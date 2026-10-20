import React from "react";

export interface ClassCardSkeletonProps {
  className?: string;
}

export default function ClassCardSkeleton({
  className = "",
}: ClassCardSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Carregando dados da turma"
      className={`flex flex-col justify-between rounded-2xl border border-[#E8E6F8] bg-white p-5 shadow-xs animate-pulse ${className}`}
    >
      <div>
        {/* Skeleton do Cabeçalho: Código da Turma e Turno */}
        <div className="mb-3.5 flex items-center justify-between gap-2">
          <div className="h-6 w-20 rounded-lg bg-[#EDE9FD]/80" />
          <div className="h-5 w-16 rounded-md bg-gray-200/80" />
        </div>

        {/* Skeleton do Docente */}
        <div className="mb-3 flex items-center gap-2">
          <div className="h-4 w-4 shrink-0 rounded-full bg-[#EDE9FD]" />
          <div className="h-5 w-3/4 rounded-md bg-gray-200" />
        </div>

        {/* Skeleton de Horário e Local */}
        <div className="space-y-2 pt-0.5">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-3.5 shrink-0 rounded-full bg-gray-200" />
            <div className="h-3.5 w-2/3 rounded-sm bg-gray-100" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-3.5 shrink-0 rounded-full bg-gray-200" />
            <div className="h-3.5 w-3/5 rounded-sm bg-gray-100" />
          </div>
        </div>
      </div>

      {/* Skeleton da Barra de Ocupação */}
      <div className="mt-4 border-t border-gray-100 pt-3.5">
        <div className="mb-2 flex items-center justify-between">
          <div className="h-3.5 w-24 rounded-sm bg-gray-200" />
          <div className="h-3.5 w-28 rounded-sm bg-gray-200" />
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100" />
      </div>
    </div>
  );
}
