import test from "node:test";
import assert from "node:assert/strict";
import {
  UTF8_BOM,
  escapeCsvCell,
  serializeToCsv,
  serializeToJson,
  buildOpenDataFilename,
  isSemesterSuppressedByLgpd,
  filterPublicHistoricalPerformance,
  mapCoursesToOpenData,
  mapDisciplinesToOpenData,
  mapHistoricalPerformanceToOpenData,
  exportCoursesOpenData,
  exportDisciplinesOpenData,
  exportDisciplineHistoryOpenData,
  exportDisciplineClassesOpenData,
} from "../openDataService.ts";
import type { Course } from "../../types/curso.ts";
import {
  DEFAULT_HISTORICAL_PERFORMANCE,
  adaptBackendDisciplina,
  type BackendDisciplinaResponse,
  type Discipline,
  type HistoricalPerformance,
} from "../../types/disciplina.ts";
import type { Class } from "../../types/turma.ts";

test("escapeCsvCell aplica escape RFC 4180 e neutraliza injecao de formulas", () => {
  assert.equal(escapeCsvCell(null), "");
  assert.equal(escapeCsvCell(undefined), "");
  assert.equal(escapeCsvCell("Calculo 1"), "Calculo 1");
  assert.equal(escapeCsvCell("FGA, Campus Gama"), '"FGA, Campus Gama"');
  assert.equal(escapeCsvCell('Texto com "aspas"'), '"Texto com ""aspas"""');
  assert.equal(escapeCsvCell("Linha 1\nLinha 2"), '"Linha 1\nLinha 2"');
  assert.equal(escapeCsvCell("=SUM(A1:A5)"), "'=SUM(A1:A5)");
  assert.equal(escapeCsvCell("-15.5"), "-15.5");
});

test("serializeToCsv inclui BOM UTF-8 e formata cabecalho e linhas corretamente", () => {
  const columns = [
    { key: "codigo" as const, header: "codigo" },
    { key: "nome" as const, header: "nome" },
  ];
  const rows = [
    { codigo: "FGA0138", nome: "Metodos de Desenvolvimento de Software" },
    { codigo: "MAT0025", nome: "Calculo 1, Turma Unificada" },
  ];

  const csv = serializeToCsv(columns, rows, true);
  assert.equal(csv.startsWith(UTF8_BOM), true);

  const lines = csv.slice(UTF8_BOM.length).split("\r\n");
  assert.equal(lines.length, 3);
  assert.equal(lines[0], "codigo,nome");
  assert.equal(lines[1], "FGA0138,Metodos de Desenvolvimento de Software");
  assert.equal(lines[2], 'MAT0025,"Calculo 1, Turma Unificada"');
});

test("serializeToJson gera envelope de Dados Abertos com metadados e LGPD", () => {
  const rows = [{ codigo: "FGA0138", taxa_aprovacao_pct: 88.5 }];
  const rawJson = serializeToJson("disciplinas", rows, {
    contextIdentifier: "FCTE",
    generatedAt: "2026-11-12T12:00:00.000Z",
  });

  const parsed = JSON.parse(rawJson);
  assert.equal(parsed.plataforma, "Tamburetei UnB");
  assert.equal(parsed.escopo, "disciplinas");
  assert.equal(parsed.identificador_contexto, "FCTE");
  assert.equal(parsed.gerado_em, "2026-11-12T12:00:00.000Z");
  assert.equal(parsed.total_registros, 1);
  assert.equal(parsed.conformidade_lgpd.includes("LGPD"), true);
  assert.deepEqual(parsed.dados, rows);
});

test("buildOpenDataFilename padroniza nomes de arquivos CSV e JSON", () => {
  const refDate = new Date("2026-11-12T15:30:00.000Z");

  assert.equal(
    buildOpenDataFilename("disciplinas", "csv", null, refDate),
    "tamburetei-unb-disciplinas-2026-11-12.csv"
  );
  assert.equal(
    buildOpenDataFilename("historico_disciplina", "json", "FGA0138", refDate),
    "tamburetei-unb-historico-disciplina-fga0138-2026-11-12.json"
  );
});

