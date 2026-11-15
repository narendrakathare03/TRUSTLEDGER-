
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { pool } from '@/lib/db';
import { errorResponse } from '@/lib/http';

const schema = z.object({
  conflictId: z.number().int().positive(),
  decision: z.enum(['kept_old', 'accepted_new', 'both_uncertain'])
});

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can resolve conflicts
  if (session.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden: Only admins can resolve conflicts.' },
      { status: 403 }
    );
  }

  const parsed = schema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid conflict decision.' },
      { status: 400 }
    );
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const found = await client.query(
      `SELECT conflict_id
       FROM trustledger.conflict
       WHERE conflict_id = $1
       FOR UPDATE`,
      [parsed.data.conflictId]
    );

    if (!found.rowCount) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Conflict not found.' },
        { status: 404 }
      );
    }

    await client.query(
      `UPDATE trustledger.conflict
       SET status = $1
       WHERE conflict_id = $2`,
      [parsed.data.decision, parsed.data.conflictId]
    );

    await client.query(
      `CALL trustledger.resolve_conflict_scores($1)`,
      [parsed.data.conflictId]
    );

    await client.query('COMMIT');

    return NextResponse.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    return errorResponse(e);
  } finally {
    client.release();
  }
}
