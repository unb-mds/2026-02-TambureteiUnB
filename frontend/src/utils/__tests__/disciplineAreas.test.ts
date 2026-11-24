import assert from "node:assert/strict";
import test from "node:test";
import { adaptBackendDisciplina } from "../../types/disciplina.ts";
const subject = (codigo:string,nome:string,departamento="Departamento de FCTE - Gama") => adaptBackendDisciplina({codigo,nome,departamento,slug:codigo.toLowerCase(),total_turmas:1,locais_oferta:["FCTE - S1"]});
test("Humanidades e Cidadania é Humanas sem mudar departamento nem ofertas",()=>{
 const item=subject("FGA0164","HUMANIDADES E CIDADANIA");
 assert.equal(item.area,"Humanas");
 assert.equal(item.department,"Departamento de FCTE - Gama");
 assert.equal(item.campus,"FCTE");
 assert.deepEqual(item.offeringCampuses,["FCTE (Gama)"]);
});
test("área é consistente por disciplina mesmo com outro campus e acentos",()=>{
 assert.equal(subject("OUT0001","  Humanidades e Cidadania  ","Geral").area,"Humanas");
 assert.equal(subject("MAT0025","CÁLCULO 1").area,"Exatas");
 assert.equal(subject("IFD0173","FÍSICA 1 EXPERIMENTAL").area,"Exatas");
 assert.equal(subject("FGA0158","ORIENTAÇÃO A OBJETOS").area,"Tecnologia");
});
