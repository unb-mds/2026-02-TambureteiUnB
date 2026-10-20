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
}

export default function ClassFilters({
  selectedShift,
  onShiftChange,
  sortBy,
  onSortChange,
  totalCount,
  filteredCount,
  onResetFilters,
}: ClassFiltersProps) {
  const hasActiveFilter = selectedShift !== "Todos" || sortBy !== "code_asc";

  return (
    <div
      className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-[#ECEAF5] bg-[#FAFAFC] p-4"
      role="region"
      aria-label="Filtros e ordenação de turmas"
    >
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
  );
}

