"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GradeCalendar from "@/components/GradeCalendar";
import { downloadGradePdf } from "@/services/gradePdfService";
import {
  getDisciplines,
  getOfferedSemesters,
  getClassesByDiscipline,
} from "@/services/disciplineService";
import type { Discipline } from "@/types/disciplina";
import type { Class } from "@/types/turma";
import {
  nextPlanningSemester,
  validateGradeExport,
  generateSchedules,
  hasConflict,
  meetings,
  selectedClasses,
  getPlanningSemesters,
  type GradeEntry,
} from "@/utils/gradePlanner";
type GradeDraft = { id: string; name: string; semester: string; entries: GradeEntry[] };
const KEY = "tamburetei_grade_v1";
let memory = "";
let volatileStorage = false;
function persist(value: string) {
  memory = value;
  try {
    localStorage.setItem(KEY, value);
    volatileStorage = false;
  } catch {
    volatileStorage = true;
  }
  window.dispatchEvent(new Event("grade-change"));
  return !volatileStorage;
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("grade-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("grade-change", callback);
  };
}
function snapshot() {
  try {
    return volatileStorage ? memory : localStorage.getItem(KEY) || "";
  } catch {
    return memory;
  }
}
const panel =
  "rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5";
const field =
  "w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-sm text-[var(--foreground)]";
const button =
  "rounded-xl bg-[#5B4BDB] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50";
