import { NextResponse } from "next/server";
import { ensureTable, sql } from "@/lib/db";
import type { Row } from "@/lib/types";

export async function GET() {
  try {
    await ensureTable();
    const db = sql();
    const rows = await db`
      SELECT interno, descripcion, precio, stock
      FROM siga_products
      ORDER BY interno
    ` as Record<string, string>[];
    const mapped: Row[] = rows.map((r) => ({
      Interno: r.interno,
      Descripcion: r.descripcion,
      "Precio Lista (c/IVA)": r.precio,
      "Stock Total": r.stock,
    }));
    return NextResponse.json({ rows: mapped });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureTable();
    const db = sql();
    const { rows }: { rows: Row[] } = await req.json();

    await db`TRUNCATE siga_products`;
    for (const row of rows) {
      await db`
        INSERT INTO siga_products (interno, descripcion, precio, stock)
        VALUES (
          ${row["Interno"] ?? ""},
          ${row["Descripcion"] ?? ""},
          ${row["Precio Lista (c/IVA)"] ?? ""},
          ${row["Stock Total"] ?? ""}
        )
        ON CONFLICT (interno) DO UPDATE
          SET descripcion = EXCLUDED.descripcion,
              precio      = EXCLUDED.precio,
              stock       = EXCLUDED.stock,
              updated_at  = NOW()
      `;
    }
    return NextResponse.json({ ok: true, count: rows.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
