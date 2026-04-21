"use client";

import { useState } from "react";
import StepUpload from "@/components/StepUpload";
import StepMap from "@/components/StepMap";
import StepResults from "@/components/StepResults";
import type { ColumnMapping, ComparisonResult, ParsedFile } from "@/lib/types";
import { compare } from "@/lib/comparison";

type Step = "upload" | "map" | "results";

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [siga, setSiga] = useState<ParsedFile | null>(null);
  const [web, setWeb] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  function handleUploadDone(s: ParsedFile, w: ParsedFile) {
    setSiga(s);
    setWeb(w);
    setStep("map");
  }

  function handleMapDone(m: ColumnMapping) {
    setMapping(m);
    const res = compare(siga!.rows, web!.rows, m);
    setResult(res);
    setStep("results");
  }

  function reset() {
    setSiga(null);
    setWeb(null);
    setMapping(null);
    setResult(null);
    setStep("upload");
  }

  const steps = [
    { id: "upload", label: "1. Subir archivos" },
    { id: "map", label: "2. Mapear columnas" },
    { id: "results", label: "3. Resultados" },
  ];

  const isResults = step === "results";

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header — siempre centrado */}
      <div className="max-w-4xl mx-auto w-full px-4 pt-6 space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Sincronización de Inventario</h1>
          <p className="text-white/40 text-sm">Compará el inventario de SIGA con los productos de la web</p>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full ${
                step === s.id
                  ? "bg-blue-600 text-white"
                  : (step === "results" && s.id !== "results") || (step === "map" && s.id === "upload")
                  ? "bg-white/20 text-white/60"
                  : "bg-white/10 text-white/30"
              }`}>
                {s.label}
              </span>
              {i < steps.length - 1 && <span className="text-white/20">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Content — ancho completo en resultados, centrado en los otros pasos */}
      <div className={`flex-1 px-4 py-4 pb-8 ${isResults ? "w-full" : "max-w-4xl mx-auto w-full"}`}>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6">
          {step === "upload" && <StepUpload onDone={handleUploadDone} />}
          {step === "map" && siga && web && (
            <StepMap siga={siga} web={web} onDone={handleMapDone} onBack={() => setStep("upload")} />
          )}
          {step === "results" && result && mapping && (
            <StepResults result={result} mapping={mapping} onBack={() => setStep("map")} onReset={reset} />
          )}
        </div>
      </div>

      <p className="text-center text-xs text-white/20 pb-4">
        Todo se procesa localmente en tu navegador — ningún archivo se sube a internet.
      </p>
    </main>
  );
}
