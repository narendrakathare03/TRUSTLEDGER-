import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { pool, query } from '@/lib/db';
import { embedText, toPgVector } from '@/lib/embeddings';
import { errorResponse } from '@/lib/http';
export const runtime = 'nodejs';
export async function GET() {
  try {
    const session = await getSession(); if (!session) return NextResponse.json({error:'Unauthorized'}, {status:401});
    const result = await query(`SELECT v.* FROM trustledger.v_memory_dashboard v WHERE ($1='admin' OR v.user_id=$2) ORDER BY v.created_at DESC`, [session.role, session.userId]);
    return NextResponse.json({ memories: result.rows });
  } catch(e) { return errorResponse(e); }
}
const schema = z.object({ factText: z.string().trim().min(3).max(2000), sourceType: z.enum(['user_stated','agent_inferred']) });
export async function POST(req: NextRequest) {
  const session = await getSession(); if (!session) return NextResponse.json({error:'Unauthorized'}, {status:401});
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({error:'Fact must be 3–2000 characters and source type must be valid.'}, {status:400});
  let client;
  try {
    const vector = toPgVector(await embedText(parsed.data.factText));
    client = await pool.connect(); await client.query('BEGIN');
    const agentResult = await client.query(`SELECT agent_id FROM trustledger.agent WHERE user_id=$1 ORDER BY agent_id LIMIT 1`, [session.userId]);
    if (!agentResult.rowCount) throw new Error('No agent is configured for this account.');
    const inserted = await client.query(`INSERT INTO trustledger.memory_fact(agent_id,fact_text,source_type,embedding) VALUES($1,$2,$3,$4::vector) RETURNING fact_id,fact_text,source_type,created_at`, [agentResult.rows[0].agent_id, parsed.data.factText, parsed.data.sourceType, vector]);
    const fact = inserted.rows[0];
    const threshold = Number(process.env.SIMILARITY_THRESHOLD || 0.76);
    const similar = await client.query(`SELECT f.fact_id, 1-(f.embedding <=> $1::vector) AS similarity
      FROM trustledger.memory_fact f JOIN trustledger.agent a ON a.agent_id=f.agent_id
      WHERE a.user_id=$2 AND f.fact_id<>$3 AND f.embedding IS NOT NULL
      AND 1-(f.embedding <=> $1::vector) >= $4
      ORDER BY f.embedding <=> $1::vector LIMIT 5`, [vector, session.userId, fact.fact_id, threshold]);
    for (const old of similar.rows) {
      await client.query(`INSERT INTO trustledger.conflict(new_fact_id,old_fact_id) VALUES($1,$2) ON CONFLICT(new_fact_id,old_fact_id) DO NOTHING`, [fact.fact_id, old.fact_id]);
    }
    await client.query('COMMIT');
    return NextResponse.json({ fact, possibleConflicts: similar.rows.length }, {status:201});
  } catch(e) { if (client) await client.query('ROLLBACK'); return errorResponse(e); }
  finally { client?.release(); }
}
