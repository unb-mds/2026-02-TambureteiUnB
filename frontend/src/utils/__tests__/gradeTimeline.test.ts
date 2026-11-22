import test from "node:test";
import assert from "node:assert/strict";
import {buildGradeTimeline, formatGradeTime} from "../gradeTimeline.ts";
test("escala usa início e fim dos blocos SIGAA sem faixas vazias entre aulas",()=>{
 const t=buildGradeTimeline([]);
 assert.equal(t.position(480),0);
 assert.equal(t.position(590),96);
 assert.equal(t.position(600),96);
 assert.equal(t.position(710),192);
 assert.equal(t.position(535),48);
 assert.equal(t.position(595),96);
 assert.equal(t.blocks.at(-1)?.end,1350);
 assert.equal(formatGradeTime(590),"09:50");
});
test("horários fora da escala padrão não são cortados",()=>{
 const t=buildGradeTimeline([{start:420,end:1380}]);
 assert.equal(t.position(420),0);
 assert.equal(t.position(1380),t.height);
});

test("conteúdo extenso expande a linha inteira e mantém alinhamento", () => {
 const t=buildGradeTimeline([{start:480,end:590,minHeight:180},{start:600,end:655,minHeight:120}]);
 assert.equal(t.position(590)-t.position(480),180);
 assert.equal(t.position(655)-t.position(600),120);
 assert.equal(t.position(590),t.position(600));
});
