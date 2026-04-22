"use client";

import { useMemo, useState } from "react";
import type { ColumnMapping, ComparisonResult, Row } from "@/lib/types";
import { exportToXlsx } from "@/lib/comparison";
import { parseTireSize } from "@/lib/parsers";

interface Props {
  result: ComparisonResult;
  mapping: ColumnMapping;
  onBack: () => void;
  onReset: () => void;
}

type UnifiedRow =
  | { type: "missing"; key: string; sigaRow: Row }
  | { type: "extra"; key: string; webRow: Row }
  | { type: "matched"; key: string; sigaRow: Row; webRow: Row; diffFields: Set<string> };

type ExtraDecision = "quitado" | "mantener" | null;

function getRowName(row: UnifiedRow, mapping: ColumnMapping): string {
  if (row.type === "extra") return mapping.webDesc ? (row.webRow[mapping.webDesc] ?? "") : "";
  return mapping.sigaDesc ? (row.sigaRow[mapping.sigaDesc] ?? "") : "";
}

function getWebStatus(row: UnifiedRow): string {
  if (row.type === "missing") return "";
  const webRow = row.type === "extra" ? row.webRow : row.webRow;
  return (webRow["post_status"] ?? "").toLowerCase();
}

function buildUnified(result: ComparisonResult, mapping: ColumnMapping): UnifiedRow[] {
  const rows: UnifiedRow[] = [];
  for (const r of result.missingOnWeb) {
    rows.push({ type: "missing", key: r[mapping.sigaKey] ?? r[Object.keys(r)[0]] ?? "", sigaRow: r });
  }
  for (const r of result.extraOnWeb) {
    rows.push({ type: "extra", key: r[mapping.webKey] ?? r[Object.keys(r)[0]] ?? "", webRow: r });
  }
  for (const r of result.allMatched) {
    rows.push({ type: "matched", key: r.key, sigaRow: r.sigaRow, webRow: r.webRow, diffFields: new Set(r.differences.map((d) => d.field)) });
  }
  return rows;
}

function loadDecisions(): Record<string, ExtraDecision> {
  try { return JSON.parse(localStorage.getItem("extra-decisions") ?? "{}"); }
  catch { return {}; }
}

function uniqueSorted(vals: (string | undefined)[]): string[] {
  return [...new Set(vals.filter(Boolean) as string[])].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
}

