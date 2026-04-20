import type { ColumnMapping, ComparisonResult, DiffRow, Row } from "./types";

function normalize(val: string): string {
  return (val ?? "").toString().trim().toLowerCase();
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

  for (const [key, sigaRow] of sigaMap) {
    if (!webMap.has(key)) {
      missingOnWeb.push(sigaRow);
    } else {
      const webRow = webMap.get(key)!;
      const diffs = buildDiffs(key, sigaRow, webRow, mapping);
      if (diffs.length > 0) {
        withDifferences.push({ key, sigaRow, webRow, differences: diffs });
      }
    }
  }

  const extraOnWeb: Row[] = [];
  for (const [key, webRow] of webMap) {
    if (!sigaMap.has(key)) {
      extraOnWeb.push(webRow);
    }
  }

  return { missingOnWeb, extraOnWeb, withDifferences };
}

function buildDiffs(
  _key: string,
  sigaRow: Row,
  webRow: Row,
  mapping: ColumnMapping
): DiffRow["differences"] {
  const diffs: DiffRow["differences"] = [];

  const pairs: { field: string; sigaCol?: string; webCol?: string; price?: boolean }[] = [
    { field: "Nombre", sigaCol: mapping.sigaDesc, webCol: mapping.webDesc },
    { field: "Precio", sigaCol: mapping.sigaPrice, webCol: mapping.webPrice, price: true },
    { field: "Stock", sigaCol: mapping.sigaStock, webCol: mapping.webStock },
  ];

  for (const { field, sigaCol, webCol, price } of pairs) {
    if (!sigaCol || !webCol) continue;
    const sv = sigaCol ? sigaRow[sigaCol] ?? "" : "";
    const wv = webCol ? webRow[webCol] ?? "" : "";
    const sigaNorm = price ? normalizePrice(sv) : normalize(sv);
    const webNorm = price ? normalizePrice(wv) : normalize(wv);
    if (sigaNorm !== webNorm && (sigaNorm !== "" || webNorm !== "")) {
      diffs.push({ field, sigaValue: sv, webValue: wv });
    }
  }

  return diffs;
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
