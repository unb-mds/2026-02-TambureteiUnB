"use client";

import Link from "next/link";
import React from "react";
import ApprovalBadge from "./ApprovalBadge.ts";
import { Discipline } from "../types/disciplina.ts";
import { formatPositiveMetric, hasApprovalData } from "../utils/academicMetrics.ts";

interface DisciplineCardProps {
  discipline: Discipline;
  detailedMetrics?: {
    approval?: number | null;
    failedGrade?: number;
    failedAttendance?: number;
    withdrawn?: number;
    matriculados?: number;
  };
}

export default function DisciplineCard({ discipline, detailedMetrics }: DisciplineCardProps) {
  const resolvedApproval = detailedMetrics?.approval ?? discipline.approval;
  const resolvedFailedGrade = detailedMetrics?.failedGrade ?? discipline.failedGrade ?? 0;
  const resolvedFailedAttendance = detailedMetrics?.failedAttendance ?? discipline.failedAttendance ?? 0;
  const resolvedWithdrawn = detailedMetrics?.withdrawn ?? discipline.withdrawn ?? 0;
  const resolvedMatriculados = detailedMetrics?.matriculados ?? discipline.metrica_consolidada?.matriculados ?? 0;

  const hasMetrics =
    resolvedMatriculados > 0 ||
    (hasApprovalData(resolvedApproval) && resolvedApproval > 0) ||
    resolvedFailedGrade > 0 ||
    resolvedFailedAttendance > 0 ||
    resolvedWithdrawn > 0;

  const hasClasses = discipline.total_turmas !== undefined && discipline.total_turmas > 0;

  return (
    <article
      className="relative group flex flex-col justify-between rounded-2xl bg-white p-5 sm:p-6 border border-[#E8E6F8] shadow-xs hover:shadow-md hover:border-[#5B4BDB]/40 hover:-translate-y-0.5 transition-all cursor-pointer focus-within:ring-2 focus-within:ring-[#5B4BDB] focus-within:ring-offset-2"
    >
      {/* Link overlay cobrindo todo o retangulo do card da disciplina */}
      <Link
        href={`/disciplinas/${discipline.slug}`}
        className="absolute inset-0 z-30 rounded-2xl focus:outline-hidden"
        aria-label={`Acessar disciplina ${discipline.name}`}
      >
        <span className="sr-only">Acessar disciplina {discipline.name}</span>
      </Link>

      <div className="pointer-events-none">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="rounded-lg bg-[#EDE9FD] px-2.5 py-1 text-xs font-bold text-[#5B4BDB]">
              {discipline.code}
            </span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border"
              style={{
                backgroundColor: hasClasses
                  ? "var(--primary-soft)"
                  : "var(--status-neutral-bg)",
                borderColor: hasClasses
                  ? "var(--border-subtle)"
                  : "var(--status-neutral-border)",
                color: hasClasses
                  ? "var(--primary-text)"
                  : "var(--status-neutral-text)",
              }}
            >
              {hasClasses
                ? `${discipline.total_turmas} ${discipline.total_turmas === 1 ? "turma" : "turmas"}`
                : "Sem dados"}
            </span>
          </div>
          <div>
            <ApprovalBadge approval={resolvedApproval} />
          </div>
        </div>

        <h2 className="text-base sm:text-lg font-bold text-[#202124] group-hover:text-[#5B4BDB] transition-colors leading-snug">
          {discipline.name}
        </h2>

        <p className="mt-2 text-xs text-gray-500 leading-relaxed">
          {discipline.departmentName} <span className="mx-1 text-[#C4C1D8]">•</span> {discipline.offeringCampuses?.length ? discipline.offeringCampuses.join(" / ") : discipline.campus}
        </p>

        {/* Painel de métricas adaptado automaticamente ao tema claro/escuro */}
        {hasMetrics ? (
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div
                className="rounded-xl p-2.5 flex flex-col justify-between border"
                style={{
                  backgroundColor: "var(--status-success-bg)",
                  borderColor: "var(--status-success-border)",
                  color: "var(--status-success-text)",
                }}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">
                  Aprovação
                </span>
                <span className="text-sm font-extrabold mt-0.5">
                  {formatPositiveMetric(resolvedApproval, "%")}
                </span>
              </div>

              <div
                className="rounded-xl p-2.5 flex flex-col justify-between border"
                style={{
                  backgroundColor: "var(--status-danger-bg)",
                  borderColor: "var(--status-danger-border)",
                  color: "var(--status-danger-text)",
                }}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">
                  Repr. Nota
                </span>
                <span className="text-sm font-extrabold mt-0.5">
                  {formatPositiveMetric(resolvedFailedGrade, "%")}
                </span>
              </div>

              <div
                className="rounded-xl p-2.5 flex flex-col justify-between border"
                style={{
                  backgroundColor: "var(--status-warning-bg)",
                  borderColor: "var(--status-warning-border)",
                  color: "var(--status-warning-text)",
                }}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">
                  Repr. Falta
                </span>
                <span className="text-sm font-extrabold mt-0.5">
                  {formatPositiveMetric(resolvedFailedAttendance, "%")}
                </span>
              </div>

              <div
                className="rounded-xl p-2.5 flex flex-col justify-between border"
                style={{
                  backgroundColor: "var(--status-neutral-bg)",
                  borderColor: "var(--status-neutral-border)",
                  color: "var(--status-neutral-text)",
                }}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">
                  Trancamentos
                </span>
                <span className="text-sm font-extrabold mt-0.5">
                  {formatPositiveMetric(resolvedWithdrawn, "%")}
                </span>
              </div>
            </div>

            <div
              className="flex items-center justify-between text-[11px] px-1 pt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              <span>
                Discentes:{" "}
                <strong>
                  {resolvedMatriculados > 0
                    ? `${resolvedMatriculados} ${resolvedMatriculados === 1 ? "aluno" : "alunos"}`
                    : "Sem dados"}
                </strong>
              </span>
              <span>
                {hasClasses
                  ? `${discipline.total_turmas} ${discipline.total_turmas === 1 ? "turma" : "turmas"}`
                  : "Sem dados"}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-4 pt-3 border-t border-[#EDE9FD]/60">
            <div className="bg-[#FAF9FE] rounded-xl p-2.5 border border-[#EDE9FD]/70 flex flex-col justify-between min-h-[58px]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">
                Métricas Consolidadas
              </span>
              <span className="text-[11px] text-gray-500 mt-1">
                Sem registro de dados históricos para este período
              </span>
            </div>
          </div>
        )}

        <div className="mt-3.5 flex items-center gap-2 text-xs font-semibold text-gray-700">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-[#7C6CF0]">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 4.5V8l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          {discipline.credits}
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-[#7C6CF0]">
            <path d="M3 2.5h7.5A2.5 2.5 0 0 1 13 5v8.5H5.5A2.5 2.5 0 0 1 3 11V2.5Z" stroke="currentColor" strokeWidth="1.3" />
            <path d="M3 11a2.5 2.5 0 0 1 2.5-2.5H13" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          <span>
            {discipline.resources > 0 ? (
              <>
                <strong className="text-gray-800">{discipline.resources}</strong> materiais e relatos
              </>
            ) : (
              "Sem dados de materiais"
            )}
          </span>
        </div>
      </div>

      <div className="mt-6 border-t border-[#EDE9FD] pt-4 pointer-events-none">
        <div className="flex w-full items-center justify-between text-xs sm:text-sm font-bold text-[#5B4BDB] group-hover:translate-x-0.5 transition-all">
          <span>Acessar disciplina</span>
          <span aria-hidden="true">→</span>
        </div>
      </div>
    </article>
  );
}
