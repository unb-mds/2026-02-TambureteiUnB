import React from "react";
import { ClassShiftFilter, ClassSortOption } from "@/types/turma";

export const CLASS_SHIFT_OPTIONS: ClassShiftFilter[] = [
  "Todos",
  "Matutino",
  "Vespertino",
  "Noturno",
];

export const CLASS_SORT_OPTIONS: {
  value: ClassSortOption;
  label: string;
}[] = [
  { value: "code_asc", label: "Identificador (01–99 / A–Z)" },
  { value: "occupancy_asc", label: "Menor ocupação (mais vagas)" },
  { value: "occupancy_desc", label: "Maior ocupação (mais disputadas)" },
];

export interface ClassFiltersProps {
  selectedShift: ClassShiftFilter;
  onShiftChange: (shift: ClassShiftFilter) => void;
  sortBy: ClassSortOption;
  onSortChange: (sort: ClassSortOption) => void;
  totalCount: number;
  filteredCount: number;
  onResetFilters?: () => void;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  onlyWithData?: boolean;
  onOnlyWithDataChange?: (only: boolean) => void;
}

export default function ClassFilters({
  selectedShift,
  onShiftChange,
  sortBy,
  onSortChange,
  totalCount,
  filteredCount,
  onResetFilters,
  searchQuery = "",
  onSearchChange,
  onlyWithData = false,
  onOnlyWithDataChange,
}: ClassFiltersProps) {
  const hasActiveFilter =
    selectedShift !== "Todos" ||
    sortBy !== "code_asc" ||
    searchQuery.trim().length > 0 ||
    onlyWithData;

  return (
    <div
      className="mb-6 flex flex-col gap-3.5 rounded-2xl border border-[#ECEAF5] bg-[#FAFAFC] p-4"
      role="region"
      aria-label="Filtros e ordenação de turmas"
    >
      {/* Linha superior: Busca por professor/turma */}
      {onSearchChange && (
        <div className="relative w-full max-w-lg">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por professor, turma ou semestre..."
            aria-label="Buscar turma por professor, código ou semestre"
            className="w-full rounded-xl border border-[#DDD9F1] bg-white py-2 pl-9 pr-3 text-xs font-medium text-[#202124] placeholder-gray-400 outline-none transition-colors focus:border-[#5B4BDB]"
          />
        </div>
      )}

      {/* Linha inferior: Turno, Resumo e Ordenação */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      {/* Filtro por Turno */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 shrink-0">
          Turno:
        </span>
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filtrar turmas por turno"
        >
          {CLASS_SHIFT_OPTIONS.map((shift) => {
            const selected = selectedShift === shift;
            return (
              <button
                key={shift}
                type="button"
                onClick={() => onShiftChange(shift)}
                aria-pressed={selected}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  selected
                    ? "bg-[#5B4BDB] text-white shadow-xs"
                    : "bg-white text-gray-600 border border-[#E1DFEA] hover:border-[#5B4BDB]/40 hover:text-[#5B4BDB]"
                }`}
              >
                {shift}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ordenação Rápida e Resumo */}
      <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#ECEAF5]">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>
            Exibindo{" "}
            <strong className="font-bold text-[#202124]">{filteredCount}</strong>{" "}
            de <strong className="font-bold text-[#202124]">{totalCount}</strong>{" "}
            {totalCount === 1 ? "turma" : "turmas"}
          </span>
          {hasActiveFilter && onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="ml-1 font-semibold text-[#5B4BDB] hover:underline cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>

        <label className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
            Ordenar por:
          </span>
          <div className="relative w-56 sm:w-64">
            <select
              value={sortBy}
              onChange={(event) =>
                onSortChange(event.target.value as ClassSortOption)
              }
              aria-label="Ordenar lista de turmas"
              className="w-full appearance-none rounded-xl bg-white border border-[#DDD9F1] px-3.5 py-2 pr-8 text-xs font-semibold text-[#202124] outline-none transition-colors focus:border-[#5B4BDB] cursor-pointer"
            >
              {CLASS_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="#6B7280"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </label>
      </div>
    </div>

      {/* Alternador: Mostrar Apenas Com Dados */}
      {onOnlyWithDataChange && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ECEAF5] pt-3.5">
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyWithData}
              onChange={(e) => onOnlyWithDataChange(e.target.checked)}
              className="sr-only peer"
            />
            <div
              className={`relative w-10 h-5.5 rounded-full transition-colors peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#5B4BDB]/30 ${
                onlyWithData
                  ? "bg-[var(--primary)]"
                  : "border border-[var(--border-subtle)] bg-[var(--surface-muted)]"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-[2px] left-[2px] h-4.5 w-4.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] transition-transform ${
                  onlyWithData
                    ? "translate-x-4.5"
                    : "translate-x-0"
                }`}
              />
            </div>
            <span className="ml-3 text-xs sm:text-sm font-semibold text-[var(--foreground)]">
              Mostrar Apenas Com Dados
            </span>
          </label>

          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]">
            {onlyWithData
              ? "Ocultando turmas sem dados"
              : "Exibindo todas as turmas"}
          </span>
        </div>
      )}
    </div>
  );
}

