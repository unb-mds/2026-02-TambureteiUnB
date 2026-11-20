import test from "node:test";
import assert from "node:assert/strict";
import { adaptBackendTurma, calculateOccupancyRate, compareClassOccupancy, formatClassOccupancy } from "../turma.ts";
import type { BackendTurmaResponse } from "../turma.ts";

const base: BackendTurmaResponse = { id: 1, disciplina_id: 2, codigo_turma: "01", semestre: "2026.1", professores: [] };

for (const [capacidade, matriculados] of [[45, 38], [45, 0], [0, 0], [30, 38]] as const) {
  test(`adapta ocupação real ${matriculados}/${capacidade}`, () => {
    const turma = adaptBackendTurma({ ...base, capacidade, matriculados });
    assert.equal(turma.totalVagas, capacidade);
    assert.equal(turma.vagasOcupadas, matriculados);
    assert.equal(formatClassOccupancy(turma.vagasOcupadas, turma.totalVagas), `Ocupação: ${matriculados}/${capacidade} vagas`);
  });
}

for (const campos of [{}, { capacidade: null, matriculados: null }, { capacidade: 45 }, { matriculados: 38 }, { capacidade: -1, matriculados: 10 }, { capacidade: 40, matriculados: -1 }, { capacidade: NaN, matriculados: 0 }, { capacidade: 45, matriculados: Infinity }, { capacidade: 1.5, matriculados: 1 }]) {
  test(`dados incompletos ou inválidos não viram 0/45: ${JSON.stringify(campos)}`, () => {
    const turma = adaptBackendTurma({ ...base, ...campos });
    assert.equal(turma.occupancy, null);
    assert.equal(formatClassOccupancy(turma.vagasOcupadas, turma.totalVagas), "Ocupação: Não informada");
  });
}

test("adaptação preserva campos conhecidos mesmo com outro ausente", () => {
  assert.equal(adaptBackendTurma({ ...base, matriculados: 38 }).vagasOcupadas, 38);
  assert.equal(adaptBackendTurma({ ...base, capacidade: 45 }).totalVagas, 45);
});

test("cálculo mantém sobrelotação real e não divide por zero", () => {
  assert.equal(calculateOccupancyRate(48, 40)?.percentage, 120);
  assert.equal(calculateOccupancyRate(48, 40)?.available, 0);
  assert.equal(calculateOccupancyRate(0, 0)?.percentage, 0);
  assert.equal(calculateOccupancyRate(null, 45), null);
});

for (const order of ["occupancy_asc", "occupancy_desc"] as const) {
  test(`ocupações ausentes ficam no fim em ${order}`, () => {
    const unknown = adaptBackendTurma({ ...base, id: 1 });
    const empty = adaptBackendTurma({ ...base, id: 2, capacidade: 45, matriculados: 0 });
    const full = adaptBackendTurma({ ...base, id: 3, capacidade: 45, matriculados: 45 });
    const sorted = [unknown, full, empty].sort((a, b) => compareClassOccupancy(a, b, order));
    assert.deepEqual(sorted.map((item) => item.id), order === "occupancy_asc" ? [2, 3, 1] : [3, 2, 1]);
    assert.equal(compareClassOccupancy(unknown, unknown, order), 0);
  });
}
