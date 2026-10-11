// Eyes Opener: One pool per server process. Next.js reloads modules in development, so the pool is kept on globalThis. .
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/iopener";

/** One pool per server process. Next.js reloads modules in development, so the pool is kept on globalThis. */
const g = globalThis as unknown as { __iopenerPool?: Pool };
const pool = g.__iopenerPool ?? new Pool({ connectionString: url, max: 5 });
if (process.env.NODE_ENV !== "production") g.__iopenerPool = pool;

export const db = drizzle(pool, { schema, casing: "snake_case" });
export { schema };
export type Db = typeof db;
