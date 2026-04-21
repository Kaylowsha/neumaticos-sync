"use client";

import { useEffect, useRef, useState } from "react";
import type { ParsedFile } from "@/lib/types";
import { parseFile } from "@/lib/parsers";
import { fetchInventory, saveInventory } from "@/lib/inventoryApi";
import InventoryEditor from "./InventoryEditor";

interface Props {
  onDone: (siga: ParsedFile, web: ParsedFile) => void;
}

export default function StepUpload({ onDone }: Props) {
  const [sigaFile, setSigaFile] = useState<ParsedFile | null>(null);
  const [webFile, setWebFile] = useState<ParsedFile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [dbLoading, setDbLoading] = useState(true);

  const sigaRef = useRef<HTMLInputElement>(null);
  const webRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInventory().then((inv) => {
      if (inv) setSigaFile(inv);
      setDbLoading(false);
    });
  }, []);

  async function handleFile(file: File, type: "siga" | "web") {
    setError("");
    setLoading(true);
    try {
      const parsed = await parseFile(file);
      if (type === "siga") {
        await saveInventory(parsed);
        setSigaFile(parsed);
      } else {
        setWebFile(parsed);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al leer el archivo");
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e: React.DragEvent, type: "siga" | "web") {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file, type);
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

  const sigaIsSaved = !!sigaFile;

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
          {/* SIGA — guardado o subir */}
          {sigaIsSaved ? (
            <div className="border-2 border-blue-500/50 bg-blue-900/10 rounded-xl p-6 flex flex-col items-center gap-3">
              <div className="text-3xl">✅</div>
              <div className="text-center">
                <p className="font-semibold text-white">Inventario SIGA</p>
                <p className="text-xs text-blue-300 mt-1 font-mono">
                  {sigaFile.rows.length} productos guardados
                </p>
                <p className="text-xs text-white/30 mt-1">{sigaFile.fileName}</p>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setShowEditor(true)}
                  className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-medium transition"
                >
                  ✏️ Editar inventario
                </button>
                <button
                  onClick={handleReplace}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-xs transition"
                >
                  🔄 Reemplazar CSV
                </button>
              </div>
              <input
                ref={sigaRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f, "siga"); e.target.value = ""; }}
              />
            </div>
          ) : (
            <DropZone
              label="Archivo SIGA"
              sublabel="Excel (.xlsx) o CSV exportado de SIGA"
              accept=".xlsx,.xls,.csv"
              file={null}
              inputRef={sigaRef}
              color="blue"
              onDrop={(e) => onDrop(e, "siga")}
              onChange={(f) => handleFile(f, "siga")}
            />
          )}

          <DropZone
            label="Archivo Web (WooCommerce)"
            sublabel="CSV exportado desde WooCommerce"
            accept=".csv"
            file={webFile}
            inputRef={webRef}
            color="green"
            onDrop={(e) => onDrop(e, "web")}
            onChange={(f) => handleFile(f, "web")}
          />
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-500 rounded-lg px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          disabled={!sigaFile || !webFile || loading}
          onClick={() => sigaFile && webFile && onDone(sigaFile, webFile)}
          className="w-full py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {loading ? "Leyendo archivo…" : "Continuar →"}
        </button>
      </div>
    </>
  );
}

function DropZone({
  label,
  sublabel,
  accept,
  file,
  inputRef,
  color,
  onDrop,
  onChange,
}: {
  label: string;
  sublabel: string;
  accept: string;
  file: ParsedFile | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  color: "blue" | "green";
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
      className={`cursor-pointer border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 transition ${file ? ring : idle}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
          e.target.value = "";
        }}
      />
      <div className="text-3xl">{file ? "✅" : "📂"}</div>
      <div className="text-center">
        <p className="font-semibold text-white">{label}</p>
        <p className="text-xs text-white/50 mt-1">{sublabel}</p>
        {file && (
          <p className="text-xs text-white/70 mt-2 font-mono">
            {file.fileName} — {file.rows.length} filas, {file.headers.length} columnas
          </p>
        )}
        {!file && (
          <p className="text-xs text-white/40 mt-2">Arrastrá acá o hacé click</p>
        )}
      </div>
    </div>
  );
}