function ChipGroup({ label, options, selected, onToggle }: { label: string; options: string[]; selected: Set<string>; onToggle: (v: string) => void }) {
  if (options.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-white/40 shrink-0">{label}</span>
      {options.map((v) => (
        <button
          key={v}
          onClick={() => onToggle(v)}
          className={`px-2 py-0.5 rounded-full text-xs font-medium border transition ${
            selected.has(v)
              ? "bg-blue-600 border-blue-500 text-white"
              : "bg-white/5 border-white/20 text-white/60 hover:bg-white/10"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

const STATUS: Record<string, { label: string; cls: string }> = {
  missing:  { label: "FALTA",    cls: "bg-red-900/40 text-red-300 border-red-500/30" },
  extra:    { label: "SOBRA",    cls: "bg-yellow-900/40 text-yellow-300 border-yellow-500/30" },
  matched:  { label: "OK",       cls: "bg-green-900/30 text-green-400 border-green-500/30" },
  diff:     { label: "DIFS",     cls: "bg-orange-900/40 text-orange-300 border-orange-500/30" },
  quitado:  { label: "QUITADO",  cls: "bg-red-900/30 text-red-400/70 border-red-500/20" },
  mantener: { label: "MANTENER", cls: "bg-blue-900/40 text-blue-300 border-blue-500/30" },
};

export default function StepResults({ result, mapping, onBack, onReset }: Props) {
  const [skuFilter, setSkuFilter]     = useState("");
  const [medidaFilter, setMedidaFilter] = useState("");
  const [aroSel, setAroSel]           = useState<Set<string>>(new Set());
  const [perfilSel, setPerfilSel]     = useState<Set<string>>(new Set());
  const [anchoSel, setAnchoSel]       = useState<Set<string>>(new Set());
  const [estadoWeb, setEstadoWeb]     = useState<"todos" | "publicado" | "borrador">("todos");
  const [decisions, setDecisions]     = useState<Record<string, ExtraDecision>>(loadDecisions);

  function setDecision(key: string, decision: ExtraDecision) {
    setDecisions((prev) => {
      const next = { ...prev };
      if (next[key] === decision) delete next[key]; // toggle off
      else next[key] = decision;
      localStorage.setItem("extra-decisions", JSON.stringify(next));
      return next;
    });
  }

  const allRows = useMemo(() => buildUnified(result, mapping), [result, mapping]);

  const dimOptions = useMemo(() => {
    const aros: string[] = [], perfiles: string[] = [], anchos: string[] = [];
    for (const row of allRows) {
      const name = getRowName(row, mapping);
      const { aro, perfil, ancho } = parseTireSize(name);
      if (aro) aros.push(aro);
      if (perfil) perfiles.push(perfil);
      if (ancho) anchos.push(ancho);
    }
    return { aros: uniqueSorted(aros), perfiles: uniqueSorted(perfiles), anchos: uniqueSorted(anchos) };
  }, [allRows, mapping]);

  const toggle = (sel: Set<string>, setSel: (s: Set<string>) => void, val: string) => {
    const next = new Set(sel);
    next.has(val) ? next.delete(val) : next.add(val);
    setSel(next);
  };

  const filtered = useMemo(() => {
    return allRows.filter((row) => {
      const key = row.key.toLowerCase();
      if (skuFilter && !key.includes(skuFilter.toLowerCase())) return false;

      const name = getRowName(row, mapping).toLowerCase();
      if (medidaFilter && !name.includes(medidaFilter.toLowerCase())) return false;

      if (aroSel.size > 0 || perfilSel.size > 0 || anchoSel.size > 0) {
        const { aro, perfil, ancho } = parseTireSize(getRowName(row, mapping));
        if (aroSel.size > 0 && (!aro || !aroSel.has(aro))) return false;
        if (perfilSel.size > 0 && (!perfil || !perfilSel.has(perfil))) return false;
        if (anchoSel.size > 0 && (!ancho || !anchoSel.has(ancho))) return false;
      }

      if (estadoWeb !== "todos") {
        const st = getWebStatus(row);
        if (estadoWeb === "publicado" && !st.includes("publicad")) return false;
        if (estadoWeb === "borrador"  && !st.includes("borrador") && !st.includes("draft")) return false;
      }

      return true;
    });
  }, [allRows, skuFilter, medidaFilter, aroSel, perfilSel, anchoSel, estadoWeb, mapping]);

  // Contadores dinámicos
  const extraRows = allRows.filter((r) => r.type === "extra");
  const sobraPendiente = extraRows.filter((r) => !decisions[r.key]).length;
  const sobraQuitados  = extraRows.filter((r) => decisions[r.key] === "quitado").length;
  const sobraMantener  = extraRows.filter((r) => decisions[r.key] === "mantener").length;

  const fields: { label: string; sigaCol?: string; webCol?: string }[] = [
    { label: "Nombre", sigaCol: mapping.sigaDesc, webCol: mapping.webDesc },
    { label: "Precio", sigaCol: mapping.sigaPrice, webCol: mapping.webPrice },
    { label: "Stock",  sigaCol: mapping.sigaStock, webCol: mapping.webStock },
  ].filter((f) => f.sigaCol || f.webCol);

  const summaryCards = [
    { label: "Faltan en web",    count: result.missingOnWeb.length,                              color: "text-red-400",    sub: null },
    { label: "Sobran — pendiente", count: sobraPendiente,                                        color: "text-yellow-400", sub: `${sobraQuitados} quitar · ${sobraMantener} mantener` },
    { label: "Con diferencias",  count: result.withDifferences.length,                           color: "text-orange-400", sub: null },
    { label: "Coinciden",        count: result.allMatched.length - result.withDifferences.length, color: "text-green-400",  sub: null },
  ];

  const estadoBtns: { val: typeof estadoWeb; label: string }[] = [
    { val: "todos",     label: "Todos" },
    { val: "publicado", label: "Publicados" },
    { val: "borrador",  label: "Borradores" },
  ];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-2">
        {summaryCards.map((c) => (
          <div key={c.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${c.color}`}>{c.count}</p>
            <p className="text-xs text-white/40 mt-1">{c.label}</p>
            {c.sub && <p className="text-[10px] text-white/25 mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
        {/* Fila 1: búsqueda + estado web + exportar */}
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Buscar SKU..."
            value={skuFilter}
            onChange={(e) => setSkuFilter(e.target.value)}
            className="w-36 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/50"
          />
          <input
            type="text"
            placeholder="Buscar medida..."
            value={medidaFilter}
            onChange={(e) => setMedidaFilter(e.target.value)}
            className="flex-1 min-w-32 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/50"
          />
          {/* Filtro publicado/borrador */}
          <div className="flex rounded-lg overflow-hidden border border-white/20">
            {estadoBtns.map((b) => (
              <button
                key={b.val}
                onClick={() => setEstadoWeb(b.val)}
                className={`px-3 py-1.5 text-xs font-medium transition ${
                  estadoWeb === b.val
                    ? "bg-blue-600 text-white"
                    : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => exportToXlsx(result, mapping)}
            className="px-4 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-semibold transition whitespace-nowrap"
          >
            📥 Exportar .xlsx
          </button>
        </div>
        <ChipGroup label="Aro"    options={dimOptions.aros}    selected={aroSel}    onToggle={(v) => toggle(aroSel, setAroSel, v)} />
        <ChipGroup label="Perfil" options={dimOptions.perfiles} selected={perfilSel} onToggle={(v) => toggle(perfilSel, setPerfilSel, v)} />
        <ChipGroup label="Ancho"  options={dimOptions.anchos}   selected={anchoSel}  onToggle={(v) => toggle(anchoSel, setAnchoSel, v)} />
      </div>

      {/* Table */}
      <div className="text-xs text-white/40 px-1">{filtered.length} productos</div>
      <div className="overflow-auto max-h-[calc(100vh-440px)] min-h-[300px] bg-white/5 border border-white/10 rounded-xl">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#0d1117] z-10">
            <tr className="text-left text-xs text-white/40 border-b border-white/10">
              <th className="py-2 px-3 whitespace-nowrap">SKU</th>
              <th className="py-2 px-2 whitespace-nowrap">Estado</th>
              {fields.map((f) => (
                <>
                  <th key={`si-${f.label}`} className="py-2 px-3 whitespace-nowrap text-blue-400/70">{f.label} Inv.</th>
                  <th key={`wb-${f.label}`} className="py-2 px-3 whitespace-nowrap text-green-400/70">{f.label} Web</th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={2 + fields.length * 2} className="py-8 text-center text-white/30">Sin resultados</td></tr>
            ) : filtered.map((row, i) => {
              const isDiff     = row.type === "matched" && (row as Extract<UnifiedRow, { type: "matched" }>).diffFields.size > 0;
              const decision   = row.type === "extra" ? decisions[row.key] : null;
              const statusKey  = decision ?? (row.type === "matched" && isDiff ? "diff" : row.type);
              const { label: stLabel, cls: stCls } = STATUS[statusKey];
              const isHandled  = !!decision;
              const skuColor   = decision === "quitado" ? "text-red-400/50"
                               : decision === "mantener" ? "text-blue-300"
                               : row.type === "missing" ? "text-red-300"
                               : row.type === "extra"   ? "text-yellow-300"
                               : "text-white/80";

              return (
                <tr key={i} className={`border-b border-white/5 hover:bg-white/5 ${isHandled ? "opacity-50" : ""}`}>
                  <td className={`py-2 px-3 font-mono whitespace-nowrap ${skuColor}`}>{row.key}</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${stCls}`}>{stLabel}</span>
                      {row.type === "extra" && !decision && (
                        <>
                          <button
                            onClick={() => setDecision(row.key, "quitado")}
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-red-900/20 text-red-400/70 border-red-500/20 hover:bg-red-900/40 hover:text-red-300 transition"
                          >
                            ✕ quitar
                          </button>
                          <button
                            onClick={() => setDecision(row.key, "mantener")}
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-blue-900/20 text-blue-400/70 border-blue-500/20 hover:bg-blue-900/40 hover:text-blue-300 transition"
                          >
                            ✓ mantener
                          </button>
                        </>
                      )}
                      {row.type === "extra" && decision && (
                        <button
                          onClick={() => setDecision(row.key, decision)}
                          className="text-[10px] px-1.5 py-0.5 rounded border bg-white/5 text-white/25 border-white/10 hover:text-white/50 transition"
                        >
                          ↩
                        </button>
                      )}
                    </div>
                  </td>
                  {fields.map((f) => {
                    const differs = row.type === "matched" && (row as Extract<UnifiedRow, { type: "matched" }>).diffFields.has(f.label);
                    const sv = row.type !== "extra" && f.sigaCol ? ((row as any).sigaRow[f.sigaCol] ?? "") : "";
                    const rawWv = row.type !== "missing" && f.webCol ? ((row as any).webRow[f.webCol] ?? "") : "";
                    const wv = f.label === "Precio" && mapping.webSalePrice && row.type !== "missing"
                      ? (((row as any).webRow?.[mapping.webSalePrice] ?? "").trim() || rawWv)
                      : rawWv;
                    return (
                      <>
                        <td key={`si-${f.label}`} className={`py-2 px-3 ${differs ? "text-orange-300 font-medium" : row.type === "extra" ? "text-white/20" : "text-white/70"}`}>
                          {sv || (row.type === "extra" ? "—" : "")}
                        </td>
                        <td key={`wb-${f.label}`} className={`py-2 px-3 ${differs ? "text-orange-300/80 font-medium" : row.type === "missing" ? "text-white/20" : "text-white/50"}`}>
                          {wv || (row.type === "missing" ? "—" : "")}
                        </td>
                      </>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
