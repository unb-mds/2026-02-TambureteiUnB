"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

export interface AcademicProfileDashboardProps {
  consented: boolean;
  onConsent: () => void;
  onRevokeConsent: () => void;
}

const profileSections = [
  { id: "overview", label: "Visão geral" },
  { id: "degree", label: "Minha graduação" },
  { id: "disciplines", label: "Disciplinas" },
  { id: "history", label: "Histórico" },
  { id: "performance", label: "Desempenho" },
  { id: "schedule", label: "Horários" },
  { id: "planning", label: "Planejamento" },
  { id: "community", label: "Comunidade" },
] as const;

type ProfileSectionId = (typeof profileSections)[number]["id"];

const currentDisciplines = [
  {
    code: "DSW-301",
    name: "Engenharia de Software Experimental",
    credits: 4,
    hours: 60,
    status: "Em andamento",
    prerequisite: "Requisitos de Software",
    professor: "Docente demonstrativo",
  },
  {
    code: "DSW-305",
    name: "Banco de Dados",
    credits: 4,
    hours: 60,
    status: "Em andamento",
    prerequisite: "Estruturas de Dados",
    professor: "Docente demonstrativo",
  },
  {
    code: "DSW-309",
    name: "Sistemas de Informação",
    credits: 4,
    hours: 60,
    status: "Em andamento",
    prerequisite: "Nenhum",
    professor: "Docente demonstrativo",
  },
];

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

const planningItems = [
  {
    date: "20 nov",
    category: "Avaliação",
    title: "Exercício de modelagem de dados",
    course: "Banco de Dados",
  },
  {
    date: "24 nov",
    category: "Entrega",
    title: "Relatório de projeto",
    course: "Engenharia de Software Experimental",
  },
  {
    date: "02 dez",
    category: "Avaliação",
    title: "Apresentação do seminário",
    course: "Sistemas de Informação",
  },
];

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

