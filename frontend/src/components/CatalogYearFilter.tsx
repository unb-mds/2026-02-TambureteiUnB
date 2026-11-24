"use client";

import React from "react";
import type { CatalogYearSelection } from "@/utils/catalogYearFilter";

interface CatalogYearFilterProps {
  years: number[];
  selectedYear: CatalogYearSelection;
  onChange: (year: CatalogYearSelection) => void;
  allLabel?: string;
  description?: string;
}

export default function CatalogYearFilter({
  years,
  selectedYear,
  onChange,
  allLabel = "Mais recente",
  description,
}: CatalogYearFilterProps) {
  if (years.length === 0) {
    return null;
  }

  const activeText =
    selectedYear === "all"
      ? description || `Exibindo os dados de referência mais recentes disponíveis (${years[0]})`
      : `Filtrando indicadores e exportação para o ano de ${selectedYear}`;

  return (
    <div className="mb-5 rounded-2xl border border-[#E8E6F8] bg-white px-4 py-3.5 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#EDE9FD] text-[#5B4BDB]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Ano dos indicadores
            </span>
            <p className="text-xs text-gray-600">{activeText}</p>
          </div>
        </div>

        <div
          role="group"
          aria-label="Filtrar indicadores por ano"
          className="flex flex-wrap items-center gap-1.5"
        >
          <button
            type="button"
            aria-pressed={selectedYear === "all"}
            onClick={() => onChange("all")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              selectedYear === "all"
                ? "bg-[#5B4BDB] text-white shadow-xs"
                : "bg-[#F7F7FA] text-gray-600 border border-[#E8E6F8] hover:border-[#5B4BDB]/40 hover:text-[#5B4BDB]"
            }`}
          >
            {allLabel}
          </button>

          {years.map((year) => {
            const active = selectedYear === year;
            return (
              <button
                key={year}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(year)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-[#5B4BDB] text-white shadow-xs"
                    : "bg-[#F7F7FA] text-gray-600 border border-[#E8E6F8] hover:border-[#5B4BDB]/40 hover:text-[#5B4BDB]"
                }`}
              >
                {year}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
