"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import type {
  HistoricoComponenteItem,
  HistoricoImportacaoResponse,
} from "../services/historicoService";
import { request } from "../services/httpClient";
import { SIGAA_TIME_SLOTS as SIGAA_SLOTS, type BackendTurmaResponse } from "../types/turma";
import SecurityTabContent from "./SecurityTabContent";

export interface AcademicProfileDashboardProps {
  consented: boolean;
  onConsent: () => void;
  onRevokeConsent: () => void;
  importedData?: HistoricoImportacaoResponse | null;
  initialSection?: ProfileSectionId;
}

const profileSections = [
  { id: "overview", label: "Visão geral" },
  { id: "degree", label: "Minha graduação" },
  { id: "history", label: "Histórico" },
  { id: "performance", label: "Desempenho" },
  { id: "security", label: "Segurança e Senha" },
] as const;

export type ProfileSectionId = (typeof profileSections)[number]["id"];

const disciplineHistory = [
  {
    semester: "2026/1",
    code: "DSW-220",
    name: "Requisitos de Software",
    mention: "SS",
    attendance: "96%",
    status: "Aprovada",
  },
  {
    semester: "2025/2",
    code: "DSW-205",
    name: "Estruturas de Dados",
    mention: "MS",
    attendance: "91%",
    status: "Aprovada",
  },
  {
    semester: "2025/1",
    code: "MAT-120",
    name: "Cálculo 1",
    mention: "MM",
    attendance: "84%",
    status: "Aprovada",
  },
  {
    semester: "2024/2",
    code: "CIC-110",
    name: "Algoritmos e Programação",
    mention: "II",
    attendance: "70%",
    status: "Reprovada",
  },
  {
    semester: "2024/1",
    code: "FIS-101",
    name: "Fundamentos de Física",
    mention: "—",
    attendance: "—",
    status: "Trancada",
  },
];

export function getDisciplineHistoryForSemester(semester: string) {
  return disciplineHistory.filter((row) => row.semester === semester);
}

const semesterPerformance = [
  { semester: "2024/1", approvals: 72 },
  { semester: "2024/2", approvals: 68 },
  { semester: "2025/1", approvals: 81 },
  { semester: "2025/2", approvals: 86 },
  { semester: "2026/1", approvals: 89 },
];

const scheduleByDay = [
  {
    day: "Segunda",
    classes: [
      { time: "08:00–09:50", name: "Banco de Dados", place: "Sala demonstrativa" },
      { time: "14:00–15:50", name: "Sistemas de Informação", place: "Sala demonstrativa" },
    ],
  },
  {
    day: "Terça",
    classes: [
      {
        time: "10:00–11:50",
        name: "Engenharia de Software Experimental",
        place: "Laboratório demonstrativo",
      },
    ],
  },
  {
    day: "Quarta",
    classes: [
      { time: "08:00–09:50", name: "Banco de Dados", place: "Sala demonstrativa" },
    ],
  },
  {
    day: "Quinta",
    classes: [
      {
        time: "10:00–11:50",
        name: "Engenharia de Software Experimental",
        place: "Laboratório demonstrativo",
      },
    ],
  },
  {
    day: "Sexta",
    classes: [
      { time: "14:00–15:50", name: "Sistemas de Informação", place: "Sala demonstrativa" },
    ],
  },
];

const WEEK_DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"] as const;
const SIGAA_DAY_TO_WEEKDAY: Record<string, (typeof WEEK_DAYS)[number]> = {
  "2": "Segunda",
  "3": "Terça",
  "4": "Quarta",
  "5": "Quinta",
  "6": "Sexta",
};

function formatProfessorNames(
  professores: string[],
  disciplineName: string
): string {
  const escapedName = disciplineName
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  const prefixRegex = escapedName ? new RegExp(`^${escapedName}\\s+`, "i") : null;

  return professores
    .map((prof) => {
      let cleaned = prof.trim();
      if (prefixRegex) {
        cleaned = cleaned.replace(prefixRegex, "").trim();
      }
      const tituloMatch = cleaned.match(
        /\b(?:Dr\.?|Dra\.?|MSc\.?|Prof\.?|Esp\.?|Me\.?|Ms\.?)\s+/
      );
      if (tituloMatch?.index && tituloMatch.index > 0) {
        cleaned = cleaned.slice(tituloMatch.index).trim();
      }
      return cleaned;
    })
    .filter(Boolean)
    .join(", ");
}

