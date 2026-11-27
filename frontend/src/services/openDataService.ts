import type { Course } from "../types/curso.ts";
import {
  DEFAULT_HISTORICAL_PERFORMANCE,
  type BackendMetricaConsolidada,
  type Discipline,
  type HistoricalPerformance,
} from "../types/disciplina.ts";
import {
  applyDisciplineYearFilter,
  getCourseMetricsForYear,
  type CatalogYearSelection,
} from "../utils/catalogYearFilter.ts";
import type { Class } from "../types/turma.ts";
import type {
  ClassOpenDataRow,
  CourseOpenDataRow,
  DisciplineOpenDataRow,
  HistoricalPerformanceOpenDataRow,
  OpenDataColumnDefinition,
  OpenDataEnvelope,
  OpenDataExportResult,
  OpenDataFormat,
  OpenDataScope,
} from "../types/openData.ts";

export const UTF8_BOM = "\uFEFF";

export const MIN_PUBLIC_SAMPLE_SIZE = 5;

export const LGPD_COMPLIANCE_STATEMENT =
  "Dados agregados publicos em conformidade com a LGPD. Sem identificacao nominal ou matricula discente; turmas com menos de 5 estudantes sao consolidadas no acumulado.";

export const COURSE_OPEN_DATA_COLUMNS: OpenDataColumnDefinition<CourseOpenDataRow>[] = [
  { key: "id", header: "id" },
  { key: "codigo_mec", header: "codigo_mec" },
  { key: "nome", header: "nome" },
  { key: "slug", header: "slug" },
  { key: "campus", header: "campus" },
  { key: "departamento", header: "departamento" },
  { key: "grau", header: "grau" },
  { key: "turno", header: "turno" },
  { key: "semestres", header: "semestres" },
  { key: "total_disciplinas", header: "total_disciplinas" },
  { key: "ano", header: "ano" },
  { key: "matriculados_recentes", header: "matriculados_recentes" },
  { key: "concluintes_recentes", header: "concluintes_recentes" },
  { key: "trancamentos", header: "trancamentos" },
  { key: "taxa_sucesso_pct", header: "taxa_sucesso_pct" },
  { key: "taxa_evasao_pct", header: "taxa_evasao_pct" },
];

export const DISCIPLINE_OPEN_DATA_COLUMNS: OpenDataColumnDefinition<DisciplineOpenDataRow>[] = [
  { key: "codigo", header: "codigo" },
  { key: "nome", header: "nome" },
  { key: "slug", header: "slug" },
  { key: "departamento", header: "departamento" },
  { key: "nome_departamento", header: "nome_departamento" },
  { key: "campus", header: "campus" },
  { key: "grande_area", header: "grande_area" },
  { key: "creditos_descricao", header: "creditos_descricao" },
  { key: "carga_horaria_h", header: "carga_horaria_h" },
  { key: "ano", header: "ano" },
  { key: "matriculados", header: "matriculados" },
  { key: "trancamentos", header: "trancamentos" },
  { key: "taxa_aprovacao_pct", header: "taxa_aprovacao_pct" },
  { key: "taxa_reprovacao_nota_pct", header: "taxa_reprovacao_nota_pct" },
  { key: "taxa_reprovacao_falta_pct", header: "taxa_reprovacao_falta_pct" },
  { key: "taxa_trancamento_pct", header: "taxa_trancamento_pct" },
  { key: "total_materiais_relatos", header: "total_materiais_relatos" },
];

export const HISTORICAL_OPEN_DATA_COLUMNS: OpenDataColumnDefinition<HistoricalPerformanceOpenDataRow>[] = [
  { key: "codigo_disciplina", header: "codigo_disciplina" },
  { key: "nome_disciplina", header: "nome_disciplina" },
  { key: "semestre_letivo", header: "semestre_letivo" },
  { key: "total_avaliados", header: "total_avaliados" },
  { key: "aprovados", header: "aprovados" },
  { key: "reprovados_nota", header: "reprovados_nota" },
  { key: "reprovados_falta", header: "reprovados_falta" },
  { key: "trancamentos", header: "trancamentos" },
  { key: "taxa_aprovacao_pct", header: "taxa_aprovacao_pct" },
  { key: "taxa_reprovacao_nota_pct", header: "taxa_reprovacao_nota_pct" },
  { key: "taxa_reprovacao_falta_pct", header: "taxa_reprovacao_falta_pct" },
  { key: "taxa_trancamento_pct", header: "taxa_trancamento_pct" },
];

