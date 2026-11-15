import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { errorResponse } from '@/lib/http';
export async function GET() {
  try {
    const session = await getSession(); if (!session) return NextResponse.json({error:'Unauthorized'}, {status:401});
    const result = await query(`SELECT c.conflict_id,c.status,c.detected_at,
      nf.fact_id AS new_fact_id,nf.fact_text AS new_fact,nf.source_type AS new_source,
      of.fact_id AS old_fact_id,of.fact_text AS old_fact,of.source_type AS old_source
      FROM trustledger.conflict c
      JOIN trustledger.memory_fact nf ON nf.fact_id=c.new_fact_id
      JOIN trustledger.memory_fact of ON of.fact_id=c.old_fact_id
      JOIN trustledger.agent a ON a.agent_id=nf.agent_id
      WHERE ($1='admin' OR a.user_id=$2) ORDER BY (c.status='pending') DESC,c.detected_at DESC`, [session.role,session.userId]);
    return NextResponse.json({conflicts:result.rows});
  } catch(e) { return errorResponse(e); }
}
