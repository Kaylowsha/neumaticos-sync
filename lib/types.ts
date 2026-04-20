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
}

export interface ComparisonResult {
  missingOnWeb: Row[];      // En SIGA pero no en la web
  extraOnWeb: Row[];        // En la web pero no en SIGA
  withDifferences: DiffRow[]; // En ambos pero con diferencias
}

export interface DiffRow {
  key: string;
  sigaRow: Row;
  webRow: Row;
  differences: { field: string; sigaValue: string; webValue: string }[];
}