function OverviewSection() {
  return (
    <div>
      <SectionHeading
        eyebrow="Resumo acadêmico"
        title="Sua trajetória em um só lugar"
        description="Um resumo do semestre, do progresso curricular e dos próximos compromissos."
      />
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Período atual" value="7º semestre" detail="Ingresso em 2023/1" />
        <Metric label="Integralização" value="55%" detail="132 de 240 créditos" />
        <Metric label="Disciplinas no semestre" value="3" detail="12 créditos em andamento" />
        <Metric label="Próximo compromisso" value="20 nov" detail="Exercício · Banco de Dados" />
      </dl>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-[#E8E6F8] bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-[#202124]">Semestre 2026/2</h3>
              <p className="mt-1 text-xs text-gray-500">
                Três disciplinas em andamento, conforme dados demonstrativos.
              </p>
            </div>
            <span className="rounded-full bg-[#F0EEFF] px-2.5 py-1 text-xs font-semibold text-[#5142C5]">
              Graduação
            </span>
          </div>
          <ul className="mt-4 divide-y divide-gray-100">
            {currentDisciplines.map((discipline) => (
              <li
                key={discipline.code}
                className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-[#202124]">
                    {discipline.name}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {discipline.code} · {discipline.credits} créditos
                  </p>
                </div>
                <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Em andamento
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-[#E8E6F8] bg-white p-4 sm:p-5">
          <h3 className="font-bold text-[#202124]">Próximos compromissos</h3>
          <ul className="mt-3 space-y-3">
            {planningItems.slice(0, 2).map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="flex h-11 min-w-12 items-center justify-center rounded-xl bg-[#F0EEFF] px-2 text-xs font-bold text-[#5142C5]">
                  {item.date}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#202124]">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {item.category} · {item.course}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-gray-100 pt-3 text-xs leading-5 text-gray-500">
            Datas ilustrativas. O Tamburetei ainda não importa compromissos do
            SIGAA.
          </p>
        </section>
      </div>
    </div>
  );
}

function DegreeSection() {
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

function DisciplinesSection() {
  return (
    <div>
      <SectionHeading
        eyebrow="Disciplinas"
        title="Situação das disciplinas"
        description="Consulte disciplinas em andamento e exemplos de situações acadêmicas."
      />
      <div className="space-y-3">
        {currentDisciplines.map((discipline) => (
          <article
            key={discipline.code}
            className="rounded-2xl border border-[#E8E6F8] bg-white p-4 sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-[#5B4BDB]">
                  {discipline.code} · {discipline.credits} créditos ·{" "}
                  {discipline.hours} h
                </p>
                <h3 className="mt-1 font-bold text-[#202124]">
                  {discipline.name}
                </h3>
              </div>
              <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {discipline.status}
              </span>
            </div>
            <dl className="mt-4 grid gap-3 border-t border-gray-100 pt-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-gray-500">
                  Pré-requisito
                </dt>
                <dd className="mt-1 text-gray-700">{discipline.prerequisite}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500">Docente</dt>
                <dd className="mt-1 text-gray-700">{discipline.professor}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <p className="mt-4 rounded-xl bg-white px-4 py-3 text-xs leading-5 text-gray-500">
        A situação atual não é consultada no SIGAA. Histórico de trancamentos,
        reprovações e aprovações depende de integração futura.
      </p>
    </div>
  );
}

function HistorySection() {
  return (
    <div>
      <SectionHeading
        eyebrow="Histórico acadêmico"
        title="Disciplinas cursadas"
        description="Exemplo de como menção, frequência e situação podem ser organizadas por semestre."
      />
      <div className="overflow-x-auto rounded-2xl border border-[#E8E6F8] bg-white">
        <table className="min-w-[700px] w-full border-collapse text-left text-sm">
          <caption className="sr-only">
            Histórico acadêmico demonstrativo por disciplina
          </caption>
          <thead className="bg-[#F7F7FA] text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Semestre</th>
              <th scope="col" className="px-4 py-3 font-semibold">Disciplina</th>
              <th scope="col" className="px-4 py-3 font-semibold">Menção</th>
              <th scope="col" className="px-4 py-3 font-semibold">Frequência</th>
              <th scope="col" className="px-4 py-3 font-semibold">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {disciplineHistory.map((row) => (
              <tr key={`${row.semester}-${row.code}`}>
                <th scope="row" className="whitespace-nowrap px-4 py-3 font-semibold text-gray-700">
                  {row.semester}
                </th>
                <td className="px-4 py-3">
                  <span className="block font-semibold text-[#202124]">{row.name}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">{row.code}</span>
                </td>
                <td className="px-4 py-3 font-semibold text-[#202124]">{row.mention}</td>
                <td className="px-4 py-3 text-gray-700">{row.attendance}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      row.status === "Aprovada"
                        ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
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
      <p className="mt-3 text-xs leading-5 text-gray-500">
        Menções, notas e frequência são fictícias. O sistema não possui acesso
        ao histórico acadêmico individual.
      </p>
    </div>
  );
}

function PerformanceSection() {
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

function ScheduleSection() {
  return (
    <div>
      <SectionHeading
        eyebrow="Horários"
        title="Organização semanal"
        description="Uma visão rápida de aulas e locais para apoiar o planejamento da semana."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {scheduleByDay.map(({ day, classes }) => (
          <section
            key={day}
            aria-labelledby={`schedule-${day.toLowerCase()}`}
            className="rounded-2xl border border-[#E8E6F8] bg-white p-4"
          >
            <h3
              id={`schedule-${day.toLowerCase()}`}
              className="font-bold text-[#202124]"
            >
              {day}
            </h3>
            <ul className="mt-3 space-y-2">
              {classes.map((classItem) => (
                <li
                  key={`${classItem.time}-${classItem.name}`}
                  className="rounded-xl bg-[#F7F7FA] p-3"
                >
                  <p className="text-xs font-bold text-[#5B4BDB]">
                    {classItem.time}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#202124]">
                    {classItem.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{classItem.place}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-gray-500">
        Grade horária inteiramente fictícia. Horários e salas oficiais dependem
        de uma fonte de dados futura.
      </p>
    </div>
  );
}

function PlanningSection() {
  return (
    <div>
      <SectionHeading
        eyebrow="Planejamento"
        title="Próximas datas"
        description="Avaliações e entregas reunidas em uma agenda simples para ajudar na organização."
      />
      <ol className="space-y-3">
        {planningItems.map((item, index) => (
          <li
            key={item.title}
            className="flex gap-4 rounded-2xl border border-[#E8E6F8] bg-white p-4 sm:items-center"
          >
            <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-[#F0EEFF] py-2">
              <span className="text-lg font-extrabold leading-tight text-[#5142C5]">
                {item.date.split(" ")[0]}
              </span>
              <span className="text-[10px] font-bold uppercase text-[#5142C5]">
                {item.date.split(" ")[1]}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#5B4BDB]">
                {item.category} · {item.course}
              </p>
              <h3 className="mt-1 font-bold text-[#202124]">{item.title}</h3>
            </div>
            <span className="hidden text-xs text-gray-400 sm:block">
              Item {index + 1}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-4 rounded-xl border border-dashed border-[#D8D4F5] bg-white px-4 py-3 text-sm leading-6 text-gray-600">
        Datas de exemplo. Calendário acadêmico e atividades pessoais ainda não
        estão conectados.
      </div>
    </div>
  );
}

function CommunitySection() {
  const contributions = [
    { label: "Disciplinas avaliadas", value: "12" },
    { label: "Comentários publicados", value: "24" },
    { label: "Materiais compartilhados", value: "8" },
    { label: "Resumos publicados", value: "5" },
  ];

  return (
    <div>
      <SectionHeading
        eyebrow="Comunidade Tamburetei"
        title="Suas contribuições"
        description="Acompanhe como sua participação ajuda outras pessoas a escolher e cursar disciplinas."
      />
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {contributions.map(({ label, value }) => (
          <Metric key={label} label={label} value={value} />
        ))}
      </dl>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#E8E6F8] bg-white p-4 sm:p-5">
          <h3 className="font-bold text-[#202124]">Disciplinas favoritas</h3>
          <ul className="mt-3 space-y-2">
            {["Requisitos de Software", "Banco de Dados", "Cálculo 1"].map(
              (discipline) => (
                <li
                  key={discipline}
                  className="rounded-xl bg-[#F7F7FA] px-3 py-2.5 text-sm font-medium text-gray-700"
                >
                  {discipline}
                </li>
              )
            )}
          </ul>
        </section>
        <section className="rounded-2xl border border-[#E8E6F8] bg-white p-4 sm:p-5">
          <h3 className="font-bold text-[#202124]">Reputação na comunidade</h3>
          <p className="mt-2 text-3xl font-extrabold text-[#5B4BDB]">180</p>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Pontos demonstrativos por avaliações e materiais compartilhados.
          </p>
        </section>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Atividade ilustrativa, sem vínculo com uma conta real.
      </p>
    </div>
  );
}

const sectionContent: Record<ProfileSectionId, () => ReactNode> = {
  overview: OverviewSection,
  degree: DegreeSection,
  disciplines: DisciplinesSection,
  history: HistorySection,
  performance: PerformanceSection,
  schedule: ScheduleSection,
  planning: PlanningSection,
  community: CommunitySection,
};

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
}: AcademicProfileDashboardProps) {
  const [activeSection, setActiveSection] =
    useState<ProfileSectionId>("overview");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeSectionIndex = profileSections.findIndex(
    (section) => section.id === activeSection
  );
  const ActiveSection = sectionContent[activeSection];

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
        {consented && (
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
        {!consented ? (
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
          <ActiveSection />
        )}
      </div>
      <p className="mt-5 border-t border-gray-100 pt-3 text-xs leading-5 text-gray-500">
        Protótipo: todos os dados acadêmicos são fictícios. Nenhuma integração
        com o SIGAA está ativa.
      </p>
      <span className="sr-only" aria-live="polite">
        Seção {profileSections[activeSectionIndex].label} selecionada
      </span>
    </section>
  );
}
