"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StoolIllustration from "@/components/StoolIllustration";
import api from "@/services/api";
import {
  GLOBAL_CAMPUSES,
  GLOBAL_AREAS,
  GLOBAL_DEPARTMENTS,
  Discipline,
} from "@/types/disciplina";

function DisciplinasContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState(initialQuery);
  const [appliedQuery, setAppliedQuery] = useState(initialQuery);
  const [campus, setCampus] = useState("Todos os Campi");
  const [department, setDepartment] = useState("Todos os Departamentos");
  const [area, setArea] = useState("Todas");
  const [sort, setSort] = useState<"Mais populares" | "Menor taxa de aprovação" | "Mais materiais">("Mais populares");

  useEffect(() => {
    let isMounted = true;
    async function loadDisciplines() {
      try {
        setLoading(true);
        const data = await api.getDisciplines();
        if (isMounted) {
          setDisciplines(data);
        }
      } catch (err) {
        console.error("Erro ao carregar catálogo de disciplinas:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadDisciplines();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredResults: Discipline[] = useMemo(() => {
    const normalizedQuery = appliedQuery.trim().toLocaleLowerCase("pt-BR");

    return disciplines.filter((discipline) => {
      const searchable = `${discipline.name} ${discipline.code} ${discipline.departmentName} ${discipline.department}`.toLocaleLowerCase("pt-BR");
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      const matchesCampus =
        campus === "Todos os Campi" ||
        discipline.campusFilter === campus ||
        discipline.campus === campus;
      const matchesDepartment =
        department === "Todos os Departamentos" || discipline.department === department;
      const matchesArea = area === "Todas" || discipline.area === area;

      return matchesQuery && matchesCampus && matchesDepartment && matchesArea;
    }).sort((a, b) => {
      if (sort === "Menor taxa de aprovação") return a.approval - b.approval;
      if (sort === "Mais materiais") return b.resources - a.resources;
      return b.popularity - a.popularity;
    });
  }, [disciplines, appliedQuery, campus, department, area, sort]);

  const executeSearch = () => {
    setAppliedQuery(query);
  };

  return (
    <div className="min-h-screen bg-[#F7F7FA] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pb-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-white border-b border-[#EDE9FD]">
          <div className="relative mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 max-w-7xl">
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EDE9FD]">
                <StoolIllustration size={44} />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#5B4BDB] uppercase tracking-wider mb-1">
                  <span>Universidade de Brasília</span>
                  <span>•</span>
                  <span>Catálogo Geral</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-[#202124] tracking-tight">
                  Pesquisar Disciplinas da UnB
                </h1>
                <p className="mt-1.5 text-sm sm:text-base text-gray-500 max-w-3xl">
                  Busque qualquer matéria da universidade por nome, código SIGAA ou departamento, sem restrição de curso.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Área de Filtros e Busca */}
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-7xl">
          <section className="mb-8 rounded-3xl bg-white p-5 sm:p-6 border border-[#E8E6F8] shadow-xs">
            {/* Barra de Pesquisa */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-2xl bg-white border-2 border-[#DDD8FA] p-2 pl-4 focus-within:border-[#5B4BDB] transition-all">
              <div className="flex items-center gap-3 flex-1">
                <svg width="22" height="22" viewBox="0 0 23 23" fill="none" aria-hidden="true" className="text-[#7C6CF0]">
                  <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M15 15l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") executeSearch();
                  }}
                  placeholder="Digite o nome da disciplina ou código ex: MAT0025, CIC0004, FGA0138..."
                  aria-label="Pesquisar disciplinas da UnB"
                  className="flex-1 bg-transparent py-2 text-sm text-[#202124] outline-none placeholder-gray-400"
                />
              </div>
              <button
                type="button"
                onClick={executeSearch}
                className="rounded-xl bg-[#5B4BDB] px-6 sm:px-8 py-3 text-sm font-bold text-white transition-all hover:brightness-110 shadow-xs active:scale-95"
              >
                Buscar
              </button>
            </div>

            {/* Filtros de Campus e Departamento */}
            <div className="mt-6 flex flex-col md:flex-row items-stretch md:items-start justify-between gap-6">
              <div className="flex-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Campus</p>
                <div className="flex flex-wrap gap-2">
                  {GLOBAL_CAMPUSES.map((item) => {
                    const selected = campus === item;
                    return (
                      <button
                        type="button"
                        key={item}
                        onClick={() => setCampus(item)}
                        aria-pressed={selected}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                          selected
                            ? "bg-[#5B4BDB] text-white shadow-xs"
                            : "bg-[#F7F7FA] text-gray-600 border border-[#E1DFEA] hover:border-[#5B4BDB]/40 hover:text-[#5B4BDB]"
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
                  Instituto / Departamento
                </span>
                <div className="relative">
                  <select
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    className="w-full appearance-none rounded-xl bg-[#F7F7FA] border border-[#E1DFEA] px-4 py-2.5 pr-10 text-xs font-medium text-[#202124] outline-none focus:border-[#5B4BDB]"
                  >
                    {GLOBAL_DEPARTMENTS.map((item) => (
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

            {/* Filtro por Grande Área */}
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#ECEAF5] pt-5">
              <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Grande área:
              </span>
              {GLOBAL_AREAS.map((item) => {
                const selected = area === item;
                return (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setArea(item)}
                    aria-pressed={selected}
                    className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
                      selected
                        ? "bg-[#EDE9FD] text-[#5B4BDB]"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Barra de Ordenação e Contador */}
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-xs sm:text-sm text-gray-600">
              Exibindo <strong className="text-[#202124]">{filteredResults.length} disciplinas</strong>{" "}
              {appliedQuery && (
                <>
                  para <strong className="text-[#5B4BDB]">&quot;{appliedQuery}&quot;</strong>
                </>
              )}{" "}
              em toda a UnB
            </p>

            <label className="flex items-center gap-2.5 self-end sm:self-auto">
              <span className="text-xs font-medium text-gray-500">Ordenar por:</span>
              <div className="relative w-48">
                <select
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as "Mais populares" | "Menor taxa de aprovação" | "Mais materiais")
                  }
                  className="w-full appearance-none rounded-xl bg-white border border-[#E1DFEA] px-3.5 py-2 pr-8 text-xs font-semibold text-[#202124] outline-none focus:border-[#5B4BDB]"
                >
                  <option>Mais populares</option>
                  <option>Menor taxa de aprovação</option>
                  <option>Mais materiais</option>
                </select>
                <svg
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                  width="14"
                  height="14"
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

          {/* Grade de Disciplinas */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-[#E8E6F8] p-6 shadow-xs animate-pulse flex flex-col justify-between h-56"
                >
                  <div>
                    <div className="h-4 bg-gray-200 rounded-md w-1/4 mb-4" />
                    <div className="h-6 bg-gray-200 rounded-md w-3/4 mb-2" />
                    <div className="h-4 bg-gray-100 rounded-md w-1/2" />
                  </div>
                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                    <div className="h-4 bg-gray-200 rounded-md w-1/3" />
                    <div className="h-8 bg-gray-200 rounded-xl w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredResults.length > 0 ? (
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResults.map((discipline) => (
                <article
                  key={discipline.slug || discipline.code}
                  className="group flex flex-col justify-between rounded-2xl bg-white p-5 sm:p-6 border border-[#E8E6F8] shadow-xs hover:shadow-md hover:border-[#5B4BDB]/40 hover:-translate-y-0.5 transition-all"
                >
                  <div>
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <span className="rounded-lg bg-[#EDE9FD] px-2.5 py-1 text-xs font-bold text-[#5B4BDB]">
                        {discipline.code}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          discipline.approval >= 70
                            ? "bg-[#E9F9F3] text-[#067A59]"
                            : "bg-[#FFF7E8] text-[#925600]"
                        }`}
                      >
                        {discipline.approval}% de aprovação
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-[#202124] group-hover:text-[#5B4BDB] transition-colors leading-snug">
                      {discipline.name}
                    </h2>

                    <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                      {discipline.departmentName} <span className="mx-1 text-[#C4C1D8]">•</span> {discipline.campus}
                    </p>

                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-gray-700">
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
                        <strong className="text-gray-800">{discipline.resources}</strong> materiais e relatos
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-[#EDE9FD] pt-4">
                    <Link
                      href={`/disciplinas/${discipline.slug}`}
                      className="flex w-full items-center justify-between text-xs sm:text-sm font-bold text-[#5B4BDB] group-hover:translate-x-0.5 transition-all"
                    >
                      <span>Acessar disciplina</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section className="flex flex-col items-center rounded-3xl bg-white border border-[#E8E6F8] px-8 py-16 text-center max-w-md mx-auto">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EDE9FD]">
                <StoolIllustration size={42} />
              </div>
              <h2 className="text-lg font-bold text-[#202124]">Nenhuma disciplina encontrada</h2>
              <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                Tente remover um filtro ou pesquisar outro nome, código ou departamento.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setAppliedQuery("");
                  setCampus("Todos os Campi");
                  setDepartment("Todos os Departamentos");
                  setArea("Todas");
                }}
                className="mt-5 rounded-xl bg-[#5B4BDB] px-5 py-2.5 text-xs font-semibold text-white hover:brightness-110"
              >
                Redefinir filtros
              </button>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function DisciplinasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F7FA] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5B4BDB] border-t-transparent" />
        </div>
      }
    >
      <DisciplinasContent />
    </Suspense>
  );
}
