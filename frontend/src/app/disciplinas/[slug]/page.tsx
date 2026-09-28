"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StoolIllustration from "@/components/StoolIllustration";
import { getDisciplineBySlug, DEFAULT_HISTORICAL_PERFORMANCE } from "@/mocks/disciplines";

export default function DisciplineDetailPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : "";

  const [period, setPeriod] = useState("Todos os semestres (2020 a 2025)");
  const [completed, setCompleted] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);

  // Busca detalhes da disciplina a partir do slug
  const discipline = useMemo(() => {
    if (!slug) return undefined;
    return getDisciplineBySlug(slug);
  }, [slug]);

  if (!discipline) {
    return (
      <div className="min-h-screen bg-[#F7F7FA] flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-3xl border border-[#EDE9FD] p-12 shadow-xs">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EDE9FD]">
                <StoolIllustration size={44} />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[#202124]">Disciplina não encontrada</h1>
            <p className="mt-2 text-sm text-gray-500">
              Não encontramos uma disciplina correspondente ao código ou slug informado ({slug}).
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/disciplinas"
                className="inline-flex items-center gap-2 rounded-xl bg-[#5B4BDB] px-6 py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
              >
                ← Voltar para Disciplinas
              </Link>
              <Link
                href="/cursos"
                className="inline-flex items-center gap-2 rounded-xl border border-[#5B4BDB] bg-white px-6 py-3 text-sm font-semibold text-[#5B4BDB] transition-all hover:bg-[#5B4BDB]/5"
              >
                Ver Cursos
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const performanceList = discipline.historicalPerformance || DEFAULT_HISTORICAL_PERFORMANCE;

  const metrics = [
    {
      label: "Taxa de Aprovação",
      value: `${discipline.approval}%`,
      count: "312 alunos",
      color: "#067A59",
      iconColor: "#10B981",
      background: "#E9F9F3",
      icon: (
        <path
          d="M5 10.5l3 3L15 6.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ),
    },
    {
      label: "Reprovação por Nota",
      value: `${discipline.failedGrade || 14.2}%`,
      count: "56 alunos",
      color: "#C52C2C",
      iconColor: "#EF4444",
      background: "#FFF0F0",
      icon: (
        <path
          d="M5 6l4 4 3-3 4 4M13 11h3V8"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ),
    },
    {
      label: "Reprovação por Falta",
      value: `${discipline.failedAttendance || 4.8}%`,
      count: "19 alunos",
      color: "#9A5700",
      iconColor: "#F59E0B",
      background: "#FFF7E8",
      icon: (
        <>
          <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10 6.5V10l2.5 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </>
      ),
    },
    {
      label: "Trancamentos",
      value: `${discipline.withdrawn || 2.6}%`,
      count: "10 alunos",
      color: "#526174",
      iconColor: "#64748B",
      background: "#F1F5F9",
      icon: <path d="M7 6v8M13 6v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F7FA] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pb-16">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 pt-6 max-w-7xl">
          {/* Breadcrumb de navegação */}
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-500" aria-label="Navegação estrutural">
            <Link href="/" className="hover:text-[#5B4BDB] transition-colors">
              Início
            </Link>
            <span className="text-[#C4C1D8]">›</span>
            <Link href="/disciplinas" className="hover:text-[#5B4BDB] transition-colors">
              Disciplinas
            </Link>
            <span className="text-[#C4C1D8]">›</span>
            {discipline.courses && discipline.courses.length > 0 ? (
              <>
                <Link
                  href={`/cursos/${discipline.courses[0].slug}`}
                  className="hover:text-[#5B4BDB] transition-colors"
                >
                  {discipline.courses[0].name}
                </Link>
                <span className="text-[#C4C1D8]">›</span>
              </>
            ) : null}
            <span className="font-semibold text-[#202124]">{discipline.name}</span>
          </nav>

          {/* Banner de cabeçalho da disciplina */}
          <section className="mb-6 rounded-3xl bg-white px-6 sm:px-8 py-8 border border-[#E8E6F8] shadow-xs">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
              <div className="max-w-4xl">
                {/* Badges de Identificação */}
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-lg bg-[#EDE9FD] px-3 py-1.5 text-xs font-bold text-[#5B4BDB]">
                    {discipline.code}
                  </span>
                  <span className="rounded-lg bg-[#F1F0F8] px-3 py-1.5 text-xs font-semibold text-[#514A64]">
                    {discipline.departmentName}
                  </span>
                  <span className="rounded-lg bg-[#F1F0F8] px-3 py-1.5 text-xs font-semibold text-[#514A64]">
                    {discipline.credits}
                  </span>
                  {discipline.semester && (
                    <span className="rounded-lg bg-[#FFF8D8] px-3 py-1.5 text-xs font-semibold text-[#806300]">
                      {discipline.semester} • {discipline.type || "Obrigatória"}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold text-[#202124] tracking-tight leading-tight">
                  {discipline.name}
                </h1>
                <p className="mt-3 max-w-3xl text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Conheça a ementa, os objetivos e o histórico de desempenho da disciplina antes de planejar seu semestre.
                </p>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto pt-2">
                <button
                  type="button"
                  onClick={() => setCompleted(!completed)}
                  aria-pressed={completed}
                  className={`flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs sm:text-sm font-semibold transition-all ${
                    completed
                      ? "bg-[#E9F9F3] text-[#067A59] border border-[#A7E6CF]"
                      : "bg-[#EDE9FD] text-[#5B4BDB] border border-[#D8D1FA] hover:bg-[#5B4BDB]/15"
                  }`}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path
                      d="M2.5 6.5L9 3l6.5 3.5L9 10 2.5 6.5Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5 8.2v3.3c1.2 1.6 6.8 1.6 8 0V8.2M15.5 7v4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  {completed ? "Matéria cursada" : "Já cursei essa matéria"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowMaterialModal(true)}
                  className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-[#5B4BDB] px-5 py-3 text-xs sm:text-sm font-bold text-white transition-all hover:brightness-110 shadow-xs active:scale-95"
                >
                  <span className="text-base leading-none">+</span>
                  Adicionar material
                </button>
              </div>
            </div>
          </section>

          {/* Modal de confirmação ao adicionar material */}
          {showMaterialModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-[#EDE9FD]">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h3 className="font-bold text-lg text-[#202124]">Compartilhar Material</h3>
                  <button
                    onClick={() => setShowMaterialModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    ✕
                  </button>
                </div>
                <p className="mt-4 text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Ajude outros estudantes compartilhando resumos, listas de exercícios ou provas antigas de <strong>{discipline.name}</strong>.
                </p>
                <div className="mt-4 rounded-xl bg-[#F7F7FA] p-3 text-xs text-gray-500">
                  💡 Os materiais passam por revisão da moderação discente para garantir a qualidade acadêmica.
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowMaterialModal(false)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      alert("Upload de materiais disponível em breve!");
                      setShowMaterialModal(false);
                    }}
                    className="rounded-xl bg-[#5B4BDB] px-4 py-2 text-xs font-semibold text-white hover:brightness-110"
                  >
                    Selecionar Arquivo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Seção Ementa e Objetivos */}
          <section className="mb-6 rounded-3xl bg-white p-6 sm:p-8 border border-[#E8E6F8] shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              {/* Ementa Oficial */}
              <div className="md:border-r border-[#E8E6F8] md:pr-8 lg:pr-12">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDE9FD] text-[#5B4BDB]">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path
                        d="M4 3.5h9.5A2.5 2.5 0 0 1 16 6v10.5H6.5A2.5 2.5 0 0 1 4 14V3.5Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M4 14a2.5 2.5 0 0 1 2.5-2.5H16"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#202124]">Ementa Oficial</h2>
                </div>
                <p className="text-xs sm:text-sm text-[#545864] leading-relaxed">
                  {discipline.ementa ||
                    "Ementa oficial cadastrada junto ao decanato de graduação e matriz curricular da Universidade de Brasília."}
                </p>

                {/* Pré-requisitos & Equivalências */}
                {(discipline.preRequisitos || discipline.equivalencias) && (
                  <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col gap-3">
                    {discipline.preRequisitos && discipline.preRequisitos.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                          Pré-requisitos:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {discipline.preRequisitos.map((req) => (
                            <span
                              key={req}
                              className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                            >
                              {req}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {discipline.equivalencias && discipline.equivalencias.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                          Equivalências:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {discipline.equivalencias.map((eq) => (
                            <span
                              key={eq}
                              className="rounded-md bg-purple-50 px-2 py-0.5 text-xs text-purple-700"
                            >
                              {eq}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Objetivos do Programa */}
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF8D8] text-[#806300]">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                      <path
                        d="M7 10l2 2 4-4"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#202124]">Objetivos do Programa</h2>
                </div>
                <ul className="flex flex-col gap-3.5">
                  {(discipline.objectives || [
                    "Compreender e comparar conceitos fundamentais e teorias estruturantes.",
                    "Planejar e aplicar métodos práticos em resolução de problemas reais.",
                    "Elicitar e sintetizar conteúdos de modo iterativo e colaborativo.",
                    "Desenvolver autonomia acadêmica e postura crítica na área.",
                  ]).map((objective) => (
                    <li key={objective} className="flex items-start gap-3 text-xs sm:text-sm text-[#545864] leading-relaxed">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#7C6CF0]" />
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Seção Estatísticas Históricas e Painel de Desempenho */}
          <section className="rounded-3xl bg-white p-6 sm:p-8 border border-[#E8E6F8] shadow-xs">
            {/* Cabeçalho do Painel */}
            <div className="mb-7 flex flex-col md:flex-row md:items-start justify-between gap-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#202124]">
                  Painel de Desempenho e Estatísticas Históricas
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-gray-500">
                  Dados consolidados via DPO/INEP e registros da comunidade discente da UnB
                </p>
              </div>

              <label className="flex w-full sm:w-72 flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Período analisado
                </span>
                <div className="relative">
                  <select
                    value={period}
                    onChange={(event) => setPeriod(event.target.value)}
                    className="w-full appearance-none rounded-xl bg-[#F7F7FA] border border-[#DDD9F1] px-4 py-2.5 pr-10 text-xs sm:text-sm font-medium text-[#202124] outline-none focus:border-[#5B4BDB]"
                  >
                    <option>Todos os semestres (2020 a 2025)</option>
                    <option>Últimos 2 anos</option>
                    <option>2025/2</option>
                  </select>
                  <svg
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 6l4 4 4-4"
                      stroke="#6B7280"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </label>
            </div>

            {/* 4 Cards de Métricas */}
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl p-5 border"
                  style={{
                    background: metric.background,
                    borderColor: `${metric.iconColor}33`,
                  }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-2xs"
                      style={{ color: metric.iconColor }}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        {metric.icon}
                      </svg>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: metric.color }}>
                      {metric.count}
                    </span>
                  </div>
                  <div
                    className="text-2xl sm:text-3xl font-extrabold"
                    style={{ color: metric.color, fontFamily: "Poppins, sans-serif" }}
                  >
                    {metric.value}
                  </div>
                  <p className="mt-1 text-xs sm:text-sm font-semibold text-gray-700">{metric.label}</p>
                </div>
              ))}
            </div>

            {/* Visualização de Evolução Semestral (Stacked Bar Chart) */}
            <div className="rounded-2xl bg-[#FAFAFC] p-5 sm:p-6 border border-[#ECEAF5]">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#202124]">Evolução semestral</h3>
                  <p className="mt-0.5 text-xs text-gray-500">Distribuição percentual dos resultados por semestre</p>
                </div>
                <span className="self-start sm:self-auto rounded-full bg-[#EDE9FD] px-3 py-1 text-xs font-semibold text-[#5B4BDB]">
                  Base acumulada: 397 matrículas
                </span>
              </div>

              {/* Área do Gráfico */}
              <div className="flex h-64 gap-3 sm:gap-5">
                {/* Eixo Y */}
                <div className="flex w-8 sm:w-10 flex-col justify-between pb-7 text-right text-[11px] font-medium text-gray-500">
                  <span>100%</span>
                  <span>75%</span>
                  <span>50%</span>
                  <span>25%</span>
                  <span>0%</span>
                </div>

                {/* Linhas de grade e Barras */}
                <div className="relative flex flex-1 items-end justify-around border-b border-l border-[#DCD9E9] px-2 sm:px-8 pb-7">
                  {[25, 50, 75, 100].map((line) => (
                    <div
                      key={line}
                      className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-[#E4E2EC]"
                      style={{ bottom: `${line}%` }}
                    />
                  ))}

                  {performanceList.map((item) => (
                    <div
                      key={item.semester}
                      className="relative z-10 flex h-full w-10 sm:w-16 flex-col items-center justify-end group"
                    >
                      {/* Tooltip com dados no hover */}
                      <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gray-900 text-white text-[10px] rounded-lg px-2 py-1 whitespace-nowrap z-20 shadow-md">
                        {item.semester}: {item.approved}% aprov.
                      </div>

                      {/* Barra empilhada */}
                      <div
                        className="flex h-full w-8 sm:w-10 flex-col-reverse overflow-hidden rounded-t-lg transition-transform group-hover:scale-y-102"
                        aria-label={`${item.semester}: ${item.approved}% aprovação, ${item.failed}% reprovação por nota`}
                      >
                        <div style={{ height: `${item.approved}%`, background: "#10B981" }} title={`Aprovação: ${item.approved}%`} />
                        <div style={{ height: `${item.failed}%`, background: "#EF4444" }} title={`Reprovação por nota: ${item.failed}%`} />
                        <div style={{ height: `${item.absent}%`, background: "#F59E0B" }} title={`Reprovação por falta: ${item.absent}%`} />
                        <div style={{ height: `${item.withdrawn}%`, background: "#94A3B8" }} title={`Trancamento: ${item.withdrawn}%`} />
                      </div>

                      {/* Rótulo do semestre */}
                      <span className="absolute -bottom-6 whitespace-nowrap text-[11px] font-medium text-gray-600">
                        {item.semester}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legenda do Gráfico */}
              <div className="mt-8 flex flex-wrap justify-center gap-4 sm:gap-7 pt-2">
                {[
                  ["Aprovação", "#10B981"],
                  ["Reprovação por nota", "#EF4444"],
                  ["Reprovação por falta", "#F59E0B"],
                  ["Trancamento", "#94A3B8"],
                ].map(([label, color]) => (
                  <div key={label} className="flex items-center gap-2 text-xs font-medium text-gray-600">
                    <span className="h-2.5 w-2.5 rounded-xs" style={{ background: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Aviso de Respeito à LGPD */}
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#F7F7FA] border border-gray-100 px-4 py-3">
              <svg
                className="mt-0.5 flex-shrink-0 text-gray-500"
                width="17"
                height="17"
                viewBox="0 0 17 17"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="8.5" cy="8.5" r="7" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8.5 7.5v4M8.5 5.2h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="text-xs text-gray-600 leading-relaxed">
                <strong>Respeito à LGPD:</strong> Dados agregados sem identificação nominal de estudantes. Turmas com menos de 5 alunos são consolidadas no acumulado da matéria para preservar a privacidade discente.
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
