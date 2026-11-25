"use client";

import React, { useSyncExternalStore, useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GuestBanner from "@/components/GuestBanner";
import CourseCard from "@/components/CourseCard";
import DataCollectionBanner from "@/components/DataCollectionBanner";
import Button from "@/components/Button";
import Pagination from "@/components/Pagination";
import { authService } from "@/services/authService";
import OpenDataExportBar from "@/components/OpenDataExportBar";
import CatalogYearFilter from "@/components/CatalogYearFilter";
import InstitutionalMetrics from "@/components/InstitutionalMetrics";
import { getCourses } from "@/services/courseService";
import { exportCoursesOpenData } from "@/services/openDataService";
import {
  getAvailableCourseCatalogYears,
  type CatalogYearSelection,
} from "@/utils/catalogYearFilter";
import useAsyncList from "@/hooks/useAsyncList";
import {
  filterCourses,
  paginateCourses,
  COURSES_PER_PAGE,
} from "@/utils/courseCatalog";
import { CampusFilter, CAMPUS_LIST, Course } from "@/types/curso";

export default function HomePage() {
  const { items: courses, loading } = useAsyncList(
    getCourses,
    "Erro ao carregar cursos da API:"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampus, setSelectedCampus] = useState<CampusFilter>("Todos");
  const [selectedYear, setSelectedYear] = useState<CatalogYearSelection>("all");
  const isLoggedIn = useSyncExternalStore(
    authService.subscribeAuthChange,
    authService.isAuthenticated,
    () => false,
  );

  const availableYears = useMemo(
    () => getAvailableCourseCatalogYears(courses),
    [courses]
  );
  const activeYear: CatalogYearSelection =
    selectedYear === "all" || availableYears.includes(selectedYear)
      ? selectedYear
      : "all";

  // Filtro e busca em tempo real do catálogo na Landing Page
  const filteredCourses = useMemo(() => {
    return filterCourses(courses, searchQuery, selectedCampus);
  }, [courses, searchQuery, selectedCampus]);

  const paginated = paginateCourses(filteredCourses, currentPage);
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };
  const handleCampusChange = (value: CampusFilter) => {
    setSelectedCampus(value);
    setCurrentPage(1);
  };
  const handleYearChange = (year: CatalogYearSelection) => {
    setSelectedYear(year);
    setCurrentPage(1);
  };
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-[#F7F7FA] flex flex-col font-sans">
      {/* Link de Salto de Navegacao para Teclado (WCAG 2.4.1) */}
      <a
        href="#catalogo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#5B4BDB] focus:text-white focus:font-semibold focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#5B4BDB]"
      >Pular para o conteúdo principal</a>

      {/* Barra de Navegação */}
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col gap-8">
        {/* Faixa de Aviso de Visitante */}
        {!isLoggedIn && <GuestBanner />}

        {/* Faixa de Aviso sobre Coleta Colaborativa de Dados */}
        <DataCollectionBanner />

        {/* Hero Section */}
        <section className="home-hero relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-[#EDE9FD]/50 border border-[#E8E6F8] p-8 sm:p-12 shadow-xs">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#5B4BDB]/10 px-3 py-1 text-xs font-bold text-[#5B4BDB] mb-4">
              <span>Universidade de Brasília • MDS 2026/2</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#202124] tracking-tight leading-tight">
              O hub colaborativo das disciplinas da{" "}
              <span className="text-[#5B4BDB]">UnB</span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-gray-700 leading-relaxed font-normal">
              Consulte ementas, taxas históricas de aprovação e reprovação, dicas de estudo
              e resumos compartilhados pelos próprios estudantes dos 4 campi.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#catalogo" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4BDB] focus-visible:ring-offset-2 rounded-xl">
                <Button variant="primary" size="lg" className="shadow-md">
                  Explorar Cursos
                </Button>
              </a>
              <Link href="/disciplinas" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4BDB] focus-visible:ring-offset-2 rounded-xl">
                <Button variant="outline" size="lg" className="border-[#5B4BDB] text-[#5B4BDB] hover:bg-[#5B4BDB]/5">
                  Explorar Disciplinas
                </Button>
              </Link>
              {!isLoggedIn && (
                <Link href="/login" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4BDB] focus-visible:ring-offset-2 rounded-xl">
                  <Button variant="ghost" size="lg" className="text-gray-700 hover:text-[#5B4BDB]">
                    Entrar na Comunidade
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div
            className="absolute -right-12 -bottom-12 w-96 h-96 bg-[#5B4BDB]/5 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />
        </section>

        {/* Metricas Consolidadas da UnB (Panorama Institucional) */}
        <InstitutionalMetrics />

        {/* Seção Catálogo de Cursos */}
        <section
          id="catalogo"
          aria-labelledby="catalogo-heading"
          className="bg-white rounded-3xl border border-[#E8E6F8] p-6 sm:p-8 shadow-xs flex flex-col gap-6"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#F7F7FA] pb-6">
            <div>
              <span className="text-xs font-bold text-[#5B4BDB] uppercase tracking-wider">
                Catálogo Geral
              </span>
              <h2
                id="catalogo-heading"
                className="text-2xl sm:text-3xl font-bold text-[#202124] tracking-tight mt-1"
              >
                Cursos de Graduação
              </h2>
              <p className="text-sm text-gray-700 mt-1">
                Selecione seu curso para ver o fluxo curricular e os índices de cada matéria
              </p>
            </div>

            {/* Barra de Busca com Semantica e Acessibilidade (WCAG 4.1.3 / Form Semantics) */}
            <form
              role="search"
              aria-label="Buscar curso de graduação"
              onSubmit={(e) => e.preventDefault()}
              className="relative w-full md:w-80"
            >
              <label htmlFor="campo-busca-cursos" className="sr-only">
                Buscar curso por nome ou departamento
              </label>
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600" aria-hidden="true">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="campo-busca-cursos"
                type="search"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Buscar curso (ex: Software)..."
                className="w-full pl-10 pr-9 py-2.5 bg-[#F7F7FA] border border-[#E8E6F8] rounded-xl text-sm text-[#202124] placeholder-gray-600 focus:outline-none focus:border-[#5B4BDB] focus:ring-2 focus:ring-[#5B4BDB]/20 focus-visible:ring-2 focus-visible:ring-[#5B4BDB] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  aria-label="Limpar termo de busca"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4BDB] rounded-lg"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </form>
          </div>

          {/* Filtros de Campus da UnB com Navegacao Acessivel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div
              role="group"
              aria-label="Filtrar cursos por campus da UnB"
              className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none"
            >
              {CAMPUS_LIST.map((campus) => {
                const active = selectedCampus === campus;
                return (
                  <button
                    key={campus}
                    type="button"
                    onClick={() => handleCampusChange(campus)}
                    aria-pressed={active}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4BDB] focus-visible:ring-offset-2 ${
                      active
                        ? "bg-[#5B4BDB] text-white shadow-xs"
                        : "bg-[#F7F7FA] text-gray-700 hover:bg-[#EDE9FD] hover:text-[#5B4BDB]"
                    }`}
                  >
                    {campus}
                  </button>
                );
              })}
            </div>

            {/* Regiao viva para leitor de tela nos resultados da busca (WCAG 4.1.3) */}
            <p
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="text-xs text-gray-700 shrink-0"
            >
              Exibindo <span className="font-bold text-[#202124]">{filteredCourses.length}</span> cursos{" "}
              {selectedCampus !== "Todos" && (
                <>
                  no campus <strong className="text-[#5B4BDB]">{selectedCampus}</strong>
                </>
              )}
            </p>

            {(searchQuery || selectedCampus !== "Todos" || activeYear !== "all") && (
              <button
                type="button"
                onClick={() => {
                  handleSearchChange("");
                  handleCampusChange("Todos");
                  handleYearChange("all");
                }}
                className="text-xs text-[#5B4BDB] hover:text-[#4F3EC9] font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4BDB] rounded-md px-1"
              >
                Redefinir filtros
              </button>
            )}
          </div>

          <CatalogYearFilter
            years={availableYears}
            selectedYear={activeYear}
            onChange={handleYearChange}
          />

          <div className="mb-6">
            <OpenDataExportBar
              title={
                activeYear === "all"
                  ? "Exportar Catalogo de Cursos da UnB"
                  : `Exportar Catalogo de Cursos da UnB (${activeYear})`
              }
              recordCount={filteredCourses.length}
              recordLabel="cursos"
              disabled={loading}
              compact={true}
              onExport={(format) =>
                exportCoursesOpenData(filteredCourses, format, {
                  year: activeYear,
                  identifier: selectedCampus !== "Todos" ? selectedCampus : null,
                })
              }
            />
          </div>

          {/* Grade de Cards de Cursos */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-[#E8E6F8] p-6 shadow-xs animate-pulse flex flex-col justify-between h-56"
                >
                  <div>
                    <div className="h-4 bg-gray-200 rounded-md w-1/3 mb-4" />
                    <div className="h-6 bg-gray-200 rounded-md w-3/4 mb-2" />
                    <div className="h-4 bg-gray-100 rounded-md w-1/2" />
                  </div>
                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                    <div className="h-4 bg-gray-200 rounded-md w-1/4" />
                    <div className="h-8 bg-gray-200 rounded-xl w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCourses.length > 0 ? (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.items.map((course: Course) => (
                <CourseCard
                  key={course.slug || course.id}
                  course={course}
                  activeYear={activeYear}
                />
              ))}
            </div>
            <Pagination
              currentPage={paginated.currentPage}
              totalPages={paginated.totalPages}
              onPageChange={handlePageChange}
              totalItems={filteredCourses.length}
              itemsPerPage={COURSES_PER_PAGE}
              itemName="cursos"
            />
            </>
          ) : (
            /* Estado Vazio */
            <div className="bg-white rounded-3xl border border-[#E8E6F8] p-12 text-center max-w-md mx-auto">
              <div className="h-12 w-12 rounded-2xl bg-[#5B4BDB]/10 text-[#5B4BDB] flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-[#202124]">
                Nenhum curso encontrado
              </h3>
              <p className="text-xs text-gray-700 mt-1 mb-6">
                Não encontramos cursos para os critérios pesquisados. Tente ajustar o nome ou selecionar outro campus.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleSearchChange("");
                  handleCampusChange("Todos");
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
