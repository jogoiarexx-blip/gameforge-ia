'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const catalog=require('../js/repository-knowledge.js');
const expected=['eden-fixed-step-audited','navinha-save-checkpoint-audited','neon-sprite-cache-audited','dragon-collision-audited'];
test('referencias auditadas possuem proveniencia, testes e identificadores unicos',()=>{
 const ids=new Set();
 for(const entry of catalog.entries){
   assert.ok(!ids.has(entry.id),'ID duplicado: '+entry.id);ids.add(entry.id);
 }
 for(const id of expected){
   const row=catalog.entries.find(e=>e.id===id);
   assert.ok(row,id);assert.match(row.url,/^https:\/\/github\.com\/jogoiarexx-blip\//);
   for(const field of ['guidance','verify','verified','path','repository'])assert.ok(row[field],id+': '+field);
 }
});
test('busca semantica recupera tecnicas dos jogos',()=>{
 for(const [query,id] of [['simulacao fixed timestep','eden-fixed-step-audited'],['checkpoint persistencia salvar','navinha-save-checkpoint-audited'],['sprite cache render fps','neon-sprite-cache-audited'],['colisao aabb circulo','dragon-collision-audited']]){
  const rows=catalog.rank(query,8);
  assert.ok(rows.some(row=>row.id===id),query);
 }
});
