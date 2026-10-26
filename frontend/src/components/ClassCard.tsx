import React from "react";
import {
  Class,
  TurnoTurma,
  OccupancyLevel,
  calculateOccupancyRate,
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

function getOccupancyStyles(level: OccupancyLevel): {
  barColor: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
  badgeLabel: string;
} {
  switch (level) {
    case "full":
      return {
        barColor: "bg-rose-500",
        textColor: "text-rose-600",
        badgeBg: "bg-rose-100",
        badgeText: "text-rose-700",
        badgeLabel: "Esgotada",
      };
    case "high":
      return {
        barColor: "bg-amber-500",
        textColor: "text-amber-700",
        badgeBg: "bg-amber-100",
        badgeText: "text-amber-800",
        badgeLabel: "Últimas vagas",
      };
    case "medium":
    case "low":
    default:
      return {
        barColor: "bg-[#10B981]",
        textColor: "text-[#067A59]",
        badgeBg: "bg-[#E9F9F3]",
        badgeText: "text-[#067A59]",
        badgeLabel: "Vagas abertas",
      };
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

  const occupancy =
    item.occupancy ?? calculateOccupancyRate(item.vagasOcupadas, item.totalVagas);
  const porcentagemBarra = Math.min(Math.max(occupancy.percentage, 0), 100);
  const occupancyStyles = getOccupancyStyles(occupancy.level);

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

      {/* Barra de Progresso e Ocupação de Vagas */}
      <footer className="mt-4 border-t border-gray-100 pt-3.5">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-1.5 font-medium text-gray-500">
            Ocupação
            <span
              className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${occupancyStyles.badgeBg} ${occupancyStyles.badgeText}`}
            >
              {occupancyStyles.badgeLabel}
            </span>
          </span>
          <span className={`font-bold ${occupancyStyles.textColor}`}>
            {occupancy.occupied}/{occupancy.total} vagas ({occupancy.percentage}%)
          </span>
        </div>

        <div
          className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-label={`Taxa de ocupação das vagas da ${codigoFormatado}: ${occupancy.occupied} de ${occupancy.total} vagas preenchidas (${occupancy.percentage}%)`}
          aria-valuenow={occupancy.occupied}
          aria-valuemin={0}
          aria-valuemax={occupancy.total}
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${occupancyStyles.barColor}`}
            style={{ width: `${porcentagemBarra}%` }}
          />
        </div>
      </footer>
    </article>
  );
}
