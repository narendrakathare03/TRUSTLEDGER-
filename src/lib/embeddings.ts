import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;
env.useBrowserCache = false;
let extractor: any;
async function getExtractor() {
  if (!extractor) extractor = await pipeline('feature-extraction', process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2');
  return extractor;
}
export async function embedText(text: string): Promise<number[]> {
  const model = await getExtractor();
  const output = await model(text, { pooling: 'mean', normalize: true });
  const vector = Array.from(output.data as Float32Array);
  if (vector.length !== 384) throw new Error(`Expected 384 embedding dimensions, received ${vector.length}`);
  return vector;
}
export function toPgVector(values: number[]) { return `[${values.join(',')}]`; }
