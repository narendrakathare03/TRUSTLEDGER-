import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
export async function GET(){
 const s=await getSession(); if(!s)return NextResponse.json({error:'Unauthorized'},{status:401});
 const r=await query(`SELECT COUNT(DISTINCT f.fact_id)::int AS total_facts,
 COUNT(DISTINCT c.conflict_id) FILTER(WHERE c.status='pending')::int AS pending_conflicts,
 COALESCE(ROUND(AVG(ts.score_value),2),0) AS average_trust,
 COUNT(DISTINCT a.agent_id)::int AS total_agents
 FROM trustledger.agent a LEFT JOIN trustledger.memory_fact f ON f.agent_id=a.agent_id
 LEFT JOIN trustledger.trust_score ts ON ts.fact_id=f.fact_id
 LEFT JOIN trustledger.conflict c ON c.new_fact_id=f.fact_id
 WHERE ($1='admin' OR a.user_id=$2)`,[s.role,s.userId]);
 return NextResponse.json(r.rows[0]);
}
