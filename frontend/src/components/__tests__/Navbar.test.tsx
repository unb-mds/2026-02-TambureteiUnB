import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("Navbar mobile aplica estilos uniformes para Inicio, Cursos, Disciplinas e Minha grade", () => {
  const sourcePath = path.resolve(process.cwd(), "src/components/Navbar.tsx");
  const source = fs.readFileSync(sourcePath, "utf-8");

  assert.match(source, /href:\s*"\/",\s*label:\s*"Início"/);
  assert.match(source, /href:\s*"\/cursos",\s*label:\s*"Cursos"/);
  assert.match(source, /href:\s*"\/disciplinas",\s*label:\s*"Disciplinas"/);
  assert.match(source, /href:\s*"\/minha-grade",\s*label:\s*"Minha grade"/);
  assert.match(source, /px-3 py-2\.5 rounded-xl text-base font-medium/);
  assert.match(source, /text-gray-700 hover:bg-gray-50/);
});