test("exportCoursesOpenData e exportDisciplinesOpenData acionam handler de download", () => {
  const captured: Array<{ content: string; filename: string; mimeType: string }> = [];
  const handler = (content: string, filename: string, mimeType: string) => {
    captured.push({ content, filename, mimeType });
  };

  const courses: Course[] = [
    {
      id: "1",
      codigo_mec: "114628",
      nome: "Engenharia de Software",
      slug: "engenharia-de-software",
      campus: "FCTE",
      departamento: "FCTE",
      grau: "Bacharelado",
      turno: "Diurno",
      semestres: 10,
      total_disciplinas: 48,
      metricas_recentes: {
        vagas_totais: 120,
        inscritos_total: 600,
        ingressantes: 115,
        matriculados: 540,
        concluintes: 62,
        trancados: 18,
        desvinculados: 20,
        taxa_sucesso: 84.2,
        taxa_evasao: 3.7,
      },
    },
  ];

  const disciplines: Discipline[] = [
    {
      id: 10,
      code: "FGA0138",
      name: "Metodos de Desenvolvimento de Software",
      slug: "fga0138-mds",
      department: "FCTE",
      departmentName: "Departamento de FCTE",
      campus: "FCTE",
      campusFilter: "FCTE (Gama)",
      area: "Tecnologia",
      credits: "4 creditos • 60h",
      hours: 60,
      approval: 87.4,
      failedGrade: 6.2,
      failedAttendance: 3.1,
      withdrawn: 3.3,
      resources: 15,
      popularity: 95,
    },
  ];

  const refDate = new Date("2026-11-12T10:00:00.000Z");

  const courseExport = exportCoursesOpenData(courses, "csv", {
    identifier: "FCTE",
    referenceDate: refDate,
    downloadHandler: handler,
  });

  const disciplineExport = exportDisciplinesOpenData(disciplines, "json", {
    referenceDate: refDate,
    downloadHandler: handler,
  });

  assert.equal(courseExport.recordCount, 1);
  assert.equal(courseExport.filename, "tamburetei-unb-cursos-fcte-2026-11-12.csv");
  assert.equal(courseExport.content.includes("Engenharia de Software"), true);

  assert.equal(disciplineExport.recordCount, 1);
  assert.equal(disciplineExport.filename, "tamburetei-unb-disciplinas-2026-11-12.json");
  assert.equal(disciplineExport.content.includes("FGA0138"), true);
  const [disciplineWithoutMetric] = mapDisciplinesToOpenData([
    { ...disciplines[0], approval: null },
  ]);
  assert.equal(disciplineWithoutMetric.taxa_aprovacao_pct, null);
  assert.equal(captured.length, 2);
});

test("exportDisciplineHistoryOpenData e exportDisciplineClassesOpenData calculam percentuais corretamente", () => {
  const history: HistoricalPerformance[] = [
    { semester: "2025/1", approved: 40, failed: 5, absent: 3, withdrawn: 2 },
  ];
  const classes: Class[] = [
    {
      id: 1,
      codigoTurma: "Turma 01",
      disciplinaCodigo: "FGA0138",
      semestre: "2026.1",
      professor: "Docente FCTE",
      horarios: "Ter/Qui 10:00 - 11:50",
      local: "UAC S-9",
      vagasOcupadas: 36,
      totalVagas: 40,
      turno: "Matutino",
    },
  ];

  const histRes = exportDisciplineHistoryOpenData(
    "FGA0138",
    "Metodos de Desenvolvimento de Software",
    history,
    "json",
    { downloadHandler: null }
  );
  const parsedHist = JSON.parse(histRes.content);
  assert.equal(parsedHist.dados[0].total_avaliados, 50);
  assert.equal(parsedHist.dados[0].taxa_aprovacao_pct, 80);
  assert.equal(parsedHist.dados[0].taxa_reprovacao_nota_pct, 10);

  const classRes = exportDisciplineClassesOpenData("FGA0138", classes, "csv", {
    downloadHandler: null,
  });
  assert.equal(classRes.content.includes("Turma 01"), true);
  assert.equal(classRes.content.includes("90"), true);
});

