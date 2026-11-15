import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { errorResponse } from '@/lib/http';
const schema = z.object({ username: z.string().trim().min(1), password: z.string().min(1) });
export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Enter username and password.' }, { status: 400 });
    const result = await query<any>(`SELECT user_id,username,password_hash,role FROM trustledger."user" WHERE username=$1`, [parsed.data.username]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    await createSession({ userId: user.user_id, username: user.username, role: user.role });
    return NextResponse.json({ user: { userId: user.user_id, username: user.username, role: user.role } });
  } catch (e) { return errorResponse(e); }
}
