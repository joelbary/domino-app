// Applies any new database migrations. Runs automatically every time the app starts.
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set — skipping migrations.");
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: url, ssl: url.includes("render.com") ? { rejectUnauthorized: false } : undefined });
await migrate(drizzle(pool), { migrationsFolder: "./db/migrations" });
console.log("Database is up to date.");
await pool.end();
