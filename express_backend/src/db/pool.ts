import { Pool } from 'pg';
import { env } from '../utils/env';

let pool: Pool | null = null;
let connectionStringInUse: string | null = null;

function createPool(connectionString: string): Pool {
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000
  });
}

// PUBLIC_INTERFACE
export function getPool(): Pool {
  /** Get (and lazily initialize) the shared PostgreSQL connection pool. */
  if (!pool) {
    connectionStringInUse = env.db.connectionString;
    pool = createPool(connectionStringInUse);
  }
  return pool;
}

// PUBLIC_INTERFACE
export async function initDb(): Promise<void> {
  /** Verify DB connectivity at startup. Includes a dev-friendly fallback for port mismatch. */

  const p = getPool();

  try {
    await p.query('SELECT 1 AS ok;');
    return;
  } catch (err) {
    // If the configuration was defaulted and port was assumed 5001 (per project instructions),
    // try a fallback to 5000 (some environments run Postgres on 5000, e.g., postgres_database/startup.sh).
    const canFallback = env.db.isDefaulted && env.db.portHint === 5001;
    if (!canFallback) throw err;

    try {
      await p.end();
    } catch {
      // ignore
    }

    const fallback = env.db.connectionString.replace(':5001/', ':5000/');
    connectionStringInUse = fallback;
    pool = createPool(fallback);

    await pool.query('SELECT 1 AS ok;');
  }
}

// PUBLIC_INTERFACE
export function getDbConnectionStringInUse(): string | null {
  /** Return the resolved connection string currently in use (useful for debugging). */
  return connectionStringInUse;
}
