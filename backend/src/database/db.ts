import { Pool, PoolClient } from "pg";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from the working directory (works in both src and dist)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'resume_parser',
  user: process.env.DB_USER || 'resume_user',
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

console.log("🔍 Connecting to PostgreSQL:", `${poolConfig.user}@${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`);

const pool = new Pool(poolConfig);

pool.on("error", (err: Error) => {
  console.error("Unexpected error on idle PostgreSQL client:", err);
  process.exit(-1);
});

/** Run a single parameterised query. */
export const query = (text: string, params?: unknown[]) =>
  pool.query(text, params);

/** Borrow a raw client from the pool (remember to .release() it). */
export const getClient = (): Promise<PoolClient> => pool.connect();

/**
 * Run `fn` inside a transaction.
 * Auto-commits on success, rolls back on any thrown error.
 */
export const transaction = async <T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

export default pool;