export function buildWeeklySchedule(
  cursando: HistoricoComponenteItem[],
  liveSchedules: Record<string, { horario: string; local: string; slug: string | null }>
) {
  const columns = new Map<
    (typeof WEEK_DAYS)[number],
    Array<{
      time: string;
      name: string;
      place: string;
      codigo: string;
      turma: string | null;
      ch: number;
      professores: string[];
      slug: string | null;
    }>
  >(WEEK_DAYS.map((day) => [day, []]));

  const sigaaTokenRegex = /([2-6]+)([MTN])([1-6]+)/g;

  for (const discipline of cursando) {
    const key = `${discipline.codigo}-${discipline.turma || ""}`;
    const live = liveSchedules[key];
    const rawHorario = (discipline.horario || live?.horario || "").trim();
    const rawLocal = (discipline.local || live?.local || "Local a definir").trim();
    const resolvedSlug = discipline.slug || live?.slug || null;
    if (!rawHorario) continue;

    const baseInfo = {
      name: discipline.nome,
      place: rawLocal,
      codigo: discipline.codigo,
      turma: discipline.turma,
      ch: discipline.ch,
      professores: discipline.professores,
      slug: resolvedSlug,
    };

    const matches = [...rawHorario.toUpperCase().matchAll(sigaaTokenRegex)];
    if (matches.length > 0) {
      for (const m of matches) {
        const [, daysPart, shiftChar, slotsPart] = m;
        const shift = shiftChar as "M" | "T" | "N";
        const firstSlot = SIGAA_SLOTS[shift]?.[slotsPart[0]];
        const lastSlot = SIGAA_SLOTS[shift]?.[slotsPart[slotsPart.length - 1]];
        const timeRange =
          firstSlot && lastSlot
            ? `${firstSlot.start}–${lastSlot.end}`
            : `${shift}${slotsPart}`;

        for (const d of daysPart) {
          const weekday = SIGAA_DAY_TO_WEEKDAY[d];
          if (!weekday) continue;
          const list = columns.get(weekday)!;
          if (!list.some((item) => item.codigo === discipline.codigo && item.turma === discipline.turma && item.time === timeRange)) {
            list.push({ time: timeRange, ...baseInfo });
          }
        }
      }
      continue;
    }

    const timeMatch = rawHorario.match(/(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})/);
    const timeLabel = timeMatch ? `${timeMatch[1]}–${timeMatch[2]}` : rawHorario;
    for (const weekday of WEEK_DAYS) {
      const prefix = weekday.slice(0, 3).toLowerCase();
      if (rawHorario.toLowerCase().includes(prefix)) {
        columns.get(weekday)!.push({
          time: timeLabel,
          ...baseInfo,
        });
      }
    }
  }

  return WEEK_DAYS.map((day) => {
    const sorted = (columns.get(day) ?? []).sort((a, b) => a.time.localeCompare(b.time));
    const classes: typeof sorted = [];
    for (const item of sorted) {
      const [start, end] = item.time.split("–");
      const previous = classes.find(candidate => {
        if (candidate.codigo !== item.codigo || candidate.turma !== item.turma) return false;
        const previousEnd = candidate.time.split("–")[1];
        // T6 e N1 são consecutivos na oferta SIGAA, com transição de cinco minutos.
        const crossesEveningShift = previousEnd === SIGAA_SLOTS.T["6"].end && start === SIGAA_SLOTS.N["1"].start;
        return previousEnd === start || crossesEveningShift;
      });
      if (previous && end) {
        previous.time = `${previous.time.split("–")[0]}–${end}`;
      } else {
        classes.push({...item});
      }
    }
    return {day, classes};
  });
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E8E6F8] bg-white p-4">
      <dt className="text-xs font-semibold text-gray-500">{label}</dt>
      <dd className="mt-2 text-2xl font-extrabold tracking-tight text-[#202124]">
        {value}
      </dd>
      {detail && <p className="mt-1 text-xs text-gray-500">{detail}</p>}
    </div>
  );
}

