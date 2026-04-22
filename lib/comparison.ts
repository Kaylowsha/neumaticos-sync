import type { ColumnMapping, ComparisonResult, DiffRow, Row } from "./types";

function normalize(val: string): string {
  return (val ?? "").toString().trim().toLowerCase();
}

function normalizeWords(val: string): string {
  return normalize(val).split(/\s+/).sort().join(" ");
}

function normalizePrice(val: string): string {
  // Elimina símbolos de moneda, puntos de miles y normaliza la coma decimal
  return (val ?? "").replace(/[$\s.]/g, "").replace(",", ".").trim();
}

export function compare(
  sigaRows: Row[],
  webRows: Row[],
  mapping: ColumnMapping
): ComparisonResult {
  const { sigaKey, webKey } = mapping;

  const sigaMap = new Map<string, Row>();
  for (const row of sigaRows) {
    const key = normalize(row[sigaKey]);
    if (key) sigaMap.set(key, row);
  }

  const webMap = new Map<string, Row>();
  for (const row of webRows) {
    const key = normalize(row[webKey]);
    if (key) webMap.set(key, row);
  }

  const missingOnWeb: Row[] = [];
  const withDifferences: DiffRow[] = [];
  const allMatched: DiffRow[] = [];

  for (const [key, sigaRow] of sigaMap) {
    if (!webMap.has(key)) {
      missingOnWeb.push(sigaRow);
    } else {
      const webRow = webMap.get(key)!;
      const diffs = buildDiffs(key, sigaRow, webRow, mapping);
      const diffRow: DiffRow = { key, sigaRow, webRow, differences: diffs };
      allMatched.push(diffRow);
      if (diffs.length > 0) withDifferences.push(diffRow);
    }
  }

  const extraOnWeb: Row[] = [];
  for (const [key, webRow] of webMap) {
    if (!sigaMap.has(key)) {
      extraOnWeb.push(webRow);
    }
  }

  return { missingOnWeb, extraOnWeb, withDifferences, allMatched };
}

function buildDiffs(
  _key: string,
  sigaRow: Row,
  webRow: Row,
  mapping: ColumnMapping
): DiffRow["differences"] {
  const diffs: DiffRow["differences"] = [];

  const pairs: { field: string; sigaCol?: string; webCol?: string; price?: boolean; words?: boolean }[] = [
    { field: "Nombre", sigaCol: mapping.sigaDesc, webCol: mapping.webDesc, words: true },
    { field: "Precio", sigaCol: mapping.sigaPrice, webCol: mapping.webPrice, price: true },
    { field: "Stock", sigaCol: mapping.sigaStock, webCol: mapping.webStock },
  ];

  for (const { field, sigaCol, webCol, price, words } of pairs) {
    if (!sigaCol || !webCol) continue;
    const sv = sigaRow[sigaCol] ?? "";
    const rawWv = webRow[webCol] ?? "";
    const wv = price && mapping.webSalePrice
      ? (webRow[mapping.webSalePrice] ?? "").trim() || rawWv
      : rawWv;
    const sigaNorm = price ? normalizePrice(sv) : words ? normalizeWords(sv) : normalize(sv);
    const webNorm = price ? normalizePrice(wv) : words ? normalizeWords(wv) : normalize(wv);
    if (sigaNorm !== webNorm && (sigaNorm !== "" || webNorm !== "")) {
      diffs.push({ field, sigaValue: sv, webValue: wv });
    }
  }

  return diffs;
}

export function exportForWooCommerce(
  result: ComparisonResult,
  mapping: ColumnMapping,
  corrections: Record<string, string[]>
): void {
  const rows = result.withDifferences
    .filter((d) => {
      // excluir filas donde TODOS los campos con diff ya están marcados como corregidos
      const corrected = corrections[d.key] ?? [];
      return !d.differences.every((diff) => corrected.includes(diff.field));
    })
    .map((d) => {
      const row: Record<string, string> = {};
      // ID para que WooCommerce matchee más rápido
      const id = d.webRow["ID"] ?? d.webRow["id"] ?? "";
      if (id) row["ID"] = id;
      row["sku"] = d.key;
      // precio desde SIGA
      if (mapping.sigaPrice) row["regular_price"] = d.sigaRow[mapping.sigaPrice] ?? "";
      // stock desde SIGA
      if (mapping.sigaStock) row["stock"] = d.sigaRow[mapping.sigaStock] ?? "";
      // mantener estado actual de la web
      row["post_status"] = d.webRow["post_status"] ?? "publish";
      return row;
    });

  if (rows.length === 0) {
    alert("No hay diferencias pendientes para exportar.");
    return;
  }

  // Generar CSV manualmente (sin dependencia extra)
  const headers = [...new Set(rows.flatMap(Object.keys))];
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => {
        const val = r[h] ?? "";
        return val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "actualizacion-woocommerce.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToXlsx(result: ComparisonResult, mapping: ColumnMapping): void {
  const XLSX = require("xlsx") as typeof import("xlsx");

  const wb = XLSX.utils.book_new();

  const toSheet = (rows: Row[]) =>
    rows.length > 0
      ? XLSX.utils.json_to_sheet(rows)
      : XLSX.utils.json_to_sheet([{ "(sin resultados)": "" }]);

  const diffRows = result.withDifferences.map((d) => ({
    Código: d.key,
    ...Object.fromEntries(d.differences.flatMap((diff) => [
      [`${diff.field} SIGA`, diff.sigaValue],
      [`${diff.field} Web`, diff.webValue],
    ])),
  }));

  XLSX.utils.book_append_sheet(wb, toSheet(result.missingOnWeb), "Faltan en la web");
  XLSX.utils.book_append_sheet(wb, toSheet(result.extraOnWeb), "Sobran en la web");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(diffRows.length > 0 ? diffRows : [{ "(sin diferencias)": "" }]), "Diferencias");

  XLSX.writeFile(wb, "comparacion-inventario.xlsx");
}
