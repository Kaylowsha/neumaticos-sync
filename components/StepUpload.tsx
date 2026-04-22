"use client";

import { useEffect, useRef, useState } from "react";
import type { ParsedFile } from "@/lib/types";
import { parseFile } from "@/lib/parsers";
import { fetchInventory, saveInventory } from "@/lib/inventoryApi";
import InventoryEditor from "./InventoryEditor";

interface Props {
  onDone: (siga: ParsedFile, web: ParsedFile) => void;
}

type WebStatus = "publish" | "draft";

interface WebEntry {
  parsed: ParsedFile;
  status: WebStatus;
}

function mergeWebEntries(entries: WebEntry[]): ParsedFile {
  const allHeaders = [...new Set(entries.flatMap((e) => e.parsed.headers))];
  const allRows = entries.flatMap((e) =>
    e.parsed.rows.map((row) => ({ ...row, post_status: e.status }))
  );
  return { rows: allRows, headers: allHeaders, fileName: entries.map((e) => e.parsed.fileName).join(" + ") };
}

export default function StepUpload({ onDone }: Props) {
  const [sigaFile, setSigaFile]   = useState<ParsedFile | null>(null);
  const [webEntries, setWebEntries] = useState<WebEntry[]>([]);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [dbLoading, setDbLoading] = useState(true);

  const sigaRef = useRef<HTMLInputElement>(null);
  const webRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInventory().then((inv) => {
      if (inv) setSigaFile(inv);
      setDbLoading(false);
    });
  }, []);

  async function handleSigaFile(file: File) {
    setError("");
    setLoading(true);
    try {
      const parsed = await parseFile(file);
      await saveInventory(parsed);
      setSigaFile(parsed);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al leer el archivo");
    } finally {
      setLoading(false);
    }
  }

  async function handleWebFile(file: File) {
    if (webEntries.length >= 2) return;
    setError("");
    setLoading(true);
    try {
      const parsed = await parseFile(file);
      // guess status from filename
      const name = file.name.toLowerCase();
      const status: WebStatus = name.includes("borrador") || name.includes("draft") ? "draft" : "publish";
      setWebEntries((prev) => [...prev, { parsed, status }]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al leer el archivo");
    } finally {
      setLoading(false);
    }
  }

  function removeWebEntry(idx: number) {
    setWebEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  function setWebEntryStatus(idx: number, status: WebStatus) {
    setWebEntries((prev) => prev.map((e, i) => i === idx ? { ...e, status } : e));
  }

  function onDropSiga(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleSigaFile(file);
  }

  function onDropWeb(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    for (const f of files.slice(0, 2 - webEntries.length)) handleWebFile(f);
  }

  async function handleEditorSave(updated: ParsedFile) {
    await saveInventory(updated);
    setSigaFile(updated);
    setShowEditor(false);
  }

  function handleReplace() {
    setSigaFile(null);
    setTimeout(() => sigaRef.current?.click(), 50);
  }

  function handleContinue() {
    if (!sigaFile || webEntries.length === 0) return;
    const merged = webEntries.length === 1 ? mergeWebEntries(webEntries) : mergeWebEntries(webEntries);
    onDone(sigaFile, merged);
  }

  if (dbLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-white/40">
        <div className="w-6 h-6 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm">Conectando con la base de datos…</p>
      </div>
    );
  }

  return (
    <>
      {showEditor && sigaFile && (
        <InventoryEditor
          inventory={sigaFile}
          onSave={handleEditorSave}
          onClose={() => setShowEditor(false)}
        />
      )}

      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* SIGA */}
          {sigaFile ? (
            <div className="border-2 border-blue-500/50 bg-blue-900/10 rounded-xl p-6 flex flex-col items-center gap-3">
              <div className="text-3xl">✅</div>
              <div className="text-center">
                <p className="font-semibold text-white">Inventario SIGA</p>
                <p className="text-xs text-blue-300 mt-1 font-mono">{sigaFile.rows.length} productos guardados</p>
                <p className="text-xs text-white/30 mt-1">{sigaFile.fileName}</p>
              </div>
              <div className="flex gap-2 mt-1">
                <button onClick={() => setShowEditor(true)} className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-medium transition">
                  ✏️ Editar inventario
                </button>
                <button onClick={handleReplace} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-xs transition">
                  🔄 Reemplazar CSV
                </button>
              </div>
              <input ref={sigaRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSigaFile(f); e.target.value = ""; }} />
            </div>
          ) : (
            <DropZone
              label="Archivo SIGA"
              sublabel="Excel (.xlsx) o CSV exportado de SIGA"
              accept=".xlsx,.xls,.csv"
              inputRef={sigaRef}
              hasFile={false}
              color="blue"
              onDrop={onDropSiga}
              onChange={handleSigaFile}
            />
          )}

          {/* Web — multi-archivo */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-white/70">Archivo Web (WooCommerce)</p>

            {webEntries.length === 0 && (
              <DropZone
                label="CSV de WooCommerce"
                sublabel="Podés subir hasta 2 archivos"
                accept=".csv"
                inputRef={webRef}
                hasFile={false}
                color="green"
                onDrop={onDropWeb}
                onChange={handleWebFile}
              />
            )}

            {webEntries.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-green-900/20 border border-green-500/40 rounded-xl px-4 py-3">
                <span className="text-green-400 text-lg">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-mono truncate">{entry.parsed.fileName}</p>
                  <p className="text-xs text-white/40">{entry.parsed.rows.length} filas</p>
                </div>
                <div className="flex rounded-lg overflow-hidden border border-white/20 shrink-0">
                  {([["publish", "Publicado"], ["draft", "Borrador"]] as [WebStatus, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setWebEntryStatus(idx, val)}
                      className={`px-2.5 py-1 text-xs font-medium transition ${
                        entry.status === val ? "bg-green-600 text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button onClick={() => removeWebEntry(idx)} className="text-white/30 hover:text-red-400 transition text-lg leading-none ml-1">✕</button>
              </div>
            ))}

            {webEntries.length > 0 && webEntries.length < 2 && (
              <button
                onClick={() => webRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-white/20 text-white/40 hover:border-white/40 hover:text-white/60 text-sm transition"
              >
                <span>+</span> Agregar otro archivo
              </button>
            )}

            {webEntries.length > 0 && webEntries.length < 2 && (
              <input ref={webRef} type="file" accept=".csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleWebFile(f); e.target.value = ""; }} />
            )}
            {webEntries.length === 0 && (
              <input ref={webRef} type="file" accept=".csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleWebFile(f); e.target.value = ""; }} />
            )}

            {webEntries.length > 0 && (
              <p className="text-xs text-white/30 text-center">
                Total: {webEntries.reduce((s, e) => s + e.parsed.rows.length, 0)} productos web
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-500 rounded-lg px-4 py-3 text-red-300 text-sm">{error}</div>
        )}

        <button
          disabled={!sigaFile || webEntries.length === 0 || loading}
          onClick={handleContinue}
          className="w-full py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {loading ? "Leyendo archivo…" : "Continuar →"}
        </button>
      </div>
    </>
  );
}

function DropZone({
  label, sublabel, accept, inputRef, hasFile, color, onDrop, onChange,
}: {
  label: string; sublabel: string; accept: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  hasFile: boolean; color: "blue" | "green";
  onDrop: (e: React.DragEvent) => void;
  onChange: (f: File) => void;
}) {
  const ring = color === "blue" ? "border-blue-500 bg-blue-900/20" : "border-green-500 bg-green-900/20";
  const idle = "border-white/20 bg-white/5 hover:border-white/40";
  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 transition ${hasFile ? ring : idle}`}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = ""; }} />
      <div className="text-3xl">{hasFile ? "✅" : "📂"}</div>
      <div className="text-center">
        <p className="font-semibold text-white">{label}</p>
        <p className="text-xs text-white/50 mt-1">{sublabel}</p>
        <p className="text-xs text-white/40 mt-2">Arrastrá acá o hacé click</p>
      </div>
    </div>
  );
}
