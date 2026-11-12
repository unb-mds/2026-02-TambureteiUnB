"use client";

import React, { useState } from "react";
import type { OpenDataExportResult, OpenDataFormat } from "@/types/openData";

export interface OpenDataExportBarProps {
  title: string;
  description?: string;
  recordCount: number;
  recordLabel?: string;
  disabled?: boolean;
  compact?: boolean;
  onExport: (format: OpenDataFormat) => OpenDataExportResult | void;
}

export default function OpenDataExportBar({
  title,
  description = "Conjunto de dados publicos agregados da UnB (RF06/RF13) em conformidade com a LGPD.",
  recordCount,
  recordLabel = "registros",
  disabled = false,
  compact = false,
  onExport,
}: OpenDataExportBarProps) {
  const [statusMessage, setStatusMessage] = useState<string>("");

  const handleExportClick = (format: OpenDataFormat) => {
    if (disabled || recordCount === 0) return;
    const result = onExport(format);
    const upperFormat = format.toUpperCase();
    const filenameInfo = result?.filename ? ` (${result.filename})` : "";
    setStatusMessage(
      `Exportacao em ${upperFormat} concluida com ${recordCount} ${recordLabel}${filenameInfo}.`
    );
  };

  const isExportDisabled = disabled || recordCount === 0;

  return (
    <div
      role="region"
      aria-label={`Exportacao em Dados Abertos: ${title}`}
      className={`rounded-2xl border border-[#E8E6F8] bg-white ${
        compact ? "p-3.5 sm:p-4" : "p-4 sm:p-5"
      } shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-[#EDE9FD] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#5B4BDB]">
            Dados Abertos UnB
          </span>
          <span className="text-xs font-semibold text-gray-500">
            {recordCount} {recordLabel}
          </span>
        </div>
        <h3 className="mt-1 text-sm font-bold text-[#202124]">{title}</h3>
        {!compact && (
          <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
            {description}
          </p>
        )}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={statusMessage ? "mt-1.5 text-xs font-semibold text-[#067A59]" : "sr-only"}
        >
          {statusMessage ||
            `Pronto para exportar ${recordCount} ${recordLabel} em CSV ou JSON.`}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        <button
          type="button"
          disabled={isExportDisabled}
          onClick={() => handleExportClick("csv")}
          aria-label={`Baixar ${title} em formato CSV (${recordCount} ${recordLabel})`}
          className="inline-flex items-center gap-2 rounded-xl border border-[#5B4BDB] bg-white px-3.5 py-2 text-xs font-bold text-[#5B4BDB] transition-all hover:bg-[#5B4BDB]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B4BDB] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
            />
          </svg>
          <span>Exportar CSV</span>
        </button>

        <button
          type="button"
          disabled={isExportDisabled}
          onClick={() => handleExportClick("json")}
          aria-label={`Baixar ${title} em formato JSON (${recordCount} ${recordLabel})`}
          className="inline-flex items-center gap-2 rounded-xl bg-[#5B4BDB] px-3.5 py-2 text-xs font-bold text-white transition-all hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B4BDB] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
            />
          </svg>
          <span>Exportar JSON</span>
        </button>
      </div>
    </div>
  );
}
