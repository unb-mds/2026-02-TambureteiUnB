import assert from "node:assert/strict";
import test from "node:test";
import { getOfferingCampuses, matchesDisciplineCampus } from "../disciplineCampuses.ts";
import { adaptBackendDisciplina } from "../../types/disciplina.ts";
test("Cálculo permanece Exatas e pode ser ofertado na FCTE", () => {
 const course=adaptBackendDisciplina({codigo:"MAT0025",nome:"CÁLCULO 1",slug:"calculo-1",departamento:"Departamento de Matemática",total_turmas:2,locais_oferta:["FCTE - I9","ICC ASS 10"]});
 assert.equal(course.area,"Exatas");
 assert.equal(course.department,"Departamento de Matemática");
 assert(matchesDisciplineCampus(course,"FCTE (Gama)"));
 assert(matchesDisciplineCampus(course,"Darcy Ribeiro"));
 assert(!matchesDisciplineCampus(course,"FCE (Ceilândia)"));
});
test("locais desconhecidos não inventam oferta e siglas não são partes de palavras", () => {
 assert.deepEqual(getOfferingCampuses(["FCTE - I9","FGA - S1","ICC ASS 10","Local a definir","GAMALIEL"]),["FCTE (Gama)","Darcy Ribeiro"]);
 assert.deepEqual(getOfferingCampuses(["Não informado"]),[]);
});
