import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildTurmaStatusKey,
  extrairTurmasCursadasDoHistorico,
  normalizarCodigoTurma,
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

test("normalizarCodigoTurma e buildTurmaStatusKey alinham turmas numericas com o backend", () => {
  assert.equal(normalizarCodigoTurma("1"), "01");
  assert.equal(normalizarCodigoTurma("11"), "11");
  assert.equal(normalizarCodigoTurma("a"), "A");
  assert.equal(normalizarCodigoTurma("--"), "");

  assert.equal(
    buildTurmaStatusKey("cic0004", "1", "2024.2"),
    buildTurmaStatusKey("CIC0004", "01", "2024.2")
  );
});

test("TurmaEstatisticaModal bloqueia opcoes ja consolidadas e nao exige preenchimento manual de docente/turma", () => {
  const modalPath = path.resolve(
    process.cwd(),
    "src/components/TurmaEstatisticaModal.tsx"
  );
  const source = fs.readFileSync(modalPath, "utf-8");

  assert.doesNotMatch(source, /input-prof|input-turma-num/);
  assert.match(source, /disabled=\{indisponivel\}/);
  assert.match(source, /Indisponível \(já possui dados da pizza\)/);
  assert.match(source, /Print do Gráfico do SIGAA \(Opcional\)/);
  assert.match(source, /\/doacoes\/upload/);

  const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert.equal(emojiRegex.test(source), false);
});