export const CLASS_OPEN_DATA_COLUMNS: OpenDataColumnDefinition<ClassOpenDataRow>[] = [
  { key: "codigo_disciplina", header: "codigo_disciplina" },
  { key: "codigo_turma", header: "codigo_turma" },
  { key: "semestre_letivo", header: "semestre_letivo" },
  { key: "docentes", header: "docentes" },
  { key: "turno", header: "turno" },
  { key: "horarios", header: "horarios" },
  { key: "local", header: "local" },
  { key: "vagas_ocupadas", header: "vagas_ocupadas" },
  { key: "total_vagas", header: "total_vagas" },
  { key: "taxa_ocupacao_pct", header: "taxa_ocupacao_pct" },
];

/**
 * Escapa uma celula individual para o formato CSV seguindo a RFC 4180
 * e neutraliza prefixos de injecao de formulas em planilhas (=, +, -, @).
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let raw = String(value);

  if (/^[=+\-@]/.test(raw) && !/^-[0-9]+(\.[0-9]+)?$/.test(raw)) {
    raw = `'${raw}`;
  }

  const mustQuote =
    raw.includes(",") ||
    raw.includes('"') ||
    raw.includes("\n") ||
    raw.includes("\r") ||
    raw.includes(";");

  if (!mustQuote) {
    return raw;
  }

  const escapedQuotes = raw.replace(/"/g, '""');
  return `"${escapedQuotes}"`;
}

/**
 * Converte uma lista de objetos tipados em conteudo CSV (RFC 4180),
 * incluindo BOM UTF-8 por padrao para leitura imediata de acentuacao.
 */
export function serializeToCsv<T extends object>(
  columns: OpenDataColumnDefinition<T>[],
  rows: T[],
  includeBom = true
): string {
  const headerLine = columns.map((col) => escapeCsvCell(col.header)).join(",");
  const dataLines = rows.map((row) => {
    const record = row as Record<string, unknown>;
    return columns.map((col) => escapeCsvCell(record[col.key])).join(",");
  });

  const csvBody = [headerLine, ...dataLines].join("\r\n");
  return includeBom ? `${UTF8_BOM}${csvBody}` : csvBody;
}

/**
 * Serializa os registros em um envelope JSON estruturado de Dados Abertos (RF06/RF13).
 */
export function serializeToJson<T>(
  scope: OpenDataScope,
  rows: T[],
  options?: {
    contextIdentifier?: string | null;
    generatedAt?: string;
  }
): string {
  const envelope: OpenDataEnvelope<T> = {
    plataforma: "Tamburetei UnB",
    instituicao: "Universidade de Brasilia (UnB)",
    requisito: "Exportacao de Dados Abertos",
    conformidade_lgpd: LGPD_COMPLIANCE_STATEMENT,
    escopo: scope,
    identificador_contexto: options?.contextIdentifier ?? null,
    gerado_em: options?.generatedAt ?? new Date().toISOString(),
    total_registros: rows.length,
    dados: rows,
  };

  return JSON.stringify(envelope, null, 2);
}

/**
 * Normaliza um identificador textual para compor nomes de arquivos seguros.
 */
