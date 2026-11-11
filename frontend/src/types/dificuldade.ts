export type DifficultyLevel = "CRITICO" | "ALTO" | "MODERADO";

export interface BackendComentarioItem {
  id: number | string;
  usuario_id?: string;
  disciplina_id: number;
  turma_id?: number | null;
  autor_alias: string;
  topico_dificuldade?: string | null;
  conteudo: string;
  parent_id?: number | null;
  status_moderacao?: string;
  created_at: string;
  upvotes?: number;
}

export interface BackendComentarioPage {
  items: BackendComentarioItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface DifficultyAlert {
  id: string;
  disciplinaId?: number;
  turmaId?: number | null;
  authorAlias: string;
  isAnonymous: boolean;
  topic: string;
  severity: DifficultyLevel;
  content: string;
  createdAt: string;
  rawCreatedAt: string;
  upvotes: number;
  isLikedByMe: boolean;
}

export interface CreateDifficultyAlertInput {
  disciplineId?: number;
  disciplineSlugOrCode?: string;
  turmaId?: number | null;
  authorAlias?: string;
  isAnonymous?: boolean;
  topic: string;
  severity: DifficultyLevel;
  content: string;
}

export interface SyllabusUnitMetric {
  unit: string;
  alertCount: number;
  totalUpvotes: number;
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  fearScore: number;
  fearPercentage: number;
  intensityPercentage: number;
  dominantSeverity: DifficultyLevel;
}

export interface DifficultySummaryStats {
  totalAlerts: number;
  totalUpvotes: number;
  mostFearedUnit: SyllabusUnitMetric | null;
  mappedUnitsCount: number;
  totalSyllabusUnits: number;
  communityComplexityIndex: number;
  unitMetrics: SyllabusUnitMetric[];
}

export const DIFFICULTY_LEVEL_CONFIG: Record<
  DifficultyLevel,
  {
    label: string;
    tag: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    barColor: string;
    weight: number;
  }
> = {
  CRITICO: {
    label: "Crítico",
    tag: "[CRITICO]",
    badgeBg: "#FFF0F0",
    badgeText: "#C52C2C",
    badgeBorder: "#FCA5A5",
    barColor: "#EF4444",
    weight: 3,
  },
  ALTO: {
    label: "Complexidade Alta",
    tag: "[ALTO]",
    badgeBg: "#FFF7E8",
    badgeText: "#9A5700",
    badgeBorder: "#FCD34D",
    barColor: "#F59E0B",
    weight: 2,
  },
  MODERADO: {
    label: "Moderado",
    tag: "[MODERADO]",
    badgeBg: "#EDE9FD",
    badgeText: "#5B4BDB",
    badgeBorder: "#D8D1FA",
    barColor: "#7C6CF0",
    weight: 1,
  },
};

export const DEFAULT_SYLLABUS_UNITS = [
  "Fundamentos Teóricos e Conceitos Base",
  "Resolução de Problemas e Listas Práticas",
  "Modelagem, Arquitetura e Abstração",
  "Avaliações Intermediárias e Provas Finais",
  "Projeto Prático e Integração em Equipe",
];

const GENERIC_EMENTA_SNIPPETS = [
  "ementa oficial cadastrada junto ao decanato",
  "matriz curricular da universidade de brasília",
];

/**
 * Extrai as unidades temáticas a partir da ementa oficial da disciplina.
 * Caso a ementa não esteja detalhada, retorna unidades estruturais padrão.
 */
export function extractSyllabusUnits(ementa?: string | null): string[] {
  if (!ementa || typeof ementa !== "string") {
    return DEFAULT_SYLLABUS_UNITS;
  }

  const normalized = ementa.trim();
  if (!normalized) {
    return DEFAULT_SYLLABUS_UNITS;
  }

  const lower = normalized.toLowerCase();
  if (GENERIC_EMENTA_SNIPPETS.some((snippet) => lower.includes(snippet))) {
    return DEFAULT_SYLLABUS_UNITS;
  }

  const rawSegments = normalized
    .split(/[.;\n]+/)
    .map((segment) =>
      segment
        .replace(/^\d+[\s.)-]+/, "")
        .replace(/^[-*•]+\s*/, "")
        .trim()
    )
    .filter((segment) => segment.length >= 6 && segment.length <= 120);

  const uniqueUnits: string[] = [];
  const seenLower = new Set<string>();

