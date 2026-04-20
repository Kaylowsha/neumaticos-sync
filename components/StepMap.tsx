"use client";

import { useEffect, useState } from "react";
import type { ColumnMapping, ParsedFile } from "@/lib/types";
import { guessColumn, guessKeyColumn } from "@/lib/parsers";

interface Props {
  siga: ParsedFile;
  web: ParsedFile;
  onDone: (mapping: ColumnMapping) => void;
  onBack: () => void;
}

export default function StepMap({ siga, web, onDone, onBack }: Props) {
  const [mapping, setMapping] = useState<ColumnMapping>(() => ({
    sigaKey: guessKeyColumn(siga.headers, true),
    webKey: guessKeyColumn(web.headers, false),
    sigaDesc: guessColumn(siga.headers, ["Descripción", "Descripcion", "Nombre", "Name"]),
    webDesc: guessColumn(web.headers, ["post_title", "Name", "Nombre", "Descripción"]),
    sigaPrice: guessColumn(siga.headers, ["Precio Lista (c/IVA)", "Precio", "Price"]),
    webPrice: guessColumn(web.headers, ["regular_price", "Regular price", "Price", "Precio"]),
    sigaStock: guessColumn(siga.headers, ["Stock Total", "Stock", "Cantidad"]),
    webStock: guessColumn(web.headers, ["stock", "Stock", "stock_quantity", "Quantity"]),
    sigaBrand: guessColumn(siga.headers, ["Marca", "Brand"]),
  }));

  const set = (key: keyof ColumnMapping, val: string) =>
    setMapping((prev) => ({ ...prev, [key]: val }));

  const canContinue = mapping.sigaKey && mapping.webKey;

  return (
    <div className="space-y-6">
      <p className="text-white/60 text-sm">
        Revisá que las columnas estén bien asignadas. Las columnas <span className="text-white font-medium">Clave</span> son las que se usan para comparar (ej: código interno vs SKU).
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <ColumnCard title="Columnas SIGA" color="blue">
          <Field label="Clave (comparación) *" value={mapping.sigaKey} headers={siga.headers} onChange={(v) => set("sigaKey", v)} />
          <Field label="Descripción" value={mapping.sigaDesc ?? ""} headers={["(ninguna)", ...siga.headers]} onChange={(v) => set("sigaDesc", v)} />
          <Field label="Precio" value={mapping.sigaPrice ?? ""} headers={["(ninguna)", ...siga.headers]} onChange={(v) => set("sigaPrice", v)} />
          <Field label="Stock" value={mapping.sigaStock ?? ""} headers={["(ninguna)", ...siga.headers]} onChange={(v) => set("sigaStock", v)} />
          <Field label="Marca" value={mapping.sigaBrand ?? ""} headers={["(ninguna)", ...siga.headers]} onChange={(v) => set("sigaBrand", v)} />
        </ColumnCard>

        <ColumnCard title="Columnas Web (WooCommerce)" color="green">
          <Field label="Clave (comparación) *" value={mapping.webKey} headers={web.headers} onChange={(v) => set("webKey", v)} />
          <Field label="Nombre" value={mapping.webDesc ?? ""} headers={["(ninguna)", ...web.headers]} onChange={(v) => set("webDesc", v)} />
          <Field label="Precio" value={mapping.webPrice ?? ""} headers={["(ninguna)", ...web.headers]} onChange={(v) => set("webPrice", v)} />
          <Field label="Stock" value={mapping.webStock ?? ""} headers={["(ninguna)", ...web.headers]} onChange={(v) => set("webStock", v)} />
        </ColumnCard>
      </div>

      <PreviewRow siga={siga} web={web} mapping={mapping} />

      <div className="flex gap-3">
        <button onClick={onBack} className="px-6 py-3 rounded-xl font-semibold text-white/70 bg-white/10 hover:bg-white/20 transition">
          ← Volver
        </button>
        <button
          disabled={!canContinue}
          onClick={() => onDone(mapping)}
          className="flex-1 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Comparar inventarios →
        </button>
      </div>
    </div>
  );
}

function ColumnCard({ title, color, children }: { title: string; color: "blue" | "green"; children: React.ReactNode }) {
  const border = color === "blue" ? "border-blue-500/30" : "border-green-500/30";
  const header = color === "blue" ? "text-blue-400" : "text-green-400";
  return (
    <div className={`bg-white/5 border ${border} rounded-xl p-4 space-y-3`}>
      <h3 className={`font-semibold text-sm ${header}`}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, headers, onChange }: { label: string; value: string; headers: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-white/50 w-32 shrink-0">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-white/50"
      >
        {headers.map((h) => (
          <option key={h} value={h === "(ninguna)" ? "" : h}>
            {h}
          </option>
        ))}
      </select>
    </div>
  );
}

function PreviewRow({ siga, web, mapping }: { siga: ParsedFile; web: ParsedFile; mapping: ColumnMapping }) {
  const sr = siga.rows[0];
  const wr = web.rows[0];
  if (!sr || !wr) return null;
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-xs text-white/40 mb-2 font-medium uppercase tracking-wide">Vista previa — primera fila de cada archivo</p>
      <div className="grid md:grid-cols-2 gap-4 text-xs font-mono">
        <div>
          <p className="text-blue-400 mb-1">SIGA</p>
          <p><span className="text-white/40">clave:</span> <span className="text-white">{sr[mapping.sigaKey] ?? "—"}</span></p>
          {mapping.sigaDesc && <p><span className="text-white/40">desc:</span> <span className="text-white">{sr[mapping.sigaDesc] ?? "—"}</span></p>}
          {mapping.sigaPrice && <p><span className="text-white/40">precio:</span> <span className="text-white">{sr[mapping.sigaPrice] ?? "—"}</span></p>}
          {mapping.sigaStock && <p><span className="text-white/40">stock:</span> <span className="text-white">{sr[mapping.sigaStock] ?? "—"}</span></p>}
        </div>
        <div>
          <p className="text-green-400 mb-1">Web</p>
          <p><span className="text-white/40">clave:</span> <span className="text-white">{wr[mapping.webKey] ?? "—"}</span></p>
          {mapping.webDesc && <p><span className="text-white/40">nombre:</span> <span className="text-white">{wr[mapping.webDesc] ?? "—"}</span></p>}
          {mapping.webPrice && <p><span className="text-white/40">precio:</span> <span className="text-white">{wr[mapping.webPrice] ?? "—"}</span></p>}
          {mapping.webStock && <p><span className="text-white/40">stock:</span> <span className="text-white">{wr[mapping.webStock] ?? "—"}</span></p>}
        </div>
      </div>
    </div>
  );
}
