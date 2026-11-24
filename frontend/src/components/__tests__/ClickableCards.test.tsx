import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import CourseCard from "../CourseCard.tsx";
import DisciplineCard from "../DisciplineCard.tsx";
import { Course } from "../../types/curso.ts";
import { Discipline } from "../../types/disciplina.ts";

test("CourseCard renderiza link overlay cobrindo todo o retangulo do card com acessibilidade", () => {
  const mockCourse: Course = {
    id: "1",
    nome: "Engenharia de Software",
    slug: "engenharia-de-software",
    campus: "FGA",
    grau: "Bacharelado",
    turno: "Integral",
    modalidade: "Presencial",
    total_creditos: 240,
    semestres: 10,
    total_disciplinas: 56,
  };

  const markup = renderToStaticMarkup(<CourseCard course={mockCourse} />);

  // Verifica que o card possui estilo clicável e foco acessível
  assert.match(markup, /cursor-pointer/);
  assert.match(markup, /focus-within:ring-2/);

  // Verifica que o Link com cobertura total (.absolute.inset-0) está presente
  assert.match(markup, /href="\/cursos\/engenharia-de-software"/);
  assert.match(markup, /class="[^"]*absolute inset-0 z-10[^"]*"/);
  assert.match(markup, /aria-label="Ver curso Engenharia de Software"/);
  assert.match(markup, /Ver disciplinas/);
});

test("DisciplineCard renderiza link overlay cobrindo todo o card com acessibilidade e metricas", () => {
  const mockDiscipline: Discipline = {
    code: "FGA0138",
    name: "Métodos de Desenvolvimento de Software",
    slug: "metodos-de-desenvolvimento-de-software",
    department: "Engenharias",
    departmentName: "Engenharias",
    campus: "FGA",
    campusFilter: "FGA",
    area: "Exatas",
    hours: 60,
    credits: "4 créditos",
    resources: 12,
    total_turmas: 2,
    approval: 85.5,
    popularity: 5,
  };

  const markup = renderToStaticMarkup(<DisciplineCard discipline={mockDiscipline} />);

  // Verifica que o card da disciplina possui estilo clicável
  assert.match(markup, /cursor-pointer/);
  assert.match(markup, /focus-within:ring-2/);

  // Verifica o link absoluto ocupando o retângulo completo
  assert.match(markup, /href="\/disciplinas\/metodos-de-desenvolvimento-de-software"/);
  assert.match(markup, /class="[^"]*absolute inset-0 z-10[^"]*"/);
  assert.match(markup, /aria-label="Acessar disciplina Métodos de Desenvolvimento de Software"/);
  assert.match(markup, /Acessar disciplina/);
});
