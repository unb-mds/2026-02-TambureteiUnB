import React from "react";
import {
  Class,
  TurnoTurma,
  formatClassOccupancy,
  hasClassLocal,
  hasClassOccupancy,
  hasClassSchedule,
  isHistoricalClass,
} from "@/types/turma";
import { ClassOccupancyPie } from "@/components/ClassPerformancePieForm";
import {
  formatExactPercent,
  resumirTaxasTurmaDetalhadas,
} from "@/utils/academicMetrics";

export interface ClassCardProps {
  turma?: Class;
  classData?: Class;
  className?: string;
}

function getTurnoBadgeClasses(turno: TurnoTurma): string {
  switch (turno) {
    case "Matutino":
    case "Diurno":
      return "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]";
    case "Vespertino":
      return "bg-[var(--primary-soft)] text-[var(--primary-text)] border-[var(--border-subtle)]";
    case "Noturno":
      return "bg-[var(--primary-soft)] text-[var(--primary-text)] border-[var(--border-subtle)]";
    default:
      return "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border-[var(--status-neutral-border)]";
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

  const historical = isHistoricalClass(item);
  const showSchedule = !historical && hasClassSchedule(item.horarios);
  const showLocal = !historical && hasClassLocal(item.local);
  const showOccupancy = !historical && hasClassOccupancy(item);
  const showTurno = !historical && Boolean(item.turno);

  const amostras = item.amostrasComunidade ?? 0;
  const minimoLgpd = item.minimoAmostrasLgpd ?? 5;
  const progressoColetaPct =
    minimoLgpd > 0 ? Math.min(100, Math.round((amostras / minimoLgpd) * 100)) : 0;

  const blocoEstatisticas = item.estatistica ? (
    (() => {
      const taxas = resumirTaxasTurmaDetalhadas(item.estatistica);
      return (
        <div className={`${historical ? "" : "mt-3.5 "}rounded-xl bg-[#F7F7FA] px-3 py-2 text-[11px]`}>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-semibold">
            <span className="text-emerald-700">
              Aprovação: {formatExactPercent(taxas.aprovacao)}%
            </span>
            <span className="text-red-600">
              Reprov. nota: {formatExactPercent(taxas.reprovacaoNota)}%
            </span>
            <span className="text-amber-700">
              Reprov. falta: {formatExactPercent(taxas.reprovacaoFalta)}%
            </span>
            <span className="text-gray-600">
              Tranc.: {formatExactPercent(taxas.trancamento)}%
            </span>
          </div>
          {amostras > 0 && (
            <p className="mt-1.5 text-[10px] text-gray-500">
              Baseado em {amostras}{" "}
              {amostras === 1 ? "histórico" : "históricos"}
            </p>
          )}
        </div>
      );
    })()
  ) : amostras > 0 ? (
    <div className={`${historical ? "" : "mt-3.5 "}rounded-xl border border-dashed border-[#D8D1FA] bg-[#F8F7FF] px-3 py-2 text-[11px] font-medium text-[#5B4BDB]`}>
      <p>
        Coleta comunidade: {amostras}/{minimoLgpd} históricos (RN07)
      </p>
      <div
        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E8E6F8]"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-[#5B4BDB] transition-all"
          style={{ width: `${progressoColetaPct}%` }}
        />
      </div>
    </div>
  ) : null;

  return (
    <article
      aria-label={`${codigoFormatado} - ${item.professor}`}
      className={`flex flex-col justify-between rounded-2xl border border-[#E8E6F8] bg-white ${
        historical ? "p-4" : "p-5"
      } shadow-xs transition-all hover:border-[#5B4BDB]/40 hover:shadow-md ${className}`}
    >
      <div>
        {/* Cabeçalho do Card: Identificador da Turma, Semestre e Turno/Origem */}
        <header className={`${historical ? "mb-3" : "mb-3.5"} flex items-center justify-between gap-2`}>
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-lg border border-[#D8D1FA]/70 bg-[#EDE9FD] px-2.5 py-1 text-xs font-bold text-[#5B4BDB]">
              {codigoFormatado}
            </span>
            {item.semestre && (
              <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md border border-gray-200/70 bg-[#F7F7FA] px-2 py-0.5 text-[11px] font-medium text-gray-500">
                {item.semestre}
              </span>
            )}
          </div>
          {showTurno && item.turno ? (
            <span
              className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold ${getTurnoBadgeClasses(
                item.turno
              )}`}
            >
              {item.turno}
            </span>
          ) : historical ? (
            <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md border border-[var(--status-neutral-border)] bg-[var(--status-neutral-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--status-neutral-text)]">
              Histórico
            </span>
          ) : null}
        </header>

        {/* Nome(s) do(s) Docente(s) */}
        <div className={`${showSchedule || showLocal ? "mb-3" : "mb-1"} flex items-start gap-2`}>
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

        {/* Informações de Horário e Local (somente quando existentes) */}
        {(showSchedule || showLocal) && (
          <dl className="space-y-1.5 text-xs text-gray-600">
            {showSchedule && (
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
            )}

            {showLocal && (
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
            )}
          </dl>
        )}

        {!historical && blocoEstatisticas}
      </div>

      {showOccupancy && (
        <footer className="mt-4 border-t border-gray-100 pt-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-gray-700">
              {formatClassOccupancy(item.vagasOcupadas, item.totalVagas)}
            </p>
            <ClassOccupancyPie classData={item} compact />
          </div>
        </footer>
      )}

      {historical && (
        <footer className="mt-3 border-t border-gray-100 pt-3">
          {blocoEstatisticas ?? (
            <p className="text-[11px] text-gray-500">
              Sem estatísticas comunitárias registradas
            </p>
          )}
        </footer>
      )}
    </article>
  );
}
