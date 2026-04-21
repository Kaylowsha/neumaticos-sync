import type { ParsedFile, Row } from "./types";

const KEY = "siga-inventory";

export function loadSigaInventory(): ParsedFile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ParsedFile) : null;
  } catch {
    return null;
  }
}

export function saveSigaInventory(file: ParsedFile): void {
  localStorage.setItem(KEY, JSON.stringify(file));
}

export function clearSigaInventory(): void {
  localStorage.removeItem(KEY);
}

export function updateSigaRow(keyCol: string, keyVal: string, updates: Partial<Row>): void {
  const inv = loadSigaInventory();
  if (!inv) return;
  const idx = inv.rows.findIndex((r) => r[keyCol] === keyVal);
  if (idx >= 0) inv.rows[idx] = { ...inv.rows[idx], ...(updates as Row) };
  saveSigaInventory(inv);
}

export function addSigaRow(keyCol: string, row: Row): void {
  const inv = loadSigaInventory();
  if (!inv) return;
  const exists = inv.rows.some((r) => r[keyCol] === row[keyCol]);
  if (!exists) inv.rows.push(row);
  saveSigaInventory(inv);
}

export function mergeSigaRows(keyCol: string, incoming: Row[]): void {
  const inv = loadSigaInventory();
  if (!inv) return;
  for (const row of incoming) {
    const idx = inv.rows.findIndex((r) => r[keyCol] === row[keyCol]);
    if (idx >= 0) inv.rows[idx] = { ...inv.rows[idx], ...row };
    else inv.rows.push(row);
  }
  saveSigaInventory(inv);
}
