export type TurnoTurma = "Matutino" | "Diurno" | "Vespertino" | "Noturno";

export type ClassShift = "Matutino" | "Vespertino" | "Noturno";

export type ClassShiftFilter = "Todos" | ClassShift;

export type ClassSortOption = "code_asc" | "occupancy_asc" | "occupancy_desc";

export type OccupancyLevel = "low" | "medium" | "high" | "full";

export interface HorarioTurma {
  dia: string;       // ex: "Seg/Qua" ou "Terça-feira"
  horario: string;   // ex: "10:00 - 11:50"
  sala?: string;     // ex: "PAT AT-02/10" ou "S9"
}

export interface Schedule extends HorarioTurma {
  raw?: string;      // ex: "35M12" ou "Seg/Qua 10:00 - 11:50"
}

export interface OccupancyRate {
  occupied: number;
  total: number;
  percentage: number;
  available: number;
  isFull: boolean;
  level: OccupancyLevel;
}

export interface Turma {
  id: string | number;
  codigoTurma: string;          // ex: "Turma 01", "Turma A"
  disciplinaCodigo: string;     // ex: "FGA0138" ou "FGA0158"
  disciplinaId?: number;        // ID relacional da disciplina no backend
  semestre?: string;            // ex: "2026.1"
  professor: string;            // ex: "Profª. Dra. Carla Rocha"
  professores?: string[];       // Lista individualizada em caso de co-docência
  horarios: string;             // ex: "Seg/Qua 10:00 - 11:50"
  schedule?: Schedule;          // Objeto estruturado de horário
  local: string;                // ex: "FCTE - UAC Sala S-9"
  vagasOcupadas: number;        // ex: 35
  totalVagas: number;           // ex: 40
  turno: TurnoTurma;            // "Matutino" | "Diurno" | "Vespertino" | "Noturno"
  occupancy?: OccupancyRate;    // Taxa de ocupação calculada
}

export type Class = Turma;

export interface BackendProfessorResumo {
  id: number;
  nome: string;
  departamento?: string | null;
}

export interface BackendTurmaResponse {
  id: number;
  disciplina_id: number;
  semestre: string;
  codigo_turma: string;
  horario?: string | null;
  local?: string | null;
  capacidade?: number | null;
  matriculados?: number | null;
  professores: BackendProfessorResumo[];
}

const SIGAA_DAYS_MAP: Record<string, string> = {
  "2": "Seg",
  "3": "Ter",
  "4": "Qua",
  "5": "Qui",
  "6": "Sex",
  "7": "Sáb",
};

const SIGAA_TIME_SLOTS: Record<
  "M" | "T" | "N",
  Record<string, { start: string; end: string }>
> = {
  M: {
    "1": { start: "08:00", end: "08:55" },
    "2": { start: "08:55", end: "09:50" },
    "3": { start: "10:00", end: "10:55" },
    "4": { start: "10:55", end: "11:50" },
    "5": { start: "12:00", end: "12:55" },
  },
  T: {
    "1": { start: "12:55", end: "13:50" },
    "2": { start: "14:00", end: "14:55" },
    "3": { start: "14:55", end: "15:50" },
    "4": { start: "16:00", end: "16:55" },
    "5": { start: "16:55", end: "17:50" },
    "6": { start: "18:00", end: "18:55" },
  },
  N: {
    "1": { start: "19:00", end: "19:50" },
    "2": { start: "19:50", end: "20:40" },
    "3": { start: "20:50", end: "21:40" },
    "4": { start: "21:40", end: "22:30" },
  },
};

/**
 * Calcula a taxa de ocupação e classifica o nível de lotação da turma.
 */
export function calculateOccupancyRate(
  occupied: number,
  total: number
): OccupancyRate {
  const safeTotal = Math.max(0, total);
  const safeOccupied = Math.max(0, occupied);
  const percentage =
    safeTotal > 0 ? Math.round((safeOccupied / safeTotal) * 100) : 0;
  const isFull = safeTotal > 0 && safeOccupied >= safeTotal;
  const available = Math.max(0, safeTotal - safeOccupied);

  let level: OccupancyLevel = "low";
  if (isFull) {
    level = "full";
  } else if (percentage >= 75) {
    level = "high";
  } else if (percentage >= 40) {
    level = "medium";
  }

  return {
    occupied: safeOccupied,
    total: safeTotal,
    percentage,
    available,
    isFull,
    level,
  };
}

/**
 * Normaliza o turno da turma para o filtro canônico ("Matutino" | "Vespertino" | "Noturno").
 * Mapeia "Diurno" para "Matutino" para manter retrocompatibilidade com mocks e testes legados.
 */
export function normalizeClassShift(
  turno?: TurnoTurma | string | null,
  horario?: string | null
): ClassShift {
  if (turno === "Noturno") return "Noturno";
  if (turno === "Vespertino") return "Vespertino";
  if (turno === "Matutino") return "Matutino";

  if (horario) {
    const sigaaMatch = horario.toUpperCase().match(/\b[2-7]+([MTN])[1-6]+\b/);
    if (sigaaMatch) {
      if (sigaaMatch[1] === "N") return "Noturno";
      if (sigaaMatch[1] === "T") return "Vespertino";
      return "Matutino";
    }

    const hourMatch = horario.match(/(\d{1,2}):\d{2}/);
    if (hourMatch) {
      const startHour = parseInt(hourMatch[1], 10);
      if (startHour >= 18) return "Noturno";
      if (startHour >= 12) return "Vespertino";
      return "Matutino";
    }
  }

  return "Matutino";
}

