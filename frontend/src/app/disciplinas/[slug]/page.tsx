"use client";

import { hasApprovalData } from "@/utils/academicMetrics";
import { normalizeSearchTerm } from "@/utils/search";
import ComentariosFrontend from "@/components/ComentariosFrontend";
import DificuldadesPanel from "@/components/DificuldadesPanel";
import MateriaisApoio from "@/components/MateriaisApoio";
import PreRequisitosSection from "@/components/PreRequisitosSection";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useSyncExternalStore,
  Suspense,
} from "react";
import Link from "next/link";
import {
  useParams,
  useSearchParams,
  useRouter,
  usePathname,
} from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StoolIllustration from "@/components/StoolIllustration";
import ClassCard from "@/components/ClassCard";
import Pagination from "@/components/Pagination";
import { CLASSES_PER_PAGE, paginateClasses } from "@/utils/classPagination";
import ClassCardSkeleton from "@/components/ClassCardSkeleton";
import ClassEmptyState from "@/components/ClassEmptyState";
import ClassFilters, {
  CLASS_SHIFT_OPTIONS,
  CLASS_SORT_OPTIONS,
} from "@/components/ClassFilters";
import MaterialModal from "@/components/MaterialModal";
import OpenDataExportBar from "@/components/OpenDataExportBar";
import ClassPerformancePieForm from "@/components/ClassPerformancePieForm";
import { isAuthenticated, subscribeAuthChange } from "@/services/authService";
import {
  getDisciplineBySlug,
  getClassesByDiscipline,
} from "@/services/disciplineService";
import {
  exportDisciplineHistoryOpenData,
  mapHistoricalPerformanceToOpenData,
} from "@/services/openDataService";
import {
  buildDisciplinePeriodOptions,
  computePeriodMetricsSummary,
} from "@/utils/disciplinePeriodMetrics";
import {
  Discipline,
} from "@/types/disciplina";
import {
  Class,
  ClassShiftFilter,
  ClassSortOption,
  normalizeClassShift,
  compareClassOccupancy,
} from "@/types/turma";

function parseInitialShift(param: string | null): ClassShiftFilter {
  if (!param) return "Todos";
  const matched = CLASS_SHIFT_OPTIONS.find(
    (option) => option.toLowerCase() === param.toLowerCase()
  );
  return matched || "Todos";
}

function parseInitialSort(param: string | null): ClassSortOption {
  if (!param) return "code_asc";
  const matched = CLASS_SORT_OPTIONS.find((option) => option.value === param);
  return matched ? matched.value : "code_asc";
}

function DisciplineDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const simulateClassesError = searchParams.get("erroTurmas") === "true";

  const slug =
    typeof params?.slug === "string"
      ? params.slug
      : Array.isArray(params?.slug)
      ? params.slug[0]
      : "";

  const [discipline, setDiscipline] = useState<Discipline | null>(null);
  const [loading, setLoading] = useState(true);
  const [disciplineError, setDisciplineError] = useState<string | null>(null);
  const [disciplineRetryCount, setDisciplineRetryCount] = useState(0);

  // Estados da listagem de turmas
  const [classes, setClasses] = useState<Class[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [classPage, setClassPage] = useState(1);

  // Estados de filtro e ordenação sincronizados com URL query params
  const [selectedShift, setSelectedShift] = useState<ClassShiftFilter>(() =>
    parseInitialShift(searchParams.get("turno"))
  );
  const [periodoSelecionado, setPeriodoSelecionado] = useState<string>(
    () => searchParams.get("semestre") || "Todos"
  );
  const [sortBy, setSortBy] = useState<ClassSortOption>(() =>
    parseInitialSort(searchParams.get("ordem"))
  );

  const [period, setPeriod] = useState("ALL");
  const [showSemesterEvolution, setShowSemesterEvolution] = useState(true);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialsReloadTrigger, setMaterialsReloadTrigger] = useState(0);
  const [pendingMaterialIds, setPendingMaterialIds] = useState<string[]>([]);

  const authenticated = useSyncExternalStore(
    subscribeAuthChange,
    isAuthenticated,
    () => false
  );

  const handleOpenMaterialModal = useCallback(() => {
    if (!authenticated || !isAuthenticated()) {
      return;
    }
    setShowMaterialModal(true);
  }, [authenticated]);

  const syncUrlParams = useCallback(
    (
      nextShift: ClassShiftFilter,
      nextSort: ClassSortOption,
      proximoPeriodo: string
    ) => {
      const current = new URLSearchParams(searchParams.toString());
      if (nextShift === "Todos") {
        current.delete("turno");
      } else {
        current.set("turno", nextShift);
      }

      if (nextSort === "code_asc") {
        current.delete("ordem");
      } else {
        current.set("ordem", nextSort);
      }

      if (proximoPeriodo === "Todos") {
        current.delete("semestre");
      } else {
        current.set("semestre", proximoPeriodo);
      }

      const queryString = current.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(targetUrl, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleShiftChange = useCallback(
    (shift: ClassShiftFilter) => {
      setSelectedShift(shift);
      setClassPage(1);
      syncUrlParams(shift, sortBy, periodoSelecionado);
    },
    [sortBy, periodoSelecionado, syncUrlParams]
  );

  const aoAlterarPeriodo = useCallback(
    (periodo: string) => {
      setPeriodoSelecionado(periodo);
      setClassPage(1);
      syncUrlParams(selectedShift, sortBy, periodo);
    },
    [selectedShift, sortBy, syncUrlParams]
  );

  const handleSortChange = useCallback(
    (sort: ClassSortOption) => {
      setSortBy(sort);
      setClassPage(1);
      syncUrlParams(selectedShift, sort, periodoSelecionado);
    },
    [selectedShift, periodoSelecionado, syncUrlParams]
  );

  const [classSearchQuery, setClassSearchQuery] = useState("");
  const [onlyClassesWithData, setOnlyClassesWithData] = useState(false);

  const handleResetClassFilters = useCallback(() => {
    setSelectedShift("Todos");
    setPeriodoSelecionado("Todos");
    setSortBy("code_asc");
    setClassSearchQuery("");
    setOnlyClassesWithData(false);
    setClassPage(1);
    syncUrlParams("Todos", "code_asc", "Todos");
  }, [syncUrlParams]);

  const handleRetryDiscipline = useCallback(() => {
    setLoading(true);
    setDisciplineError(null);
    setDisciplineRetryCount((prev) => prev + 1);
  }, []);

  // Carregamento dos dados da disciplina
  useEffect(() => {
    let isMounted = true;
    async function loadDiscipline() {
      if (!slug) return;
      try {
        setLoading(true);
        setDisciplineError(null);
        const data = await getDisciplineBySlug(slug);
        if (isMounted) {
          if (data && data.name) {
            setDiscipline(data);
          } else {
            setDiscipline(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          setDiscipline(null);
          const message =
            err instanceof Error && err.message
              ? err.message
              : "Não foi possível carregar os dados da disciplina no momento.";
          setDisciplineError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadDiscipline();
    return () => {
      isMounted = false;
    };
  }, [slug, disciplineRetryCount]);

  // Contador para permitir re-tentativa (retry) manual da busca de turmas
  const [classesRetryCount, setClassesRetryCount] = useState(0);

  const handleRetryClasses = useCallback(() => {
    setClassesLoading(true);
    setClassesError(null);
    setClassesRetryCount((prev) => prev + 1);
  }, []);

  // Carregamento das turmas vinculadas à disciplina somente quando disciplinaId for numérico válido
  useEffect(() => {
    if (!discipline) return;

    const currentDiscipline = discipline;
    const disciplinaId = currentDiscipline.id;
    let isMounted = true;

    async function fetchClassesForDiscipline() {
      try {
        setClassesLoading(true);

        // Permite simular estado de erro via query param (?erroTurmas=true) para testes de UI
        if (simulateClassesError) {
          throw new Error(
            "Não foi possível carregar as turmas ofertadas no momento."
          );
        }

        const targetSlug = currentDiscipline.slug || slug;
        const validId =
          typeof disciplinaId === "number" &&
          Number.isFinite(disciplinaId) &&
          disciplinaId > 0
            ? disciplinaId
            : undefined;

        if (!targetSlug && !validId) {
          if (isMounted) {
            setClasses([]);
            setClassesError(null);
          }
          return;
        }

        const loadedClasses = await getClassesByDiscipline({
          slug: targetSlug,
          disciplinaId: validId,
          codigo: currentDiscipline.code,
        });

        if (isMounted) {
          setClasses(loadedClasses);
          setClassesError(null);
        }
      } catch (err) {
        if (!isMounted) return;
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Ocorreu um erro inesperado ao consultar as turmas ofertadas.";
        setClasses([]);
        setClassesError(message);
      } finally {
        if (isMounted) {
          setClassesLoading(false);
        }
      }
    }

    fetchClassesForDiscipline();

    return () => {
      isMounted = false;
    };
  }, [discipline, slug, simulateClassesError, classesRetryCount]);

  const periodosDisponiveis = useMemo(() => {
    const unicos = new Set<string>();
    for (const item of classes) {
      const sem = (item.semestre || "").trim();
      if (sem) unicos.add(sem);
    }
    return Array.from(unicos).sort((a, b) =>
      b.localeCompare(a, "pt-BR", { numeric: true })
    );
  }, [classes]);

  const periodoAtivo =
    periodoSelecionado === "Todos" ||
    periodosDisponiveis.includes(periodoSelecionado)
      ? periodoSelecionado
      : "Todos";

  // Filtragem por período, turno, busca por professor/turma/semestre, dados e ordenação reativa
  const filteredAndSortedClasses = useMemo(() => {
    const qNorm = normalizeSearchTerm(classSearchQuery);
    const filtered = classes.filter((item) => {
      if (periodoAtivo !== "Todos") {
        if ((item.semestre || "").trim() !== periodoAtivo) return false;
      }

      if (selectedShift !== "Todos") {
        const normalized = normalizeClassShift(item.turno, item.horarios);
        if (normalized !== selectedShift) return false;
      }

      if (onlyClassesWithData) {
        const hasAcademicData =
          Boolean(item.estatistica) || (item.amostrasComunidade ?? 0) > 0;
        if (!hasAcademicData) return false;
      }

      if (qNorm) {
        const profNorm = normalizeSearchTerm(item.professor);
        const codNorm = normalizeSearchTerm(item.codigoTurma);
        const semNorm = normalizeSearchTerm(item.semestre ?? "");
        if (
          !profNorm.includes(qNorm) &&
          !codNorm.includes(qNorm) &&
          !semNorm.includes(qNorm)
        ) {
          return false;
        }
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "occupancy_asc" || sortBy === "occupancy_desc") {
        return compareClassOccupancy(a, b, sortBy);
      }
      const semCompare = (b.semestre || "").localeCompare(
        a.semestre || "",
        "pt-BR",
        { numeric: true }
      );
      if (semCompare !== 0) return semCompare;
      return a.codigoTurma.localeCompare(b.codigoTurma, "pt-BR", {
        numeric: true,
        sensitivity: "base",
      });
    });
  }, [
    classes,
    periodoAtivo,
    selectedShift,
    sortBy,
    classSearchQuery,
    onlyClassesWithData,
  ]);

  const paginatedClasses = paginateClasses(filteredAndSortedClasses, classPage);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7FA] flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-10 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="h-32 bg-white border border-[#EDE9FD] rounded-2xl p-6 mb-8" />
          <div className="mb-8 grid grid-flow-col auto-cols-[260px] gap-4 overflow-x-auto">
            {[1, 2, 3, 4].map((i) => (
              <ClassCardSkeleton key={i} />
            ))}
          </div>
          <div className="h-64 bg-white border border-[#EDE9FD] rounded-2xl mb-8" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!discipline) {
    return (
      <div className="min-h-screen bg-[#F7F7FA] flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-16 text-center">
          <div
            role="alert"
            className="bg-white rounded-3xl border border-[#EDE9FD] p-12 shadow-xs"
          >
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EDE9FD]">
                <StoolIllustration size={44} />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[#202124]">
              {disciplineError
                ? "Não foi possível carregar a disciplina"
                : "Disciplina não encontrada"}
            </h1>
            <p className="mt-2 text-sm text-gray-500 max-w-lg mx-auto">
              {disciplineError ||
                `Não encontramos uma disciplina correspondente ao código ou slug informado (${slug}).`}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={handleRetryDiscipline}
                className="inline-flex items-center gap-2 rounded-xl bg-[#5B4BDB] px-6 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 shadow-xs active:scale-95 cursor-pointer"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Tentar novamente
              </button>
              <Link
                href="/disciplinas"
                className="inline-flex items-center gap-2 rounded-xl border border-[#5B4BDB] bg-white px-6 py-3 text-sm font-semibold text-[#5B4BDB] transition-all hover:bg-[#5B4BDB]/5"
              >
                ← Voltar para Disciplinas
              </Link>
              <Link
                href="/cursos"
                className="inline-flex items-center gap-2 rounded-xl border border-[#E1DFEA] bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
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

  const realHistoricalPerformance =
    discipline.historicalPerformance ?? [];
  const periodOptions = buildDisciplinePeriodOptions(realHistoricalPerformance);
  const activePeriod = periodOptions.some((opt) => opt.value === period)
    ? period
    : "ALL";
  const periodSummary = computePeriodMetricsSummary({
    history: realHistoricalPerformance,
    consolidatedMetric: discipline.metrica_consolidada,
    period: activePeriod,
  });

  const exportableHistoryRows = mapHistoricalPerformanceToOpenData(
    discipline.code,
    discipline.name,
    periodSummary.selectedHistory,
    periodSummary.filteredConsolidatedMetric
  );
  const hasRealExportableHistory = exportableHistoryRows.length > 0;

  const performanceList = periodSummary.publicHistory;

  // Extração dos dados consolidados reais da disciplina para o período selecionado
  const totalDadosFornecidos = discipline.metrica_consolidada?.matriculados ?? 0;
  const totalMatriculados = periodSummary.matriculados;
  const hasConsolidatedMetrics =
    !periodSummary.suppressedByLgpd &&
    (hasApprovalData(periodSummary.approval) || totalMatriculados > 0);

  // Formatação segura de quantidades de alunos
  const formatAlunos = (qtd: number | undefined) => {
    if (!hasConsolidatedMetrics || !qtd || qtd <= 0) {
      return "Sem dados";
    }
    return `${qtd} ${qtd === 1 ? "aluno" : "alunos"}`;
  };

  // Cards de métricas consumindo o período selecionado
  const metrics = [
    {
      label: "Taxa de Aprovação",
      value:
        hasConsolidatedMetrics &&
        hasApprovalData(periodSummary.approval) &&
        (periodSummary.approval ?? 0) > 0
          ? `${periodSummary.approval}%`
          : "Sem dados",
      count: formatAlunos(periodSummary.aprovados),
      color: "var(--status-success-text)",
      iconColor: "var(--status-success-text)",
      background: "var(--status-success-bg)",
      border: "var(--status-success-border)",
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
      value:
        hasConsolidatedMetrics && periodSummary.failedGrade > 0
          ? `${periodSummary.failedGrade}%`
          : "Sem dados",
      count: formatAlunos(periodSummary.reprovadosNota),
      color: "var(--status-danger-text)",
      iconColor: "var(--status-danger-text)",
      background: "var(--status-danger-bg)",
      border: "var(--status-danger-border)",
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
      value:
        hasConsolidatedMetrics && periodSummary.failedAttendance > 0
          ? `${periodSummary.failedAttendance}%`
          : "Sem dados",
      count: formatAlunos(periodSummary.reprovadosFalta),
      color: "var(--status-warning-text)",
      iconColor: "var(--status-warning-text)",
      background: "var(--status-warning-bg)",
      border: "var(--status-warning-border)",
      icon: (
        <>
          <circle
            cx="10"
            cy="10"
            r="6"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M10 6.5V10l2.5 1.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      ),
    },
    {
      label: "Trancamentos",
      value:
        hasConsolidatedMetrics && periodSummary.withdrawn > 0
          ? `${periodSummary.withdrawn}%`
          : "Sem dados",
      count: formatAlunos(periodSummary.trancamentos),
      color: "var(--status-neutral-text)",
      iconColor: "var(--status-neutral-text)",
      background: "var(--status-neutral-bg)",
      border: "var(--status-neutral-border)",
      icon: (
        <path
          d="M7 6v8M13 6v8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F7FA] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pb-16">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 pt-6 max-w-7xl">
          {/* Breadcrumb de navegação */}
          <nav
            className="mb-6 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-500"
            aria-label="Navegação estrutural"
          >
            <Link href="/" className="hover:text-[#5B4BDB] transition-colors">
              Início
            </Link>
            <span className="text-[#C4C1D8]">›</span>
            <Link
              href="/disciplinas"
              className="hover:text-[#5B4BDB] transition-colors"
            >
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
            <span className="font-semibold text-[#202124]">
              {discipline.name}
            </span>
          </nav>

          
          <section className="mb-6 rounded-3xl bg-white px-6 sm:px-8 py-8 border border-[#E8E6F8] shadow-xs">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                
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

                <h1 className="text-2xl sm:text-4xl font-extrabold text-[#202124] tracking-tight leading-tight break-words">
                  {discipline.name}
                </h1>
                <p className="mt-3 max-w-3xl text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Conheça a ementa, os objetivos e o histórico de desempenho da
                  disciplina antes de planejar seu semestre.
                </p>
              </div>

              
              <div className="flex flex-wrap sm:flex-nowrap lg:flex-wrap xl:flex-nowrap items-center gap-3 w-full lg:w-auto shrink-0 pt-2 lg:pt-1">
                <div
                  title="Quantidade de registros acadêmicos enviados para esta disciplina"
                  className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold whitespace-nowrap bg-[#EDE9FD] text-[#5B4BDB] border border-[#D8D1FA] select-none"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 13.5V9.5M7.5 13.5V5.5M12 13.5V7.5M15.5 13.5H2.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Dados fornecidos</span>
                  <span className="ml-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold">
                    {totalDadosFornecidos}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={!authenticated}
                  title={!authenticated ? "Faça login para adicionar materiais" : undefined}
                  onClick={handleOpenMaterialModal}
                  data-reload-count={materialsReloadTrigger}
                  className={`flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl px-4 sm:px-5 py-3 text-xs sm:text-sm font-bold text-white whitespace-nowrap transition-all shadow-xs ${
                    authenticated
                      ? "bg-[#5B4BDB] hover:brightness-110 active:scale-95 cursor-pointer"
                      : "bg-gray-300 cursor-not-allowed opacity-60"
                  }`}
                >
                  <span className="text-base leading-none">+</span>
                  {authenticated ? "Adicionar material" : "Faça login para adicionar"}
                </button>
              </div>
            </div>
          </section>

          
          <MaterialModal
            isOpen={showMaterialModal}
            disciplineId={discipline.id}
            disciplineSlug={slug}
            disciplineName={discipline.name}
            onClose={() => setShowMaterialModal(false)}
            onUploadSuccess={(uploadedIds) => {
              if (uploadedIds && uploadedIds.length > 0) {
                setPendingMaterialIds(uploadedIds);
              }
              setMaterialsReloadTrigger((prev) => prev + 1);
            }}
          />

          
          <section className="mb-6 rounded-3xl bg-white p-6 sm:p-8 border border-[#E8E6F8] shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
             
              <div className="md:border-r border-[#E8E6F8] md:pr-8 lg:pr-12">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDE9FD] text-[#5B4BDB]">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
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
                  <h2 className="text-lg sm:text-xl font-bold text-[#202124]">
                    Ementa Oficial
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[#545864] leading-relaxed">
                  {discipline.ementa ||
                    "Ementa oficial cadastrada junto ao decanato de graduação e matriz curricular da Universidade de Brasília."}
                </p>

                    
                {/* Seção dedicada e navegável de Pré-requisitos (Issue #286) */}
                <PreRequisitosSection
                  preRequisitosItens={discipline.preRequisitosItens}
                  preRequisitosStrings={discipline.preRequisitos}
                  coRequisitos={discipline.coRequisitos}
                />

                {discipline.equivalencias && discipline.equivalencias.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
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

              
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF8D8] text-[#806300]">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        cx="10"
                        cy="10"
                        r="6.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M7 10l2 2 4-4"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#202124]">
                    Objetivos do Programa
                  </h2>
                </div>
                <ul className="flex flex-col gap-3.5">
                  {(
                    discipline.objectives || [
                      "Compreender e comparar conceitos fundamentais e teorias estruturantes.",
                      "Planejar e aplicar métodos práticos em resolução de problemas reais.",
                      "Elicitar e sintetizar conteúdos de modo iterativo e colaborativo.",
                      "Desenvolver autonomia acadêmica e postura crítica na área.",
                    ]
                  ).map((objective) => (
                    <li
                      key={objective}
                      className="flex items-start gap-3 text-xs sm:text-sm text-[#545864] leading-relaxed"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#7C6CF0]" />
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Seção Turmas Ofertadas */}
          <section
            aria-labelledby="turmas-ofertadas-heading"
            className="mb-6 rounded-3xl bg-white p-6 sm:p-8 border border-[#E8E6F8] shadow-xs"
          >
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDE9FD] text-[#5B4BDB]">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <h2
                    id="turmas-ofertadas-heading"
                    className="text-lg sm:text-xl font-bold text-[#202124]"
                  >
                    Turmas Ofertadas
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Consulte docentes, horários, salas e ocupação das vagas no
                    semestre letivo atual
                  </p>
                </div>
              </div>

              {!classesLoading && !classesError && (
                <span
                  className={`self-start sm:self-auto rounded-full px-3 py-1 text-xs font-semibold ${
                    classes.length > 0
                      ? "bg-[#EDE9FD] text-[#5B4BDB]"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {classes.length > 0
                    ? `${classes.length} ${
                        classes.length === 1
                          ? "turma disponível"
                          : "turmas disponíveis"
                      }`
                    : "0 turmas disponíveis"}
                </span>
              )}
            </div>

            {/* Estado 1: Skeleton Loader (Prevenção de CLS) */}
            {classesLoading ? (
              <div
                aria-label="Carregando lista de turmas"
                className="grid grid-flow-col auto-cols-[260px] gap-4 overflow-x-auto sm:gap-5"
              >
                {[1, 2, 3, 4].map((skeletonId) => (
                  <ClassCardSkeleton key={skeletonId} />
                ))}
              </div>
            ) : classesError ? (
              /* Estado 2: Erro amigável com botão de Retry */
              <div
                role="alert"
                className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/50 px-6 py-12 text-center"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                  <svg
                    className="h-7 w-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[#202124]">
                  Não foi possível carregar as turmas
                </h3>
                <p className="mt-2 max-w-md text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {classesError}
                </p>
                <button
                  type="button"
                  onClick={handleRetryClasses}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#5B4BDB] px-5 py-2.5 text-xs font-semibold text-white transition-all hover:brightness-110 shadow-xs active:scale-95 cursor-pointer"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Tentar novamente
                </button>
              </div>
            ) : classes.length > 0 ? (
              /* Estado 3: Barra de Filtros + Grid de Turmas ou Empty State de Filtro */
              <>
                <ClassFilters
                  selectedShift={selectedShift}
                  onShiftChange={handleShiftChange}
                  sortBy={sortBy}
                  onSortChange={handleSortChange}
                  totalCount={classes.length}
                  filteredCount={filteredAndSortedClasses.length}
                  onResetFilters={handleResetClassFilters}
                  searchQuery={classSearchQuery}
                  onSearchChange={(val) => {
                    setClassSearchQuery(val);
                    setClassPage(1);
                  }}
                  onlyWithData={onlyClassesWithData}
                  onOnlyWithDataChange={(only) => {
                    setOnlyClassesWithData(only);
                    setClassPage(1);
                  }}
                  periodosDisponiveis={periodosDisponiveis}
                  periodoSelecionado={periodoAtivo}
                  aoAlterarPeriodo={aoAlterarPeriodo}
                />

                {filteredAndSortedClasses.length > 0 ? (
                  <>
                    <p role="status" className="mb-4 text-sm text-gray-600">
                      Mostrando {paginatedClasses.startItem} a {paginatedClasses.endItem}{" "}
                      de {filteredAndSortedClasses.length}{" "}
                      {filteredAndSortedClasses.length === 1 ? "turma" : "turmas"}
                    </p>
                    <div className="overflow-x-auto pb-2">
                      <div className="grid min-w-[1000px] grid-cols-4 gap-4 sm:gap-5">
                        {paginatedClasses.items.map((turma) => (
                          <ClassCard key={turma.id} classData={turma} />
                        ))}
                      </div>
                    </div>
                    <Pagination
                      currentPage={paginatedClasses.currentPage}
                      totalPages={paginatedClasses.totalPages}
                      onPageChange={setClassPage}
                      itemsPerPage={CLASSES_PER_PAGE}
                    />
                  </>
                ) : (
                  <ClassEmptyState
                    hasActiveFilters={true}
                    selectedShift={selectedShift}
                    onResetFilters={handleResetClassFilters}
                  />
                )}
              </>
            ) : (
              /* Estado 4: Nenhuma turma ofertada para a disciplina */
              <ClassEmptyState hasActiveFilters={false} />
            )}
          </section>

          <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-xs sm:p-8">
            
            <div className="mb-7 flex flex-col md:flex-row md:items-start justify-between gap-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#202124]">
                  Painel de Desempenho e Estatísticas Históricas
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-gray-500">
                  Dados consolidados via DPO/INEP e registros da comunidade
                  discente da UnB
                </p>
              </div>

              <label className="flex w-full sm:w-72 flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Período analisado
                </span>
                <div className="relative">
                  <select
                    value={activePeriod}
                    onChange={(event) => setPeriod(event.target.value)}
                    className="w-full appearance-none rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-2.5 pr-10 text-xs font-medium text-[var(--foreground)] outline-none focus:border-[var(--primary)] sm:text-sm"
                  >
                    {periodOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
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

            <ClassPerformancePieForm classes={classes} />

            {periodSummary.suppressedByLgpd && (
              <div
                role="status"
                className="mb-5 flex items-start gap-2.5 rounded-2xl border border-[#D8D1FA] bg-[#EDE9FD] px-4 py-3 text-xs sm:text-sm text-[#5B4BDB]"
              >
                <span>
                  <strong>Dados individuais suprimidos pela LGPD (RN07):</strong>{" "}
                  o período selecionado possui {periodSummary.matriculados}{" "}
                  {periodSummary.matriculados === 1 ? "matrícula" : "matrículas"}{" "}
                  (mínimo de 5 para exibição individual). Selecione{" "}
                  <strong>Todos os semestres</strong> para ver o acumulado consolidado.
                </span>
              </div>
            )}

            <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl p-5 border"
                  style={{
                    background: metric.background,
                    borderColor: metric.border,
                  }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface)] shadow-2xs"
                      style={{ color: metric.iconColor }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        aria-hidden="true"
                      >
                        {metric.icon}
                      </svg>
                    </div>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: metric.color }}
                    >
                      {metric.count}
                    </span>
                  </div>
                  <div
                    className="text-2xl sm:text-3xl font-extrabold"
                    style={{
                      color: metric.color,
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    {metric.value}
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[var(--text-muted)] sm:text-sm">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>

            
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-5 sm:p-6">
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  showSemesterEvolution ? "mb-6" : "mb-0"
                }`}
              >
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)] sm:text-lg">
                    Evolução semestral
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Distribuição percentual dos resultados por semestre
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary-text)]">
                    Base acumulada:{" "}
                    {totalMatriculados > 0
                      ? `${totalMatriculados} ${totalMatriculados === 1 ? "matrícula" : "matrículas"}`
                      : "Sem dados"}
                  </span>

                  <button
                    type="button"
                    aria-expanded={showSemesterEvolution}
                    aria-controls="evolucao-semestral-conteudo"
                    aria-label={
                      showSemesterEvolution
                        ? "Ocultar evolução semestral"
                        : "Mostrar evolução semestral"
                    }
                    onClick={() => setShowSemesterEvolution((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary-text)] cursor-pointer"
                  >
                    <span>{showSemesterEvolution ? "Ocultar" : "Mostrar"}</span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                      className={`transition-transform duration-200 ${
                        showSemesterEvolution ? "rotate-180" : "rotate-0"
                      }`}
                    >
                      <path
                        d="M4 6l4 4 4-4"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {showSemesterEvolution && (
                <div id="evolucao-semestral-conteudo">
              {performanceList.length === 0 ? (
                <p role="status" className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 text-sm text-[var(--text-muted)]">
                  Não há histórico semestral público disponível para esta disciplina. Registros com baixa amostragem são preservados conforme a LGPD.
                </p>
              ) : (
                <>
              <div className="flex h-64 gap-3 sm:gap-5">
                {/* Eixo Y */}
                <div className="flex w-8 flex-col justify-between pb-7 text-right text-[11px] font-medium text-[var(--text-muted)] sm:w-10">
                  <span>100%</span>
                  <span>75%</span>
                  <span>50%</span>
                  <span>25%</span>
                  <span>0%</span>
                </div>

                
                <div className="relative flex min-w-0 flex-1 items-end justify-around border-b border-l border-[var(--border-subtle)] px-2 pb-7 sm:px-8">
                  {[25, 50, 75, 100].map((line) => (
                    <div
                      key={line}
                      className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-[var(--border-subtle)]"
                      style={{ bottom: `${line}%` }}
                    />
                  ))}

                  {performanceList.map((item, index) => {
                    const tooltipAlignment =
                      index === 0
                        ? "left-0"
                        : index >= performanceList.length - 2
                        ? "right-0"
                        : "left-1/2 -translate-x-1/2";
                    const total =
                      (item.approved || 0) +
                      (item.failed || 0) +
                      (item.absent || 0) +
                      (item.withdrawn || 0);
                    const approvedPct =
                      total > 0
                        ? ((item.approved / total) * 100).toFixed(1)
                        : "0";
                    const failedPct =
                      total > 0
                        ? ((item.failed / total) * 100).toFixed(1)
                        : "0";
                    const absentPct =
                      total > 0
                        ? ((item.absent / total) * 100).toFixed(1)
                        : "0";
                    const withdrawnPct =
                      total > 0
                        ? ((item.withdrawn / total) * 100).toFixed(1)
                        : "0";

                    return (
                      <div
                        key={item.semester}
                        className="relative z-10 flex h-full min-w-0 w-10 sm:w-16 flex-col items-center justify-end group"
                      >
                        
                        <div
                          className={`absolute -top-12 w-40 ${tooltipAlignment} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gray-900 text-white text-[10px] rounded-lg px-2 py-1 whitespace-normal text-center z-20 shadow-md`}
                        >
                          {item.semester}: {approvedPct}% aprov. (
                          {item.approved}/{total})
                        </div>

                        
                        <div
                          className="flex h-full w-8 max-w-[75%] sm:max-w-full sm:w-10 flex-col-reverse overflow-hidden rounded-t-lg transition-transform group-hover:scale-y-102"
                          aria-label={`${item.semester}: ${approvedPct}% aprovação, ${failedPct}% reprovação por nota`}
                        >
                          <div
                            style={{
                              height: `${approvedPct}%`,
                              background: "var(--status-success-text)",
                            }}
                            title={`Aprovação: ${approvedPct}% (${item.approved})`}
                          />
                          <div
                            style={{
                              height: `${failedPct}%`,
                              background: "var(--status-danger-text)",
                            }}
                            title={`Reprovação por nota: ${failedPct}% (${item.failed})`}
                          />
                          <div
                            style={{
                              height: `${absentPct}%`,
                              background: "var(--status-warning-text)",
                            }}
                            title={`Reprovação por falta: ${absentPct}% (${item.absent})`}
                          />
                          <div
                            style={{
                              height: `${withdrawnPct}%`,
                              background: "var(--status-neutral-text)",
                            }}
                            title={`Trancamento: ${withdrawnPct}% (${item.withdrawn})`}
                          />
                        </div>

                        
                        <span className="absolute -bottom-6 whitespace-nowrap text-[11px] font-medium text-[var(--text-muted)] max-sm:-bottom-8 max-sm:-rotate-45">
                          {item.semester}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              
              <div className="mt-8 flex flex-wrap justify-center gap-4 sm:gap-7 pt-2">
                {[
                  ["Aprovação", "var(--status-success-text)"],
                  ["Reprovação por nota", "var(--status-danger-text)"],
                  ["Reprovação por falta", "var(--status-warning-text)"],
                  ["Trancamento", "var(--status-neutral-text)"],
                ].map(([label, color]) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-xs"
                      style={{ background: color }}
                    />
                    {label}
                  </div>
                ))}
              </div>

              <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]">
                <table
                  aria-label={`Tabela de desempenho historico semestral de ${discipline.name}`}
                  className="w-full text-left text-xs text-[var(--foreground)]"
                >
                  <caption className="sr-only">
                    Distribuicao semestral de aprovados, reprovados por nota, reprovados por falta e trancamentos da disciplina {discipline.code} - {discipline.name}
                  </caption>
                  <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    <tr>
                      <th scope="col" className="px-3.5 py-2.5">Semestre</th>
                      <th scope="col" className="px-3.5 py-2.5">Avaliados</th>
                      <th scope="col" className="px-3.5 py-2.5">Aprovacao</th>
                      <th scope="col" className="px-3.5 py-2.5">Reprov. Nota</th>
                      <th scope="col" className="px-3.5 py-2.5">Reprov. Falta</th>
                      <th scope="col" className="px-3.5 py-2.5">Trancamentos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {performanceList.map((item) => {
                      const total =
                        (item.approved || 0) +
                        (item.failed || 0) +
                        (item.absent || 0) +
                        (item.withdrawn || 0);
                      const pct = (val: number) =>
                        total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={`row-${item.semester}`} className="hover:bg-[var(--surface-soft)]">
                          <th scope="row" className="px-3.5 py-2 font-bold text-[var(--foreground)]">
                            {item.semester}
                          </th>
                          <td className="px-3.5 py-2">{total > 0 ? total : "Sem dados"}</td>
                          <td className="px-3.5 py-2 font-semibold text-[var(--status-success-text)]">
                            {(item.approved || 0) > 0
                              ? `${pct(item.approved || 0)}% (${item.approved})`
                              : "Sem dados"}
                          </td>
                          <td className="px-3.5 py-2 text-[var(--status-danger-text)]">
                            {(item.failed || 0) > 0
                              ? `${pct(item.failed || 0)}% (${item.failed})`
                              : "Sem dados"}
                          </td>
                          <td className="px-3.5 py-2 text-[var(--status-warning-text)]">
                            {(item.absent || 0) > 0
                              ? `${pct(item.absent || 0)}% (${item.absent})`
                              : "Sem dados"}
                          </td>
                          <td className="px-3.5 py-2 text-[var(--status-neutral-text)]">
                            {(item.withdrawn || 0) > 0
                              ? `${pct(item.withdrawn || 0)}% (${item.withdrawn})`
                              : "Sem dados"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
                </>
              )}
                </div>
              )}
            </div>

            
            <div className="mt-6">
              <OpenDataExportBar
                title={`Historico Semestral de ${discipline.code} - ${discipline.name}`}
                recordCount={exportableHistoryRows.length}
                recordLabel="semestres"
                disabled={!hasRealExportableHistory}
                emptyMessage="Exportacao indisponivel: nao ha historico semestral publico real retornado pela API para esta disciplina (ou os registros possuem baixa amostragem suprimida pela LGPD)."
                compact={true}
                onExport={(format) =>
                  exportDisciplineHistoryOpenData(
                    discipline.code,
                    discipline.name,
                    periodSummary.selectedHistory,
                    format,
                    { consolidatedMetric: periodSummary.filteredConsolidatedMetric }
                  )
                }
              />
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#F7F7FA] border border-gray-100 px-4 py-3">
              <svg
                className="mt-0.5 flex-shrink-0 text-gray-500"
                width="17"
                height="17"
                viewBox="0 0 17 17"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="8.5"
                  cy="8.5"
                  r="7"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M8.5 7.5v4M8.5 5.2h.01"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <p className="text-xs text-gray-600 leading-relaxed">
                <strong>Respeito à LGPD:</strong> Dados agregados sem
                identificação nominal de estudantes. Turmas com menos de 5
                alunos são consolidadas no acumulado da matéria para preservar a
                privacidade discente.
              </p>
            </div>
          </section>
          
          <DificuldadesPanel
            disciplineId={discipline.id}
            disciplineSlug={discipline.slug || slug}
            disciplineCode={discipline.code}
            disciplineName={discipline.name}
            ementa={discipline.ementa}
          />

          <MateriaisApoio
            key={discipline.slug || slug}
            disciplineName={discipline.name}
            disciplineIdOrSlug={discipline.slug || slug}
            refreshTrigger={materialsReloadTrigger}
            pendingMaterialIds={pendingMaterialIds}
            onOpenUploadModal={() => setShowMaterialModal(true)}
          />

          <ComentariosFrontend
            disciplineName={discipline.name}
            disciplineCode={discipline.code}
            disciplineId={discipline.id}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function DisciplineDetailPage() {
  const params = useParams();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F7FA] flex flex-col font-sans">
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
            <div className="h-10 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="h-32 bg-white border border-[#EDE9FD] rounded-2xl p-6 mb-8" />
            <div className="mb-8 grid grid-flow-col auto-cols-[260px] gap-4 overflow-x-auto">
              {[1, 2, 3, 4].map((i) => (
                <ClassCardSkeleton key={i} />
              ))}
            </div>
          </main>
          <Footer />
        </div>
      }
    >
      <DisciplineDetailContent key={String(params?.slug ?? "")} />
    </Suspense>
  );
}
