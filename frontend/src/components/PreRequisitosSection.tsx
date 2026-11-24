"use client";

import Link from "next/link";
import React from "react";
import { formatPreRequisitos } from "../utils/preRequisitos.ts";

interface PreRequisitosSectionProps {
  preRequisitosItens?: Array<{ codigo: string; nome: string; slug?: string }>;
  preRequisitosStrings?: string[];
  coRequisitos?: string | null;
}

export default function PreRequisitosSection({
  preRequisitosItens,
  preRequisitosStrings,
  coRequisitos,
}: PreRequisitosSectionProps) {
  const formattedItems = formatPreRequisitos(preRequisitosItens, preRequisitosStrings);
  const hasPreReqs = formattedItems.length > 0;

  return (
    <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col gap-3">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-[#5B4BDB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Pré-requisitos Obrigatórios
          </span>
        </div>

        {hasPreReqs ? (
          <div className="flex flex-wrap gap-2">
            {formattedItems.map((item) => {
              if (item.slug) {
                return (
                  <Link
                    key={item.codigo || item.nome}
                    href={`/disciplinas/${item.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#EDE9FD] bg-[#FAF9FE] px-3 py-1.5 text-xs font-semibold text-[#5B4BDB] hover:bg-[#EDE9FD] hover:border-[#5B4BDB]/40 transition-all shadow-2xs group"
                    title={`Ver detalhes da disciplina ${item.textoCompleto}`}
                  >
                    <span>{item.textoCompleto}</span>
                    <span aria-hidden="true" className="group-hover:translate-x-0.5 transition-transform">
                      →
                    </span>
                  </Link>
                );
              }

              return (
                <span
                  key={item.nome}
                  className="inline-flex items-center rounded-lg bg-gray-100 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700"
                >
                  {item.textoCompleto}
                </span>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-[#F7F7FA] border border-gray-100 px-3.5 py-2 text-xs text-gray-500 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Sem pré-requisitos exigidos para esta disciplina.</span>
          </div>
        )}
      </div>

      {coRequisitos && coRequisitos.trim().length > 0 && (
        <div className="mt-1">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
            Co-requisito registrado:
          </span>
          <span className="inline-flex items-center rounded-lg bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-800">
            {coRequisitos}
          </span>
        </div>
      )}
    </div>
  );
}
