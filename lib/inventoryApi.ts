import type { ParsedFile, Row } from "./types";

const HEADERS = ["Interno", "Descripcion", "Precio Lista (c/IVA)", "Stock Total"];
const FILE_NAME = "SIGA (base de datos)";

export async function fetchInventory(): Promise<ParsedFile | null> {
  try {
    const res = await fetch("/api/inventory");
    if (!res.ok) return null;
    const { rows } = await res.json();
    if (!rows || rows.length === 0) return null;
    return { rows, headers: HEADERS, fileName: FILE_NAME };
  } catch {
    return null;
  }
}

export async function saveInventory(file: ParsedFile): Promise<void> {
  await fetch("/api/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows: file.rows }),
  });
}

export async function updateRow(interno: string, updates: Partial<Row>): Promise<void> {
  await fetch(`/api/inventory/${encodeURIComponent(interno)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
}

export async function addRow(row: Row): Promise<void> {
  const interno = row["Interno"] ?? "";
  await fetch(`/api/inventory/${encodeURIComponent(interno)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(row),
  });
}

export async function deleteRow(interno: string): Promise<void> {
  await fetch(`/api/inventory/${encodeURIComponent(interno)}`, {
    method: "DELETE",
  });
}
