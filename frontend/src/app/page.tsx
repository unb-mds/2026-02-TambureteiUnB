"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import GuestBanner from "@/components/GuestBanner";
import Button from "@/components/Button";
import COURSES, { CampusFilter, CAMPUS_LIST, Course } from "@/mocks/courses";

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampus, setSelectedCampus] = useState<CampusFilter>("Todos");

  // Filtro e busca em tempo real do catálogo na Landing Page
  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return COURSES.filter((course) => {
      const matchCampus =
        selectedCampus === "Todos" || course.campus === selectedCampus;

      const matchQuery =
        !query ||
        course.nome.toLowerCase().includes(query) ||
        (course.departamento && course.departamento.toLowerCase().includes(query)) ||
        course.campus.toLowerCase().includes(query);

      return matchCampus && matchQuery;
    });
  }, [searchQuery, selectedCampus]);

  const campusBadgeColor = (campus: string) => {
    switch (campus) {
      case "FGA":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Darcy Ribeiro":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "FCE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "FUP":
        return "bg-amber-50 text-amber-800 border-amber-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7FA] flex flex-col font-sans">
      {/* Barra de Navegação */}
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col gap-8">
        {/* Faixa de Aviso de Visitante */}
        <GuestBanner />

        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-[#EDE9FD]/50 border border-[#E8E6F8] p-8 sm:p-12 shadow-xs">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#5B4BDB]/10 px-3 py-1 text-xs font-bold text-[#5B4BDB] mb-4">
              <span>Universidade de Brasília • MDS 2026/2</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#202124] tracking-tight leading-tight">
              O hub colaborativo das disciplinas da{" "}
              <span className="text-[#5B4BDB]">UnB</span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed">
              Consulte ementas, taxas históricas de aprovação e reprovação, dicas de estudo
              e resumos compartilhados pelos próprios estudantes dos 4 campi.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#catalogo">
                <Button variant="primary" size="lg" className="shadow-md">
                  Explorar Cursos
                </Button>
              </a>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Entrar na Comunidade
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Seção Catálogo com Busca em Tempo Real e Filtros de Campus */}
        <section id="catalogo" className="scroll-mt-20">
          <div className="mb-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#5B4BDB] uppercase tracking-wider mb-1">
              <span>Matrizes Curriculares</span>
              <span>•</span>
              <span>FGA, Darcy Ribeiro, FCE e FUP</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#202124]">
              Catálogo de Cursos
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Pesquise pelo nome do curso e filtre por campus para encontrar as disciplinas e dados acadêmicos.
            </p>
          </div>

          {/* Barra de Pesquisa e Filtros */}
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
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar curso por nome ou departamento..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#F7F7FA] border border-[#E8E6F8] rounded-xl text-sm text-[#202124] placeholder-gray-400 focus:bg-white focus:border-[#5B4BDB] focus:ring-4 focus:ring-[#5B4BDB]/15 transition-all outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
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
                    onClick={() => setSelectedCampus(campus)}
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
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs text-gray-500 font-medium">
              Exibindo <span className="font-bold text-[#202124]">{filteredCourses.length}</span> cursos{" "}
              {selectedCampus !== "Todos" && (
                <>
                  no campus <strong className="text-[#5B4BDB]">{selectedCampus}</strong>
                </>
              )}
            </p>

            {(searchQuery || selectedCampus !== "Todos") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCampus("Todos");
                }}
                className="text-xs text-[#5B4BDB] hover:text-[#4F3EC9] font-semibold hover:underline"
              >
                Redefinir filtros
              </button>
            )}
          </div>

          {/* Grade de Cards de Cursos */}
          {filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course: Course) => (
                <div
                  key={course.id}
                  className="group bg-white rounded-2xl border border-[#E8E6F8] p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-[#5B4BDB]/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Badges superiores: Campus e Grau */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${campusBadgeColor(
                          course.campus
                        )}`}
                      >
                        {course.campus}
                      </span>
                      <span className="text-[11px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                        {course.grau} • {course.turno}
                      </span>
                    </div>

                    {/* Nome do Curso */}
                    <h3 className="text-lg font-bold text-[#202124] group-hover:text-[#5B4BDB] transition-colors leading-snug">
                      {course.nome}
                    </h3>

                    {/* Departamento / Faculdade */}
                    {course.departamento && (
                      <p className="text-xs text-gray-500 font-medium mt-1">
                        {course.departamento}
                      </p>
                    )}

                    {/* Descrição resumida */}
                    {course.descricao && (
                      <p className="text-xs text-gray-600 mt-3 line-clamp-2 leading-relaxed">
                        {course.descricao}
                      </p>
                    )}
                  </div>

                  {/* Rodapé do Card com Métricas e Botão */}
                  <div className="mt-5 pt-4 border-t border-[#F7F7FA] flex items-center justify-between gap-3">
                    <div className="text-[11px] text-gray-500 flex flex-col">
                      <span className="font-semibold text-gray-700">
                        {course.semestres ? `${course.semestres} semestres` : "Fluxo padrão"}
                      </span>
                      <span>{course.total_disciplinas || 45} disciplinas</span>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        alert(
                          `Em breve: hub com grade e métricas analíticas de ${course.nome}!`
                        );
                      }}
                      rightIcon={
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      }
                    >
                      Ver disciplinas
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
                  setSearchQuery("");
                  setSelectedCampus("Todos");
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </section>
      </main>

      {/* Rodapé */}
      <footer className="border-t border-[#E8E6F8] bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© 2026 Tamburetei UnB • Projeto da disciplina MDS (FCTE/UnB).</p>
          <div className="flex items-center gap-4">
            <Link href="/cursos" className="hover:text-[#5B4BDB]">
              Cursos
            </Link>
            <Link href="/login" className="hover:text-[#5B4BDB]">
              Login
            </Link>
            <Link href="/cadastro" className="hover:text-[#5B4BDB]">
              Cadastro
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
