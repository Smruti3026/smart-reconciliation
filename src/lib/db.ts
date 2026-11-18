import { Pool } from "pg";

/**
 * Shared PostgreSQL connection pool.
 *
 * Uses the DATABASE_URL env variable which should look like:
 *   postgresql://postgres:<password>@localhost:5432/smart_reconciliation
 *
 * The pool is created once and reused across requests (Next.js module caching).
 */

declare global {
  // Prevent creating a new pool on every hot-reload in development
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local as:\n" +
        "DATABASE_URL=postgresql://postgres:<password>@localhost:5432/smart_reconciliation"
    );
  }
  return new Pool({ connectionString, max: 10 });
}

// In development, store the pool on globalThis so hot-reloads reuse it
const pool: Pool =
  process.env.NODE_ENV === "production"
    ? createPool()
    : (globalThis._pgPool ??= createPool());

export default pool;