  for (const segment of rawSegments) {
    const formatted =
      segment.charAt(0).toUpperCase() + segment.slice(1);
    const key = formatted.toLowerCase();
    if (!seenLower.has(key)) {
      seenLower.add(key);
      uniqueUnits.push(formatted);
    }
    if (uniqueUnits.length >= 10) {
      break;
    }
  }

  return uniqueUnits.length >= 2 ? uniqueUnits : DEFAULT_SYLLABUS_UNITS;
}

/**
 * Codifica o nível de severidade junto ao tópico respeitando o limite de 150 caracteres do banco.
 */
export function encodeTopicWithSeverity(
  topic: string,
  severity: DifficultyLevel
): string {
  const cleanTopic = topic.trim().replace(/^\[(CRITICO|ALTO|MODERADO)\]\s*/i, "");
  const prefix = `[${severity}] `;
  const maxTopicLen = 150 - prefix.length;
  return `${prefix}${cleanTopic.slice(0, maxTopicLen)}`.trim();
}

/**
 * Extrai o tópico limpo e o nível de severidade a partir do campo topico_dificuldade.
 */
export function parseTopicAndSeverity(rawTopic?: string | null): {
  topic: string;
  severity: DifficultyLevel;
} {
  if (!rawTopic || typeof rawTopic !== "string" || !rawTopic.trim()) {
    return {
      topic: "Geral da Disciplina",
      severity: "MODERADO",
    };
  }

  const trimmed = rawTopic.trim();
  const match = trimmed.match(/^\[(CRITICO|ALTO|MODERADO)\]\s*(.+)$/i);
  if (match) {
    const rawLevel = match[1].toUpperCase() as DifficultyLevel;
    const cleanTopic = match[2].trim() || "Geral da Disciplina";
    return {
      topic: cleanTopic,
      severity: rawLevel,
    };
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes("crític") || lower.includes("critic") || lower.includes("prova final")) {
    return { topic: trimmed, severity: "CRITICO" };
  }
  if (lower.includes(" moderad") || lower.includes("básico") || lower.includes("introdução")) {
    return { topic: trimmed, severity: "MODERADO" };
  }

  return {
    topic: trimmed,
    severity: "ALTO",
  };
}

/**
 * Formata uma data ISO para exibição amigável em português.
 */
