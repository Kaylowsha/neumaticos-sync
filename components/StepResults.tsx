"use client";

import { useState } from "react";
import type { ColumnMapping, ComparisonResult, DiffRow, Row } from "@/lib/types";
import { exportToXlsx } from "@/lib/comparison";

interface Props {
  result: ComparisonResult;
  mapping: ColumnMapping;
  onBack: () => void;
  onReset: () => void;
}

type Tab = "missing" | "extra" | "diffs";

export default function StepResults({ result, mapping, onBack, onReset }: Props) {
  const [tab, setTab] = useState<Tab>("missing");
  const [search, setSearch] = useState("");

  const tabs: { id: Tab; label: string; count: number; color: string }[] = [
    { id: "missing", label: "Faltan en la web", count: result.missingOnWeb.length, color: "text-red-400" },
    { id: "extra", label: "Sobran en la web", count: result.extraOnWeb.length, color: "text-yellow-400" },
    { id: "diffs", label: "Diferencias de precio/stock", count: result.withDifferences.length, color: "text-blue-400" },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSearch(""); }}
            className={`rounded-xl p-3 text-center border transition ${tab === t.id ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10 hover:bg-white/8"}`}
          >
            <p className={`text-2xl font-bold ${t.color}`}>{t.count}</p>
            <p className="text-xs text-white/50 mt-1">{t.label}</p>
          </button>
        ))}
      </div>

      {/* Search + Export */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/50"
        />
        <button
          onClick={() => exportToXlsx(result, mapping)}
          className="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-semibold transition"
        >
          📥 Exportar .xlsx
        </button>
      </div>

      {/* Table */}
      {tab === "missing" && <MissingTable rows={result.missingOnWeb} mapping={mapping} search={search} />}
      {tab === "extra" && <ExtraTable rows={result.extraOnWeb} mapping={mapping} search={search} />}
      {tab === "diffs" && <DiffsTable rows={result.withDifferences} mapping={mapping} search={search} />}

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="px-6 py-2 rounded-xl text-white/60 bg-white/10 hover:bg-white/20 text-sm transition">
          ← Ajustar columnas
        </button>
        <button onClick={onReset} className="px-6 py-2 rounded-xl text-white/60 bg-white/10 hover:bg-white/20 text-sm transition">
          🔄 Nueva comparación
        </button>
      </div>
    </div>
  );
}

function filterRows(rows: Row[], search: string, cols: string[]): Row[] {
  if (!search) return rows;
  const q = search.toLowerCase();
  return rows.filter((r) => cols.some((c) => (r[c] ?? "").toLowerCase().includes(q)));
}