test("RN07: adaptBackendDisciplina preserva amostragem_suprimida_lgpd e exportacao suprime semestre com menos de 5 discentes", () => {
  const apiResponse: BackendDisciplinaResponse = {
    id: 42,
    codigo: "FGA0999",
    nome: "Topicos Especiais",
    slug: "fga0999-topicos",
    departamento: "FCTE",
    creditos: 4,
    carga_horaria: 60,
    ementa: "Unidade 1.",
    pre_requisitos_itens: [],
    equivalencias_itens: [],
    cursos: [],
    metrica_consolidada: {
      matriculados: 3,
      aprovados: 2,
      reprovados_nota: 1,
      reprovados_falta: 0,
      trancamentos: 0,
      taxa_aprovacao_acumulada: 66.7,
      total_turmas_suprimidas: 1,
    },
    metricas: [
      {
        ano: 2025,
        semestre: 1,
        matriculados: 3,
        aprovados: 2,
        reprovados_nota: 1,
        reprovados_falta: 0,
        trancamentos: 0,
        taxa_aprovacao: 66.7,
        amostragem_suprimida_lgpd: true,
      },
    ],
  };

  const adapted = adaptBackendDisciplina(apiResponse);
  assert.equal(adapted.historicalPerformance?.length, 1);
  assert.equal(adapted.historicalPerformance?.[0].amostragem_suprimida_lgpd, true);
  assert.equal(isSemesterSuppressedByLgpd(adapted.historicalPerformance![0]), true);
  assert.equal(adapted.approval, 66.7);

  let downloadTriggered = false;
  const exportRes = exportDisciplineHistoryOpenData(
    adapted.code,
    adapted.name,
    adapted.historicalPerformance,
    "json",
    {
      consolidatedMetric: adapted.metrica_consolidada,
      downloadHandler: () => {
        downloadTriggered = true;
      },
    }
  );

  const parsed = JSON.parse(exportRes.content);
  assert.equal(exportRes.recordCount, 0);
  assert.equal(parsed.total_registros, 0);
  assert.deepEqual(parsed.dados, []);
  assert.equal(downloadTriggered, false);
});

test("adaptBackendDisciplina mantém aprovação indisponível distinta de zero e calcula taxa consolidada", () => {
  const summary = adaptBackendDisciplina({
    codigo: "FGA0001",
    nome: "Disciplina sem métricas",
    slug: "fga0001-sem-metricas",
  });
  assert.equal(summary.approval, null);

  const withoutConsolidatedRate: BackendDisciplinaResponse = {
    id: 43,
    codigo: "FGA0002",
    nome: "Disciplina com métricas",
    slug: "fga0002-com-metricas",
    pre_requisitos_itens: [],
    equivalencias_itens: [],
    cursos: [],
    metrica_consolidada: {
      matriculados: 8,
      aprovados: 6,
      reprovados_nota: 1,
      reprovados_falta: 1,
      trancamentos: 0,
      taxa_aprovacao_acumulada: null,
      total_turmas_suprimidas: 0,
    },
    metricas: [],
  };
  assert.equal(
    adaptBackendDisciplina(withoutConsolidatedRate).approval,
    75
  );
});

test("RN07: semestres suprimidos sao omitidos individualmente e consolidados no acumulado quando o total >= 5", () => {
  const history: HistoricalPerformance[] = [
    {
      semester: "2024/2",
      matriculados: 30,
      approved: 24,
      failed: 3,
      absent: 2,
      withdrawn: 1,
      amostragem_suprimida_lgpd: false,
    },
    {
      semester: "2025/1",
      matriculados: 3,
      approved: 2,
      failed: 1,
      absent: 0,
      withdrawn: 0,
      amostragem_suprimida_lgpd: true,
    },
  ];

  const rows = mapHistoricalPerformanceToOpenData(
    "FGA0138",
    "Metodos de Desenvolvimento de Software",
    history,
    {
      matriculados: 33,
      aprovados: 26,
      reprovados_nota: 4,
      reprovados_falta: 2,
      trancamentos: 1,
      taxa_aprovacao_acumulada: 78.8,
      total_turmas_suprimidas: 1,
    }
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].semestre_letivo, "2024/2");
  assert.equal(rows[0].total_avaliados, 30);
  assert.equal(rows.some((r) => r.semestre_letivo === "2025/1"), false);
  assert.equal(rows[1].semestre_letivo, "Acumulado Consolidado (LGPD)");
  assert.equal(rows[1].total_avaliados, 33);
  assert.equal(rows[1].aprovados, 26);
});

test("Impede exportacao de DEFAULT_HISTORICAL_PERFORMANCE ou metricas vazias como dados reais", () => {
  assert.deepEqual(
    filterPublicHistoricalPerformance(DEFAULT_HISTORICAL_PERFORMANCE),
    []
  );
  assert.deepEqual(
    mapHistoricalPerformanceToOpenData(
      "FGA0138",
      "Metodos de Desenvolvimento de Software",
      DEFAULT_HISTORICAL_PERFORMANCE
    ),
    []
  );
  assert.deepEqual(
    mapHistoricalPerformanceToOpenData(
      "FGA0138",
      "Metodos de Desenvolvimento de Software",
      []
    ),
    []
  );
});

