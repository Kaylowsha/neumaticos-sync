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
type TipoFilter = "todos" | "missing" | "extra" | "diff" | "ok";

interface ModalData {
  row: UnifiedRow;
  excerpt: string;
  content: string;
}

function CopyBlock({ label, value, placeholder }: { label: string; value: string; placeholder?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">{label}</span>
        {value ? (
          <button
            onClick={copy}
            className={`text-xs px-2.5 py-1 rounded-lg border transition font-medium ${
              copied ? "bg-green-700 border-green-500 text-white" : "bg-white/10 border-white/20 text-white/50 hover:text-white hover:border-white/40"
            }`}
          >
            {copied ? "✓ Copiado" : "Copiar"}
          </button>
        ) : null}
      </div>
      <div className={`rounded-lg px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap min-h-[48px] ${value ? "bg-white/[0.06] text-white/80 border border-white/10" : "bg-white/[0.03] text-white/25 border border-dashed border-white/10 italic"}`}>
        {value || (placeholder ?? "Sin contenido")}
      </div>
    </div>
  );
}

function loadSuggestions(): Record<string, { excerpt: string; content: string }> {
  try { return JSON.parse(localStorage.getItem("desc-suggestions") ?? "{}"); }
  catch { return {}; }
}

function ProductModal({ data, mapping, onClose }: { data: ModalData; mapping: ColumnMapping; onClose: () => void }) {
  const { row, excerpt, content } = data;
  const webRow = row.type !== "missing" ? (row as any).webRow as Record<string, string> : null;
  const sigaRow = row.type !== "extra" ? (row as any).sigaRow as Record<string, string> : null;

  const suggestions = loadSuggestions();
  const suggested = suggestions[row.key] ?? null;

  const title = webRow?.[mapping.webDesc ?? ""] ?? sigaRow?.[mapping.sigaDesc ?? ""] ?? row.key;
  const status = (webRow?.["post_status"] ?? "").toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#0d1117] border border-white/15 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-white/10 sticky top-0 bg-[#0d1117] z-10">
          <div>
            <p className="text-xs text-white/30 font-mono mb-0.5">SKU {row.key}</p>
            <h2 className="text-base font-semibold text-white leading-snug">{title}</h2>
            {status && <span className={`text-[10px] font-medium mt-1 inline-block px-2 py-0.5 rounded-full ${status.includes("publish") ? "bg-green-900/40 text-green-300" : "bg-yellow-900/40 text-yellow-300"}`}>{status.includes("publish") ? "Publicado" : "Borrador"}</span>}
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white text-xl leading-none ml-4 mt-0.5">✕</button>
        </div>

        {/* Datos */}
        <div className="px-6 py-4 space-y-5">
          {/* Precios / stock side by side */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Precio Inv.", val: sigaRow?.[mapping.sigaPrice ?? ""] ?? "" },
              { label: "Precio Web", val: webRow?.[mapping.webSalePrice ?? ""] || webRow?.[mapping.webPrice ?? ""] || "" },
              { label: "Stock Inv.", val: sigaRow?.[mapping.sigaStock ?? ""] ?? "" },
              { label: "Stock Web", val: webRow?.[mapping.webStock ?? ""] ?? "" },
            ].map(({ label, val }) => val ? (
              <div key={label} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                <p className="text-[10px] text-white/30 mb-0.5">{label}</p>
                <p className="text-sm font-mono text-white/80">{val}</p>
              </div>
            ) : null)}
          </div>

          {/* Descripciones actuales en web */}
          <div>
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-2">Estado actual en web</p>
            <CopyBlock label="Descripción corta (post_excerpt)" value={excerpt} placeholder="Sin descripción corta en web" />
            <div className="mt-3">
              <CopyBlock label="Descripción completa (post_content)" value={content} placeholder="Sin descripción completa en web" />
            </div>
          </div>

          {/* Descripciones sugeridas */}
          {suggested && (
            <div className="border-t border-white/10 pt-4">
              <p className="text-[11px] font-semibold text-purple-400/70 uppercase tracking-widest mb-2">Descripciones sugeridas (para copiar a WooCommerce)</p>
              <CopyBlock label="Descripción corta sugerida" value={suggested.excerpt} placeholder="Sin sugerencia" />
              <div className="mt-3">
                <CopyBlock label="Descripción completa sugerida" value={suggested.content} placeholder="Sin sugerencia" />
              </div>
            </div>
          )}
          {!suggested && !excerpt && !content && (
            <p className="text-xs text-white/30 italic text-center py-2">Cargá el CSV de descripciones sugeridas en el paso 1 para ver las generadas aquí</p>
          )}
        </div>
      </div>
    </div>
  );
}

