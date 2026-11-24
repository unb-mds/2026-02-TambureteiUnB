import test from "node:test";
import assert from "node:assert/strict";
import {
  extrairTurmasCursadasDoHistorico,
  validarVinculoEstudanteTurma,
} from "../turmaEstatisticaService";
import { HistoricoImportacaoResponse } from "@/types/historico";

test("extrairTurmasCursadasDoHistorico extrai turmas com turma informada", () => {
  const fakeHistorico = {
    dados_academicos: {
      matricula: "250000000",
      curso: "Engenharia",
      ira: 4.5,
      periodo_inicial: "2024.1",
      total_disciplinas: 2,
    },
    cursadas: [
      {
        codigo: "MAT0025",
        nome: "Cálculo 1",
        turma: "27",
        semestre: "2025.2",
        professores: ["Dr. Fragelli"],
        situacao: "APR",
        ch: 90,
      },
      {
        codigo: "FGA0150",
        nome: "PI 1",
        turma: "--",
        semestre: "--",
        professores: [],
        situacao: "CUMP",
        ch: 60,
      },
    ],
    cursando: [],
  } as unknown as HistoricoImportacaoResponse;

  const resultado = extrairTurmasCursadasDoHistorico(fakeHistorico);
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].codigo, "MAT0025");
  assert.equal(resultado[0].turma, "27");
  assert.equal(resultado[0].semestre, "2025.2");
  assert.equal(resultado[0].comprovado_pelo_historico, true);
});

test("validarVinculoEstudanteTurma exige comprovacao previa de matricula pelo historico", () => {
  const turmas = [
    {
      codigo: "MAT0025",
      nome: "Cálculo 1",
      turma: "T27",
      semestre: "2025.2",
      professores: ["Dr. Fragelli"],
      situacao: "APR",
      comprovado_pelo_historico: true,
    },
  ];

  assert.equal(
    validarVinculoEstudanteTurma(turmas, "MAT0025", "T27", "2025.2").valido,
    true
  );

  // Turma diferente da cursada
  const turmaInvalida = validarVinculoEstudanteTurma(turmas, "MAT0025", "T01", "2025.2");
  assert.equal(turmaInvalida.valido, false);
  assert.match(turmaInvalida.motivo!, /Não foi encontrado registro de matrícula/);

  // Sem histórico importado
  const semHistorico = validarVinculoEstudanteTurma([], "MAT0025", "T27", "2025.2");
  assert.equal(semHistorico.valido, false);
  assert.match(semHistorico.motivo!, /Nenhum histórico oficial do SIGAA foi importado/);
});
