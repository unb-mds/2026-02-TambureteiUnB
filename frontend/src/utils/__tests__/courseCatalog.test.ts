import assert from "node:assert/strict";
import test from "node:test";
import type { Course } from "../../types/curso";
import {
  filterCourses,
  paginateCourses,
  getCampusBadgeClasses,
} from "../courseCatalog.ts";

const courses: Course[] = [
  {
    nome: "Engenharia de Software",
    campus: "FCTE - UnB Gama",
    slug: "engenharia-de-software",
    departamento: "Tecnologia",
  },
  {
    nome: "Engenharia Elétrica",
    campus: "Darcy Ribeiro",
    slug: "engenharia-eletrica",
    departamento: "Engenharia",
  },
  {
    nome: "Engenharia de Computação",
    campus: "FCTE - UnB Gama",
    slug: "engenharia-de-computacao",
    departamento: "Tecnologia",
  },
];

test("filterCourses filtra por consulta em nome, departamento e campus", () => {
  assert.deepEqual(
    filterCourses(courses, "  SOFTWARE ", "Todos").map((course) => course.slug),
    ["engenharia-de-software"]
  );
  assert.deepEqual(
    filterCourses(courses, "engenharia", "Todos").map((course) => course.slug),
    ["engenharia-de-software", "engenharia-eletrica", "engenharia-de-computacao"]
  );
  assert.deepEqual(
    filterCourses(courses, "gama", "Todos").map((course) => course.slug),
    ["engenharia-de-software", "engenharia-de-computacao"]
  );
});

test("filterCourses combina campus e consulta sem distinguir caixa", () => {
  assert.deepEqual(
    filterCourses(courses, "TECNOLOGIA", "fcte").map((course) => course.slug),
    ["engenharia-de-software", "engenharia-de-computacao"]
  );
  assert.deepEqual(
    filterCourses(courses, "", "Darcy Ribeiro").map((course) => course.slug),
    ["engenharia-eletrica"]
  );
});

test("filterCourses é insensível a acentos e diacríticos", () => {
  assert.deepEqual(
    filterCourses(courses, "eletrica", "Todos").map((course) => course.slug),
    ["engenharia-eletrica"]
  );
  assert.deepEqual(
    filterCourses(courses, "computacao", "Todos").map((course) => course.slug),
    ["engenharia-de-computacao"]
  );
  assert.deepEqual(
    filterCourses(courses, "ELETRICA", "Todos").map((course) => course.slug),
    ["engenharia-eletrica"]
  );
});

test("getCampusBadgeClasses mantém as cores específicas de cada campus", () => {
  assert.equal(
    getCampusBadgeClasses("FCTE - UnB Gama"),
    "bg-indigo-50 text-indigo-700 border-indigo-200"
  );
  assert.equal(
    getCampusBadgeClasses("Darcy Ribeiro"),
    "bg-purple-50 text-purple-700 border-purple-200"
  );
  assert.equal(
    getCampusBadgeClasses("FCE - Ceilândia"),
    "bg-emerald-50 text-emerald-700 border-emerald-200"
  );
  assert.equal(
    getCampusBadgeClasses("FUP - Planaltina"),
    "bg-amber-50 text-amber-800 border-amber-200"
  );
  assert.equal(
    getCampusBadgeClasses(""),
    "bg-gray-100 text-gray-700 border-gray-200"
  );
});

test("paginateCourses divide 51 cursos sem perder nem repetir registros", () => {
  const items = Array.from({ length: 51 }, (_, i) => ({ ...courses[0], slug: `curso-${i}` }));
  const pages = [1, 2, 3].map(page => paginateCourses(items, page));
  assert.deepEqual(pages.map(page => page.items.length), [25, 25, 1]);
  assert.deepEqual(pages.flatMap(page => page.items), items);
  assert.equal(pages[2].totalPages, 3);
});

test("paginateCourses limita a pagina apos filtros e aceita lista vazia", () => {
  assert.equal(paginateCourses(courses, 99).currentPage, 1);
  assert.equal(paginateCourses(courses, 0).currentPage, 1);
  assert.deepEqual(paginateCourses([], 2).items, []);
  assert.equal(paginateCourses([], 2).totalPages, 1);
});
