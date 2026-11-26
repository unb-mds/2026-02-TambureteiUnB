"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import type { HistoricoImportacaoResponse } from "@/services/historicoService";
import type { MatrizCurricularItem } from "@/types/curso";
import curriculosCursos from "@/data/curriculos-cursos.json";
import {
  resolveCourseSlug,
  getOfficialCurriculumUrl,
} from "@/utils/courseCurriculum";

interface MinhaGraduacaoSectionProps {
  importedData?: HistoricoImportacaoResponse | null;
}

type GradeFilterType = "todas" | "concluidas" | "andamento" | "pendentes";

interface GradeItem {
  codigo: string;
  nome: string;
  slug?: string | null;
  ch?: number;
  creditos?: number;
  departamento?: string;
  periodo_sugerido: number;
  is_obrigatoria: boolean;
  natureza: "Obrigatoria" | "Optativa";
  status: "Concluída" | "Em andamento" | "Pendente";
  mencao?: string | null;
  semestreConclusao?: string | null;
}

// Situações que confirmam conclusão/aprovação no SIGAA da UnB
const SITUACOES_APROVADAS = new Set([
  "APR",
  "APROVADO",
  "CUMP",
  "CUMPRIDO",
  "DISP",
  "DISPENSADO",
  "APROVADA",
]);

// Mapeamento bidirecional de equivalências curriculares da UnB / FCTE
const EQUIVALENCIAS_DISCIPLINAS: Record<string, string[]> = {
  FGA0161: ["FGA0302"],
  FGA0302: ["FGA0161"],
};

