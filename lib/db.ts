import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";

const url = process.env.DATABASE_URL ?? "";

// Reuse one connection pool across hot reloads in development.
const g = globalThis as unknown as { pgPool?: pg.Pool };
export const pool =
  g.pgPool ??
  new pg.Pool({
    connectionString: url,
    ssl: url.includes("render.com") ? { rejectUnauthorized: false } : undefined,
    max: 5,
  });
if (process.env.NODE_ENV !== "production") g.pgPool = pool;

export const db = drizzle(pool, { schema });
