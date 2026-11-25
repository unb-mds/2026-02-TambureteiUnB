"use client";

import React, { useState, useMemo } from "react";
import CourseCard from "@/components/CourseCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import Pagination from "@/components/Pagination";
import OpenDataExportBar from "@/components/OpenDataExportBar";
import CatalogYearFilter from "@/components/CatalogYearFilter";
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

const ITEMS_PER_PAGE = COURSES_PER_PAGE;

export default function CursosPage() {
  const { items: courses, loading } = useAsyncList(
    getCourses,
    "Erro ao carregar catálogo de cursos da API:"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampus, setSelectedCampus] = useState<CampusFilter>("Todos");
  const [selectedYear, setSelectedYear] = useState<CatalogYearSelection>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const availableYears = useMemo(
    () => getAvailableCourseCatalogYears(courses),
    [courses]
  );
  const activeYear: CatalogYearSelection =
    selectedYear === "all" || availableYears.includes(selectedYear)
      ? selectedYear
      : "all";

  // Filtro e busca em tempo real
  const filteredCourses = useMemo(() => {
    return filterCourses(courses, searchQuery, selectedCampus);
  }, [courses, searchQuery, selectedCampus]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleCampusChange = (campus: CampusFilter) => {
    setSelectedCampus(campus);
    setCurrentPage(1);
  };

  const handleYearChange = (year: CatalogYearSelection) => {
    setSelectedYear(year);
    setCurrentPage(1);
  };

  const { items: paginatedCourses, currentPage: activePage, totalPages } =
    paginateCourses(filteredCourses, currentPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 200, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7FA] flex flex-col font-sans">
      {/* Barra de Navegação */}
      <Navbar />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Cabeçalho do Catálogo */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5B4BDB] uppercase tracking-wider mb-2">
            <span>Universidade de Brasília</span>
            <span>•</span>
            <span>Matrizes Curriculares</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#202124] tracking-tight">
            Catálogo de Cursos
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-2xl leading-relaxed">
            Consulte os cursos de graduação da UnB nos campi FCTE, Darcy Ribeiro, FCE e FUP. 
            Acesse as disciplinas, estatísticas de aprovação e materiais de apoio.
          </p>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E8E6F8] shadow-xs mb-8 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Campo de Busca em Tempo Real */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar curso por nome ou departamento..."
              aria-label="Buscar curso por nome ou departamento"
              className="w-full pl-10 pr-4 py-2.5 bg-[#F7F7FA] border border-[#E8E6F8] rounded-xl text-sm text-[#202124] placeholder-gray-400 focus:bg-white focus:border-[#5B4BDB] focus:ring-4 focus:ring-[#5B4BDB]/15 transition-all outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                aria-label="Limpar busca"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filtro por Campus */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {CAMPUS_LIST.map((campus) => {
              const active = selectedCampus === campus;
              return (
                <button
                  key={campus}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleCampusChange(campus)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? "bg-[#5B4BDB] text-white shadow-xs"
                      : "bg-[#F7F7FA] text-gray-600 border border-[#E8E6F8] hover:border-[#5B4BDB]/40 hover:text-[#5B4BDB]"
                  }`}
                >
                  {campus}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contador de Resultados */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-gray-500 font-medium">
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
              className="text-xs text-[#5B4BDB] hover:text-[#4F3EC9] font-semibold hover:underline"
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
                ? "Exportar Dados Abertos de Cursos"
                : `Exportar Dados Abertos de Cursos (${activeYear})`
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
              {paginatedCourses.map((course: Course) => (
                <CourseCard
                  key={course.slug || course.id}
                  course={course}
                  activeYear={activeYear}
                />
              ))}
            </div>

            <Pagination
              currentPage={activePage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalItems={filteredCourses.length}
              itemsPerPage={ITEMS_PER_PAGE}
              itemName="cursos"
            />
          </>
        ) : (
          /* Estado Vazio */
          <div className="bg-white rounded-3xl border border-[#E8E6F8] p-12 text-center max-w-md mx-auto">
            <div className="h-12 w-12 rounded-2xl bg-[#5B4BDB]/10 text-[#5B4BDB] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <p className="text-xs text-gray-500 mt-1 mb-6">
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
      </main>

      <Footer />
    </div>
  );
}
