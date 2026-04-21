import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ interno: string }> }
) {
  try {
    const { interno } = await params;
    const body: Record<string, string> = await req.json();

    const colMap: Record<string, string> = {
      Descripcion: "descripcion",
      "Precio Lista (c/IVA)": "precio",
      "Stock Total": "stock",
    };

    for (const [field, value] of Object.entries(body)) {
      const col = colMap[field];
      if (!col) continue;
      if (col === "descripcion") {
        await sql`UPDATE siga_products SET descripcion=${value}, updated_at=NOW() WHERE interno=${interno}`;
      } else if (col === "precio") {
        await sql`UPDATE siga_products SET precio=${value}, updated_at=NOW() WHERE interno=${interno}`;
      } else if (col === "stock") {
        await sql`UPDATE siga_products SET stock=${value}, updated_at=NOW() WHERE interno=${interno}`;
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ interno: string }> }
) {
  try {
    const { interno } = await params;
    await sql`DELETE FROM siga_products WHERE interno = ${interno}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ interno: string }> }
) {
  try {
    const { interno } = await params;
    const body: Record<string, string> = await req.json();
    await sql`
      INSERT INTO siga_products (interno, descripcion, precio, stock)
      VALUES (
        ${interno},
        ${body["Descripcion"] ?? ""},
        ${body["Precio Lista (c/IVA)"] ?? ""},
        ${body["Stock Total"] ?? ""}
      )
      ON CONFLICT (interno) DO UPDATE
        SET descripcion = EXCLUDED.descripcion,
            precio      = EXCLUDED.precio,
            stock       = EXCLUDED.stock,
            updated_at  = NOW()
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
