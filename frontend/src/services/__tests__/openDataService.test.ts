import test from "node:test";
import assert from "node:assert/strict";
import {
  UTF8_BOM,
  escapeCsvCell,
  serializeToCsv,
  serializeToJson,
  buildOpenDataFilename,
  exportCoursesOpenData,
  exportDisciplinesOpenData,
  exportDisciplineHistoryOpenData,
  exportDisciplineClassesOpenData,
} from "../openDataService.ts";
import type { Course } from "../../types/curso.ts";
import type { Discipline, HistoricalPerformance } from "../../types/disciplina.ts";
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