export default function MinhaGrade() {
  const stored = useSyncExternalStore(subscribe, snapshot, () => "");
  const data = useMemo(() => {
    try {
      const value = JSON.parse(stored);
      if (
        Array.isArray(value.entries) &&
        value.entries.every(
          (e: GradeEntry) =>
            typeof e.code === "string" && Array.isArray(e.classes),
        )
      )
        return {
          entries: value.entries as GradeEntry[],
          semester: typeof value.semester === "string" ? value.semester : "",
          drafts: Array.isArray(value.drafts) ? value.drafts.filter((draft: GradeDraft) => typeof draft.id === "string" && typeof draft.name === "string" && typeof draft.semester === "string" && Array.isArray(draft.entries)) as GradeDraft[] : [],
        };
    } catch {}
    return { entries: [] as GradeEntry[], semester: "", drafts: [] as GradeDraft[] };
  }, [stored]);
  const { entries, drafts } = data;
  const [draftName, setDraftName] = useState("");
  const [offeredSemesters, setOfferedSemesters] = useState<string[]>([]);
  const [loadingSemesters, setLoadingSemesters] = useState(true);
  const semester = data.semester || offeredSemesters[0] || "";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Discipline[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [alternatives, setAlternatives] = useState<Class[][]>([]);
  const [alternative, setAlternative] = useState(0);
  const searchVersion = useRef(0);
  const calendarRef = useRef<HTMLElement>(null);
  const [exporting, setExporting] = useState(false);
  const exportDialogRef = useRef<HTMLDialogElement>(null);
  const selectedSectionRef = useRef<HTMLElement>(null);
  function update(nextEntries: GradeEntry[], nextSemester = semester) {
    if (
      !persist(JSON.stringify({ entries: nextEntries, semester: nextSemester, drafts }))
    )
      setNotice(
        "Armazenamento indisponível: alterações mantidas somente nesta sessão.",
      );
    setAlternatives([]);
    setAlternative(0);
  }
  function saveDraft() {
    const name = draftName.trim();
    if (!name || !entries.length) return;
    const draft: GradeDraft = { id: crypto.randomUUID(), name, semester, entries };
    const saved = persist(JSON.stringify({ entries, semester, drafts: [...drafts, draft] }));
    setDraftName("");
    setNotice(saved ? `Rascunho “${name}” salvo neste navegador.` : "Armazenamento indisponível: rascunho mantido somente nesta sessão.");
  }
  function openDraft(draft: GradeDraft) {
    update(draft.entries, draft.semester);
    setQuery("");
    setResults([]);
    setError("");
    setNotice(`Rascunho “${draft.name}” aberto para edição. Salve um novo rascunho para guardar outras alterações.`);
  }
  function deleteDraft(draft: GradeDraft) {
    const saved = persist(JSON.stringify({ entries, semester, drafts: drafts.filter(value => value.id !== draft.id) }));
    setNotice(saved ? `Rascunho “${draft.name}” excluído. A grade atual foi mantida.` : "Armazenamento indisponível: exclusão mantida somente nesta sessão.");
  }
  useEffect(() => {
    let active = true;
    getOfferedSemesters()
      .then((values) => {
        if (active) setOfferedSemesters(values);
      })
      .catch(() => {
        if (active)
          setError(
            "Não foi possível carregar os semestres ofertados. Recarregue a página para tentar novamente.",
          );
      })
      .finally(() => {
        if (active) setLoadingSemesters(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const version = ++searchVersion.current;
    const term = query.trim().replace(/\s+/g, " ");
    if (term.length < 2 || !semester) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      setError("");
      try {
        const compactCode = term.replace(/\s+/g, "");
        const isCode = /^[a-z]{2,}\d+$/i.test(compactCode);
        const response = await getDisciplines({
          ...(isCode ? { codigo: compactCode } : { q: term }),
          limit: 12,
          apenas_com_turmas: true,
          semestre: semester,
        });
        if (version === searchVersion.current) setResults(response);
      } catch {
        if (version === searchVersion.current) {
          setResults([]);
          setError(
            "Não foi possível buscar disciplinas. Confira a API e tente novamente.",
          );
        }
      } finally {
        if (version === searchVersion.current) setSearching(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [query, semester]);
  async function add(discipline: Discipline) {
    if (entries.some((e) => e.code === discipline.code)) return;
    setAdding(true);
    setError("");
    try {
      const classes = await getClassesByDiscipline({
        disciplinaId: discipline.id,
        slug: discipline.slug,
        codigo: discipline.code,
      });
      if (!classes.length) {
        setError("Esta disciplina não tem turmas disponíveis no catálogo.");
        return;
      }
      const current = snapshot();
      let latest = data;
      try {
        latest = JSON.parse(current || "null") || data;
      } catch {}
      if (latest.entries.some((e) => e.code === discipline.code)) return;
      const nextSemester = latest.semester || semester;
      update(
        [
          ...latest.entries,
          {
            code: discipline.code,
            name: discipline.name,
            slug: discipline.slug,
            classes,
            chosen: null,
          },
        ],
        nextSemester,
      );
      setQuery("");
      setResults([]);
    } catch {
      setError(
        "Não foi possível carregar as turmas. Tente adicionar a disciplina novamente.",
      );
    } finally {
      setAdding(false);
    }
  }
  const currentSemester = offeredSemesters[0] || "";
  const nextSemester = nextPlanningSemester(currentSemester);
  const semesters = getPlanningSemesters(
    offeredSemesters,
    data.semester,
    nextSemester,
  );
  const chosen = selectedClasses(entries, semester);
  const exportValidation = validateGradeExport(entries, semester);
  const conflicts = chosen.flatMap((a, i) =>
    chosen
      .slice(i + 1)
      .filter((b) => hasConflict(a.item, b.item))
      .map((b) => `${a.entry.name} e ${b.entry.name}`),
  );
  const unknown = chosen.filter((c) => !meetings(c.item).length);
  function apply(schedule: Class[]) {
    update(
      entries.map((entry, i) => ({ ...entry, chosen: String(schedule[i].id) })),
    );
  }
  function generate() {
    const result = generateSchedules(entries, semester);
    if (!result.schedules.length) {
      setError(
        "Nenhuma combinação encontrada. Confira o semestre, horários não informados e turmas fixadas; libere opções para tentar novamente.",
      );
      return;
    }
    setError("");
    apply(result.schedules[0]);
    setAlternatives(result.schedules);
    setAlternative(0);
    setNotice(
      `${result.schedules.length} combinações encontradas${result.limited ? " (limite da busca atingido)" : ""}.`,
    );
  }
  function ensureExportable() {
    if (exportValidation.canExport) return true;
    exportDialogRef.current?.showModal();
    return false;
  }
  function closeExportWarning() {
    exportDialogRef.current?.close();
    selectedSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    selectedSectionRef.current?.focus({ preventScroll: true });
  }
  async function printGrade() {
    if (!ensureExportable() || !calendarRef.current || exporting) return;
    setExporting(true);
    setError("");
    try {
      await downloadGradePdf(calendarRef.current, semester);
    } catch {
      setError("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="grade-planner min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />
      <main className="grade-main mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--primary-text)]">
              Planejamento do semestre
            </p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              Minha grade
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
              Escolha suas disciplinas, compare turmas e organize a semana. Seu
              planejamento fica salvo neste navegador.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={button}
              disabled={!entries.length || exporting}
              aria-label="Baixar grade em PDF"
              aria-busy={exporting}
              onClick={printGrade}
            >
              {exporting ? "Gerando PDF..." : "Baixar PDF"}
            </button>
          </div>
        </header>
        <p className="mb-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-xs text-[var(--text-muted)]">
          Este planejamento não realiza matrícula. Confirme horários, vagas e
          pré-requisitos no SIGAA antes de se matricular.
        </p>
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm"
          >
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mb-4 text-sm text-[var(--primary-text)]">
            {notice}
          </p>
        )}
        <div className="grade-layout grid items-start gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-4">
            <section className={panel}>
              <h2 className="mb-3 font-bold">Adicionar disciplinas</h2>
              <label
                htmlFor="grade-semester"
                className="mb-1 block text-xs font-semibold"
              >
                Semestre
              </label>
              <select
                id="grade-semester"
                className={`${field} mb-3`}
                disabled={loadingSemesters || adding || !semesters.length}
                value={semester}
                onChange={(e) => {
                  update(
                    entries.map((entry) => ({ ...entry, chosen: null })),
                    e.target.value,
                  );
                  setResults([]);
                  setNotice("");
                  setError("");
                }}
              >
                {!semesters.length && (
                  <option value="">
                    {loadingSemesters
                      ? "Carregando semestres..."
                      : "Semestres indisponíveis"}
                  </option>
                )}
                {semesters.map((value) => (
                  <option key={value} value={value}>
                    {value}
                    {!offeredSemesters.includes(value)
                      ? " — sem ofertas cadastradas"
                      : ""}
                  </option>
                ))}
              </select>
              {semester && !offeredSemesters.includes(semester) && (
                <p
                  role="status"
                  className="mb-3 rounded-lg bg-[var(--surface-muted)] p-3 text-xs text-[var(--text-muted)]"
                >
                  As turmas de {semester} ainda não foram cadastradas. As opções
                  serão disponibilizadas quando as ofertas desse semestre forem
                  importadas.
                </p>
              )}
              <label
                htmlFor="grade-search"
                className="mb-2 block text-xs text-[var(--text-muted)]"
              >
                Buscar por nome ou código
              </label>
              <input
                id="grade-search"
                disabled={adding || loadingSemesters || !semester}
                aria-busy={adding}
                className={field}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setResults([]);
                  setSearching(e.target.value.trim().length >= 2);
                }}
                placeholder="Ex.: Cálculo ou MAT0025"
              />
              {adding && (
                <p
                  role="status"
                  className="mt-2 text-xs text-[var(--text-muted)]"
                >
                  Carregando turmas da disciplina...
                </p>
              )}
              {query.trim().length >= 2 && (
                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                  {searching ? (
                    <p role="status" className="text-sm">
                      Buscando...
                    </p>
                  ) : results.length ? (
                    results.map((d) => (
                      <button
                        key={d.slug}
                        disabled={
                          adding || entries.some((e) => e.code === d.code)
                        }
                        onClick={() => add(d)}
                        className="w-full rounded-xl border border-[var(--border-subtle)] p-3 text-left text-sm hover:bg-[var(--primary-soft)] disabled:opacity-50"
                      >
                        <span className="block text-[10px] font-bold text-[var(--primary-text)]">
                          {d.code}
                        </span>
                        {d.name}
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-[var(--text-muted)]">
                      Nenhuma disciplina com turmas cadastradas em {semester}{" "}
                      foi encontrada.
                    </p>
                  )}
                </div>
              )}
            </section>
            <section
              ref={selectedSectionRef}
              tabIndex={-1}
              className={`${panel} scroll-mt-24`}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold">Disciplinas escolhidas</h2>
                <span className="text-xs text-[var(--text-muted)]">
                  {entries.length}
                </span>
              </div>
              {!entries.length && (
                <p className="text-sm text-[var(--text-muted)]">
                  Busque uma disciplina para começar a montar sua grade.
                </p>
              )}
              <div className="mt-4 space-y-4">
                {entries.map((entry) => (
                  <div
                    key={entry.code}
                    className="border-t border-[var(--border-subtle)] pt-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold">
                        {entry.name}
                        <span className="block text-[10px] font-medium text-[var(--text-muted)]">
                          {entry.code}
                        </span>
                      </h3>
                      <button
                        aria-label={`Remover ${entry.name}`}
                        className="text-xs text-[var(--text-muted)] underline"
                        onClick={() =>
                          update(entries.filter((e) => e.code !== entry.code))
                        }
                      >
                        Remover
                      </button>
                    </div>
                    <select
                      aria-label={`Turma de ${entry.name}`}
                      className={`${field} mt-2`}
                      value={entry.chosen || ""}
                      onChange={(e) =>
                        update(
                          entries.map((v) =>
                            v.code === entry.code
                              ? { ...v, chosen: e.target.value || null }
                              : v,
                          ),
                        )
                      }
                    >
                      <option value="">Automática (todas as opções)</option>
                      {entry.classes
                        .filter((c) => c.semestre === semester)
                        .map((c) => (
                          <option key={c.id} value={String(c.id)}>
                            {c.codigoTurma} · {c.professor} · {c.horarios}
                          </option>
                        ))}
                    </select>
                    {!entry.classes.some((c) => c.semestre === semester) && (
                      <p className="mt-1 text-xs text-amber-600">
                        Sem oferta neste semestre.
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <button
                className={`${button} mt-5 w-full`}
                disabled={
                  !entries.length ||
                  adding ||
                  !offeredSemesters.includes(semester)
                }
                onClick={generate}
              >
                Gerar grade sem conflitos
              </button>
              <p className="mt-2 text-xs text-[var(--text-muted)]">Escolha “Automática” nas disciplinas para buscar outras turmas. Depois, salve as combinações que preferir como rascunhos.</p>
              {!!entries.length && (
                <button
                  className="mt-3 w-full text-xs text-[var(--text-muted)] underline"
                  onClick={() => {
                    update([], "");
                    setNotice("");
                  }}
                >
                  Limpar planejamento
                </button>
              )}
            </section>
            <section className={panel} aria-labelledby="grade-drafts-title">
              <h2 id="grade-drafts-title" className="font-bold">Rascunhos salvos</h2>
              <p className="mt-2 text-xs text-[var(--text-muted)]">Guarde opções para comparar depois. Os rascunhos ficam somente neste navegador, mesmo ao limpar a grade atual.</p>
              <form className="mt-4 space-y-2" onSubmit={event => { event.preventDefault(); saveDraft(); }}>
                <label htmlFor="grade-draft-name" className="block text-xs font-semibold">Nome do rascunho</label>
                <input id="grade-draft-name" className={field} value={draftName} maxLength={80} onChange={event => setDraftName(event.target.value)} placeholder="Ex.: Grade de manhã" />
                <button className={`${button} w-full`} disabled={!entries.length || !draftName.trim() || adding}>Salvar rascunho</button>
              </form>
              {!drafts.length && <p className="mt-4 text-xs text-[var(--text-muted)]">Nenhum rascunho salvo ainda.</p>}
              <ul className="mt-4 space-y-3">
                {drafts.map(draft => <li key={draft.id} className="rounded-xl border border-[var(--border-subtle)] p-3">
                  <h3 className="break-words text-sm font-semibold">{draft.name}</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{draft.semester} · {draft.entries.length} disciplinas</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button type="button" className="text-xs font-semibold text-[var(--primary-text)] underline" aria-label={`Abrir rascunho ${draft.name}`} onClick={() => openDraft(draft)} disabled={adding}>Abrir</button>
                    <button type="button" className="text-xs text-[var(--text-muted)] underline" aria-label={`Excluir rascunho ${draft.name}`} onClick={() => deleteDraft(draft)} disabled={adding}>Excluir</button>
                  </div>
                </li>)}
              </ul>
            </section>
          </aside>
          <div className="grade-results min-w-0 space-y-4">
            {!!conflicts.length && (
              <div
                role="alert"
                className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm"
              >
                <strong>Choque de horário</strong>
                {conflicts.map((pair) => (
                  <p key={pair}>{pair}</p>
                ))}
              </div>
            )}
            {!!unknown.length && (
              <p
                role="alert"
                className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm"
              >
                Horários não reconhecidos:{" "}
                {unknown.map((c) => c.entry.name).join(", ")}. Não é possível
                garantir ausência de conflitos nessas turmas.
              </p>
            )}
            {!!alternatives.length && (
              <div className={`${panel} flex flex-wrap items-center gap-3`}>
                <label
                  htmlFor="grade-alternative"
                  className="text-sm font-semibold"
                >
                  Combinação
                </label>
                <select
                  id="grade-alternative"
                  className="rounded-lg bg-[var(--surface-muted)] p-2 text-sm"
                  value={alternative}
                  onChange={(e) => {
                    const index = Number(e.target.value);
                    apply(alternatives[index]);
                    setAlternatives(alternatives);
                    setAlternative(index);
                  }}
                >
                  {alternatives.map((_, i) => (
                    <option key={i} value={i}>
                      {i + 1} de {alternatives.length}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <GradeCalendar
              semester={semester}
              selection={chosen}
              calendarRef={calendarRef}
            />
            {!chosen.length && (
              <p className="text-center text-sm text-[var(--text-muted)]">
                Escolha turmas ou gere combinações para preencher a semana.
              </p>
            )}
          </div>
        </div>
      </main>
      <dialog
        ref={exportDialogRef}
        role="alertdialog"
        aria-labelledby="grade-export-title"
        aria-describedby="grade-export-description"
        className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-[var(--foreground)] shadow-xl backdrop:bg-black/60"
      >
        <h2 id="grade-export-title" className="text-lg font-bold">
          Não é possível exportar a grade
        </h2>
        <div
          id="grade-export-description"
          className="mt-3 space-y-3 text-sm text-[var(--text-muted)]"
        >
          {!!exportValidation.conflicting.length && (
            <div>
              <p>
                Há choque de horário entre as disciplinas abaixo. Para resolver,
                troque a turma ou remova uma delas:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-[var(--foreground)]">
                {exportValidation.conflicting.map((entry) => (
                  <li key={entry.code}>
                    <strong>{entry.code}</strong> — {entry.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!!exportValidation.missing.length && (
            <p>
              Escolha uma turma para:{" "}
              {exportValidation.missing
                .map((entry) => `${entry.code} — ${entry.name}`)
                .join("; ")}
              .
            </p>
          )}
          {!!exportValidation.unknown.length && (
            <p>
              Confira os horários não reconhecidos de:{" "}
              {exportValidation.unknown
                .map((entry) => `${entry.code} — ${entry.name}`)
                .join("; ")}
              .
            </p>
          )}
          <p>Resolva as pendências antes de baixar o PDF.</p>
        </div>
        <button
          type="button"
          className={`${button} mt-5 w-full`}
          onClick={closeExportWarning}
        >
          Voltar e ajustar turmas
        </button>
      </dialog>
      <Footer />
    </div>
  );
}
