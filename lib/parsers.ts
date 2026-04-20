import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { ParsedFile, Row } from "./types";

export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") {
    return parseCsv(file);
  } else if (ext === "xlsx" || ext === "xls") {
    return parseExcel(file);
  }
  throw new Error(`Formato no soportado: .${ext}. Usá .csv, .xlsx o .xls`);
}

function parseCsv(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      transformHeader: (h) => h.replace(/^\uFEFF/, ""),
      complete(results) {
        const headers = results.meta.fields ?? [];
        resolve({ rows: results.data, headers, fileName: file.name });
      },
      error(err) {
        reject(new Error(`Error al leer CSV: ${err.message}`));
      },
    });
  });
}

async function parseExcel(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Row>(ws, { defval: "", raw: false });
  const headers = raw.length > 0 ? Object.keys(raw[0]) : [];
  return { rows: raw, headers, fileName: file.name };
}

/** Intenta detectar la columna clave más probable dado un array de headers */
export function guessKeyColumn(headers: string[], isSiga: boolean): string {
  const sigaCandidates = ["Interno", "interno", "INTERNO", "Cod", "Código", "Codigo", "ID"];
  const webCandidates = ["SKU", "sku", "id", "ID", "product_id", "Código", "Codigo"];
  const candidates = isSiga ? sigaCandidates : webCandidates;
  return candidates.find((c) => headers.includes(c)) ?? headers[0] ?? "";
}

export function guessColumn(headers: string[], candidates: string[]): string {
  for (const c of candidates) {
    const match = headers.find((h) => h.toLowerCase().includes(c.toLowerCase()));
    if (match) return match;
  }
  return "";
}
