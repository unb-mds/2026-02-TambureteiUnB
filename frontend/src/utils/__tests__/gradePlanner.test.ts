import test from "node:test";
import assert from "node:assert/strict";
import {
  validateGradeExport,
  meetings,
  nextPlanningSemester,
  hasConflict,
  generateSchedules,
  type GradeEntry,
} from "../gradePlanner.ts";
import { adaptBackendTurma } from "../../types/turma.ts";
const make = (id: number, horario: string, semestre = "2026.2") =>
  adaptBackendTurma({
    id,
    disciplina_id: id,
    semestre,
    codigo_turma: String(id),
    horario,
    capacidade: 40,
    matriculados: 20,
    professores: [],
  });
const entry = (
  code: string,
  classes: ReturnType<typeof make>[],
  chosen: string | null = null,
): GradeEntry => ({ code, name: code, slug: code, classes, chosen });
test("expande dias e múltiplos blocos SIGAA", () => {
  assert.equal(meetings(make(1, "24M12 6T12")).length, 3);
  assert.equal(meetings(make(1, "24M12"))[0].start, 480);
});
test("detecta sobreposição e permite encontros consecutivos", () => {
  assert.equal(hasConflict(make(1, "2M12"), make(2, "2M23")), true);
  assert.equal(hasConflict(make(1, "2M12"), make(2, "2M34")), false);
  assert.equal(hasConflict(make(1, "2M12"), make(2, "3M12")), false);
});
test("horário ausente ou inválido não vira período livre", () => {
  assert.deepEqual(meetings(make(1, "A definir")), []);
  assert.deepEqual(
    generateSchedules([entry("A", [make(1, "A definir")])], "2026.2").schedules,
    [],
  );
});
test("gera alternativas sem conflitos e respeita turma fixada", () => {
  const entries = [
    entry("A", [make(1, "2M12"), make(2, "3M12")]),
    entry("B", [make(3, "2M12")], "3"),
  ];
  assert.deepEqual(
    generateSchedules(entries, "2026.2").schedules.map((s) =>
      s.map((c) => c.id),
    ),
    [[2, 3]],
  );
});
test("não mistura semestres e informa a ausência de combinações", () => {
  assert.equal(
    generateSchedules([entry("A", [make(1, "2M12", "2025.2")])], "2026.2")
      .schedules.length,
    0,
  );
  assert.equal(generateSchedules([], "2026.2").schedules.length, 0);
});
test("limita busca combinatória", () => {
  const entries = [
    entry("A", [make(1, "2M12"), make(2, "3M12")]),
    entry("B", [make(3, "4M12"), make(4, "5M12")]),
  ];
  const result = generateSchedules(entries, "2026.2", 2);
  assert.equal(result.schedules.length, 2);
  assert.equal(result.limited, true);
});

test("lê código SIGAA colado à descrição existente no banco importado", () => {
  assert.deepEqual(
    meetings(
      make(1, "35M12Terça-feira 08:00 às 09:50Quinta-feira 08:00 às 09:50"),
    ),
    meetings(make(1, "35M12")),
  );
});
test("descrição divergente e fragmentos desconhecidos não são descartados silenciosamente", () => {
  assert.deepEqual(meetings(make(1, "35M12Terça-feira 10:00 às 11:50")), []);
  assert.deepEqual(
    meetings(make(1, "35M12 horário extra não reconhecido")),
    [],
  );
  assert.deepEqual(meetings(make(1, "35M129")), []);
});

test("próximo semestre respeita a virada de ano sem inventar oferta", () => {
  assert.equal(nextPlanningSemester("2026.2"), "2027.1");
  assert.equal(nextPlanningSemester("2027.1"), "2027.2");
  assert.equal(nextPlanningSemester(""), undefined);
});

test("exportação bloqueia choques e identifica cada disciplina envolvida uma única vez", () => {
  const result = validateGradeExport(
    [
      entry("MAT0107", [make(1, "24M12")], "1"),
      entry("MAT0034", [make(2, "24M12")], "2"),
    ],
    "2026.2",
  );
  assert.equal(result.canExport, false);
  assert.deepEqual(
    result.conflicting.map((value) => value.code),
    ["MAT0107", "MAT0034"],
  );
});
test("exportação exige turmas completas, com horários reconhecidos no semestre", () => {
  assert.equal(validateGradeExport([], "2026.2").canExport, false);
  assert.equal(
    validateGradeExport([entry("A", [make(1, "2M12")])], "2026.2").canExport,
    false,
  );
  assert.equal(
    validateGradeExport([entry("A", [make(1, "A definir")], "1")], "2026.2")
      .canExport,
    false,
  );
  assert.equal(
    validateGradeExport(
      [entry("A", [make(1, "2M12", "2025.2")], "1")],
      "2026.2",
    ).canExport,
    false,
  );
});
test("resolução do choque libera a exportação sem tratar horários consecutivos como conflito", () => {
  const result = validateGradeExport(
    [entry("A", [make(1, "2M12")], "1"), entry("B", [make(2, "2M34")], "2")],
    "2026.2",
  );
  assert.equal(result.canExport, true);
  assert.deepEqual(result.conflicting, []);
});