export default function MinhaGraduacaoSection({
  importedData,
}: MinhaGraduacaoSectionProps) {
  const [filter, setFilter] = useState<GradeFilterType>("todas");
  const [selectedDiscipline, setSelectedDiscipline] = useState<GradeItem | null>(null);

  // 1. Identifica o curso do estudante
  const nomeCurso = importedData?.dados_academicos.curso || "Engenharia de Software";
  const slugCurso = resolveCourseSlug(nomeCurso);
  const linkOficialSigaa = getOfficialCurriculumUrl({ slug: slugCurso });

  // 2. Dados consolidados de carga horária
  const ch = useMemo(() => {
    if (importedData) {
      return {
        exigidaTotal: importedData.carga_horaria.exigido.total,
        exigidaObrig: importedData.carga_horaria.exigido.obrigatorias,
        exigidaOpt: importedData.carga_horaria.exigido.optativas,
        integralizadaTotal: importedData.carga_horaria.integralizado.total,
        integralizadaObrig: importedData.carga_horaria.integralizado.obrigatorias,
        integralizadaOpt: importedData.carga_horaria.integralizado.optativas,
        pendenteTotal: importedData.carga_horaria.pendente.total,
      };
    }
    // Dados demonstrativos
    return {
      exigidaTotal: 3600,
      exigidaObrig: 2400,
      exigidaOpt: 1200,
      integralizadaTotal: 1980,
      integralizadaObrig: 1560,
      integralizadaOpt: 420,
      pendenteTotal: 1620,
    };
  }, [importedData]);

  // Percentuais de conclusão
  const pctTotal =
    ch.exigidaTotal > 0
      ? Math.round((ch.integralizadaTotal / ch.exigidaTotal) * 100)
      : 0;
  const pctObrig =
    ch.exigidaObrig > 0
      ? Math.round((ch.integralizadaObrig / ch.exigidaObrig) * 100)
      : 0;
  const pctOpt =
    ch.exigidaOpt > 0
      ? Math.round((ch.integralizadaOpt / ch.exigidaOpt) * 100)
      : 0;

  // 3. Monta a grade curricular oficial do curso detectado e cruza com histórico real
  const curriculos = curriculosCursos as Record<string, MatrizCurricularItem[]>;
  const temMatrizCadastrada = Boolean(curriculos[slugCurso]);

  const fullGrade = useMemo<GradeItem[]>(() => {
    // Busca a grade obrigatória oficial do curso cadastrada ou fallback
    const matrizCurso = curriculos[slugCurso] ||
      (!importedData ? curriculos["engenharia-de-software"] : []) ||
      [];

    const concluidasMap = new Map<string, { mencao?: string | null; semestre?: string | null }>();
    const cursandoSet = new Set<string>();

    if (importedData) {
      // Disciplinas do histórico (cursadas)
      for (const c of importedData.cursadas || []) {
        const sit = (c.situacao || "").toUpperCase().trim();
        const mencao = (c.mencao || "").toUpperCase().trim();
        const mencaoAprovada = ["SS", "MS", "MM"].includes(mencao);
        const sitAprovada = SITUACOES_APROVADAS.has(sit) || sit.includes("APROV");

        if (sitAprovada || mencaoAprovada) {
          concluidasMap.set(c.codigo.trim().toUpperCase(), {
            mencao: c.mencao,
            semestre: c.semestre,
          });
        }
      }

      // Disciplinas em andamento no período atual (cursando)
      for (const c of importedData.cursando || []) {
        cursandoSet.add(c.codigo.trim().toUpperCase());
      }

      // Marcação adicional de pendências que estejam com flag matriculado no histórico
      for (const p of importedData.pendentes || []) {
        if (p.matriculado) {
          cursandoSet.add(p.codigo.trim().toUpperCase());
        }
      }
    } else {
      // Mock de demonstração do estudante de Engenharia de Software
      const mockConcluidas = [
        "CIC0004", "MAT0025", "FGA0163", "FGA0168", "FGA0302", // 1º sem
        "MAT0026", "MAT0031", "IFD0171", "IFD0173", "FGA0157", // 2º sem
        "FGA0071", "FGA0073", "FGA0085", "FGA0133", "FGA0164", // 3º sem
        "FGA0108", "FGA0142", "FGA0146", "FGA0307",             // 4º sem
      ];
      for (const cod of mockConcluidas) {
        concluidasMap.set(cod, { mencao: "MS", semestre: "2024/2" });
      }
      cursandoSet.add("FGA0158");
      cursandoSet.add("FGA0160");
      cursandoSet.add("FGA0303");
      cursandoSet.add("FGA0312");
      cursandoSet.add("FGA0137");
      cursandoSet.add("FGA0173");
    }

    return matrizCurso.map((d: MatrizCurricularItem) => {
      const codeUpper = (d.codigo || "").trim().toUpperCase();
      let status: "Concluída" | "Em andamento" | "Pendente" = "Pendente";
      let mencao: string | null = null;
      let semestreConclusao: string | null = null;

      // Verifica conclusão direta ou por equivalência curricular (ex.: FGA0161 <-> FGA0302)
      const equivCodes = [codeUpper, ...(EQUIVALENCIAS_DISCIPLINAS[codeUpper] || [])];
      const matchedConcluidaCode = equivCodes.find((code) => concluidasMap.has(code));

      if (matchedConcluidaCode) {
        status = "Concluída";
        const info = concluidasMap.get(matchedConcluidaCode);
        mencao = info?.mencao ?? null;
        semestreConclusao = info?.semestre ?? null;
      } else if (equivCodes.some((code) => cursandoSet.has(code))) {
        status = "Em andamento";
      }

      return {
        codigo: d.codigo,
        nome: d.nome,
        slug: d.slug,
        ch: d.ch || undefined,
        creditos: d.creditos || (d.ch ? Math.round(d.ch / 15) : undefined),
        departamento: d.departamento || undefined,
        periodo_sugerido: d.periodo_sugerido,
        is_obrigatoria: true,
        natureza: "Obrigatoria",
        status,
        mencao,
        semestreConclusao,
      };
    });
  }, [importedData, slugCurso, curriculos]);

  // Agrupamento por Semestre da grade oficial do curso
  const semestresAgrupados = useMemo(() => {
    // Determina o maior semestre presente na grade deste curso
    const maxSemestre = Math.max(
      ...fullGrade.map((d) => d.periodo_sugerido),
      1
    );

    const list: Array<{
      numero: number;
      titulo: string;
      chTotal: number;
      chConcluida: number;
      disciplinas: GradeItem[];
      totalConcluidas: number;
      totalDisciplinas: number;
    }> = [];

    for (let s = 1; s <= maxSemestre; s++) {
      const discs = fullGrade.filter((d) => d.periodo_sugerido === s);
      if (discs.length === 0) continue;

      const chTotal = discs.reduce((acc, d) => acc + (d.ch || 0), 0);
      const chConcluida = discs
        .filter((d) => d.status === "Concluída")
        .reduce((acc, d) => acc + (d.ch || 0), 0);

      list.push({
        numero: s,
        titulo: `${s}º semestre`,
        chTotal,
        chConcluida,
        disciplinas: discs,
        totalConcluidas: discs.filter((d) => d.status === "Concluída").length,
        totalDisciplinas: discs.length,
      });
    }

    return list;
  }, [fullGrade]);

  // Filtro
  function matchesFilter(item: GradeItem): boolean {
    if (filter === "todas") return true;
    if (filter === "concluidas") return item.status === "Concluída";
    if (filter === "andamento") return item.status === "Em andamento";
    if (filter === "pendentes") return item.status === "Pendente";
    return true;
  }

  return (
    <div className="space-y-6">
      {/* 1. Progresso Geral (Bloco único compacto) */}
      <section
        aria-labelledby="progresso-geral-heading"
        className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3
              id="progresso-geral-heading"
              className="text-sm font-semibold text-[var(--text-muted)]"
            >
              Conclusão da graduação
            </h3>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-[var(--primary)]">
                {pctTotal}%
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                ({ch.integralizadaTotal} de {ch.exigidaTotal} h integralizadas)
              </span>
            </div>
          </div>
          <span className="text-xs font-medium text-[var(--text-muted)]">
            Faltam {ch.pendenteTotal} h para integralizar o curso
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Progresso geral de conclusão"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pctTotal}
          className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-soft)]"
        >
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
            style={{ width: `${pctTotal}%` }}
          />
        </div>
      </section>

      {/* 2. Integralização Curricular (Carga Obrigatória e Optativa) */}
      <section
        aria-labelledby="integralizacao-curricular-heading"
        className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6"
      >
        <h3
          id="integralizacao-curricular-heading"
          className="text-sm font-semibold text-[var(--foreground)]"
        >
          Integralização curricular
        </h3>

        <div className="mt-4 space-y-4">
          {/* Carga Obrigatória */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--foreground)]">Carga obrigatória</span>
              <span className="text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--primary)]">{pctObrig}%</span> ·{" "}
                {ch.integralizadaObrig} de {ch.exigidaObrig} h
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Carga obrigatória"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pctObrig}
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-soft)]"
            >
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                style={{ width: `${pctObrig}%` }}
              />
            </div>
          </div>

          {/* Carga Optativa */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--foreground)]">Carga optativa</span>
              <span className="text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--primary)]">{pctOpt}%</span> ·{" "}
                {ch.integralizadaOpt} de {ch.exigidaOpt} h
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Carga optativa"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pctOpt}
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-soft)]"
            >
              <div
                className="h-full rounded-full bg-[var(--secondary)] transition-all duration-300"
                style={{ width: `${pctOpt}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Mapa Curricular Visual do Curso do Estudante */}
      <section
        aria-labelledby="grade-curricular-heading"
        className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-subtle)] pb-4">
          <div>
            <h3
              id="grade-curricular-heading"
              className="text-base font-bold text-[var(--foreground)]"
            >
              Grade curricular · {nomeCurso}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {temMatrizCadastrada
                ? `Estrutura curricular oficial baseada no seu curso (${semestresAgrupados.length} semestres · ${fullGrade.length} matérias obrigatórias).`
                : `Estrutura curricular oficial do seu curso no SIGAA da UnB.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={linkOficialSigaa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors"
            >
              <span>Grade oficial no SIGAA</span>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>

            {/* Legenda sutil */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 border border-emerald-400/30" />
                <span className="text-[var(--text-muted)] text-[11px]">Concluída</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#5B4BDB] border border-[#7C6CF0]/40" />
                <span className="text-[var(--text-muted)] text-[11px]">Em andamento</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-400 dark:bg-neutral-600 border border-neutral-500/30" />
                <span className="text-[var(--text-muted)] text-[11px]">Pendente</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros discretos */}
        <div className="mt-3 flex flex-wrap gap-1.5 border-b border-[var(--border-subtle)] pb-3 text-xs">
          {(
            [
              { id: "todas", label: "Todas" },
              { id: "concluidas", label: "Concluídas" },
              { id: "andamento", label: "Em andamento" },
              { id: "pendentes", label: "Pendentes" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === tab.id
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--surface-soft)] text-[var(--text-muted)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grade de Semestres (Organização Horizontal por Semestres) */}
        {semestresAgrupados.length > 0 ? (
          <div className="mt-5 overflow-x-auto pb-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-3.5 min-w-full sm:min-w-max items-start">
              {semestresAgrupados.map((sem) => {
                const filteredDiscs = sem.disciplinas.filter(matchesFilter);
                if (filteredDiscs.length === 0 && filter !== "todas") {
                  return null;
                }

                return (
                  <div
                    key={sem.titulo}
                    className="w-full sm:w-[185px] shrink-0 flex flex-col gap-2 rounded-xl bg-[var(--surface-muted)] p-2.5 border border-[var(--border-subtle)]"
                  >
                    {/* Cabeçalho do Semestre */}
                    <div className="flex items-center justify-between px-1 pb-1 border-b border-[var(--border-subtle)]/60">
                      <span className="text-xs font-bold text-[var(--foreground)]">
                        {sem.titulo}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium">
                        {sem.totalConcluidas}/{sem.totalDisciplinas}
                      </span>
                    </div>

                    {/* Blocos Compactos das Disciplinas */}
                    <div className="flex flex-col gap-1.5">
                      {filteredDiscs.map((disc) => {
                        const isConcluida = disc.status === "Concluída";
                        const isAndamento = disc.status === "Em andamento";

                        let cardStyle =
                          "border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400";
                        let codeColor = "text-neutral-500 dark:text-neutral-500";
                        let titleColor = "text-neutral-800 dark:text-neutral-200";

                        if (isConcluida) {
                          cardStyle =
                            "border-emerald-600/40 bg-emerald-950/25 dark:bg-emerald-950/35 text-emerald-300 hover:border-emerald-500/70";
                          codeColor = "text-emerald-600 dark:text-emerald-500/90";
                          titleColor = "text-emerald-950 dark:text-emerald-100";
                        } else if (isAndamento) {
                          cardStyle =
                            "border-[#5B4BDB]/45 bg-[#5B4BDB]/10 dark:bg-[#5B4BDB]/15 text-[#A89BFF] hover:border-[#5B4BDB]";
                          codeColor = "text-[#7C6CF0] dark:text-[#9B8CF6]";
                          titleColor = "text-[#2A1E8F] dark:text-[#EAE6FF]";
                        }

                        return (
                          <div
                            key={disc.codigo}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedDiscipline(disc)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedDiscipline(disc);
                              }
                            }}
                            className={`group relative flex flex-col justify-between rounded-lg border p-2 transition-all cursor-pointer ${cardStyle}`}
                          >
                            <div>
                              <span
                                className={`text-[10px] font-semibold tracking-wider ${codeColor}`}
                              >
                                {disc.codigo}
                              </span>
                              <p
                                className={`mt-0.5 text-[11px] font-bold leading-snug line-clamp-2 ${titleColor}`}
                              >
                                {disc.nome}
                              </p>
                            </div>

                            <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-muted)] opacity-80">
                              <span>{disc.ch ? `${disc.ch} h` : ""}</span>
                              {disc.creditos && <span>{disc.creditos} cr</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-8 text-center">
            <h4 className="text-base font-bold text-[var(--foreground)]">
              Grade curricular de {nomeCurso}
            </h4>
            <p className="mt-2 max-w-md mx-auto text-xs sm:text-sm text-[var(--text-muted)]">
              A matriz curricular interativa deste curso está disponível para consulta pública diretamente no portal oficial do SIGAA da UnB.
            </p>
            <div className="mt-5">
              <a
                href={linkOficialSigaa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:opacity-90 transition-opacity"
              >
                <span>Acessar grade oficial no SIGAA</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          </div>
        )}
      </section>

      {/* 4. Popover / Modal de Detalhes da Disciplina */}
      {selectedDiscipline && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="discipline-details-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setSelectedDiscipline(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-xl transition-all sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
              <div>
                <span className="text-xs font-bold text-[var(--primary)]">
                  {selectedDiscipline.codigo}
                </span>
                <h4
                  id="discipline-details-title"
                  className="mt-1 text-sm font-bold text-[var(--foreground)] leading-snug"
                >
                  {selectedDiscipline.nome}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDiscipline(null)}
                aria-label="Fechar detalhes da disciplina"
                className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
              >
                ✕
              </button>
            </div>

            <div className="mt-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Situação</span>
                <span
                  className={`font-semibold ${
                    selectedDiscipline.status === "Concluída"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : selectedDiscipline.status === "Em andamento"
                      ? "text-[var(--primary)]"
                      : "text-neutral-500"
                  }`}
                >
                  {selectedDiscipline.status}
                  {selectedDiscipline.mencao ? ` (${selectedDiscipline.mencao})` : ""}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Semestre sugerido</span>
                <span className="font-medium text-[var(--foreground)]">
                  {selectedDiscipline.periodo_sugerido}º semestre
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Carga horária</span>
                <span className="font-medium text-[var(--foreground)]">
                  {selectedDiscipline.ch ? `${selectedDiscipline.ch} h` : "—"} ·{" "}
                  {selectedDiscipline.creditos ? `${selectedDiscipline.creditos} cr` : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Natureza</span>
                <span className="font-medium text-[var(--foreground)]">
                  Obrigatória
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-2">
              {selectedDiscipline.slug && (
                <Link
                  href={`/disciplinas/${selectedDiscipline.slug}`}
                  className="rounded-xl bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Ver estatísticas
                </Link>
              )}
              <button
                type="button"
                onClick={() => setSelectedDiscipline(null)}
                className="rounded-xl border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
