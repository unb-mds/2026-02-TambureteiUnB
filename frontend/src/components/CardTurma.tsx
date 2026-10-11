import React from "react";
import { Turma, TurnoTurma } from "@/types/turma";

export interface CardTurmaProps {
  turma: Turma;
  className?: string;
}

function getTurnoBadgeClasses(turno: TurnoTurma): string {
  switch (turno) {
    case "Diurno":
      return "bg-amber-50 text-amber-700 border-amber-200/80";
    case "Vespertino":
      return "bg-orange-50 text-orange-700 border-orange-200/80";
    case "Noturno":
      return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export default function CardTurma({ turma, className = "" }: CardTurmaProps) {
  const percentualOcupacao =
    turma.totalVagas > 0
      ? Math.round((turma.vagasOcupadas / turma.totalVagas) * 100)
      : 0;

  const vagasEsgotadas = turma.vagasOcupadas >= turma.totalVagas;
  const porcentagemBarra = Math.min(Math.max(percentualOcupacao, 0), 100);

  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border border-[#E8E6F8] bg-white p-5 shadow-xs transition-all hover:border-[#5B4BDB]/40 hover:shadow-md ${className}`}
    >
      <div>
        {/* Cabeçalho do Card: Badges de Código da Turma e Turno */}
        <div className="mb-3.5 flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-lg border border-[#D8D1FA]/70 bg-[#EDE9FD] px-3 py-1 text-xs font-bold text-[#5B4BDB]">
            {turma.codigoTurma}
          </span>
          <span
            className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${getTurnoBadgeClasses(
              turma.turno
            )}`}
          >
            {turma.turno}
          </span>
        </div>

        {/* Nome do Professor */}
        <div className="mb-3 flex items-start gap-2">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-[#7C6CF0]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <h3 className="text-base font-bold text-[#202124]">
            {turma.professor}
          </h3>
        </div>

        {/* Informações de Horário e Local */}
        <div className="space-y-1.5 text-xs text-gray-600">
          <p className="flex items-center gap-2">
            <svg
              className="h-3.5 w-3.5 shrink-0 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
            </svg>
            <span>
              <strong className="font-semibold text-gray-700">Horário:</strong>{" "}
              {turma.horarios}
            </span>
          </p>

          <p className="flex items-center gap-2">
            <svg
              className="h-3.5 w-3.5 shrink-0 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>
              <strong className="font-semibold text-gray-700">Local:</strong>{" "}
              {turma.local}
            </span>
          </p>
        </div>
      </div>

      {/* Barra de Progresso e Ocupação de Vagas */}
      <div className="mt-4 border-t border-gray-100 pt-3.5">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium text-gray-500">
            Ocupação
            {vagasEsgotadas && (
              <span className="rounded-sm bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                Esgotada
              </span>
            )}
          </span>
          <span
            className={`font-bold ${
              vagasEsgotadas ? "text-rose-600" : "text-[#067A59]"
            }`}
          >
            {turma.vagasOcupadas}/{turma.totalVagas} vagas ({percentualOcupacao}%)
          </span>
        </div>

        <div
          className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-label="Taxa de ocupação das vagas"
          aria-valuenow={turma.vagasOcupadas}
          aria-valuemin={0}
          aria-valuemax={turma.totalVagas}
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              vagasEsgotadas ? "bg-rose-500" : "bg-[#10B981]"
            }`}
            style={{ width: `${porcentagemBarra}%` }}
          />
        </div>
      </div>
    </div>
  );
}