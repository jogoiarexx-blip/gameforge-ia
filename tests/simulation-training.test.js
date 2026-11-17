'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const corpus=require('../training/simulation-ptbr-v3.json'),Parser=require('../js/parser');
test('GF-TRAIN-03: 76 pedidos diversos de simulação, exclusões e gêneros vizinhos',()=>{
 assert.equal(corpus.cases.length,76);
 assert.equal(new Set(corpus.cases.map(x=>x.instruction)).size,76);
 const failures=[];
 for(const row of corpus.cases){
  const s=Parser.parseGdd('',row.instruction),e=row.expected;
  for(const key of ['genre','dimension'])if(e[key]&&s[key]!==e[key])failures.push(row.instruction+': '+key+' = '+s[key]);
  if(e.domain&&s.simulation?.domain!==e.domain)failures.push(row.instruction+': domínio = '+s.simulation?.domain);
  if(!!s.designIR.blocked.length!==e.blocked)failures.push(row.instruction+': bloqueio = '+JSON.stringify(s.designIR.blocked));
 }
 assert.deepEqual(failures,[]);
});
test('GF-TRAIN-03: última intenção escolhe o domínio, preserva origem e informa mistura',()=>{
 const s=Parser.parseGdd('# Fazenda\nCuidar de fazenda e plantar','Agora quero criar um aquário para alimentar e vender peixes.');
 assert.equal(s.genre,'simulation');assert.equal(s.simulation.domain,'aquarium');
 const mixed=Parser.parseGdd('','Quero cuidar de fazenda e aquário e vender produtos.');
 assert.ok(mixed.implementation.pending.some(x=>x.id==='simulation-hybrid'));
});
