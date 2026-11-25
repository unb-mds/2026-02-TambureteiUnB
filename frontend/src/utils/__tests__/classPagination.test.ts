import test from "node:test";
import assert from "node:assert/strict";
import { paginateClasses } from "../classPagination.ts";
const classes = Array.from({ length: 14 }, (_, index) => ({ id: index + 1 }));
test("limita cada página a quatro turmas sem alterar a lista", () => {
  const page = paginateClasses(classes, 1);
  assert.deepEqual(page.items.map(item => item.id), [1, 2, 3, 4]);
  assert.equal(page.totalPages, 4);
  assert.equal(page.endItem, 4);
  assert.equal(classes.length, 14);
});
test("percorre todas as páginas sem repetir ou perder turmas", () => {
  const pages = [1, 2, 3, 4].map(n => paginateClasses(classes, n));
  assert.deepEqual(pages.flatMap(page => page.items), classes);
  assert.equal(pages[3].startItem, 13);
  assert.equal(pages[3].endItem, 14);
  assert.deepEqual(paginateClasses(classes, 1), pages[0]);
});
test("limita página após redução dos resultados preservando ordem", () => {
  const filtered = classes.filter(item => item.id % 2 === 0).reverse();
  const page = paginateClasses(filtered, 4);
  assert.equal(page.currentPage, 2);
  assert.deepEqual(page.items, filtered.slice(4));
});
test("trata lista vazia e limite exato", () => {
  assert.deepEqual(paginateClasses([], 2), {items: [], currentPage: 1, totalPages: 0, startItem: 0, endItem: 0});
  assert.equal(paginateClasses(classes.slice(0,4),1).totalPages,1);
  assert.equal(paginateClasses(classes,0).currentPage,1);
});
test("quinta turma abre outra página", () => {
  const page=paginateClasses(classes.slice(0,5),2);
  assert.equal(page.totalPages,2);
  assert.deepEqual(page.items,[{id:5}]);
  assert.equal(page.startItem,5);
});
