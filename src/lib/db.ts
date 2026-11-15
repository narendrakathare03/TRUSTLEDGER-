
import { Pool, type QueryResultRow } from 'pg';

declare global {
  var trustLedgerPool: Pool | undefined;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is missing. Copy .env.example to .env.local and configure it.'
  );
}

export const pool =
  global.trustLedgerPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== 'production') {
  global.trustLedgerPool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  return pool.query<T>(text, params);
}