function ProgressBar({
  label,
  value,
  max,
  unit = "h",
}: {
  label: string;
  value: number;
  max: number;
  unit?: string;
}) {
  const percentage = Math.round((value / max) * 100);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold text-[#202124]">{label}</span>
        <span className="text-xs font-medium text-gray-600">
          {value.toLocaleString("pt-BR")} de {max.toLocaleString("pt-BR")}{" "}
          {unit} ·{" "}
          {percentage}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-2.5 overflow-hidden rounded-full bg-[#E8E6F8]"
      >
        <div
          className="h-full rounded-full bg-[#5B4BDB]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5B4BDB]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-bold text-[#202124] sm:text-2xl">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
        {description}
      </p>
    </div>
  );
}

function OverviewSection({
  importedData,
}: {
  importedData?: HistoricoImportacaoResponse | null;
}) {
  const [liveSchedules, setLiveSchedules] = useState<
    Record<string, { horario: string; local: string; slug: string | null }>
  >({});

  useEffect(() => {
    if (!importedData || importedData.cursando.length === 0) return;

    const pendentes = importedData.cursando.filter((c) => !c.horario || !c.slug);
    if (pendentes.length === 0) return;

    let cancelled = false;

    async function syncSchedules() {
      const updates: Record<
        string,
        { horario: string; local: string; slug: string | null }
      > = {};
      await Promise.all(
        pendentes.map(async (item) => {
          try {
            const discs = await request<
              Array<{ id: number; codigo: string; slug?: string }>
            >(`/cadeiras?codigo=${encodeURIComponent(item.codigo)}`);
            const disc = discs.find(
              (d) => d.codigo.toUpperCase() === item.codigo.toUpperCase()
            );
            if (!disc) return;

            let horario = item.horario || "";
            let local = item.local || "Local a definir";

            if (!horario) {
              const turmas = await request<BackendTurmaResponse[]>(
                `/turmas?disciplina_id=${disc.id}&semestre=${encodeURIComponent(item.semestre)}`
              );
              const codNorm = (item.turma || "").trim().padStart(2, "0");
              const turmaMatch = turmas.find(
                (t) =>
                  t.codigo_turma.trim().padStart(2, "0") === codNorm ||
                  t.codigo_turma.trim().toUpperCase() ===
                    (item.turma || "").trim().toUpperCase()
              );
              if (turmaMatch?.horario) {
                horario = turmaMatch.horario;
                local = turmaMatch.local || local;
              }
            }

            if (horario || disc.slug) {
              updates[`${item.codigo}-${item.turma || ""}`] = {
                horario,
                local,
                slug: disc.slug || item.slug || null,
              };
            }
          } catch {
            // Ignora falhas pontuais de rede mantendo fallback visual
          }
        })
      );

      if (!cancelled && Object.keys(updates).length > 0) {
        setLiveSchedules((prev) => ({ ...prev, ...updates }));
      }
    }

    syncSchedules();
    return () => {
      cancelled = true;
    };
  }, [importedData]);

  if (importedData) {
    const { dados_academicos: dados, carga_horaria: ch, cursando } = importedData;
    const pct =
      ch.exigido.total > 0
        ? Math.round((ch.integralizado.total / ch.exigido.total) * 100)
        : 0;
    const totalChSemestre = cursando.reduce((acc, item) => acc + item.ch, 0);
    const ultimoSemestre = cursando[0]?.semestre || dados.periodo_inicial || "Atual";

    return (
      <div>
        <SectionHeading
          eyebrow="Resumo acadêmico"
          title="Sua trajetória em um só lugar"
          description="Disciplinas em andamento, horários das turmas no sistema e resumo curricular do seu Histórico Oficial."
        />
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Período atual"
            value={dados.periodo_atual ? `${dados.periodo_atual}º período` : "Ativo"}
            detail={dados.periodo_inicial ? `Ingresso em ${dados.periodo_inicial}` : undefined}
          />
          <Metric
            label="Integralização"
            value={`${pct}%`}
            detail={`${ch.integralizado.total} de ${ch.exigido.total} h`}
          />
          <Metric
            label="Disciplinas no semestre"
            value={String(cursando.length)}
            detail={`${totalChSemestre} h em andamento`}
          />
          <Metric
            label="IRA / MP"
            value={dados.ira !== null ? dados.ira.toFixed(4).replace(".", ",") : "—"}
            detail={
              dados.mp !== null
                ? `MP: ${dados.mp.toFixed(4).replace(".", ",")}`
                : "Média Ponderada"
            }
          />
        </dl>

        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-[#202124]">
                Horários · Semestre {ultimoSemestre}
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Sincronizados com as turmas ofertadas cadastradas no sistema.
              </p>
            </div>
            <span className="rounded-full bg-[#EDE9FD] px-2.5 py-1 text-xs font-semibold text-[#5B4BDB]">
              Grade semanal
            </span>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="grid w-max grid-cols-[repeat(5,224px)] gap-3">
              {buildWeeklySchedule(cursando, liveSchedules).map(({ day, classes }) => (
                <section
                  key={day}
                  aria-labelledby={`schedule-${day.toLowerCase()}`}
                  className="rounded-2xl border border-[#E8E6F8] bg-white p-4"
                >
                  <h4
                    id={`schedule-${day.toLowerCase()}`}
                    className="border-b border-[#E8E6F8] pb-2 font-bold text-[#202124]"
                  >
                    {day}
                  </h4>
                  {classes.length === 0 ? (
                    <p className="mt-3 text-xs text-gray-400">Sem aulas</p>
                  ) : (
                    <ul className="mt-3">
                      {classes.map((classItem, idx) => (
                        <li
                          key={`${classItem.time}-${classItem.name}`}
                          className={
                            idx > 0
                              ? "mt-3 border-t border-[#E8E6F8] pt-3"
                              : ""
                          }
                        >
                          <div className="rounded-xl border border-[#E8E6F8] bg-[#F7F7FA] p-3">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <p className="text-xs font-bold text-[#5B4BDB]">
                                {classItem.time}
                              </p>
                              {classItem.turma && (
                                <span className="rounded-full bg-[#F0EEFF] px-2 py-0.5 text-[10px] font-semibold text-[#5142C5]">
                                  Turma {classItem.turma}
                                </span>
                              )}
                            </div>
                            {classItem.slug ? (
                              <Link
                                href={`/disciplinas/${classItem.slug}`}
                                className="mt-1.5 block break-words text-sm font-semibold text-[#202124] hover:text-[#5B4BDB] hover:underline"
                              >
                                {classItem.name}
                              </Link>
                            ) : (
                              <p className="mt-1.5 break-words text-sm font-semibold text-[#202124]">
                                {classItem.name}
                              </p>
                            )}
                            <p className="mt-1 text-xs font-medium text-gray-600">
                              {classItem.codigo} · {classItem.ch} h
                            </p>
                            {(() => {
                              const formattedProfessors = formatProfessorNames(
                                classItem.professores,
                                classItem.name
                              );
                              return formattedProfessors ? (
                                <p className="mt-0.5 text-xs text-gray-500">
                                  {formattedProfessors}
                                </p>
                              ) : null;
                            })()}
                            <p className="mt-0.5 text-xs text-gray-500">
                              {classItem.place}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E8E6F8] bg-white px-4 py-3 text-xs text-gray-500 sm:px-5">
          <span>
            Contribuições à comunidade:{" "}
            <strong className="text-[#5B4BDB]">
              {importedData.contribuicao.novas_contribuicoes} novas amostras
            </strong>{" "}
            ({importedData.contribuicao.duplicadas_ignoradas} já contabilizadas)
          </span>
          <span>Mín. LGPD: {importedData.contribuicao.minimo_amostras_lgpd}/turma</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeading
        eyebrow="Resumo acadêmico"
        title="Sua trajetória em um só lugar"
        description="Um resumo do semestre, das disciplinas em andamento e dos horários demonstrativos."
      />
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Período atual" value="7º semestre" detail="Ingresso em 2023/1" />
        <Metric label="Integralização" value="55%" detail="132 de 240 créditos" />
        <Metric label="Disciplinas no semestre" value="3" detail="12 créditos em andamento" />
        <Metric label="IRA demonstrativo" value="4,2000" detail="Índice ilustrativo" />
      </dl>

      <div className="mt-6">
        <h3 className="mb-3 font-bold text-[#202124]">Horários demonstrativos</h3>
        <div className="overflow-x-auto pb-2">
          <div className="grid w-max grid-cols-[repeat(5,224px)] gap-3">
            {scheduleByDay.map(({ day, classes }) => (
              <section
                key={day}
                aria-labelledby={`schedule-${day.toLowerCase()}`}
                className="rounded-2xl border border-[#E8E6F8] bg-white p-4"
              >
                <h4
                  id={`schedule-${day.toLowerCase()}`}
                  className="border-b border-[#E8E6F8] pb-2 font-bold text-[#202124]"
                >
                  {day}
                </h4>
                <ul className="mt-3">
                  {classes.map((classItem, idx) => (
                    <li
                      key={`${classItem.time}-${classItem.name}`}
                      className={
                        idx > 0 ? "mt-3 border-t border-[#E8E6F8] pt-3" : ""
                      }
                    >
                      <div className="rounded-xl border border-[#E8E6F8] bg-[#F7F7FA] p-3">
                        <p className="text-xs font-bold text-[#5B4BDB]">
                          {classItem.time}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#202124]">
                          {classItem.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">{classItem.place}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DegreeSection({
  importedData,
}: {
  importedData?: HistoricoImportacaoResponse | null;
}) {
  if (importedData) {
    const { carga_horaria: ch, pendentes } = importedData;
    const pct =
      ch.exigido.total > 0
        ? Math.round((ch.integralizado.total / ch.exigido.total) * 100)
        : 0;

    return (
      <div>
        <SectionHeading
          eyebrow="Minha graduação"
          title="Progresso curricular"
          description="Cargas horárias e componentes obrigatórios pendentes extraídos do seu currículo oficial."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            label="Carga integralizada"
            value={`${ch.integralizado.total} h`}
            detail={`De ${ch.exigido.total} h exigidas`}
          />
          <Metric
            label="Carga pendente"
            value={`${ch.pendente.total} h`}
            detail={`${ch.pendente.obrigatorias} h obrig. · ${ch.pendente.optativas} h opt.`}
          />
          <Metric
            label="Conclusão do curso"
            value={`${pct}%`}
            detail={importedData.dados_academicos.curriculo || "Currículo ativo"}
          />
        </div>
        <section className="mt-4 rounded-2xl border border-[#E8E6F8] bg-white p-4 sm:p-5">
          <h3 className="font-bold text-[#202124]">Integralização por requisito</h3>
          <div className="mt-5 space-y-5">
            {ch.exigido.obrigatorias > 0 && (
              <ProgressBar
                label="Carga obrigatória"
                value={ch.integralizado.obrigatorias}
                max={ch.exigido.obrigatorias}
              />
            )}
            {ch.exigido.optativas > 0 && (
              <ProgressBar
                label="Carga optativa"
                value={ch.integralizado.optativas}
                max={ch.exigido.optativas}
              />
            )}
            {ch.exigido.total > 0 && (
              <ProgressBar
                label="Carga horária total"
                value={ch.integralizado.total}
                max={ch.exigido.total}
              />
            )}
          </div>
        </section>
        <section className="mt-4 rounded-2xl border border-[#E8E6F8] bg-white p-4 sm:p-5">
          <h3 className="font-bold text-[#202124]">
            Componentes obrigatórios pendentes ({pendentes.length})
          </h3>
          {pendentes.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">
              Nenhuma pendência obrigatória listada no histórico.
            </p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {pendentes.map((pend) => (
                <li
                  key={pend.codigo}
                  className="flex items-center justify-between gap-2 rounded-xl bg-[#F7F7FA] px-3 py-2.5 text-sm text-gray-700"
                >
                  <span className="truncate">
                    <strong className="text-[#202124]">{pend.codigo}</strong> · {pend.nome}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-[#5B4BDB]">
                    {pend.matriculado ? "Matriculado" : `${pend.ch} h`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  return (
    <div>
      <SectionHeading
        eyebrow="Minha graduação"
        title="Progresso curricular"
        description="Acompanhe créditos, cargas horárias e requisitos que ainda precisam ser cumpridos."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Créditos concluídos" value="132" detail="De 240 previstos" />
        <Metric label="Créditos pendentes" value="108" detail="Obrigatórios e optativos" />
        <Metric label="Conclusão estimada" value="55%" detail="Progresso demonstrativo" />
      </div>
      <section className="mt-4 rounded-2xl border border-[#E8E6F8] bg-white p-4 sm:p-5">
        <h3 className="font-bold text-[#202124]">Integralização por requisito</h3>
        <div className="mt-5 space-y-5">
          <ProgressBar label="Carga obrigatória" value={1920} max={2400} />
          <ProgressBar label="Carga optativa" value={720} max={1200} />
          <ProgressBar
            label="Créditos totais"
            value={132}
            max={240}
            unit="créditos"
          />
        </div>
      </section>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#E8E6F8] bg-white p-4 sm:p-5">
          <h3 className="font-bold text-[#202124]">Pendências curriculares</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li className="rounded-xl bg-[#F7F7FA] px-3 py-2.5">
              Projeto Final de Curso · obrigatório
            </li>
            <li className="rounded-xl bg-[#F7F7FA] px-3 py-2.5">
              Atividades complementares · 120 h restantes
            </li>
            <li className="rounded-xl bg-[#F7F7FA] px-3 py-2.5">
              Optativas · 480 h restantes
            </li>
          </ul>
        </section>
        <section className="rounded-2xl border border-[#E8E6F8] bg-white p-4 sm:p-5">
          <h3 className="font-bold text-[#202124]">Pré-requisitos a conferir</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Projeto Final de Curso depende da conclusão das disciplinas de
            formação específica. Consulte a matriz curricular oficial antes de
            planejar a matrícula.
          </p>
        </section>
      </div>
    </div>
  );
}

export function HistorySection({
  importedData,
}: {
  importedData?: HistoricoImportacaoResponse | null;
}) {
  const realRows = useMemo(
    () =>
      importedData
        ? [...importedData.cursadas, ...importedData.cursando].map((c) => ({
            semester: c.semestre,
            code: c.codigo,
            name: c.nome,
            turma: c.turma || "—",
            mention: c.mencao || "—",
            attendance:
              c.frequencia !== null && c.frequencia !== undefined
                ? `${c.frequencia.toFixed(1).replace(".", ",")}%`
                : "—",
            status: c.situacao,
          }))
        : null,
    [importedData]
  );

  const semesters = realRows
    ? [...new Set(realRows.map((r) => r.semester))].sort((a, b) => b.localeCompare(a))
    : [...new Set(disciplineHistory.map(({ semester }) => semester))];
  const [selectedSemester, setSelectedSemester] = useState(semesters[0] ?? "");
  const effectiveSemester = semesters.includes(selectedSemester)
    ? selectedSemester
    : semesters[0] ?? "";
  const semesterHistory = realRows
    ? realRows.filter((row) => row.semester === effectiveSemester)
    : getDisciplineHistoryForSemester(effectiveSemester);

  return (
    <div>
      <SectionHeading
        eyebrow="Histórico acadêmico"
        title="Histórico por semestre"
        description="Selecione um semestre para consultar as disciplinas, menções e frequências correspondentes."
      />
      <div className="mb-4 flex flex-col gap-2 sm:max-w-xs">
        <label
          htmlFor="history-semester"
          className="text-sm font-semibold text-[#202124]"
        >
          Semestre
        </label>
        <select
          id="history-semester"
          value={effectiveSemester}
          onChange={(event) => setSelectedSemester(event.target.value)}
          className="rounded-xl border border-[#D8D4F5] bg-white px-3 py-2.5 text-sm font-semibold text-[#202124] outline-none focus:border-[#5B4BDB] focus:ring-2 focus:ring-[#5B4BDB]/20"
        >
          {semesters.map((semester) => (
            <option key={semester} value={semester}>
              {semester}
            </option>
          ))}
        </select>
      </div>
      <p className="mb-3 text-sm text-gray-600" aria-live="polite">
        {semesterHistory.length}{" "}
        {semesterHistory.length === 1 ? "disciplina" : "disciplinas"} em{" "}
        <span className="font-semibold text-[#202124]">{effectiveSemester}</span>
      </p>
      <div className="overflow-x-auto rounded-2xl border border-[#E8E6F8] bg-white">
        <table className="min-w-[700px] w-full border-collapse text-left text-sm">
          <caption className="sr-only">
            {realRows
              ? `Histórico acadêmico oficial do semestre ${effectiveSemester}`
              : `Histórico acadêmico demonstrativo do semestre ${effectiveSemester}`}
          </caption>
          <thead className="bg-[#F7F7FA] text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Disciplina</th>
              <th scope="col" className="px-4 py-3 font-semibold">Menção</th>
              <th scope="col" className="px-4 py-3 font-semibold">Frequência</th>
              <th scope="col" className="px-4 py-3 font-semibold">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {semesterHistory.map((row, index) => (
              <tr key={`${row.semester}-${row.code}-${row.status}-${index}`}>
                <td className="px-4 py-3">
                  <span className="block font-semibold text-[#202124]">{row.name}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">{row.code}</span>
                </td>
                <td className="px-4 py-3 font-semibold text-[#202124]">{row.mention}</td>
                <td className="px-4 py-3 text-gray-700">{row.attendance}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      row.status === "Aprovada" || row.status === "APR" || row.status === "CUMP"
                        ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                        : row.status === "MATR"
                          ? "rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--primary-text)]"
                          : "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800"
                    }
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!realRows && (
        <p className="mt-3 text-xs leading-5 text-gray-500">
          Menções, notas e frequência são fictícias. O sistema não possui acesso
          ao histórico acadêmico individual; consulte o SIGAA para verificar seus
          dados oficiais.
        </p>
      )}
    </div>
  );
}

function PerformanceSection({
  importedData,
}: {
  importedData?: HistoricoImportacaoResponse | null;
}) {
  if (importedData) {
    const { dados_academicos: dados, cursadas } = importedData;
    const aprovadasSituacoes = new Set(["APR", "CUMP", "DISP"]);
    const elegiveis = cursadas.filter((c) => c.situacao !== "DISP");
    const totalAprovadas = elegiveis.filter((c) => aprovadasSituacoes.has(c.situacao)).length;
    const taxaGeral =
      elegiveis.length > 0 ? Math.round((totalAprovadas / elegiveis.length) * 100) : 0;

    const porSemestre = new Map<string, { total: number; apr: number }>();
    for (const item of elegiveis) {
      const atual = porSemestre.get(item.semestre) ?? { total: 0, apr: 0 };
      atual.total += 1;
      if (aprovadasSituacoes.has(item.situacao)) atual.apr += 1;
      porSemestre.set(item.semestre, atual);
    }
    const serieSemestres = [...porSemestre.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([semester, info]) => ({
        semester,
        approvals: Math.round((info.apr / info.total) * 100),
      }));

    return (
      <div>
        <SectionHeading
          eyebrow="Desempenho"
          title="Evolução acadêmica"
          description="Índices oficiais (IRA e MP) e taxa de aprovação por semestre extraídos do seu histórico."
        />
        <dl className="grid gap-3 sm:grid-cols-3">
          <Metric
            label="IRA oficial"
            value={dados.ira !== null ? dados.ira.toFixed(4).replace(".", ",") : "—"}
            detail="Índice de Rendimento Acadêmico"
          />
          <Metric
            label="MP oficial"
            value={dados.mp !== null ? dados.mp.toFixed(4).replace(".", ",") : "—"}
            detail="Média Ponderada"
          />
          <Metric
            label="Taxa de aprovação"
            value={`${taxaGeral}%`}
            detail={`${totalAprovadas} de ${elegiveis.length} componentes`}
          />
        </dl>
        <section className="mt-4 rounded-2xl border border-[#E8E6F8] bg-white p-4 sm:p-5">
          <h3 className="font-bold text-[#202124]">Aprovações por semestre</h3>
          <p className="mt-1 text-xs text-gray-500">
            Percentual de componentes aprovados em cada semestre cursado.
          </p>
          <ul className="mt-5 space-y-4">
            {serieSemestres.map(({ semester, approvals }) => (
              <li key={semester} className="grid grid-cols-[3.5rem_1fr_3rem] items-center gap-3">
                <span className="text-xs font-medium text-gray-600">{semester}</span>
                <div
                  role="img"
                  aria-label={`${semester}: ${approvals}% de aprovação`}
                  className="h-2.5 overflow-hidden rounded-full bg-[#E8E6F8]"
                >
                  <div
                    className="h-full rounded-full bg-[#5B4BDB]"
                    style={{ width: `${approvals}%` }}
                  />
                </div>
                <span className="text-right text-xs font-bold text-[#5142C5]">
                  {approvals}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  return (
    <div>
      <SectionHeading
        eyebrow="Desempenho"
        title="Evolução acadêmica"
        description="Indicadores demonstrativos para acompanhar tendências, sem substituir o histórico oficial."
      />
      <dl className="grid gap-3 sm:grid-cols-3">
        <Metric label="IRA demonstrativo" value="4,20" detail="Escala ilustrativa" />
        <Metric label="MP demonstrativa" value="8,50" detail="Média parcial fictícia" />
        <Metric label="Aprovações" value="89%" detail="No último semestre demonstrativo" />
      </dl>
      <section className="mt-4 rounded-2xl border border-[#E8E6F8] bg-white p-4 sm:p-5">
        <h3 className="font-bold text-[#202124]">Aprovações por semestre</h3>
        <p className="mt-1 text-xs text-gray-500">
          Percentual de disciplinas aprovadas em cada semestre fictício.
        </p>
        <ul className="mt-5 space-y-4">
          {semesterPerformance.map(({ semester, approvals }) => (
            <li key={semester} className="grid grid-cols-[3.5rem_1fr_3rem] items-center gap-3">
              <span className="text-xs font-medium text-gray-600">{semester}</span>
              <div
                role="img"
                aria-label={`${semester}: ${approvals}% de aprovação demonstrativa`}
                className="h-2.5 overflow-hidden rounded-full bg-[#E8E6F8]"
              >
                <div
                  className="h-full rounded-full bg-[#5B4BDB]"
                  style={{ width: `${approvals}%` }}
                />
              </div>
              <span className="text-right text-xs font-bold text-[#5142C5]">
                {approvals}%
              </span>
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-3 text-xs leading-5 text-gray-500">
        IRA e MP são informações sensíveis. Estes valores não são reais nem
        obtidos de uma conta de estudante.
      </p>
    </div>
  );
}

function renderSection(
  sectionId: ProfileSectionId,
  importedData?: HistoricoImportacaoResponse | null
): ReactNode {
  switch (sectionId) {
    case "overview":
      return <OverviewSection importedData={importedData} />;
    case "degree":
      return <DegreeSection importedData={importedData} />;
    case "history":
      return <HistorySection importedData={importedData} />;
    case "performance":
      return <PerformanceSection importedData={importedData} />;
    case "security":
      return <SecurityTabContent />;
  }
}

export function getAdjacentProfileSection(
  currentIndex: number,
  key: string
): number | null {
  if (key === "Home") return 0;
  if (key === "End") return profileSections.length - 1;
  if (key === "ArrowRight") return (currentIndex + 1) % profileSections.length;
  if (key === "ArrowLeft") {
    return (currentIndex - 1 + profileSections.length) % profileSections.length;
  }
  return null;
}

export default function AcademicProfileDashboard({
  consented,
  onConsent,
  onRevokeConsent,
  importedData = null,
  initialSection = "overview",
}: AcademicProfileDashboardProps) {
  const [activeSection, setActiveSection] =
    useState<ProfileSectionId>(initialSection);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeSectionIndex = profileSections.findIndex(
    (section) => section.id === activeSection
  );
  const isSecurity = activeSection === "security";
  const canShowContent = consented || Boolean(importedData) || isSecurity;

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) {
    const nextIndex = getAdjacentProfileSection(index, event.key);
    if (nextIndex === null) return;

    event.preventDefault();
    const nextSection = profileSections[nextIndex];
    setActiveSection(nextSection.id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <section
      aria-label="Painel acadêmico"
      className="rounded-3xl border border-[#E8E6F8] bg-white p-4 shadow-xs sm:p-6 lg:p-7"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5B4BDB]">
            Acompanhamento acadêmico
          </p>
          <h2 className="mt-1 text-xl font-bold text-[#202124] sm:text-2xl">
            Minha vida universitária
          </h2>
        </div>
        {!importedData && consented && (
          <button
            type="button"
            onClick={onRevokeConsent}
            className="w-fit rounded-xl border border-[#D8D4F5] px-3 py-2 text-sm font-semibold text-[#5B4BDB] transition-colors hover:bg-[#F7F7FA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4BDB] focus-visible:ring-offset-2"
          >
            Ocultar demonstração
          </button>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Seções do perfil acadêmico"
        className="-mx-1 mt-5 flex gap-1 overflow-x-auto px-1 pb-2"
      >
        {profileSections.map((section, index) => (
          <button
            key={section.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={`profile-tab-${section.id}`}
            type="button"
            role="tab"
            aria-selected={activeSection === section.id}
            aria-controls="profile-tabpanel"
            tabIndex={activeSection === section.id ? 0 : -1}
            onClick={() => setActiveSection(section.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            className={`shrink-0 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4BDB] focus-visible:ring-offset-2 ${
              activeSection === section.id
                ? "bg-[#5B4BDB] text-white"
                : "text-gray-600 hover:bg-[#F0EEFF] hover:text-[#5142C5]"
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      <div
        id="profile-tabpanel"
        role="tabpanel"
        aria-labelledby={`profile-tab-${activeSection}`}
        tabIndex={0}
        className="mt-4 min-h-72 border-t border-gray-100 pt-5 focus:outline-none"
      >
        {!canShowContent ? (
          <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-[#B8B1ED] bg-[#F8F7FF] p-5 sm:p-7">
            <h3 className="font-bold text-[#29234D]">
              Visualize o painel demonstrativo
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              As seções contêm exemplos fictícios de trajetória, histórico,
              desempenho e rotina acadêmica. Não consultamos o SIGAA, não usamos
              dados reais e esta autorização vale somente durante esta visita.
            </p>
            <button
              type="button"
              onClick={onConsent}
              className="mt-4 rounded-xl bg-[#5B4BDB] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4F3EC9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4BDB] focus-visible:ring-offset-2"
            >
              Concordar e abrir demonstração
            </button>
          </div>
        ) : (
          renderSection(activeSection, importedData)
        )}
      </div>
      <p className="mt-5 border-t border-gray-100 pt-3 text-xs leading-5 text-gray-500">
        {importedData
          ? "Dados reais extraídos do seu Histórico Escolar do SIGAA/UnB e salvos localmente neste navegador."
          : "Protótipo: todos os dados acadêmicos são fictícios. Nenhuma integração com o SIGAA está ativa."}
      </p>
      <span className="sr-only" aria-live="polite">
        Seção {profileSections[activeSectionIndex].label} selecionada
      </span>
    </section>
  );
}
