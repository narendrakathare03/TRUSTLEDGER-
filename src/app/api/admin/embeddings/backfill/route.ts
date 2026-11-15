import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { embedText, toPgVector } from '@/lib/embeddings';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const maxDuration = 300;

const requestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
});

/**
 * Generate embeddings for existing memory facts that do not have one yet.
 * This endpoint is restricted to admin users.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Limit must be an integer between 1 and 100.' },
        { status: 400 },
      );
    }

    const pending = await query<{ fact_id: number; fact_text: string }>(
      `SELECT fact_id, fact_text
       FROM trustledger.memory_fact
       WHERE embedding IS NULL
       ORDER BY fact_id
       LIMIT $1`,
      [parsed.data.limit],
    );

    let updated = 0;
    const failures: Array<{ factId: number; error: string }> = [];

    for (const fact of pending.rows) {
      try {
        const embedding = toPgVector(await embedText(fact.fact_text));
        const result = await query(
          `UPDATE trustledger.memory_fact
           SET embedding = $1::vector
           WHERE fact_id = $2 AND embedding IS NULL
           RETURNING fact_id`,
          [embedding, fact.fact_id],
        );

        if (result.rowCount && result.rowCount > 0) {
          updated += 1;
        }
      } catch (error) {
        failures.push({
          factId: fact.fact_id,
          error: error instanceof Error ? error.message : 'Unknown embedding error',
        });
      }
    }

    const remaining = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM trustledger.memory_fact
       WHERE embedding IS NULL`,
    );

    return NextResponse.json({
      message: 'Embedding backfill completed.',
      selected: pending.rows.length,
      updated,
      failed: failures.length,
      failures,
      remainingWithoutEmbeddings: Number(remaining.rows[0]?.count ?? 0),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
