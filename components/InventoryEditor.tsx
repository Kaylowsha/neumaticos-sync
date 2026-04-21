"use client";

import { useRef, useState } from "react";
import type { ParsedFile, Row } from "@/lib/types";
import { parseFile } from "@/lib/parsers";

interface Props {
  inventory: ParsedFile;
  onSave: (updated: ParsedFile) => void;
  onClose: () => void;
}

const KEY_COL = "Interno";
const DESC_COL = "Descripcion";
const PRICE_COL = "Precio Lista (c/IVA)";
const STOCK_COL = "Stock Total";

export default function InventoryEditor({ inventory, onSave, onClose }: Props) {
  const [rows, setRows] = useState<Row[]>(() => inventory.rows.map((r) => ({ ...r })));
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ key: string; col: string } | null>(null);
  const [editVal, setEditVal] = useState("");
  const [addMode, setAddMode] = useState(false);
  const [newRow, setNewRow] = useState<Row>({ [KEY_COL]: "", [DESC_COL]: "", [PRICE_COL]: "", [STOCK_COL]: "" });
  const [importError, setImportError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const filtered = rows.filter((r) => {
    const s = search.toLowerCase();
    return (
      !s ||
      (r[KEY_COL] ?? "").toLowerCase().includes(s) ||
      (r[DESC_COL] ?? "").toLowerCase().includes(s)
    );
  });

  function startEdit(key: string, col: string, current: string) {
    setEditing({ key, col });
    setEditVal(current);
  }

  function commitEdit() {
    if (!editing) return;
    setRows((prev) =>
      prev.map((r) =>
        r[KEY_COL] === editing.key ? { ...r, [editing.col]: editVal } : r
      )
    );
    setEditing(null);
  }

  function deleteRow(key: string) {
    setRows((prev) => prev.filter((r) => r[KEY_COL] !== key));
  }

  function addRow() {
    if (!newRow[KEY_COL].trim()) return;
    setRows((prev) => [...prev, { ...newRow }]);
    setNewRow({ [KEY_COL]: "", [DESC_COL]: "", [PRICE_COL]: "", [STOCK_COL]: "" });
    setAddMode(false);
  }

  async function handleImport(file: File) {
    setImportError("");
    try {
      const parsed = await parseFile(file);
      const keyCol = parsed.headers.find((h) =>
        h.toLowerCase().includes("interno") || h.toLowerCase().includes("sku") || h.toLowerCase().includes("código")
      ) ?? parsed.headers[0];
      setRows((prev) => {
        const next = [...prev];
        for (const incoming of parsed.rows) {
          const keyVal = incoming[keyCol] ?? "";
          if (!keyVal) continue;
          const idx = next.findIndex((r) => r[KEY_COL] === keyVal);
          if (idx >= 0) next[idx] = { ...next[idx], ...Object.fromEntries(
            Object.entries(incoming).map(([k, v]) => {
              if (k.toLowerCase().includes("stock")) return [STOCK_COL, v];
              if (k.toLowerCase().includes("precio") || k.toLowerCase().includes("price")) return [PRICE_COL, v];
              if (k.toLowerCase().includes("desc") || k.toLowerCase().includes("nombre")) return [DESC_COL, v];
              if (k === keyCol) return [KEY_COL, v];
              return [k, v];
            })
          )};
          else next.push({
            [KEY_COL]: keyVal,
            [DESC_COL]: incoming[parsed.headers[1]] ?? "",
            [PRICE_COL]: "",
            [STOCK_COL]: "",
            ...incoming,
          });
        }
        return next;
      });
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : "Error al leer el archivo");
    }
  }

  function handleSave() {
    onSave({ ...inventory, rows });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center overflow-auto py-6 px-4">
      <div className="w-full max-w-5xl bg-gray-950 border border-white/10 rounded-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="font-bold text-white">Gestionar Inventario SIGA</h2>
            <p className="text-xs text-white/40 mt-0.5">{rows.length} productos guardados</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl px-2">✕</button>
        </div>

        {/* Toolbar */}
        <div className="flex gap-2 px-5 py-3 border-b border-white/10 shrink-0 flex-wrap">
          <input
            type="text"
            placeholder="Buscar por código o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-40 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/50"
          />
          <button
            onClick={() => { setAddMode(true); setSearch(""); }}
            className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium transition"
          >
            + Agregar producto
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition"
          >
            📥 Importar CSV
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ""; }}
          />
        </div>

        {importError && (
          <div className="mx-5 mt-2 px-3 py-2 bg-red-900/40 border border-red-500/40 rounded-lg text-red-300 text-xs">{importError}</div>
        )}

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-950 z-10">
              <tr className="text-left text-xs text-white/40 border-b border-white/10">
                <th className="py-2 px-4 whitespace-nowrap">Interno</th>
                <th className="py-2 px-3 w-full">Descripción</th>
                <th className="py-2 px-3 whitespace-nowrap text-right">Precio</th>
                <th className="py-2 px-3 whitespace-nowrap text-right">Stock</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {/* Add row form */}
              {addMode && (
                <tr className="border-b border-blue-500/30 bg-blue-900/10">
                  {[KEY_COL, DESC_COL, PRICE_COL, STOCK_COL].map((col) => (
                    <td key={col} className="py-1 px-2">
                      <input
                        autoFocus={col === KEY_COL}
                        value={newRow[col] ?? ""}
                        onChange={(e) => setNewRow((p) => ({ ...p, [col]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") addRow(); if (e.key === "Escape") setAddMode(false); }}
                        className="w-full bg-white/10 border border-white/30 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-400"
                        placeholder={col}
                      />
                    </td>
                  ))}
                  <td className="py-1 px-2">
                    <div className="flex gap-1">
                      <button onClick={addRow} className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded">✓</button>
                      <button onClick={() => setAddMode(false)} className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded">✕</button>
                    </div>
                  </td>
                </tr>
              )}

              {filtered.length === 0 && !addMode && (
                <tr><td colSpan={5} className="py-10 text-center text-white/30">Sin resultados</td></tr>
              )}

              {filtered.map((row) => {
                const key = row[KEY_COL] ?? "";
                return (
                  <tr key={key} className="border-b border-white/5 hover:bg-white/5 group">
                    {/* Interno — no editable (es la clave) */}
                    <td className="py-1.5 px-4 font-mono text-white/70 whitespace-nowrap">{key}</td>

                    {/* Descripción */}
                    <EditCell
                      value={row[DESC_COL] ?? ""}
                      isEditing={editing?.key === key && editing.col === DESC_COL}
                      editVal={editing?.key === key && editing.col === DESC_COL ? editVal : ""}
                      onStart={() => startEdit(key, DESC_COL, row[DESC_COL] ?? "")}
                      onChange={setEditVal}
                      onCommit={commitEdit}
                      onCancel={() => setEditing(null)}
                      className="text-white/80"
                    />

                    {/* Precio */}
                    <EditCell
                      value={row[PRICE_COL] ?? ""}
                      isEditing={editing?.key === key && editing.col === PRICE_COL}
                      editVal={editing?.key === key && editing.col === PRICE_COL ? editVal : ""}
                      onStart={() => startEdit(key, PRICE_COL, row[PRICE_COL] ?? "")}
                      onChange={setEditVal}
                      onCommit={commitEdit}
                      onCancel={() => setEditing(null)}
                      className="text-right text-white/60 tabular-nums"
                      align="right"
                    />

                    {/* Stock — columna más importante de editar */}
                    <EditCell
                      value={row[STOCK_COL] ?? ""}
                      isEditing={editing?.key === key && editing.col === STOCK_COL}
                      editVal={editing?.key === key && editing.col === STOCK_COL ? editVal : ""}
                      onStart={() => startEdit(key, STOCK_COL, row[STOCK_COL] ?? "")}
                      onChange={setEditVal}
                      onCommit={commitEdit}
                      onCancel={() => setEditing(null)}
                      className="text-right font-semibold text-blue-300 tabular-nums"
                      align="right"
                      highlight
                    />

                    <td className="py-1.5 px-3">
                      <button
                        onClick={() => deleteRow(key)}
                        className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 text-xs px-1.5 transition"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-white/10 shrink-0">
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-white/60 bg-white/10 hover:bg-white/20 text-sm transition">
            Cancelar
          </button>
          <button onClick={handleSave} className="flex-1 py-2 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 text-sm transition">
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function EditCell({
  value,
  isEditing,
  editVal,
  onStart,
  onChange,
  onCommit,
  onCancel,
  className = "",
  align = "left",
  highlight = false,
}: {
  value: string;
  isEditing: boolean;
  editVal: string;
  onStart: () => void;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  className?: string;
  align?: "left" | "right";
  highlight?: boolean;
}) {
  return (
    <td
      className={`py-1.5 px-3 cursor-pointer ${highlight && !isEditing ? "hover:bg-blue-900/20" : "hover:bg-white/5"}`}
      onClick={!isEditing ? onStart : undefined}
    >
      {isEditing ? (
        <input
          autoFocus
          value={editVal}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommit();
            if (e.key === "Escape") onCancel();
          }}
          className={`w-full bg-white/10 border border-blue-500 rounded px-2 py-0.5 text-white text-sm focus:outline-none ${align === "right" ? "text-right" : ""}`}
        />
      ) : (
        <span className={`block truncate max-w-xs ${className}`} title={value}>
          {value || <span className="text-white/20">—</span>}
        </span>
      )}
    </td>
  );
}
