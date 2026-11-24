import assert from "node:assert/strict";
import test from "node:test";
import { getDepartmentOptions } from "../disciplineDepartments.ts";

test("gera opções únicas e ordenadas a partir dos departamentos carregados", () => {
  assert.deepEqual(
    getDepartmentOptions([
      { departmentName: "Faculdade de Agronomia e Medicina Veterinária" },
      { departmentName: "Departamento de Administração" },
      { departmentName: "Faculdade de Agronomia e Medicina Veterinária" },
      { departmentName: " " },
    ]),
    [
      "Departamento de Administração",
      "Faculdade de Agronomia e Medicina Veterinária",
    ],
  );
});
