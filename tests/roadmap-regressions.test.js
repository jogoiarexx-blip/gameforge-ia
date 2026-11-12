const {test}=require('node:test');
const assert=require('node:assert/strict');
const roadmap=require('../js/gdd-roadmap.js');
test('CRLF mantém o trecho exato de cada seção, inclusive a última',()=>{
 const md='# Jogo\r\n\r\n## Menu\r\nPausar.\r\n\r\n## Fase final\r\nVencer.\r\n';
 const tasks=roadmap.build(md);
 assert.equal(md.slice(tasks[1].start,tasks[1].end),'## Fase final\r\nVencer.\r\n');
 assert.match(roadmap.context(tasks[1],md),/Trecho original:\n## Fase final/);
});
test('alterar fim de seção longa exige nova implementação e revisão',()=>{
 const md='# Jogo\n## Combate\n'+'Texto estável. '.repeat(80)+'\nDano: 10';
 const approved=roadmap.changeStatus(roadmap.build(md),roadmap.build(md)[0].id,'validada','Testado');
 assert.equal(roadmap.build(md,approved)[0].status,'validada');
 assert.equal(roadmap.build(md.replace('Dano: 10','Dano: 90'),approved)[0].status,'pendente');
});
test('metadados salvos conservam evidências só com identidade integral',()=>{
 const md='# Jogo\n## Menu\nPause';
 const t=roadmap.build(md)[0];
 const records=[{id:t.id,status:'validada',notes:'inspeção manual',revision:2}];
 assert.equal(roadmap.build(md,records)[0].status,'validada');
 assert.equal(roadmap.build(md,[{...records[0],id:'legacy'}])[0].status,'pendente');
});
test('normalização CRLF da textarea não apaga o progresso restaurado',()=>{
 const md='# Jogo\r\n## Combate\r\nAtaque.\r\n';
 const tasks=roadmap.build(md);const approved=roadmap.changeStatus(tasks,tasks[0].id,'validada','manual');
 assert.equal(roadmap.build(md.replace(/\r\n/g,'\n'),approved)[0].status,'validada');
});
