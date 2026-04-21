import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;

export function sql() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return _sql;
}

export async function ensureTable() {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS siga_products (
      interno     TEXT PRIMARY KEY,
      descripcion TEXT NOT NULL DEFAULT '',
      precio      TEXT NOT NULL DEFAULT '',
      stock       TEXT NOT NULL DEFAULT '',
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}