/**
 * Converte códigos de horário do padrão SIGAA/UnB (ex: "35M12", "24T23")
 * em texto legível (ex: "Ter/Qui 08:00 - 09:50") e extrai o turno correspondente.
 */
export function parseClassSchedule(
  rawHorario?: string | null,
  local?: string | null
): {
  formatted: string;
  shift: ClassShift;
  schedule: Schedule;
} {
  const cleanRaw = (rawHorario || "").trim();
  if (!cleanRaw) {
    return {
      formatted: "Horário a definir",
      shift: "Matutino",
      schedule: {
        dia: "A definir",
        horario: "Horário a definir",
        raw: "",
        sala: local || undefined,
      },
    };
  }

  const tokens = cleanRaw.toUpperCase().split(/\s+/);
  const sigaaRegex = /^([2-7]+)([MTN])([1-6]+)$/;
  const parsedSegments: string[] = [];
  const parsedDays: string[] = [];
  const parsedTimes: string[] = [];
  let detectedShift: ClassShift | null = null;
  let allMatched = true;

  for (const token of tokens) {
    const match = token.match(sigaaRegex);
    if (!match) {
      allMatched = false;
      break;
    }

    const [, daysPart, shiftChar, slotsPart] = match;
    const shiftKey = shiftChar as "M" | "T" | "N";

    if (!detectedShift) {
      detectedShift =
        shiftKey === "N"
          ? "Noturno"
          : shiftKey === "T"
          ? "Vespertino"
          : "Matutino";
    }

    const dayNames = daysPart
      .split("")
      .map((d) => SIGAA_DAYS_MAP[d] || d)
      .join("/");

    const slotDigits = slotsPart.split("");
    const firstSlot = SIGAA_TIME_SLOTS[shiftKey]?.[slotDigits[0]];
    const lastSlot =
      SIGAA_TIME_SLOTS[shiftKey]?.[slotDigits[slotDigits.length - 1]];

    const timeRange =
      firstSlot && lastSlot
        ? `${firstSlot.start} - ${lastSlot.end}`
        : `${shiftKey}${slotsPart}`;

    parsedDays.push(dayNames);
    parsedTimes.push(timeRange);
    parsedSegments.push(`${dayNames} ${timeRange}`);
  }

  if (allMatched && parsedSegments.length > 0) {
    const formatted = parsedSegments.join(" • ");
    return {
      formatted,
      shift: detectedShift || "Matutino",
      schedule: {
        dia: parsedDays.join(" / "),
        horario: parsedTimes.join(" / "),
        raw: cleanRaw,
        sala: local || undefined,
      },
    };
  }

  // Caso já esteja em formato descritivo (ex: "Seg/Qua 10:00 - 11:50")
  const parts = cleanRaw.split(/\s+/);
  const diaPart = parts[0] || "Regular";
  const horarioPart = parts.slice(1).join(" ") || cleanRaw;
  const inferredShift = normalizeClassShift(undefined, cleanRaw);

  return {
    formatted: cleanRaw,
    shift: inferredShift,
    schedule: {
      dia: diaPart,
      horario: horarioPart,
      raw: cleanRaw,
      sala: local || undefined,
    },
  };
}

/**
 * Adapta a resposta da API de turmas (`/turmas`) para a interface `Class` (`Turma`) do frontend.
 */
export function adaptBackendTurma(
  raw: BackendTurmaResponse,
  disciplinaCodigo = ""
): Class {
  const parsed = parseClassSchedule(raw.horario, raw.local);
  const codigoFormatado = raw.codigo_turma.toLowerCase().startsWith("turma")
    ? raw.codigo_turma
    : `Turma ${raw.codigo_turma.padStart(2, "0")}`;

  const listaProfessores =
    raw.professores && raw.professores.length > 0
      ? raw.professores.map((p) => p.nome)
      : ["Docente a definir"];

  const totalVagas =
    typeof raw.capacidade === "number" && raw.capacidade > 0
      ? raw.capacidade
      : 45;
  const vagasOcupadas =
    typeof raw.matriculados === "number" && raw.matriculados >= 0
      ? raw.matriculados
      : 0;

  return {
    id: raw.id,
    codigoTurma: codigoFormatado,
    disciplinaCodigo: disciplinaCodigo || `DISC-${raw.disciplina_id}`,
    disciplinaId: raw.disciplina_id,
    semestre: raw.semestre,
    professor: listaProfessores.join(" • "),
    professores: listaProfessores,
    horarios: parsed.formatted,
    schedule: parsed.schedule,
    local: raw.local || "Local a definir",
    vagasOcupadas,
    totalVagas,
    turno: parsed.shift,
    occupancy: calculateOccupancyRate(vagasOcupadas, totalVagas),
  };
}