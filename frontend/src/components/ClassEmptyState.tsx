import React from "react";
import { ClassShiftFilter } from "@/types/turma";

export interface ClassEmptyStateProps {
  hasActiveFilters?: boolean;
  selectedShift?: ClassShiftFilter;
  onResetFilters?: () => void;
}

export default function ClassEmptyState({
  hasActiveFilters = false,
  selectedShift = "Todos",
  onResetFilters,
}: ClassEmptyStateProps) {
  if (hasActiveFilters) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#DDD9F1] bg-[#FAFAFC] px-6 py-12 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EDE9FD] text-[#5B4BDB]">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
        </div>
        <h3 className="text-base font-bold text-[#202124]">
          Nenhuma turma encontrada para o filtro selecionado
        </h3>
        <p className="mt-2 max-w-md text-xs sm:text-sm text-gray-500 leading-relaxed">
          Não há turmas ofertadas no turno{" "}
          <strong className="font-semibold text-[#202124]">
            {selectedShift}
          </strong>{" "}
          para esta disciplina no semestre atual.
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#5B4BDB] px-5 py-2.5 text-xs font-semibold text-white transition-all hover:brightness-110 shadow-xs active:scale-95 cursor-pointer"
          >
            Limpar filtros e ver todas as turmas
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#DDD9F1] bg-[#FAFAFC] px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EDE9FD] text-[#5B4BDB]">
        <svg
          className="h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      </div>
      <h3 className="text-base font-bold text-[#202124]">
        Nenhuma turma ofertada no momento
      </h3>
      <p className="mt-2 max-w-md text-xs sm:text-sm text-gray-500 leading-relaxed">
        Não há turmas ofertadas cadastradas para o semestre atual. Novas turmas
        poderão ser disponibilizadas no período de matrícula.
      </p>
      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#EDE9FD]/70 px-3.5 py-1 text-xs font-medium text-[#5B4BDB]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#5B4BDB]" />
        Acompanhe as atualizações no período de matrícula
      </div>
    </div>
  );
}

export { ClassEmptyState };
