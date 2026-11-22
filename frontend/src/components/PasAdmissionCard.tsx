import Link from "next/link";
import type { Course } from "@/types/curso";
import { findPasAdmission, formatPasScore, getPasHistory, pasSource } from "@/utils/pasAdmission";

export default function PasAdmissionCard({ course, expanded = false }: {
  course: Course; expanded?: boolean;
}) {
  const admission = findPasAdmission(course);
  const history = getPasHistory(course);
  const sourceUrl = `${pasSource.url}${admission ? `#page=${admission.pagina}` : ""}`;
  const overview = <div className="min-w-0 flex-1">
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <div>
        <p className="text-xs font-bold text-[var(--primary-text)]">Nota PAS · {pasSource.ciclo}</p>
        <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{pasSource.sistema} · Mais recente</p>
      </div>
      <strong className="text-2xl font-extrabold tracking-tight text-[var(--primary-text)]">
        {admission ? formatPasScore(admission.minimo) : "Não disponível"}
      </strong>
    </div>
    {admission?.ingressoConjunto && <p className="mt-1 text-[10px] text-[var(--text-muted)]">Ingresso conjunto das Engenharias do Gama</p>}
    {!admission && <p className="mt-1 text-[10px] text-[var(--text-muted)]">Sem correspondência validada no último boletim.</p>}
  </div>;

  return (
    <section id={expanded ? "notas-pas" : undefined} aria-label={`Nota PAS de ${course.nome}`} className="mt-3 scroll-mt-24 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--primary-soft)] text-[var(--foreground)]">
      {!expanded ? <div className="p-3">
        {overview}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold text-[var(--primary-text)]">
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Fonte Cebraspe</a>
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
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-[var(--primary-text)] underline underline-offset-2">Boletim mais recente{admission ? ` · p. ${admission.pagina}` : ""}</a>
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
    </section>
  );
}