function getAroInfo(rows: Row[]): { col: string; values: string[] } | null {
  if (rows.length === 0) return null;
  const col = Object.keys(rows[0]).find((k) => k.toLowerCase().includes("aro"));
  if (!col) return null;
  const values = [...new Set(rows.map((r) => (r[col] ?? "").toString().trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
  return values.length > 0 ? { col, values } : null;
}

function AroFilter({ aro, value, onChange }: { aro: { col: string; values: string[] }; value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-white/50"
    >
      <option value="">Todos los aros</option>
      {aro.values.map((v) => (
        <option key={v} value={v}>Aro {v}</option>
      ))}
    </select>
  );
}

function MissingTable({ rows, mapping, search }: { rows: Row[]; mapping: ColumnMapping; search: string }) {
  const [aroFilter, setAroFilter] = useState("");
  const cols = [mapping.sigaKey, mapping.sigaDesc, mapping.sigaPrice, mapping.sigaStock, mapping.sigaBrand].filter(Boolean) as string[];
  const aro = getAroInfo(rows);
  const byAro = aro && aroFilter ? rows.filter((r) => (r[aro.col] ?? "").toString().trim() === aroFilter) : rows;
  const filtered = filterRows(byAro, search, cols);

  return (
    <>
      {aro && <AroFilter aro={aro} value={aroFilter} onChange={setAroFilter} />}
      {filtered.length === 0 ? (
        <Empty msg={rows.length === 0 ? "¡Perfecto! No falta ningún producto en la web." : "No hay resultados para la búsqueda."} good={rows.length === 0} />
      ) : (
        <TableWrapper>
          <thead>
            <tr className="text-left text-xs text-white/40 border-b border-white/10">
              <th className="pb-2 pr-3">Código</th>
              {mapping.sigaDesc && <th className="pb-2 pr-3">Descripción</th>}
              {mapping.sigaPrice && <th className="pb-2 pr-3">Precio SIGA</th>}
              {mapping.sigaStock && <th className="pb-2 pr-3">Stock</th>}
              {mapping.sigaBrand && <th className="pb-2">Marca</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5 text-sm">
                <td className="py-2 pr-3 font-mono text-red-300">{r[mapping.sigaKey]}</td>
                {mapping.sigaDesc && <td className="py-2 pr-3 text-white/80">{r[mapping.sigaDesc]}</td>}
                {mapping.sigaPrice && <td className="py-2 pr-3 text-white/60">{r[mapping.sigaPrice]}</td>}
                {mapping.sigaStock && <td className="py-2 pr-3 text-white/60">{r[mapping.sigaStock]}</td>}
                {mapping.sigaBrand && <td className="py-2 text-white/50">{r[mapping.sigaBrand!]}</td>}
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      )}
    </>
  );
}

function ExtraTable({ rows, mapping, search }: { rows: Row[]; mapping: ColumnMapping; search: string }) {
  const [aroFilter, setAroFilter] = useState("");
  const cols = [mapping.webKey, mapping.webDesc, mapping.webPrice, mapping.webStock].filter(Boolean) as string[];
  const aro = getAroInfo(rows);
  const byAro = aro && aroFilter ? rows.filter((r) => (r[aro.col] ?? "").toString().trim() === aroFilter) : rows;
  const filtered = filterRows(byAro, search, cols);

  return (
    <>
      {aro && <AroFilter aro={aro} value={aroFilter} onChange={setAroFilter} />}
      {filtered.length === 0 ? (
        <Empty msg={rows.length === 0 ? "¡Perfecto! No sobra ningún producto en la web." : "No hay resultados para la búsqueda."} good={rows.length === 0} />
      ) : (
        <TableWrapper>
          <thead>
            <tr className="text-left text-xs text-white/40 border-b border-white/10">
              <th className="pb-2 pr-3">SKU Web</th>
              {mapping.webDesc && <th className="pb-2 pr-3">Nombre</th>}
              {mapping.webPrice && <th className="pb-2 pr-3">Precio Web</th>}
              {mapping.webStock && <th className="pb-2">Stock Web</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5 text-sm">
                <td className="py-2 pr-3 font-mono text-yellow-300">{r[mapping.webKey]}</td>
                {mapping.webDesc && <td className="py-2 pr-3 text-white/80">{r[mapping.webDesc]}</td>}
                {mapping.webPrice && <td className="py-2 pr-3 text-white/60">{r[mapping.webPrice]}</td>}
                {mapping.webStock && <td className="py-2 text-white/60">{r[mapping.webStock]}</td>}
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      )}
    </>
  );
}

function DiffsTable({ rows, mapping, search }: { rows: DiffRow[]; mapping: ColumnMapping; search: string }) {
  const [aroFilter, setAroFilter] = useState("");
  const sigaRows = rows.map((r) => r.sigaRow);
  const aro = getAroInfo(sigaRows);
  const byAro = aro && aroFilter ? rows.filter((r) => (r.sigaRow[aro.col] ?? "").toString().trim() === aroFilter) : rows;
  const filtered = search
    ? byAro.filter((r) => r.key.toLowerCase().includes(search.toLowerCase()) ||
        (mapping.sigaDesc && (r.sigaRow[mapping.sigaDesc] ?? "").toLowerCase().includes(search.toLowerCase())))
    : byAro;

  return (
    <>
      {aro && <AroFilter aro={aro} value={aroFilter} onChange={setAroFilter} />}
      {filtered.length === 0 ? (
        <Empty msg={rows.length === 0 ? "¡Perfecto! No hay diferencias de precio ni stock." : "No hay resultados para la búsqueda."} good={rows.length === 0} />
      ) : (
    <TableWrapper>
      <thead>
        <tr className="text-left text-xs text-white/40 border-b border-white/10">
          <th className="pb-2 pr-3">Código</th>
          {mapping.sigaDesc && <th className="pb-2 pr-3">Descripción</th>}
          <th className="pb-2 pr-3">Campo</th>
          <th className="pb-2 pr-3">Valor SIGA</th>
          <th className="pb-2">Valor Web</th>
        </tr>
      </thead>
      <tbody>
        {filtered.flatMap((r) =>
          r.differences.map((d, j) => (
            <tr key={`${r.key}-${j}`} className="border-b border-white/5 hover:bg-white/5 text-sm">
              {j === 0 ? (
                <>
                  <td className="py-2 pr-3 font-mono text-blue-300" rowSpan={r.differences.length}>{r.key}</td>
                  {mapping.sigaDesc && (
                    <td className="py-2 pr-3 text-white/70" rowSpan={r.differences.length}>
                      {r.sigaRow[mapping.sigaDesc]}
                    </td>
                  )}
                </>
              ) : null}
              <td className="py-2 pr-3 text-white/50">{d.field}</td>
              <td className="py-2 pr-3 text-white">{d.sigaValue}</td>
              <td className="py-2 text-white/60">{d.webValue}</td>
            </tr>
          ))
        )}
      </tbody>
    </TableWrapper>
      )}
    </>
  );
}

function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-auto max-h-[50vh] bg-white/5 border border-white/10 rounded-xl">
      <table className="w-full px-4">{children}</table>
    </div>
  );
}

function Empty({ msg, good }: { msg: string; good: boolean }) {
  return (
    <div className={`rounded-xl p-6 text-center border ${good ? "bg-green-900/20 border-green-500/30 text-green-300" : "bg-white/5 border-white/10 text-white/40"}`}>
      {good ? "✅ " : "🔍 "}{msg}
    </div>
  );
}
