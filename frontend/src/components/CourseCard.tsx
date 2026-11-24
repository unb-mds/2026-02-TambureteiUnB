"use client";

import Link from "next/link";
import React from "react";
import Button from "./Button.tsx";
import PasAdmissionCard from "./PasAdmissionCard.tsx";
import { Course } from "../types/curso.ts";
import { getCourseMetricsForYear, type CatalogYearSelection } from "../utils/catalogYearFilter.ts";

interface CourseCardProps {
  course: Course;
  activeYear?: CatalogYearSelection;
}

function getCampusBadgeClasses(campus: string): string {
  switch (campus) {
    case "Darcy Ribeiro":
      return "bg-[#EDE9FD] text-[#5B4BDB] border-[#DDD6FE]";
    case "FGA":
    case "Gama":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "FCE":
    case "Ceilândia":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "FUP":
    case "Planaltina":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export default function CourseCard({ course, activeYear = "all" }: CourseCardProps) {
  const m = getCourseMetricsForYear(course, activeYear);

  return (
    <div className="relative group bg-white rounded-2xl border border-[#E8E6F8] p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-[#5B4BDB]/40 transition-all flex flex-col justify-between cursor-pointer focus-within:ring-2 focus-within:ring-[#5B4BDB] focus-within:ring-offset-2">
      {/* Link overlay cobrindo todo o retangulo do card */}
      <Link
        href={`/cursos/${course.slug}`}
        className="absolute inset-0 z-10 rounded-2xl focus:outline-hidden"
        aria-label={`Ver curso ${course.nome}`}
      >
        <span className="sr-only">Ver curso {course.nome}</span>
      </Link>

      <div>
        {/* Badges superiores: Campus e Grau */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getCampusBadgeClasses(
                course.campus
              )}`}
            >
              {course.campus}
            </span>
            {course.modalidade === "A Distância" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                EaD
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {course.total_creditos && (
              <span className="text-[10px] font-bold text-[#5B4BDB] bg-[#EDE9FD] px-2 py-0.5 rounded-md">
                {course.total_creditos} cr
              </span>
            )}
            <span className="text-[11px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
              {course.grau} • {course.modalidade === "A Distância" ? "A Distância" : course.turno}
            </span>
          </div>
        </div>

        {/* Nome do Curso */}
        <h3 className="text-lg font-bold text-[#202124] group-hover:text-[#5B4BDB] transition-colors leading-snug">
          {course.nome}
        </h3>

        <div className="relative z-20">
          <PasAdmissionCard course={course} year={activeYear} />
        </div>

        {/* Identificador de Estrutura Curricular / Matriz */}
        {course.matriz_curricular && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mt-1">
            <svg className="w-3.5 h-3.5 text-[#5B4BDB] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>
              Matriz <strong className="font-semibold text-gray-700">{course.matriz_curricular}</strong>
              {course.ano_vigencia ? ` • Vigência ${course.ano_vigencia}` : ""}
            </span>
          </div>
        )}

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

        {/* Indicadores DPO reais do Curso */}
        {!m ? (
          <div className="mt-4 pt-3 border-t border-[#EDE9FD]/60">
            <div className="bg-[#FAF9FE] rounded-xl p-2.5 border border-[#EDE9FD]/70 flex flex-col justify-between min-h-[58px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">
                  Métricas Institucionais
                </span>
                <span className="text-[10px] font-semibold text-[#5B4BDB] bg-[#5B4BDB]/10 px-2 py-0.5 rounded-md">
                  {activeYear === "all" ? "DPO" : `DPO ${activeYear}`}
                </span>
              </div>
              <span className="text-[11px] text-gray-500 mt-1">
                {activeYear === "all"
                  ? "Dados unificados no turno principal pelo anuário"
                  : `Sem registro individual para o ano de ${activeYear}`}
              </span>
            </div>

            <div className="flex items-center text-[11px] text-gray-400 px-1 pt-2.5">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                Contabilizado na modalidade geral do curso
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-4 pt-3 border-t border-[#EDE9FD]/60">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#F8F7FD] rounded-xl p-2.5 flex flex-col justify-between border border-[#EDE9FD]/70">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">
                  Matriculados {m.ano ? `(${m.ano})` : ""}
                </span>
                <span className="text-sm font-extrabold text-[#202124] mt-0.5">
                  {m.matriculados.toLocaleString("pt-BR")}{" "}
                  <span className="text-[10px] font-normal text-gray-500">alunos</span>
                </span>
              </div>

              <div className="bg-[#EAF8EF] rounded-xl p-2.5 flex flex-col justify-between border border-[#D1F0DC]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#287A45]">
                  Concluintes
                </span>
                <span className="text-sm font-extrabold text-[#1B6634] mt-0.5">
                  {m.concluintes.toLocaleString("pt-BR")}{" "}
                  <span className="text-[10px] font-normal text-[#287A45]">formados/ano</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500 px-1 pt-2.5">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#5B4BDB]" />
                Ingressantes: <strong className="font-semibold text-gray-700">{m.ingressantes}</strong>
                {m.vagas_totais > 0 && m.vagas_totais !== m.ingressantes ? ` / ${m.vagas_totais} vagas` : " vagas"}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                  {m.trancados.toLocaleString("pt-BR")} tranc.
                </span>
                {m.taxa_evasao !== null && m.taxa_evasao !== undefined && (
                  <span className="font-semibold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                    {m.taxa_evasao}% evasão anual
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rodapé do Card com Métricas e Botão */}
      <div className="mt-5 pt-4 border-t border-[#F7F7FA] flex items-center justify-between gap-3">
        <div className="text-[11px] text-gray-500 flex flex-col">
          <span className="font-semibold text-gray-700">
            {course.semestres ? `${course.semestres} semestres` : "Fluxo sugerido"}
          </span>
          <span>
            {course.total_disciplinas !== undefined
              ? `${course.total_disciplinas} disciplinas na grade`
              : "Grade curricular"}
          </span>
        </div>

        <div className="relative z-20">
          <Button
            variant="primary"
            size="sm"
            tabIndex={-1}
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
    </div>
  );
}