function getRowName(row: UnifiedRow, mapping: ColumnMapping): string {
  if (row.type === "extra") return mapping.webDesc ? (row.webRow[mapping.webDesc] ?? "") : "";
  return mapping.sigaDesc ? (row.sigaRow[mapping.sigaDesc] ?? "") : "";
}

function getWebStatus(row: UnifiedRow): string {
  if (row.type === "missing") return "";
  return (row.webRow["post_status"] ?? "").toLowerCase();
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

function loadDifsCorrections(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem("difs-corrections") ?? "{}"); }
  catch { return {}; }
}

function loadReadyKeys(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem("ready-keys") ?? "[]")); }
  catch { return new Set(); }
}

function descCount(webRow: Record<string, string> | null): 0 | 1 | 2 {
  if (!webRow) return 0;
  const exc = (webRow["post_excerpt"] ?? "").trim();
  const con = (webRow["post_content"] ?? "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, "").trim();
  return (exc ? 1 : 0) + (con ? 1 : 0) as 0 | 1 | 2;
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
  missing:    { label: "FALTA",     cls: "bg-red-900/40 text-red-300 border-red-500/30" },
  extra:      { label: "SOBRA",     cls: "bg-yellow-900/40 text-yellow-300 border-yellow-500/30" },
  matched:    { label: "OK",        cls: "bg-green-900/30 text-green-400 border-green-500/30" },
  diff:       { label: "DIFS",      cls: "bg-orange-900/40 text-orange-300 border-orange-500/30" },
  quitado:    { label: "QUITADO",   cls: "bg-red-900/30 text-red-400/70 border-red-500/20" },
  mantener:   { label: "MANTENER",  cls: "bg-blue-900/40 text-blue-300 border-blue-500/30" },
  corregido:  { label: "CORREGIDO", cls: "bg-green-900/30 text-green-400/70 border-green-500/20" },
};

const TIPO_BTNS: { val: TipoFilter; label: string }[] = [
  { val: "todos",   label: "Todos" },
  { val: "missing", label: "Faltan" },
  { val: "extra",   label: "Sobran" },
  { val: "diff",    label: "DIFS" },
  { val: "ok",      label: "Coinciden" },
];

export default function StepResults({ result, mapping, onBack, onReset }: Props) {
  const [skuFilter, setSkuFilter]         = useState("");
  const [medidaFilter, setMedidaFilter]   = useState("");
  const [aroSel, setAroSel]               = useState<Set<string>>(new Set());
  const [perfilSel, setPerfilSel]         = useState<Set<string>>(new Set());
  const [anchoSel, setAnchoSel]           = useState<Set<string>>(new Set());
  const [estadoWeb, setEstadoWeb]         = useState<"todos" | "publicado" | "borrador">("todos");
  const [tipoFilter, setTipoFilter]       = useState<TipoFilter>("todos");
  const [decisions, setDecisions]         = useState<Record<string, ExtraDecision>>(loadDecisions);
  const [difsCorrections, setDifsCorr]   = useState<Record<string, string[]>>(loadDifsCorrections);
  const [modalData, setModalData]         = useState<ModalData | null>(null);
  const [readyKeys, setReadyKeys]         = useState<Set<string>>(loadReadyKeys);

  function toggleReady(key: string, e: React.MouseEvent) {
    e.stopPropagation();
    setReadyKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      localStorage.setItem("ready-keys", JSON.stringify([...next]));
      return next;
    });
  }

  function setDecision(key: string, decision: ExtraDecision) {
    setDecisions((prev) => {
      const next = { ...prev };
      if (next[key] === decision) delete next[key];
      else next[key] = decision;
      localStorage.setItem("extra-decisions", JSON.stringify(next));
      return next;
    });
  }

  function toggleCorrection(key: string, field: string) {
    setDifsCorr((prev) => {
      const current = prev[key] ?? [];
      const next = { ...prev };
      if (current.includes(field)) {
        next[key] = current.filter((f) => f !== field);
        if (next[key].length === 0) delete next[key];
      } else {
        next[key] = [...current, field];
      }
      localStorage.setItem("difs-corrections", JSON.stringify(next));
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

  const fields: { label: string; sigaCol?: string; webCol?: string }[] = [
    { label: "Nombre", sigaCol: mapping.sigaDesc,  webCol: mapping.webDesc  },
    { label: "Precio", sigaCol: mapping.sigaPrice, webCol: mapping.webPrice },
    { label: "Stock",  sigaCol: mapping.sigaStock, webCol: mapping.webStock },
  ].filter((f) => f.sigaCol || f.webCol);

  // Contadores dinámicos
  const extraRows = allRows.filter((r) => r.type === "extra");
  const sobraPendiente = extraRows.filter((r) => !decisions[r.key]).length;
  const sobraQuitados  = extraRows.filter((r) => decisions[r.key] === "quitado").length;
  const sobraMantener  = extraRows.filter((r) => decisions[r.key] === "mantener").length;

  const difRows = allRows.filter((r) => r.type === "matched" && (r as Extract<UnifiedRow, {type:"matched"}>).diffFields.size > 0);
  const difCorregidos = difRows.filter((r) => {
    const matched = r as Extract<UnifiedRow, {type:"matched"}>;
    const corrected = difsCorrections[r.key] ?? [];
    return [...matched.diffFields].every((f) => {
      // map diffField (sigaCol name) to label
      const fieldLabel = fields.find((fl) => fl.sigaCol === f || fl.webCol === f || fl.label.toLowerCase() === f.toLowerCase())?.label ?? f;
      return corrected.includes(fieldLabel);
    });
  }).length;
  const difPendiente = difRows.length - difCorregidos;

  const summaryCards = [
    { label: "Faltan en web",      count: result.missingOnWeb.length,                                color: "text-red-400",    sub: null },
    { label: "Sobran — pendiente", count: sobraPendiente,                                            color: "text-yellow-400", sub: `${sobraQuitados} quitar · ${sobraMantener} mantener` },
    { label: "Con diferencias",    count: difPendiente,                                              color: "text-orange-400", sub: difCorregidos > 0 ? `${difCorregidos} corregidos` : null },
    { label: "Coinciden",          count: result.allMatched.length - result.withDifferences.length,  color: "text-green-400",  sub: null },
  ];

  const filtered = useMemo(() => {
    return allRows.filter((row) => {
      // tipo filter
      if (tipoFilter !== "todos") {
        const isDiff = row.type === "matched" && (row as Extract<UnifiedRow, {type:"matched"}>).diffFields.size > 0;
        if (tipoFilter === "missing" && row.type !== "missing") return false;
        if (tipoFilter === "extra"   && row.type !== "extra")   return false;
        if (tipoFilter === "diff"    && !(row.type === "matched" && isDiff)) return false;
        if (tipoFilter === "ok"      && !(row.type === "matched" && !isDiff)) return false;
      }

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
  }, [allRows, skuFilter, medidaFilter, aroSel, perfilSel, anchoSel, estadoWeb, tipoFilter, mapping]);

  const estadoBtns: { val: typeof estadoWeb; label: string }[] = [
    { val: "todos",     label: "Todos" },
    { val: "publicado", label: "Publicados" },
    { val: "borrador",  label: "Borradores" },
  ];

  return (
    <>
    {modalData && <ProductModal data={modalData} mapping={mapping} onClose={() => setModalData(null)} />}
    <div className="space-y-4">
      {/* Summary — clicables para filtrar por tipo */}
      <div className="grid grid-cols-4 gap-2">
        {summaryCards.map((c, i) => {
          const tipoVal: TipoFilter = (["missing","extra","diff","ok"] as TipoFilter[])[i];
          const isActive = tipoFilter === tipoVal;
          return (
            <button
              key={c.label}
              onClick={() => setTipoFilter(isActive ? "todos" : tipoVal)}
              className={`bg-white/5 border rounded-xl p-3 text-center transition ${isActive ? "border-white/40 ring-1 ring-white/20" : "border-white/10 hover:border-white/25"}`}
            >
              <p className={`text-2xl font-bold ${c.color}`}>{c.count}</p>
              <p className="text-xs text-white/40 mt-1">{c.label}</p>
              {c.sub && <p className="text-[10px] text-white/25 mt-0.5">{c.sub}</p>}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
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
          {/* Filtro tipo */}
          <div className="flex rounded-lg overflow-hidden border border-white/20">
            {TIPO_BTNS.map((b) => (
              <button
                key={b.val}
                onClick={() => setTipoFilter(b.val)}
                className={`px-3 py-1.5 text-xs font-medium transition ${
                  tipoFilter === b.val ? "bg-blue-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          {/* Filtro publicado/borrador */}
          <div className="flex rounded-lg overflow-hidden border border-white/20">
            {estadoBtns.map((b) => (
              <button
                key={b.val}
                onClick={() => setEstadoWeb(b.val)}
                className={`px-3 py-1.5 text-xs font-medium transition ${
                  estadoWeb === b.val ? "bg-indigo-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
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
              const matched   = row.type === "matched" ? row as Extract<UnifiedRow, {type:"matched"}> : null;
              const isDiff    = !!matched && matched.diffFields.size > 0;
              const decision  = row.type === "extra" ? decisions[row.key] : null;
              const corrected = difsCorrections[row.key] ?? [];

              // para DIFS: ¿están todos los campos corregidos?
              const allCorrected = isDiff && matched
                ? [...matched.diffFields].every((f) => {
                    const lbl = fields.find((fl) => fl.sigaCol === f || fl.webCol === f)?.label ?? f;
                    return corrected.includes(lbl);
                  })
                : false;

              const statusKey = decision ?? (allCorrected ? "corregido" : isDiff ? "diff" : row.type);
              const { label: stLabel, cls: stCls } = STATUS[statusKey];
              const isHandled = !!decision || allCorrected;
              const skuColor  = decision === "quitado" ? "text-red-400/50"
                              : decision === "mantener" ? "text-blue-300"
                              : allCorrected ? "text-green-400/50"
                              : row.type === "missing" ? "text-red-300"
                              : row.type === "extra"   ? "text-yellow-300"
                              : "text-white/80";

              const webRow = row.type !== "missing" ? (row as any).webRow as Record<string, string> : null;
              const excerpt = webRow?.["post_excerpt"]?.trim() ?? "";
              const content = (webRow?.["post_content"] ?? "").replace(/<[^>]+>|&nbsp;/g, " ").replace(/\s+/g, " ").trim();
              const dc = descCount(webRow);
              const isReady = readyKeys.has(row.key) || dc === 2;

              return (
                <>
                <tr
                  key={i}
                  onClick={() => setModalData({ row, excerpt, content })}
                  className={`border-b border-white/5 hover:bg-white/5 cursor-pointer ${(isHandled || isReady) ? "opacity-50" : ""}`}
                >
                  <td className={`py-2 px-3 font-mono whitespace-nowrap ${skuColor}`}>{row.key}</td>
                  <td className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${stCls}`}>{stLabel}</span>

                      {/* Badge descripciones */}
                      {webRow && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          isReady
                            ? "bg-green-900/30 text-green-400 border-green-500/30"
                            : dc === 1
                            ? "bg-yellow-900/30 text-yellow-400 border-yellow-500/30"
                            : "bg-red-900/20 text-red-400/70 border-red-500/20"
                        }`}>
                          {isReady ? "✓ LISTO" : `${dc}/2`}
                        </span>
                      )}

                      {/* Botón Listo manual (solo si no está auto-marcado) */}
                      {webRow && !isReady && (
                        <button
                          onClick={(e) => toggleReady(row.key, e)}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-green-900/10 text-green-400/50 border-green-500/20 hover:bg-green-900/30 hover:text-green-300 transition"
                        >
                          Listo
                        </button>
                      )}
                      {webRow && readyKeys.has(row.key) && dc < 2 && (
                        <button
                          onClick={(e) => toggleReady(row.key, e)}
                          className="text-[10px] px-1.5 py-0.5 rounded border bg-white/5 text-white/25 border-white/10 hover:text-white/50 transition"
                        >↩</button>
                      )}

                      {/* SOBRA: botones quitar/mantener */}
                      {row.type === "extra" && !decision && (
                        <>
                          <button onClick={() => setDecision(row.key, "quitado")}
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-red-900/20 text-red-400/70 border-red-500/20 hover:bg-red-900/40 hover:text-red-300 transition">
                            ✕ quitar
                          </button>
                          <button onClick={() => setDecision(row.key, "mantener")}
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-blue-900/20 text-blue-400/70 border-blue-500/20 hover:bg-blue-900/40 hover:text-blue-300 transition">
                            ✓ mantener
                          </button>
                        </>
                      )}
                      {row.type === "extra" && decision && (
                        <button onClick={() => setDecision(row.key, decision)}
                          className="text-[10px] px-1.5 py-0.5 rounded border bg-white/5 text-white/25 border-white/10 hover:text-white/50 transition">
                          ↩
                        </button>
                      )}

                      {/* DIFS: botón por campo diferente */}
                      {isDiff && matched && fields.map((f) => {
                        if (!matched.diffFields.has(f.sigaCol ?? "") && !matched.diffFields.has(f.webCol ?? "") && !matched.diffFields.has(f.label)) return null;
                        const isCorrected = corrected.includes(f.label);
                        return (
                          <button
                            key={f.label}
                            onClick={() => toggleCorrection(row.key, f.label)}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition ${
                              isCorrected
                                ? "bg-green-900/30 text-green-400/70 border-green-500/20 hover:bg-green-900/50"
                                : "bg-orange-900/20 text-orange-400/70 border-orange-500/20 hover:bg-orange-900/40 hover:text-orange-300"
                            }`}
                          >
                            {isCorrected ? `✓ ${f.label}` : `✎ ${f.label}`}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  {fields.map((f) => {
                    const differs = isDiff && matched && (matched.diffFields.has(f.sigaCol ?? "") || matched.diffFields.has(f.webCol ?? "") || matched.diffFields.has(f.label));
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
</>
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
    </>
  );
}
