import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);

export async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS siga_products (
      interno    TEXT PRIMARY KEY,
      descripcion TEXT NOT NULL DEFAULT '',
      precio     TEXT NOT NULL DEFAULT '',
      stock      TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}
