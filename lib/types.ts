export type Row = Record<string, string>;

export interface ParsedFile {
  rows: Row[];
  headers: string[];
  fileName: string;
}

export interface ColumnMapping {
  sigaKey: string;
  webKey: string;
  sigaDesc?: string;
  webDesc?: string;
  sigaPrice?: string;
  webPrice?: string;
  sigaStock?: string;
  webStock?: string;
  sigaBrand?: string;
  webSalePrice?: string;
}

export interface ComparisonResult {
  missingOnWeb: Row[];
  extraOnWeb: Row[];
  withDifferences: DiffRow[];
  allMatched: DiffRow[];
}

export interface DiffRow {
  key: string;
  sigaRow: Row;
  webRow: Row;
  differences: { field: string; sigaValue: string; webValue: string }[];
}
