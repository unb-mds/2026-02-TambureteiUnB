import test from "node:test";
import assert from "node:assert/strict";
import { paginateClasses } from "../classPagination.ts";

const classes = Array.from({ length: 14 }, (_, index) => ({ id: index + 1 }));

test("limita a primeira pagina a oito turmas sem alterar a lista original", () => {
  const page = paginateClasses(classes, 1);
  assert.deepEqual(page.items.map((item) => item.id), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(page.totalPages, 2);
  assert.equal(page.startItem, 1);
  assert.equal(page.endItem, 8);
  assert.equal(classes.length, 14);
});

test("troca de pagina sem repetir ou perder turmas e permite voltar", () => {
  const first = paginateClasses(classes, 1);
  const second = paginateClasses(classes, 2);
  assert.deepEqual(second.items.map((item) => item.id), [9, 10, 11, 12, 13, 14]);
  assert.equal(second.startItem, 9);
  assert.equal(second.endItem, 14);
  assert.deepEqual([...first.items, ...second.items], classes);
  assert.deepEqual(paginateClasses(classes, 1), first);
});

test("preserva a ordem recebida e limita a pagina apos reducao dos resultados", () => {
  const filtered = classes.filter((item) => item.id % 2 === 0).reverse();
  const page = paginateClasses(filtered, 2);
  assert.equal(page.currentPage, 1);
  assert.equal(page.totalPages, 1);
  assert.deepEqual(page.items, filtered);
});

test("trata lista vazia e o limite exato de uma pagina", () => {
  assert.deepEqual(paginateClasses([], 2), {
    items: [], currentPage: 1, totalPages: 0, startItem: 0, endItem: 0,
  });
  assert.equal(paginateClasses(classes.slice(0, 8), 1).totalPages, 1);
  assert.equal(paginateClasses(classes, 0).currentPage, 1);
});

test("abre uma segunda pagina ao ultrapassar o limite por uma turma", () => {
  const page = paginateClasses(classes.slice(0, 9), 2);
  assert.equal(page.totalPages, 2);
  assert.deepEqual(page.items, [{ id: 9 }]);
  assert.equal(page.startItem, 9);
  assert.equal(page.endItem, 9);
});