export function sanitizeFilenameSegment(segment: string): string {
  return segment
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Gera o nome padronizado do arquivo de Dados Abertos para download.
 */
export function buildOpenDataFilename(
  scope: OpenDataScope,
  format: OpenDataFormat,
  identifier?: string | null,
  referenceDate: Date = new Date()
): string {
  const year = referenceDate.getUTCFullYear();
  const month = String(referenceDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(referenceDate.getUTCDate()).padStart(2, "0");
  const datePart = `${year}-${month}-${day}`;

  const cleanScope = sanitizeFilenameSegment(scope.replace(/_/g, "-"));
  const cleanId = identifier ? sanitizeFilenameSegment(identifier) : "";

  if (cleanId) {
    return `tamburetei-unb-${cleanScope}-${cleanId}-${datePart}.${format}`;
  }
  return `tamburetei-unb-${cleanScope}-${datePart}.${format}`;
}

/**
 * Mapeia cursos do catalogo para linhas tabulares de Dados Abertos,
 * preservando campos ausentes como null (JSON) ou vazio (CSV), sem
 * preencher valores ficticios nem usar o ID interno como codigo MEC.
 */
export function mapCoursesToOpenData(
  courses: Course[],
  options?: { year?: CatalogYearSelection }
): CourseOpenDataRow[] {
  const normalizeText = (value?: string | null): string | null =>
    typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  const normalizeNumber = (value?: number | null): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  const selectedYear = options?.year ?? "all";

  return courses.map((course) => {
    const metrics = getCourseMetricsForYear(course, selectedYear);
    const rawId =
      course.id !== undefined && course.id !== null && String(course.id).trim().length > 0
        ? String(course.id).trim()
        : null;

    return {
      id: rawId,
      codigo_mec: normalizeText(course.codigo_mec),
      nome: course.nome,
      slug: course.slug,
      campus: normalizeText(course.campus),
      departamento: normalizeText(course.departamento),
      grau: normalizeText(course.grau),
      turno: normalizeText(course.turno),
      semestres: normalizeNumber(course.semestres),
      total_disciplinas: normalizeNumber(course.total_disciplinas),
      ano:
        typeof selectedYear === "number"
          ? selectedYear
          : normalizeNumber(metrics?.ano),
      matriculados_recentes: normalizeNumber(metrics?.matriculados),
      concluintes_recentes: normalizeNumber(metrics?.concluintes),
      trancamentos: normalizeNumber(metrics?.trancados),
      taxa_sucesso_pct: normalizeNumber(metrics?.taxa_sucesso),
      taxa_evasao_pct: normalizeNumber(metrics?.taxa_evasao),
    };
  });
}

/**
 * Mapeia disciplinas do catalogo para linhas tabulares de Dados Abertos.
 */
export function mapDisciplinesToOpenData(
  disciplines: Discipline[],
  options?: { year?: CatalogYearSelection }
): DisciplineOpenDataRow[] {
  const selectedYear = options?.year ?? "all";

  return disciplines.map((raw) => {
    const d = applyDisciplineYearFilter(raw, selectedYear);
    const mc = d.metrica_consolidada;
    const isProtected =
      mc != null &&
      mc.matriculados > 0 &&
      mc.matriculados < MIN_PUBLIC_SAMPLE_SIZE &&
      d.approval == null;

    const matriculados =
      mc && !isProtected && Number.isFinite(mc.matriculados)
        ? mc.matriculados
        : null;
    const trancamentos =
      typeof d.withdrawnCount === "number" && Number.isFinite(d.withdrawnCount) && !isProtected
        ? d.withdrawnCount
        : mc && !isProtected && Number.isFinite(mc.trancamentos)
        ? mc.trancamentos
        : null;

    return {
      codigo: d.code,
      nome: d.name,
      slug: d.slug,
      departamento: d.department,
      nome_departamento: d.departmentName,
      campus: d.campus,
      grande_area: d.area,
      creditos_descricao: d.credits,
      carga_horaria_h: d.hours,
      ano: typeof selectedYear === "number" ? selectedYear : d.referenceYear ?? null,
      matriculados,
      trancamentos,
      taxa_aprovacao_pct:
        d.approval == null ? null : Number(d.approval.toFixed(1)),
      taxa_reprovacao_nota_pct: Number((d.failedGrade ?? 0).toFixed(1)),
      taxa_reprovacao_falta_pct: Number((d.failedAttendance ?? 0).toFixed(1)),
      taxa_trancamento_pct: Number((d.withdrawn ?? 0).toFixed(1)),
      total_materiais_relatos: d.resources ?? 0,
    };
  });
}

/**
 * Verifica se um registro semestral deve ter seus numeros individuais suprimidos
 * em respeito a RN07 (amostragem_suprimida_lgpd=true ou menos de 5 estudantes).
 */
export function isSemesterSuppressedByLgpd(item: HistoricalPerformance): boolean {
  if (item.amostragem_suprimida_lgpd === true) {
    return true;
  }
  const outcomesTotal =
    Math.max(0, item.approved || 0) +
    Math.max(0, item.failed || 0) +
    Math.max(0, item.absent || 0) +
    Math.max(0, item.withdrawn || 0);
  const sampleSize =
    typeof item.matriculados === "number" && Number.isFinite(item.matriculados)
      ? Math.max(0, item.matriculados)
      : outcomesTotal;
  return sampleSize < MIN_PUBLIC_SAMPLE_SIZE || outcomesTotal < MIN_PUBLIC_SAMPLE_SIZE;
}

/**
 * Filtra apenas os semestres reais publicos (nao suprimidos pela LGPD e que nao
 * sejam a constante estatica de demonstracao DEFAULT_HISTORICAL_PERFORMANCE).
 */
export function filterPublicHistoricalPerformance(
  history?: HistoricalPerformance[] | null
): HistoricalPerformance[] {
  if (!history || !Array.isArray(history) || history === DEFAULT_HISTORICAL_PERFORMANCE) {
    return [];
  }
  return history.filter((item) => !isSemesterSuppressedByLgpd(item));
}

function buildHistoricalPerformanceRow(
  disciplineCode: string,
  disciplineName: string,
  semesterLabel: string,
  counts: {
    approved: number;
    failed: number;
    absent: number;
    withdrawn: number;
    total?: number;
  }
): HistoricalPerformanceOpenDataRow {
  const approved = Math.max(0, counts.approved || 0);
  const failed = Math.max(0, counts.failed || 0);
  const absent = Math.max(0, counts.absent || 0);
  const withdrawn = Math.max(0, counts.withdrawn || 0);
  const outcomesTotal = approved + failed + absent + withdrawn;
  const total =
    typeof counts.total === "number" && counts.total >= outcomesTotal
      ? counts.total
      : outcomesTotal;

  const pct = (value: number) =>
    total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0;

  return {
    codigo_disciplina: disciplineCode,
    nome_disciplina: disciplineName,
    semestre_letivo: semesterLabel,
    total_avaliados: total,
    aprovados: approved,
    reprovados_nota: failed,
    reprovados_falta: absent,
    trancamentos: withdrawn,
    taxa_aprovacao_pct: pct(approved),
    taxa_reprovacao_nota_pct: pct(failed),
    taxa_reprovacao_falta_pct: pct(absent),
    taxa_trancamento_pct: pct(withdrawn),
  };
}

/**
 * Mapeia a serie historica real de desempenho de uma disciplina para Dados Abertos.
 * Suprime linhas individuais com baixa amostragem (< 5 estudantes ou amostragem_suprimida_lgpd=true)
 * e consolida os dados no acumulado apenas quando o total consolidado atinge o minimo da LGPD (RN07).
 * Nunca exporta o historico ficticio de demonstracao (DEFAULT_HISTORICAL_PERFORMANCE).
 */
export function mapHistoricalPerformanceToOpenData(
  disciplineCode: string,
  disciplineName: string,
  history?: HistoricalPerformance[] | null,
  consolidatedMetric?: BackendMetricaConsolidada | null
): HistoricalPerformanceOpenDataRow[] {
  if (!history || !Array.isArray(history) || history === DEFAULT_HISTORICAL_PERFORMANCE) {
    return [];
  }

  const publicSemesters = filterPublicHistoricalPerformance(history);
  const suppressedSemesters = history.filter((item) => isSemesterSuppressedByLgpd(item));

  const rows: HistoricalPerformanceOpenDataRow[] = publicSemesters.map((item) =>
    buildHistoricalPerformanceRow(disciplineCode, disciplineName, item.semester, {
      approved: item.approved,
      failed: item.failed,
      absent: item.absent,
      withdrawn: item.withdrawn,
      total: item.matriculados,
    })
  );

  const hasSuppressedRecords =
    suppressedSemesters.length > 0 ||
    Boolean(consolidatedMetric && consolidatedMetric.total_turmas_suprimidas > 0);

  if (hasSuppressedRecords) {
    const fallbackConsolidated = history.reduce(
      (acc, item) => {
        const itemOutcomes =
          Math.max(0, item.approved || 0) +
          Math.max(0, item.failed || 0) +
          Math.max(0, item.absent || 0) +
          Math.max(0, item.withdrawn || 0);
        const itemTotal =
          typeof item.matriculados === "number" && Number.isFinite(item.matriculados)
            ? Math.max(item.matriculados, itemOutcomes)
            : itemOutcomes;
        return {
          approved: acc.approved + Math.max(0, item.approved || 0),
          failed: acc.failed + Math.max(0, item.failed || 0),
          absent: acc.absent + Math.max(0, item.absent || 0),
          withdrawn: acc.withdrawn + Math.max(0, item.withdrawn || 0),
          total: acc.total + itemTotal,
        };
      },
      { approved: 0, failed: 0, absent: 0, withdrawn: 0, total: 0 }
    );

    const consolidatedSource = consolidatedMetric
      ? {
          approved: consolidatedMetric.aprovados,
          failed: consolidatedMetric.reprovados_nota,
          absent: consolidatedMetric.reprovados_falta,
          withdrawn: consolidatedMetric.trancamentos,
          total: consolidatedMetric.matriculados,
        }
      : fallbackConsolidated;

    const consolidatedOutcomes =
      Math.max(0, consolidatedSource.approved || 0) +
      Math.max(0, consolidatedSource.failed || 0) +
      Math.max(0, consolidatedSource.absent || 0) +
      Math.max(0, consolidatedSource.withdrawn || 0);
    const consolidatedTotal = Math.max(
      consolidatedSource.total || 0,
      consolidatedOutcomes
    );

    if (
      consolidatedTotal >= MIN_PUBLIC_SAMPLE_SIZE &&
      consolidatedOutcomes >= MIN_PUBLIC_SAMPLE_SIZE
    ) {
      rows.push(
        buildHistoricalPerformanceRow(
          disciplineCode,
          disciplineName,
          "Acumulado Consolidado (LGPD)",
          {
            ...consolidatedSource,
            total: consolidatedTotal,
          }
        )
      );
    }
  }

  return rows;
}

/**
 * Mapeia turmas ofertadas de uma disciplina para linhas de Dados Abertos.
 */
export function mapClassesToOpenData(
  disciplineCode: string,
  classes: Class[]
): ClassOpenDataRow[] {
  return classes.map((turma) => {
    const occupied = Math.max(0, turma.vagasOcupadas || 0);
    const total = Math.max(0, turma.totalVagas || 0);
    const pct =
      turma.occupancy?.percentage ??
      (total > 0 ? Math.round((occupied / total) * 100) : 0);

    return {
      codigo_disciplina: disciplineCode || turma.disciplinaCodigo,
      codigo_turma: turma.codigoTurma,
      semestre_letivo:
        typeof turma.semestre === "string" && turma.semestre.trim().length > 0
          ? turma.semestre.trim()
          : null,
      docentes: turma.professor,
      turno: turma.turno ?? "",
      horarios: turma.horarios,
      local: turma.local,
      vagas_ocupadas: occupied,
      total_vagas: total,
      taxa_ocupacao_pct: pct,
    };
  });
}

export type BrowserDownloadHandler = (
  content: string,
  filename: string,
  mimeType: string
) => void;

/**
 * Dispara o download direto no navegador utilizando Blob e link temporario.
 */
export function triggerBrowserDownload(
  content: string,
  filename: string,
  mimeType: string
): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

/**
 * Gera o artefato de Dados Abertos (CSV ou JSON) e opcionalmente inicia o download.
 */
export function createOpenDataExport<T extends object>(params: {
  scope: OpenDataScope;
  format: OpenDataFormat;
  columns: OpenDataColumnDefinition<T>[];
  rows: T[];
  identifier?: string | null;
  referenceDate?: Date;
  generatedAt?: string;
  downloadHandler?: BrowserDownloadHandler | null;
}): OpenDataExportResult {
  const {
    scope,
    format,
    columns,
    rows,
    identifier,
    referenceDate = new Date(),
    generatedAt,
    downloadHandler = triggerBrowserDownload,
  } = params;

  const filename = buildOpenDataFilename(scope, format, identifier, referenceDate);
  const mimeType =
    format === "csv"
      ? "text/csv;charset=utf-8;"
      : "application/json;charset=utf-8;";

  const content =
    format === "csv"
      ? serializeToCsv(columns, rows, true)
      : serializeToJson(scope, rows, {
          contextIdentifier: identifier ?? null,
          generatedAt: generatedAt ?? referenceDate.toISOString(),
        });

  if (downloadHandler) {
    downloadHandler(content, filename, mimeType);
  }

  return {
    filename,
    mimeType,
    format,
    scope,
    recordCount: rows.length,
    content,
  };
}

export function exportCoursesOpenData(
  courses: Course[],
  format: OpenDataFormat,
  options?: {
    year?: CatalogYearSelection;
    identifier?: string | null;
    referenceDate?: Date;
    downloadHandler?: BrowserDownloadHandler | null;
  }
): OpenDataExportResult {
  const rows = mapCoursesToOpenData(courses, { year: options?.year });
  const yearSuffix = typeof options?.year === "number" ? String(options.year) : null;
  const combinedIdentifier = [options?.identifier, yearSuffix].filter(Boolean).join("-") || null;
  return createOpenDataExport({
    scope: "cursos",
    format,
    columns: COURSE_OPEN_DATA_COLUMNS,
    rows,
    identifier: combinedIdentifier,
    referenceDate: options?.referenceDate,
    downloadHandler: options?.downloadHandler,
  });
}

export function exportDisciplinesOpenData(
  disciplines: Discipline[],
  format: OpenDataFormat,
  options?: {
    year?: CatalogYearSelection;
    identifier?: string | null;
    referenceDate?: Date;
    downloadHandler?: BrowserDownloadHandler | null;
  }
): OpenDataExportResult {
  const rows = mapDisciplinesToOpenData(disciplines, { year: options?.year });
  const yearSuffix = typeof options?.year === "number" ? String(options.year) : null;
  const combinedIdentifier = [options?.identifier, yearSuffix].filter(Boolean).join("-") || null;
  return createOpenDataExport({
    scope: "disciplinas",
    format,
    columns: DISCIPLINE_OPEN_DATA_COLUMNS,
    rows,
    identifier: combinedIdentifier,
    referenceDate: options?.referenceDate,
    downloadHandler: options?.downloadHandler,
  });
}

export function exportDisciplineHistoryOpenData(
  disciplineCode: string,
  disciplineName: string,
  history: HistoricalPerformance[] | null | undefined,
  format: OpenDataFormat,
  options?: {
    consolidatedMetric?: BackendMetricaConsolidada | null;
    referenceDate?: Date;
    downloadHandler?: BrowserDownloadHandler | null;
  }
): OpenDataExportResult {
  const rows = mapHistoricalPerformanceToOpenData(
    disciplineCode,
    disciplineName,
    history,
    options?.consolidatedMetric
  );
  return createOpenDataExport({
    scope: "historico_disciplina",
    format,
    columns: HISTORICAL_OPEN_DATA_COLUMNS,
    rows,
    identifier: disciplineCode,
    referenceDate: options?.referenceDate,
    downloadHandler: rows.length > 0 ? options?.downloadHandler : null,
  });
}

export function exportDisciplineClassesOpenData(
  disciplineCode: string,
  classes: Class[],
  format: OpenDataFormat,
  options?: {
    referenceDate?: Date;
    downloadHandler?: BrowserDownloadHandler | null;
  }
): OpenDataExportResult {
  const rows = mapClassesToOpenData(disciplineCode, classes);
  return createOpenDataExport({
    scope: "turmas_disciplina",
    format,
    columns: CLASS_OPEN_DATA_COLUMNS,
    rows,
    identifier: disciplineCode,
    referenceDate: options?.referenceDate,
    downloadHandler: options?.downloadHandler,
  });
}

export const openDataService = {
  escapeCsvCell,
  serializeToCsv,
  serializeToJson,
  buildOpenDataFilename,
  isSemesterSuppressedByLgpd,
  filterPublicHistoricalPerformance,
  mapCoursesToOpenData,
  mapDisciplinesToOpenData,
  mapHistoricalPerformanceToOpenData,
  mapClassesToOpenData,
  exportCoursesOpenData,
  exportDisciplinesOpenData,
  exportDisciplineHistoryOpenData,
  exportDisciplineClassesOpenData,
  triggerBrowserDownload,
};

export default openDataService;
