import { Pool, PoolClient } from "pg";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const poolConfig = {
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME     || "resume_parser",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD || "",
  // Pool settings
  max:                    10,
  idleTimeoutMillis:      30000,
  connectionTimeoutMillis: 5000,
};

console.log("🔍 DB Config:", {
  host:     poolConfig.host,
  port:     poolConfig.port,
  database: poolConfig.database,
  user:     poolConfig.user,
});

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
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export default pool;
