import { parseClassSchedule, type Class } from "../types/turma";
export interface GradeEntry {
  code: string;
  name: string;
  slug: string;
  classes: Class[];
  chosen: string | null;
}
export interface Meeting {
  day: number;
  start: number;
  end: number;
}
export const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
function parseMeetings(text: string): Meeting[] {
  const result: Meeting[] = [];
  for (const segment of text.split(" • ")) {
    const match = segment.match(
      /^(.+?)\s+(\d{2}):(\d{2})\s*[-–]\s*(\d{2}):(\d{2})$/,
    );
    if (!match) return [];
    const start = Number(match[2]) * 60 + Number(match[3]);
    const end = Number(match[4]) * 60 + Number(match[5]);
    if (
      end <= start ||
      end > 24 * 60 ||
      Number(match[3]) > 59 ||
      Number(match[5]) > 59
    )
      return [];
    for (const day of match[1].split("/")) {
      const index = WEEK_DAYS.findIndex(
        (name) => name.toLowerCase() === day.trim().toLowerCase(),
      );
      if (index < 0) return [];
      result.push({ day: index, start, end });
    }
  }
  return result;
}
export function meetings(item: Class): Meeting[] {
  const raw = item.schedule?.raw || item.horarios;
  const codePattern = /(?<![a-z\d])([2-7]+[MTN][1-6]+)(?!\d)/gi;
  const codes = [...raw.matchAll(codePattern)].map((match) => match[1]);
  if (!codes.length) return parseMeetings(parseClassSchedule(raw).formatted);
  const descriptionPattern =
    /(Segunda|Terça|Terca|Quarta|Quinta|Sexta|Sábado|Sabado)(?:-feira)?\s*(\d{2}):(\d{2})\s*(?:às|as|[-–])\s*(\d{2}):(\d{2})/gi;
  const descriptions = [...raw.matchAll(descriptionPattern)];
  const remaining = raw
    .replace(codePattern, " ")
    .replace(descriptionPattern, " ")
    .replace(/[\s•;,./–-]/g, "");
  if (remaining) return [];
  const parsed = parseMeetings(parseClassSchedule(codes.join(" ")).formatted);
  const names = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  for (const match of descriptions) {
    const day = names.indexOf(
      match[1]
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase(),
    );
    const start = Number(match[2]) * 60 + Number(match[3]);
    const end = Number(match[4]) * 60 + Number(match[5]);
    if (
      !parsed.some(
        (event) =>
          event.day === day && event.start === start && event.end === end,
      )
    )
      return [];
  }
  return parsed.filter(
    (event, index) =>
      parsed.findIndex(
        (other) =>
          other.day === event.day &&
          other.start === event.start &&
          other.end === event.end,
      ) === index,
  );
}
export function hasConflict(a: Class, b: Class) {
  return meetings(a).some((x) =>
    meetings(b).some(
      (y) => x.day === y.day && x.start < y.end && y.start < x.end,
    ),
  );
}
export function selectedClasses(entries: GradeEntry[], semester: string) {
  return entries.flatMap((entry) => {
    const item = entry.classes.find(
      (c) => String(c.id) === entry.chosen && c.semestre === semester,
    );
    return item ? [{ entry, item }] : [];
  });
}
export function generateSchedules(
  entries: GradeEntry[],
  semester: string,
  limit = 20,
) {
  const schedules: Class[][] = [];
  let visited = 0;
  let limited = false;
  const options = entries.map((entry) =>
    entry.classes.filter(
      (item) =>
        item.semestre === semester &&
        (!entry.chosen || String(item.id) === entry.chosen) &&
        meetings(item).length > 0,
    ),
  );
  function visit(index: number, chosen: Class[]) {
    if (++visited > 20000 || schedules.length >= limit) {
      limited = true;
      return;
    }
    if (index === options.length) {
      schedules.push(chosen);
      return;
    }
    for (const item of options[index]) {
      if (!chosen.some((other) => hasConflict(item, other)))
        visit(index + 1, [...chosen, item]);
      if (limited) return;
    }
  }
  if (entries.length && semester && options.every((items) => items.length))
    visit(0, []);
  return { schedules, limited };
}

export function nextPlanningSemester(latest: string): string | undefined {
  const match = latest.match(/^(\d{4})\.([12])$/);
  if (!match) return undefined;
  return match[2] === "1" ? `${match[1]}.2` : `${Number(match[1]) + 1}.1`;
}

export function validateGradeExport(entries: GradeEntry[], semester: string) {
  const selected = selectedClasses(entries, semester);
  const conflicting = new Map<string, GradeEntry>();
  for (let index = 0; index < selected.length; index++) {
    for (const other of selected.slice(index + 1)) {
      if (hasConflict(selected[index].item, other.item)) {
        conflicting.set(selected[index].entry.code, selected[index].entry);
        conflicting.set(other.entry.code, other.entry);
      }
    }
  }
  const selectedCodes = new Set(selected.map((value) => value.entry.code));
  const missing = entries.filter((entry) => !selectedCodes.has(entry.code));
  const unknown = selected
    .filter((value) => !meetings(value.item).length)
    .map((value) => value.entry);
  return {
    canExport:
      selected.length > 0 &&
      !conflicting.size &&
      !missing.length &&
      !unknown.length,
    conflicting: [...conflicting.values()],
    missing,
    unknown,
  };
}
