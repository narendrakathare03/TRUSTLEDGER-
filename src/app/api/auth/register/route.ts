import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { errorResponse } from '@/lib/http';
const schema = z.object({ username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9_.-]+$/), password: z.string().min(8).max(100) });
export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Username must be 3–50 characters; password must be at least 8 characters.' }, { status: 400 });
    const hash = await bcrypt.hash(parsed.data.password, 12);
    const result = await query<{user_id:number;username:string;role:'user'}>(
      `INSERT INTO trustledger."user" (username,password_hash,role) VALUES ($1,$2,'user') RETURNING user_id,username,role`, [parsed.data.username, hash]);
    const user = result.rows[0];
    await query(`INSERT INTO trustledger.agent(user_id,agent_name) VALUES($1,'Personal Assistant')`, [user.user_id]);
    await createSession({ userId: user.user_id, username: user.username, role: user.role });
    return NextResponse.json({ user }, { status: 201 });
  } catch (e: any) { return errorResponse(e, e?.code === '23505' ? 409 : 500); }
}