test("mapCoursesToOpenData preserva metadados ausentes como null no JSON e vazio no CSV, sem usar id como codigo_mec", () => {
  const incompleteCourse: Course = {
    id: "curso-interno-99",
    nome: "Engenharia Aeroespacial",
    slug: "engenharia-aeroespacial",
    campus: "FCTE",
  };

  const rows = mapCoursesToOpenData([incompleteCourse]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "curso-interno-99");
  assert.equal(rows[0].codigo_mec, null);
  assert.equal(rows[0].semestres, null);
  assert.equal(rows[0].total_disciplinas, null);
  assert.equal(rows[0].departamento, null);
  assert.equal(rows[0].grau, null);
  assert.equal(rows[0].turno, null);

  const jsonExport = exportCoursesOpenData([incompleteCourse], "json", {
    downloadHandler: null,
  });
  const parsed = JSON.parse(jsonExport.content);
  assert.equal(parsed.dados[0].id, "curso-interno-99");
  assert.equal(parsed.dados[0].codigo_mec, null);
  assert.equal(parsed.dados[0].semestres, null);
  assert.equal(parsed.dados[0].total_disciplinas, null);

  const csvExport = exportCoursesOpenData([incompleteCourse], "csv", {
    downloadHandler: null,
  });
  const csvLines = csvExport.content.slice(UTF8_BOM.length).split("\r\n");
  assert.equal(
    csvLines[0],
    "id,codigo_mec,nome,slug,campus,departamento,grau,turno,semestres,total_disciplinas,ano,matriculados_recentes,concluintes_recentes,trancamentos,taxa_sucesso_pct,taxa_evasao_pct"
  );
  assert.equal(
    csvLines[1],
    "curso-interno-99,,Engenharia Aeroespacial,engenharia-aeroespacial,FCTE,,,,,,,,,,,"
  );
});

test("exportCoursesOpenData e exportDisciplinesOpenData filtram por ano e exportam trancamentos", () => {
  const course: Course = {
    id: "1",
    codigo_mec: "114628",
    nome: "Engenharia de Software",
    slug: "engenharia-de-software",
    campus: "FCTE",
    metricas_recentes: {
      ano: 2024,
      vagas_totais: 120,
      inscritos_total: 600,
      ingressantes: 115,
      matriculados: 540,
      concluintes: 62,
      trancados: 18,
      desvinculados: 20,
      taxa_sucesso: 84.2,
      taxa_evasao: 3.7,
    },
    metricas_historicas: [
      {
        ano: 2022,
        vagas_totais: 110,
        inscritos_total: 520,
        ingressantes: 108,
        matriculados: 490,
        concluintes: 50,
        trancados: 27,
        desvinculados: 15,
        taxa_sucesso: 80.5,
        taxa_evasao: 3.1,
      },
    ],
  };

  const course2022 = exportCoursesOpenData([course], "json", {
    year: 2022,
    identifier: "FCTE",
    downloadHandler: null,
  });
  const parsedCourse = JSON.parse(course2022.content);
  assert.equal(course2022.filename.includes("fcte-2022"), true);
  assert.equal(parsedCourse.dados[0].ano, 2022);
  assert.equal(parsedCourse.dados[0].matriculados_recentes, 490);
  assert.equal(parsedCourse.dados[0].trancamentos, 27);

  const discipline: Discipline = {
    id: 1,
    code: "MAT0025",
    name: "Cálculo 1",
    slug: "calculo-1",
    department: "MAT",
    departmentName: "Departamento de Matemática",
    campus: "Darcy Ribeiro",
    campusFilter: "Darcy Ribeiro",
    area: "Exatas",
    credits: "6 créditos • 90h",
    hours: 90,
    approval: 75,
    failedGrade: 15,
    failedAttendance: 5,
    withdrawn: 5,
    resources: 0,
    popularity: 90,
    metrica_consolidada: {
      matriculados: 200,
      aprovados: 150,
      reprovados_nota: 30,
      reprovados_falta: 10,
      trancamentos: 10,
      taxa_aprovacao_acumulada: 75,
      total_turmas_suprimidas: 0,
    },
    historicalPerformance: [
      { semester: "2023/1", matriculados: 100, approved: 70, failed: 20, absent: 4, withdrawn: 6, amostragem_suprimida_lgpd: false },
      { semester: "2023/2", matriculados: 100, approved: 80, failed: 10, absent: 6, withdrawn: 4, amostragem_suprimida_lgpd: false },
    ],
  };

  const disc2023 = exportDisciplinesOpenData([discipline], "json", {
    year: 2023,
    downloadHandler: null,
  });
  const parsedDisc = JSON.parse(disc2023.content);
  assert.equal(disc2023.filename.includes("2023"), true);
  assert.equal(parsedDisc.dados[0].ano, 2023);
  assert.equal(parsedDisc.dados[0].matriculados, 200);
  assert.equal(parsedDisc.dados[0].trancamentos, 10);
});
