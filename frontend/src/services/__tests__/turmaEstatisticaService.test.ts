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
    cursando: [
      {
        codigo: "FGA0160",
        nome: "Métodos Numéricos",
        turma: "03",
        semestre: "2026.2",
        professores: ["Prof. Teste"],
        situacao: "MATR",
        ch: 60,
      },
    ],
  } as unknown as HistoricoImportacaoResponse;

  const resultado = extrairTurmasCursadasDoHistorico(fakeHistorico);
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].codigo, "MAT0025");
  assert.equal(resultado[0].turma, "27");
  assert.equal(resultado[0].semestre, "2025.2");
  assert.equal(resultado[0].comprovado_pelo_historico, true);
});

test("extrairTurmasCursadasDoHistorico exclui disciplinas em andamento ou sem desfecho", () => {
  const fakeHistorico = {
    dados_academicos: {
      matricula: "250000000",
      curso: "Engenharia",
      ira: 4.5,
      periodo_inicial: "2024.1",
      total_disciplinas: 3,
    },
    cursadas: [
      {
        codigo: "MAT0026",
        nome: "Cálculo 2",
        turma: "02",
        semestre: "2026.1",
        professores: [],
        situacao: "MATR",
        ch: 90,
      },
      {
        codigo: "FGA0133",
        nome: "Engenharia Econômica",
        turma: "01",
        semestre: "2025.2",
        professores: [],
        situacao: "REP",
        ch: 60,
      },
    ],
    cursando: [
      {
        codigo: "FGA0146",
        nome: "Estruturas de Dados 1",
        turma: "02",
        semestre: "2026.2",
        professores: [],
        situacao: "MATR",
        ch: 60,
      },
    ],
  } as unknown as HistoricoImportacaoResponse;

  const resultado = extrairTurmasCursadasDoHistorico(fakeHistorico);
  assert.deepEqual(
    resultado.map((item) => item.codigo),
    ["FGA0133"]
  );
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

test("doação exclui trancamento e cancelamento, preservando a tentativa aprovada", () => {
 const row=(situacao:string,turma:string)=>({codigo:"IFD0173",nome:"Física Experimental",turma,semestre:"2025.1",professores:[],situacao});
 const history={dados_academicos:{},cursadas:[row("TRANC","08"),row("CANC","09"),row("APR","07")],cursando:[]} as unknown as HistoricoImportacaoResponse;
 const choices=extrairTurmasCursadasDoHistorico(history);
 assert.deepEqual(choices.map(item=>item.turma),["07"]);
 assert.equal(validarVinculoEstudanteTurma([{...row("TRANC","08"),comprovado_pelo_historico:true}],"IFD0173","08","2025.1").valido,false);
});
