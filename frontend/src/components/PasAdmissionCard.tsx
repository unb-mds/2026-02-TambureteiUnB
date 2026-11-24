"use client";

import { useState } from "react";
import Link from "next/link";
import { normalizeSearchTerm } from "@/utils/search";
import type { Course } from "@/types/curso";
import { findPasAdmission, formatPasScore, getPasHistory, getPasSourceForYear } from "@/utils/pasAdmission";

export default function PasAdmissionCard({ course, expanded = false, year = "all" }: {
  course: Course; expanded?: boolean; year?: number | "all";
}) {
  const selectedSource = getPasSourceForYear(year);
  const source = selectedSource ?? { ciclo: String(year), sistema: "Sistema Universal", url: "" };
  const admission = selectedSource ? findPasAdmission(course, selectedSource) : undefined;
  const history = getPasHistory(course);
  const sourceUrl = `${source.url}${admission ? `#page=${admission.pagina}` : ""}`;
  const overview = <div className="min-w-0 flex-1">
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <div>
        <p className="text-xs font-bold text-[var(--primary-text)]">Nota PAS · {source.ciclo}</p>
        <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{source.sistema} · {year === "all" ? "Mais recente" : `Ciclo encerrado em ${year}`}</p>
      </div>
      <strong className="text-2xl font-extrabold tracking-tight text-[var(--primary-text)]">
        {admission ? formatPasScore(admission.minimo) : "Não disponível"}
      </strong>
    </div>
    {admission?.ingressoConjunto && <p className="mt-1 text-[10px] text-[var(--text-muted)]">Ingresso conjunto das Engenharias do Gama</p>}
    {admission && !admission.ingressoConjunto && admission.ofertaOriginal && (admission.graus.length > 1 || normalizeSearchTerm(admission.nome) !== normalizeSearchTerm(course.nome)) && <p className="mt-1 text-[10px] text-[var(--text-muted)]">Oferta no boletim: {admission.ofertaOriginal}</p>}
    {!admission && <p className="mt-1 text-[10px] text-[var(--text-muted)]">{selectedSource ? "Sem correspondência validada no boletim deste ciclo." : "Nenhum boletim PAS disponível para o ano selecionado."}</p>}
  </div>;

  const [quotaCycle, setQuotaCycle] = useState("");
  const quotaSource = expanded && quotaCycle ? history.find(item => item.source.ciclo === quotaCycle)?.source : selectedSource;
  const quotaAdmission = quotaSource ? findPasAdmission(course, quotaSource) : undefined;
  const quotaSourceUrl = quotaSource ? `${quotaSource.url}${quotaAdmission ? `#page=${quotaAdmission.pagina}` : ""}` : "";
  const quotaScores: Partial<Record<string, {minimo: string | null; maximo: string | null; observacao?: string}>> = quotaAdmission?.cotas ?? {};
  const quotaSection = <details className="group/quota border-t border-[var(--border-subtle)] bg-[var(--surface)]">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-[11px] font-semibold text-[var(--text-muted)] focus-visible:outline-2 focus-visible:outline-[var(--primary-text)] [&::-webkit-details-marker]:hidden">
      <span>Ver notas por modalidade de concorrência</span>
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5 shrink-0 transition-transform group-open/quota:rotate-180"><path d="m5 7.5 5 5 5-5" /></svg>
    </summary>
    <div className="space-y-3 px-3 pb-3">
      <p className="text-[10px] text-[var(--text-muted)]">PAS · {quotaSource?.ciclo ?? String(year)} · Argumentos finais dos selecionados</p>
      {expanded && <label className="block text-[11px] font-semibold">Ciclo das notas de cotas<select aria-label="Ciclo das notas de cotas" className="mt-1 block w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-2 text-xs text-[var(--foreground)]" value={quotaSource?.ciclo ?? ""} onChange={event => setQuotaCycle(event.target.value)}>{history.map(item => <option key={item.source.ciclo} value={item.source.ciclo}>{item.source.ciclo}</option>)}</select></label>}
      {!quotaAdmission ? <p className="text-[11px] text-[var(--text-muted)]">{quotaSource ? "Oferta sem correspondência validada neste ciclo. Não é possível atribuir notas de cotas a este curso." : "Nenhum boletim disponível para o ano selecionado."}</p> : <>
        <div tabIndex={0} aria-label={`Notas de cotas do PAS ${quotaSource?.ciclo}`} className="max-h-80 overflow-y-auto rounded-lg border border-[var(--border-subtle)] focus-visible:outline-2 focus-visible:outline-[var(--primary-text)]">
          <ul className="divide-y divide-[var(--border-subtle)]">
            {quotaSource?.modalidades.map(modality => {
              const values = quotaScores[modality.id];
              return <li key={modality.id} className="bg-[var(--surface-muted)] p-3">
                <p className="text-[10px] text-[var(--text-muted)]">{modality.sistema}</p>
                <p className="mt-1 text-[11px] font-semibold">{modality.descricao}</p>
                <dl className="mt-2 grid grid-cols-2 gap-3 text-[10px]">
                  <div><dt className="text-[var(--text-muted)]">Mínimo</dt><dd className="mt-0.5 text-sm font-semibold">{values ? formatPasScore(values.minimo) : "Não disponível"}</dd></div>
                  <div><dt className="text-[var(--text-muted)]">Máximo</dt><dd className="mt-0.5 text-sm font-semibold">{values ? formatPasScore(values.maximo) : "Não disponível"}</dd></div>
                </dl>
                {values?.observacao && <p className="mt-2 text-[10px] leading-relaxed text-[var(--text-muted)]">{values.observacao}</p>}
              </li>;
            })}
          </ul>
        </div>
        <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">“Não informado” corresponde à ausência de argumento no boletim, não a nota zero. As modalidades e os limites de renda são os desta edição; consulte o edital para as regras de participação.</p>
      </>}
      {quotaSource && <a href={quotaSourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-[10px] font-semibold text-[var(--primary-text)] underline underline-offset-2">Fonte Cebraspe · ciclo {quotaSource.ciclo}{quotaAdmission ? ` · p. ${quotaAdmission.pagina}` : ""}</a>}
    </div>
  </details>;

  return (
    <section id={expanded ? "notas-pas" : undefined} aria-label={`Nota PAS de ${course.nome}`} className="mt-3 scroll-mt-24 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--primary-soft)] text-[var(--foreground)]">
      {!expanded ? <div className="p-3">
        {overview}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold text-[var(--primary-text)]">
          {selectedSource && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Fonte Cebraspe</a>}
          <Link href={`/cursos/${course.slug}#notas-pas`} className="underline underline-offset-2">Ver histórico e detalhes</Link>
        </div>
      </div> : <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-4 p-3 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--primary-text)] [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex-1">
            {overview}
            <p className="mt-1.5 text-[11px] font-semibold text-[var(--primary-text)]">Histórico e detalhes</p>
          </div>
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0 text-[var(--primary-text)] transition-transform group-open:rotate-180"><path d="m5 7.5 5 5 5-5" /></svg>
        </summary>
        <div className="border-t border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">O valor é o menor argumento final dos candidatos selecionados no boletim, não a nota do último matriculado nem uma garantia de ingresso.{admission?.ingressoConjunto ? " Neste ciclo, a nota é da entrada conjunta das Engenharias, não exclusivamente de Software. Cada edição mantém sua própria oferta." : ""}</p>
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-[var(--primary-text)] underline underline-offset-2">Boletim {year === "all" ? "mais recente" : `do ciclo ${source.ciclo}`}{admission ? ` · p. ${admission.pagina}` : ""}</a>
          <section aria-label="Histórico de notas PAS" className="mt-5">
            <h2 className="text-sm font-bold">Histórico por ciclo</h2>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">Sistema Universal · {history.length} ciclos disponíveis</p>
            <ul className="mt-2 divide-y divide-[var(--border-subtle)]">
              {history.map(({ source, admission: past }, index) => <li key={source.ciclo} className={`flex flex-wrap items-start justify-between gap-3 py-3 ${index === 0 ? "text-[var(--primary-text)]" : ""}`}>
                <div className="min-w-0 flex-1 basis-40">
                  <p className="text-xs font-bold">{source.ciclo}{index === 0 ? " · Mais recente" : ""}</p>
                  {past?.ingressoConjunto && <p className="mt-1 text-[11px] text-[var(--text-muted)]">Ingresso conjunto das Engenharias do Gama</p>}
                  {!past && <p className="mt-1 text-[11px] text-[var(--text-muted)]">{source.observacao || "Oferta sem correspondência validada nesta edição."}</p>}
                  <a href={`${source.url}${past ? `#page=${past.pagina}` : ""}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[11px] text-[var(--primary-text)] underline underline-offset-2">Fonte Cebraspe{past ? ` · p. ${past.pagina}` : ""}</a>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{past ? formatPasScore(past.minimo) : "Não disponível"}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">mínimo do ciclo</p>
                </div>
              </li>)}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-muted)]">Argumentos negativos são válidos. Ausência de dados não significa nota zero. Mudanças de ingresso e de oferta podem limitar a comparação entre ciclos.</p>
          </section>
        </div>
      </details>}
      {quotaSection}
    </section>
  );
}