export function formatAlertDate(isoOrLabel?: string): string {
  if (!isoOrLabel) return "Recente";
  const parsed = new Date(isoOrLabel);
  if (Number.isNaN(parsed.getTime())) {
    return isoOrLabel;
  }
  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Converte um item de comentário do backend em um DifficultyAlert estruturado.
 */
export function adaptBackendCommentToDifficultyAlert(
  raw: BackendComentarioItem
): DifficultyAlert {
  const { topic, severity } = parseTopicAndSeverity(raw.topico_dificuldade);
  const alias = raw.autor_alias?.trim() || "Estudante Anônimo";
  const isAnon =
    alias.toLowerCase().includes("anônimo") ||
    alias.toLowerCase().includes("anonimo");

  return {
    id: String(raw.id),
    disciplinaId: raw.disciplina_id,
    turmaId: raw.turma_id ?? null,
    authorAlias: alias,
    isAnonymous: isAnon,
    topic,
    severity,
    content: raw.conteudo,
    createdAt: formatAlertDate(raw.created_at),
    rawCreatedAt: raw.created_at,
    upvotes: typeof raw.upvotes === "number" ? raw.upvotes : 0,
    isLikedByMe: false,
  };
}

interface UnitAccumulator {
  unit: string;
  alertCount: number;
  totalUpvotes: number;
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  fearScore: number;
}

function createEmptyUnitAccumulator(unit: string): UnitAccumulator {
  return {
    unit,
    alertCount: 0,
    totalUpvotes: 0,
    criticalCount: 0,
    highCount: 0,
    moderateCount: 0,
    fearScore: 0,
  };
}

function resolveDominantSeverity(entry: UnitAccumulator): DifficultyLevel {
  if (
    entry.criticalCount > 0 &&
    entry.criticalCount >= entry.highCount &&
    entry.criticalCount >= entry.moderateCount
  ) {
    return "CRITICO";
  }
  if (entry.highCount > 0 && entry.highCount >= entry.moderateCount) {
    return "ALTO";
  }
  return "MODERADO";
}

function accumulateAlertIntoUnit(
  entry: UnitAccumulator,
  alert: DifficultyAlert
): void {
  const safeUpvotes = Math.max(0, alert.upvotes);
  entry.alertCount += 1;
  entry.totalUpvotes += safeUpvotes;

  if (alert.severity === "CRITICO") {
    entry.criticalCount += 1;
  } else if (alert.severity === "ALTO") {
    entry.highCount += 1;
  } else {
    entry.moderateCount += 1;
  }

  const severityWeight = DIFFICULTY_LEVEL_CONFIG[alert.severity].weight;
  entry.fearScore += severityWeight * 10 + Math.min(20, safeUpvotes * 2);
}

function toSyllabusUnitMetric(
  entry: UnitAccumulator,
  totalFearScore: number,
  maxUnitFearScore: number
): SyllabusUnitMetric {
  const fearPercentage =
    totalFearScore > 0 ? Math.round((entry.fearScore / totalFearScore) * 100) : 0;

  let intensityPercentage = 0;
  if (maxUnitFearScore > 0 && entry.alertCount > 0) {
    intensityPercentage = Math.max(
      12,
      Math.round((entry.fearScore / maxUnitFearScore) * 100)
    );
  }

  return {
    unit: entry.unit,
    alertCount: entry.alertCount,
    totalUpvotes: entry.totalUpvotes,
    criticalCount: entry.criticalCount,
    highCount: entry.highCount,
    moderateCount: entry.moderateCount,
    fearScore: entry.fearScore,
    fearPercentage,
    intensityPercentage,
    dominantSeverity: resolveDominantSeverity(entry),
  };
}

function compareUnitMetrics(a: SyllabusUnitMetric, b: SyllabusUnitMetric): number {
  if (b.fearScore !== a.fearScore) return b.fearScore - a.fearScore;
  if (b.alertCount !== a.alertCount) return b.alertCount - a.alertCount;
  return a.unit.localeCompare(b.unit, "pt-BR");
}

function calculateCommunityComplexityIndex(
  alerts: DifficultyAlert[],
  historicalFailureRate: number
): number {
  const clampedFailure = Math.min(100, Math.max(0, historicalFailureRate));
  const totalAlerts = alerts.length;
  if (totalAlerts === 0) {
    return Math.round(clampedFailure);
  }

  const criticalRatio =
    alerts.filter((a) => a.severity === "CRITICO").length / totalAlerts;
  const highRatio =
    alerts.filter((a) => a.severity === "ALTO").length / totalAlerts;
  const alertPressure = Math.min(
    100,
    Math.round(criticalRatio * 85 + highRatio * 60 + 25)
  );

  if (clampedFailure > 0) {
    return Math.min(100, Math.round(alertPressure * 0.65 + clampedFailure * 0.35));
  }
  return alertPressure;
}

/**
 * Calcula o resumo visual e os indicadores gráficos das unidades mais temidas da ementa.
 */
export function computeDifficultySummary(
  alerts: DifficultyAlert[],
  syllabusUnits: string[],
  historicalFailureRate = 0
): DifficultySummaryStats {
  const unitMap = new Map<string, UnitAccumulator>();

  for (const unit of syllabusUnits) {
    unitMap.set(unit.toLowerCase(), createEmptyUnitAccumulator(unit));
  }

  for (const alert of alerts) {
    const cleanTopic = alert.topic.trim() || "Geral da Disciplina";
    const key = cleanTopic.toLowerCase();
    const entry = unitMap.get(key) ?? createEmptyUnitAccumulator(cleanTopic);
    unitMap.set(key, entry);
    accumulateAlertIntoUnit(entry, alert);
  }

  const allEntries = Array.from(unitMap.values());
  const totalFearScore = allEntries.reduce((acc, item) => acc + item.fearScore, 0);
  const maxUnitFearScore = allEntries.reduce(
    (max, item) => Math.max(max, item.fearScore),
    0
  );

  const unitMetrics = allEntries
    .map((entry) => toSyllabusUnitMetric(entry, totalFearScore, maxUnitFearScore))
    .sort(compareUnitMetrics);

  const totalAlerts = alerts.length;
  const totalUpvotes = alerts.reduce((acc, a) => acc + Math.max(0, a.upvotes), 0);
  const mappedUnitsCount = unitMetrics.filter((u) => u.alertCount > 0).length;
  const mostFearedUnit =
    unitMetrics[0] && unitMetrics[0].alertCount > 0 ? unitMetrics[0] : null;

  return {
    totalAlerts,
    totalUpvotes,
    mostFearedUnit,
    mappedUnitsCount,
    totalSyllabusUnits: Math.max(syllabusUnits.length, unitMetrics.length),
    communityComplexityIndex: calculateCommunityComplexityIndex(
      alerts,
      historicalFailureRate
    ),
    unitMetrics,
  };
}
