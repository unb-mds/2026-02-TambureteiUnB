import React from "react";
import {
  Class,
  TurnoTurma,
  formatClassOccupancy,
} from "@/types/turma";

export interface ClassCardProps {
  turma?: Class;
  classData?: Class;
  className?: string;
}

function getTurnoBadgeClasses(turno: TurnoTurma): string {
  switch (turno) {
    case "Matutino":
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

export default function ClassCard({
  turma,
  classData,
  className = "",
}: ClassCardProps) {
  const item = classData ?? turma;

  if (!item) {
    return null;
  }

  const codigoFormatado = item.codigoTurma.toLowerCase().startsWith("turma")
    ? item.codigoTurma
    : `Turma ${item.codigoTurma}`;

  return (
    <article
      aria-label={`${codigoFormatado} - ${item.professor}`}
      className={`flex flex-col justify-between rounded-2xl border border-[#E8E6F8] bg-white p-5 shadow-xs transition-all hover:border-[#5B4BDB]/40 hover:shadow-md ${className}`}
    >
      <div>
        {/* Cabeçalho do Card: Identificador da Turma e Turno */}
        <header className="mb-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-lg border border-[#D8D1FA]/70 bg-[#EDE9FD] px-3 py-1 text-xs font-bold text-[#5B4BDB]">
              {codigoFormatado}
            </span>
            {item.semestre && (
              <span className="inline-flex items-center rounded-md bg-[#F7F7FA] px-2 py-0.5 text-[11px] font-medium text-gray-500 border border-gray-200/70">
                {item.semestre}
              </span>
            )}
          </div>
          <span
            className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${getTurnoBadgeClasses(
              item.turno
            )}`}
          >
            {item.turno}
          </span>
        </header>

        {/* Nome(s) do(s) Docente(s) */}
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
          <h3 className="text-base font-bold text-[#202124] leading-snug">
            {item.professor}
          </h3>
        </div>

        {/* Informações de Horário e Local */}
        <dl className="space-y-1.5 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <svg
              className="h-3.5 w-3.5 shrink-0 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6l4 2"
              />
            </svg>
            <dt className="font-semibold text-gray-700">Horário:</dt>
            <dd className="truncate" title={item.horarios}>
              {item.horarios}
            </dd>
          </div>

          <div className="flex items-center gap-2">
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
            <dt className="font-semibold text-gray-700">Local:</dt>
            <dd className="truncate" title={item.local}>
              {item.local}
            </dd>
          </div>
        </dl>
      </div>

      <footer className="mt-4 border-t border-gray-100 pt-3.5">
        <p className="text-xs font-medium text-gray-700">
          {formatClassOccupancy(item.vagasOcupadas, item.totalVagas)}
        </p>
      </footer>
    </article>
  );
}
