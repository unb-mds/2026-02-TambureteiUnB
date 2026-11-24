"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PasAdmissionCard from "@/components/PasAdmissionCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StoolIllustration from "@/components/StoolIllustration";
import { getCourseBySlug } from "@/services/courseService";
import { getDisciplines } from "@/services/disciplineService";
import { CourseDetail } from "@/types/curso";
import { Discipline } from "@/types/disciplina";
import Pagination from "@/components/Pagination";
import ApprovalBadge from "@/components/ApprovalBadge";
import useDisciplineApprovalMetrics from "@/hooks/useDisciplineApprovalMetrics";
import { normalizeSearchTerm } from "@/utils/search";
import { calculateCourseSemesters, generateSemesterFilters } from "@/utils/courseCatalog";
import { getOfficialCurriculumUrl } from "@/utils/courseCurriculum";

const ITEMS_PER_PAGE = 24;

export default function CourseDisciplinesPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : "";

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [allDisciplines, setAllDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);

  const [disciplineQuery, setDisciplineQuery] = useState("");
  const [semester, setSemester] = useState("Todos");
  const [department, setDepartment] = useState("Todos os departamentos");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMetricYear, setSelectedMetricYear] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!slug) return;
      try {
        setLoading(true);
        const [courseData, discData] = await Promise.all([
          getCourseBySlug(slug).catch(() => null),
          getDisciplines().catch(() => []),
        ]);
        if (isMounted) {
          setCourse(courseData);
          setAllDisciplines(discData);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do curso da API:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Lista de disciplinas do curso
  const courseDisciplines: Discipline[] = useMemo(() => {
    if (!course) return [];

    // Se o curso possui disciplinas cadastradas na grade:
    if (course.disciplinas && course.disciplinas.length > 0) {
      return course.disciplinas.map((cd) => ({
        code: cd.codigo || "",
        name: cd.nome,
        slug: cd.slug,
        department: cd.departamento || "Geral",
        departmentName: cd.departamento ? `Departamento de ${cd.departamento}` : "Departamento Acadêmico",
        campus: course.campus || "Darcy Ribeiro",
        campusFilter: course.campus || "Darcy Ribeiro",
        area: "Tecnologia",
        credits: `${cd.creditos || 4} créditos • ${cd.carga_horaria || (cd.creditos ? cd.creditos * 15 : 60)}h`,
        hours: cd.carga_horaria || (cd.creditos ? cd.creditos * 15 : 60),
        approval: null,
        resources: 14,
        popularity: 85,
        semester: cd.periodo_sugerido ? `${cd.periodo_sugerido}º Semestre` : "Optativas",
        type: cd.is_obrigatoria ? "Obrigatória" : "Optativa",
      }));
    }

    // Fallback associando disciplinas gerais pelo campus ou departamento do curso
    const courseSlugLower = course.slug.toLowerCase();
    const courseNameLower = course.nome.toLowerCase();
    return allDisciplines
      .filter((d) => {
        const hasCourseLink = d.courses?.some(
          (c) =>
            c.slug.toLowerCase() === courseSlugLower ||
            c.name.toLowerCase() === courseNameLower
        );
        if (hasCourseLink) return true;

        if (courseNameLower.includes("software")) {
          return d.campus === "FCTE" || d.campus === "FGA" || d.department === "MAT" || d.department === "CIC";
        }
        if (courseNameLower.includes("computação") || courseNameLower.includes("computacao")) {
          return d.department === "CIC" || d.department === "MAT" || d.department === "IF";
        }
        return Boolean(d.campus && course.campus && (course.campus.includes(d.campus) || d.campus.includes(course.campus)));
      })
      .map((d) => {
        const matchingCourse = d.courses?.find(
          (c) =>
            c.slug.toLowerCase() === courseSlugLower ||
            c.name.toLowerCase() === courseNameLower
        );
        if (matchingCourse) {
          const sem = matchingCourse.semester === "Optativa" ? "Optativas" : matchingCourse.semester;
          return {
            ...d,
            semester: sem,
            type: matchingCourse.type,
          };
        }
        return d;
      });
  }, [course, allDisciplines]);

  // Quantidade total de semestres sugeridos do curso (ex.: 8 para Administração, 10 para Engenharias)
  const totalSemestres = useMemo(() => {
    return calculateCourseSemesters(courseDisciplines, course?.semestres);
  }, [courseDisciplines, course?.semestres]);

  // Lista dinâmica de abas de semestres para o curso
  const semesterFilters = useMemo(() => {
    const hasOptativas = courseDisciplines.some(
      (d) => d.type === "Optativa" || d.semester === "Optativas"
    );
    return generateSemesterFilters(totalSemestres, hasOptativas);
  }, [totalSemestres, courseDisciplines]);

  // Semestre ativo (cai para "Todos" caso o filtro selecionado anteriormente não exista no curso atual)
  const activeSemester = semesterFilters.includes(semester) ? semester : "Todos";

  // Departamentos disponíveis para filtro
  const departmentsList = useMemo(() => {
    const deps = Array.from(new Set(courseDisciplines.map((d) => d.department)));
    return ["Todos os departamentos", ...deps];
  }, [courseDisciplines]);

  // Anos disponíveis para as métricas do curso (DPO)
  const availableMetricYears = useMemo(() => {
    if (course?.metricas_historicas && course.metricas_historicas.length > 0) {
      const years = Array.from(new Set(course.metricas_historicas.map((m) => m.ano || 2024)));
      return years.sort((a, b) => b - a);
    }
    const fallback: number[] = [];
    if (course?.metricas_recentes?.ano) fallback.push(course.metricas_recentes.ano);
    if (course?.metricas_2024?.ano && !fallback.includes(course.metricas_2024.ano)) {
      fallback.push(course.metricas_2024.ano);
    }
    return fallback.length > 0 ? fallback : [2024];
  }, [course]);

  const activeMetricYear =
    selectedMetricYear && availableMetricYears.includes(selectedMetricYear)
      ? selectedMetricYear
      : availableMetricYears[0];

  const currentMetrics = useMemo(() => {
    if (course?.metricas_historicas && course.metricas_historicas.length > 0) {
      const found = course.metricas_historicas.find((m) => m.ano === activeMetricYear);
      if (found) return found;
    }
    if (course?.metricas_recentes && course.metricas_recentes.ano === activeMetricYear) {
      return course.metricas_recentes;
    }
    if (course?.metricas_2024 && (course.metricas_2024.ano === activeMetricYear || activeMetricYear === 2024)) {
      return course.metricas_2024;
    }
    return course?.metricas_recentes || course?.metricas_2024 || null;
  }, [course, activeMetricYear]);

  // Filtro de disciplinas por query, semestre e departamento
  const filteredDisciplines = useMemo(() => {
    const normalizedQuery = normalizeSearchTerm(disciplineQuery);

    return courseDisciplines.filter((discipline) => {
      const searchable = normalizeSearchTerm(`${discipline.name} ${discipline.code}`);
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);

      const matchesSemester =
        activeSemester === "Todos" ||
        discipline.semester === activeSemester ||
        (activeSemester === "Optativas" &&
          (discipline.semester === "Optativas" || discipline.type === "Optativa"));

      const matchesDepartment =
        department === "Todos os departamentos" || discipline.department === department;

      return matchesQuery && matchesSemester && matchesDepartment;
    });
  }, [courseDisciplines, disciplineQuery, activeSemester, department]);

  const totalPages = Math.max(1, Math.ceil(filteredDisciplines.length / ITEMS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);

  const paginatedDisciplines = useMemo(() => {
    const start = (activePage - 1) * ITEMS_PER_PAGE;
    return filteredDisciplines.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDisciplines, activePage]);
  const approvalMetrics = useDisciplineApprovalMetrics(paginatedDisciplines);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 380, behavior: "smooth" });
    }
  };

  const handleQueryChange = (val: string) => {
    setDisciplineQuery(val);
    setCurrentPage(1);
  };

  const handleSemesterChange = (item: string) => {
    setSemester(item);
    setCurrentPage(1);
  };

  const handleDepartmentChange = (dept: string) => {
    setDepartment(dept);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7FA] flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="h-28 bg-white border border-[#EDE9FD] rounded-2xl p-6 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-white border border-[#EDE9FD] rounded-2xl p-6" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!course) {
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
            <h1 className="text-2xl font-bold text-[#202124]">Curso não encontrado</h1>
            <p className="mt-2 text-sm text-gray-500">
              O curso solicitado não foi localizado no catálogo da UnB.
            </p>
            <div className="mt-6">
              <Link
                href="/cursos"
                className="inline-flex items-center gap-2 rounded-xl bg-[#5B4BDB] px-6 py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
              >
                ← Voltar ao Catálogo de Cursos
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7FA] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1">
        {/* Cabeçalho do Curso */}
        <section className="bg-white border-b border-[#EDE9FD]">
          <div className="mx-auto px-4 sm:px-6 lg:px-8 pb-9 pt-6 max-w-7xl">
            {/* Breadcrumb */}
            <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500" aria-label="Navegação estrutural">
              <Link href="/" className="hover:text-[#5B4BDB] transition-colors">
                Início
              </Link>
              <span className="text-[#C4C1D8]">›</span>
              <Link href="/cursos" className="hover:text-[#5B4BDB] transition-colors">
                Cursos
              </Link>
              <span className="text-[#C4C1D8]">›</span>
              <span className="font-semibold text-[#202124]">{course.nome}</span>
            </nav>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-[#EDE9FD]">
                  <StoolIllustration size={44} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-bold text-[#5B4BDB] bg-[#5B4BDB]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {course.campus}
                    </span>
                    {course.modalidade === "A Distância" && (
                      <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        EaD • A Distância
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {course.grau} • {course.modalidade === "A Distância" ? "A Distância" : course.turno}
                    </span>
                    {course.total_creditos && (
                      <span className="text-xs font-semibold text-[#5B4BDB] bg-[#EDE9FD] px-2 py-0.5 rounded-md">
                        {course.total_creditos} créditos
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-extrabold text-[#202124] tracking-tight">
                    Disciplinas de {course.nome}
                  </h1>
                  {course.matriz_curricular && (
                    <div className="flex items-center gap-2 text-sm text-[#5B4BDB] font-semibold mt-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span>
                        Estrutura Curricular {course.matriz_curricular}
                        {course.ano_vigencia ? ` • Vigência ${course.ano_vigencia}` : ""}
                      </span>
                    </div>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    Campus {course.campus} <span className="mx-2 text-[#C4C1D8]">•</span>
                    {totalSemestres} semestres sugeridos <span className="mx-2 text-[#C4C1D8]">•</span>
                    {courseDisciplines.length} disciplinas cadastradas na grade
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 self-start md:self-auto">
                <a
                  href={getOfficialCurriculumUrl(course)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B4BDB] text-white px-4 py-2.5 text-sm font-semibold shadow-xs hover:bg-[#4a3cb8] transition-colors"
                  aria-label={`Abrir Grade Curricular Oficial da UnB do curso ${course.nome} em nova aba`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  <span>Grade Curricular Oficial da UnB</span>
                </a>

                <Link
                  href="/cursos"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#5B4BDB] bg-white px-5 py-2.5 text-sm font-semibold text-[#5B4BDB] transition-colors hover:bg-[#5B4BDB]/5"
                >
                  <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
                    <path
                      d="M3 5.5h11M5.5 3L3 5.5 5.5 8M14 11.5H3M11.5 9L14 11.5 11.5 14"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Trocar de curso
                </Link>
              </div>
            </div>

            <PasAdmissionCard course={course} expanded />

            {/* Painel de Indicadores Institucionais do Curso (DPO / INEP / LAI) */}
            {(() => {
              const m = currentMetrics;
              if (!m) {
                return (
                  <div className="mt-8 pt-6 border-t border-[#EDE9FD]">
                    <div className="bg-[#F8F7FD] rounded-2xl p-5 border border-[#EDE9FD] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#EDE9FD] text-[#5B4BDB]">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#202124]">
                            Indicadores Institucionais DPO / UnB
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Os dados estatísticos deste curso ({course.turno || "turno específico"}) são contabilizados de forma unificada ou associados ao turno principal no Anuário Estatístico da UnB.
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-[#EDE9FD] whitespace-nowrap">
                        DPO / Anuário {activeMetricYear}
                      </span>
                    </div>
                  </div>
                );
              }

              const taxaOcupacao = m.vagas_totais > 0 ? Math.round((m.ingressantes / m.vagas_totais) * 100) : null;
              const concorrencia = m.vagas_totais > 0 ? (m.inscritos_total / m.vagas_totais).toFixed(1) : null;

              return (
                <div className="mt-8 pt-6 border-t border-[#EDE9FD]">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-[#5B4BDB]" />
                        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#202124]">
                          Indicadores Oficiais do Curso
                        </h2>
                      </div>

                      {/* Seletor Interativo de Anos-Base (ex: 2024, 2023, 2022, 2021) */}
                      {availableMetricYears.length > 1 ? (
                        <div
                          className="flex flex-wrap items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-1"
                          role="group"
                          aria-label="Filtro de ano das métricas do curso"
                        >
                          {availableMetricYears.map((yr) => (
                            <button
                              key={yr}
                              type="button"
                              onClick={() => setSelectedMetricYear(yr)}
                              aria-pressed={activeMetricYear === yr}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                                activeMetricYear === yr
                                  ? "bg-[#5B4BDB] text-white shadow-xs"
                                  : "text-[var(--text-muted)] hover:text-[var(--primary-text)] hover:bg-[var(--surface)]"
                              }`}
                            >
                              Ano {yr}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="rounded-full bg-[#EDE9FD] px-2.5 py-0.5 text-[11px] font-semibold text-[#5B4BDB]">
                          Ano {m.ano || 2024}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">
                      Fonte: DPO / Anuário Estatístico UnB &bull; Dados Abertos LAI
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
                    {/* KPI 1: Matriculados Ativos */}
                    <div className="bg-[#F8F7FD] rounded-2xl p-4 border border-[#EDE9FD] flex flex-col justify-between shadow-xs">
                      <div className="flex items-center justify-between text-gray-500 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Matriculados</span>
                        <svg className="w-4 h-4 text-[#5B4BDB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <div className="text-2xl font-black text-[#202124] tracking-tight">
                        {m.matriculados.toLocaleString("pt-BR")}
                      </div>
                      <span className="text-[11px] text-gray-500 mt-1">Estudantes ativos</span>
                    </div>

                    {/* KPI 2: Vagas & Ingressantes */}
                    <div className="bg-[#F8F7FD] rounded-2xl p-4 border border-[#EDE9FD] flex flex-col justify-between shadow-xs">
                      <div className="flex items-center justify-between text-gray-500 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Ingressantes / Vagas</span>
                        <svg className="w-4 h-4 text-[#5B4BDB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="text-2xl font-black text-[#202124] tracking-tight">
                        {m.ingressantes} <span className="text-sm font-semibold text-gray-500">/ {m.vagas_totais}</span>
                      </div>
                      <span className="text-[11px] text-gray-500 mt-1">
                        {taxaOcupacao ? `${taxaOcupacao}% ocupação` : "Vagas anuais"}
                        {concorrencia ? ` • ${concorrencia} cand/vaga` : ""}
                      </span>
                    </div>

                    {/* KPI 3: Concluintes (Formados no Ano) */}
                    <div className="bg-[#EAF8EF] rounded-2xl p-4 border border-[#D1F0DC] flex flex-col justify-between shadow-xs">
                      <div className="flex items-center justify-between text-[#287A45] mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">
                          Concluintes
                        </span>
                        <svg
                          className="w-4 h-4 text-[#287A45]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div className="text-2xl font-black text-[#1B6634] tracking-tight">
                        {m.concluintes.toLocaleString("pt-BR")}
                      </div>
                      <span className="text-[11px] text-[#287A45] mt-1 font-medium">
                        {m.concluintes > 0
                          ? `${m.concluintes} formados no ano-base (DPO)`
                          : "Sem formados no ano"}
                      </span>
                    </div>

                    {/* KPI 4: Evasão Anual */}
                    <div className="bg-[#FFF5F5] rounded-2xl p-4 border border-[#FED7D7] flex flex-col justify-between shadow-xs">
                      <div className="flex items-center justify-between text-[#C53030] mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Evasão Anual</span>
                        <svg className="w-4 h-4 text-[#C53030]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                      </div>
                      <div className="text-2xl font-black text-[#9B2C2C] tracking-tight">
                        {m.taxa_evasao !== null && m.taxa_evasao !== undefined
                          ? `${m.taxa_evasao}%`
                          : `${m.desvinculados} evadidos`}
                      </div>
                      <span className="text-[11px] text-[#C53030] mt-1 font-medium">
                        {m.desvinculados} desvinculados no ano
                      </span>
                    </div>

                    {/* KPI 5: Trancamentos */}
                    <div className="bg-[#FFFDF0] rounded-2xl p-4 border border-[#FEEBC8] flex flex-col justify-between shadow-xs col-span-2 sm:col-span-1">
                      <div className="flex items-center justify-between text-[#B7791F] mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Trancamentos</span>
                        <svg className="w-4 h-4 text-[#B7791F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-2xl font-black text-[#744210] tracking-tight">
                        {m.trancados}
                      </div>
                      <span className="text-[11px] text-[#B7791F] mt-1 font-medium">
                        Matrículas trancadas
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>

        {/* Área de Filtros e Listagem */}
        <section className="mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-7xl">
          {/* Caixa de Busca e Filtros */}
          <div className="mb-8 rounded-3xl bg-white p-5 sm:p-6 border border-[#EDE9FD] shadow-xs">
            {/* Campo de Busca de Disciplinas */}
            <div className="flex items-center gap-3 rounded-2xl bg-[#F7F7FA] border-2 border-[#E1DDFC] px-4 py-3">
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true" className="text-[#5B4BDB]">
                <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                <path d="M15 15l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={disciplineQuery}
                onChange={(event) => handleQueryChange(event.target.value)}
                placeholder="Buscar por nome da matéria ou código SIGAA (ex.: FGA0158, Requisitos, Cálculo)..."
                aria-label="Buscar disciplina por nome ou código SIGAA"
                className="flex-1 bg-transparent text-sm text-[#202124] outline-none placeholder-gray-400"
              />
              {disciplineQuery && (
                <button
                  type="button"
                  onClick={() => handleQueryChange("")}
                  className="rounded-lg bg-[#EDE9FD] px-3 py-1.5 text-xs font-semibold text-[#5B4BDB] hover:bg-[#5B4BDB]/20"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Filtros: Período sugerido e Departamento */}
            <div className="mt-5 flex flex-col md:flex-row items-stretch md:items-end justify-between gap-5">
              <div className="flex-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Período sugerido
                </p>
                <div className="flex flex-wrap gap-2" aria-label="Filtrar por período sugerido">
                  {semesterFilters.map((item) => {
                    const selected = activeSemester === item;
                    return (
                      <button
                        type="button"
                        key={item}
                        onClick={() => handleSemesterChange(item)}
                        aria-pressed={selected}
                        className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                          selected
                            ? "bg-[#5B4BDB] text-white shadow-xs"
                            : "bg-[#F7F7FA] text-gray-600 border border-[#E8E6F8] hover:border-[#5B4BDB]/40 hover:text-[#5B4BDB]"
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex w-full md:w-64 flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Departamento
                </span>
                <div className="relative">
                  <select
                    value={department}
                    onChange={(event) => handleDepartmentChange(event.target.value)}
                    className="w-full appearance-none rounded-xl bg-[#F7F7FA] border border-[#E8E6F8] px-4 py-2.5 pr-10 text-xs font-medium text-[#202124] outline-none focus:border-[#5B4BDB]"
                  >
                    {departmentsList.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
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
          </div>

          {/* Cabeçalho da Lista de Resultados */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#202124]">Disciplinas encontradas</h2>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                {filteredDisciplines.length} de {courseDisciplines.length} disciplinas correspondem aos filtros
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-[#FFF8D8] px-3.5 py-1.5 text-xs font-medium text-[#806300]">
              <span className="h-2 w-2 rounded-full bg-[#F4C542]" />
              Grade sugerida pela comunidade
            </div>
          </div>

          {/* Grid de Cards de Disciplinas */}
          {filteredDisciplines.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginatedDisciplines.map((discipline) => (
                  <article
                    key={discipline.code}
                    className="group flex flex-col justify-between rounded-2xl bg-white p-5 sm:p-6 border border-[#EDE9FD] shadow-xs hover:shadow-md hover:border-[#5B4BDB]/40 hover:-translate-y-0.5 transition-all"
                  >
                    <div>
                      {/* Código e Taxa de Aprovação */}
                      <div className="mb-4 flex items-start justify-between gap-2">
                        <span className="rounded-lg bg-[#EDE9FD] px-2.5 py-1 text-xs font-bold tracking-wide text-[#5B4BDB]">
                          {discipline.code}
                        </span>
                        <ApprovalBadge
                          approval={
                            approvalMetrics[discipline.slug] ??
                            discipline.approval
                          }
                        />
                      </div>

                      {/* Nome da Disciplina */}
                      <h3 className="text-base sm:text-lg font-bold text-[#202124] group-hover:text-[#5B4BDB] transition-colors leading-snug">
                        {discipline.name}
                      </h3>

                      {/* Tags de Departamento e Créditos */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="rounded-md bg-[#F1F0F8] px-2.5 py-1 text-[11px] font-semibold text-[#5B536E]">
                          {discipline.department}
                        </span>
                        <span className="rounded-md bg-[#F1F0F8] px-2.5 py-1 text-[11px] font-medium text-[#5B536E]">
                          {discipline.credits}
                        </span>
                      </div>

                      {/* Tags de Semestre e Tipo */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {discipline.semester && (
                          <span className="rounded-md bg-[#FFF8D8] px-2.5 py-1 text-[11px] font-semibold text-[#806300]">
                            {discipline.semester}
                          </span>
                        )}
                        {discipline.type && (
                          <span className="rounded-md bg-[#F7F7FA] border border-[#E5E7EB] px-2.5 py-1 text-[11px] font-medium text-gray-600">
                            {discipline.type}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ação: Ver Disciplina */}
                    <div className="mt-5 border-t border-[#EDE9FD] pt-4">
                      <Link
                        href={`/disciplinas/${discipline.slug}`}
                        className="flex w-full items-center justify-between text-xs sm:text-sm font-bold text-[#5B4BDB] group-hover:translate-x-0.5 transition-all"
                      >
                        <span>Ver disciplina</span>
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              <Pagination
                currentPage={activePage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={filteredDisciplines.length}
                itemsPerPage={ITEMS_PER_PAGE}
                itemName="disciplinas"
              />
            </>
          ) : (
            /* Estado Vazio */
            <div className="flex flex-col items-center rounded-3xl bg-white border border-[#EDE9FD] px-8 py-16 text-center max-w-md mx-auto">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#EDE9FD]">
                <StoolIllustration size={36} />
              </div>
              <h3 className="text-base font-bold text-[#202124]">Nenhuma disciplina encontrada</h3>
              <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                Ajuste a busca ou selecione outro período para visualizar mais disciplinas deste curso.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDisciplineQuery("");
                  setSemester("Todos");
                  setDepartment("Todos os departamentos");
                  setCurrentPage(1);
                }}
                className="mt-5 rounded-xl border border-[#5B4BDB] px-4 py-2 text-xs font-semibold text-[#5B4BDB] hover:bg-[#5B4BDB]/5"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
