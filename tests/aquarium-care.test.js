'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Parser=require('../js/parser'),R=require('../js/simulation-rules')();
const corpus=require('../training/aquarium-care-ptbr-v6.json');
const config=(extra='')=>Parser.parseGdd('','Quero cuidar de aquário. '+extra).simulation;
function seconds(s,c,time,dt=1){for(let t=0;t<time-1e-9;t+=dt)R.tick(s,c,Math.min(dt,time-t));}
test('GF-TRAIN-06: 40 pedidos leigos configuram cuidado e preservam restrições',()=>{
 assert.equal(corpus.cases.length,40);assert.equal(new Set(corpus.cases.map(r=>r.instruction)).size,40);
 const failed=[];
 for(const row of corpus.cases){
  const s=Parser.parseGdd('',row.instruction),c=s.simulation;
  if(s.genre!=='simulation'||c?.domain!=='aquarium'){failed.push(row.instruction+' virou '+s.genre);continue;}
  for(const [key,value] of Object.entries(row.expected)){
   if(key==='pending'){if(!s.implementation.pending.some(x=>x.id===value))failed.push(row.instruction+' faltou '+value);}
   else if((key in c?c[key]:c.aquariumCare[key])!==value)failed.push(row.instruction+' '+key+'='+JSON.stringify(key in c?c[key]:c.aquariumCare[key]));
  }
  if(s.designIR.blocked.length)failed.push(row.instruction+' bloqueado indevidamente');
 }
 assert.deepEqual(failed,[]);
});
test('GF-TRAIN-06: alimentação é isolada, acaba com o tempo e retoma crescimento',()=>{
 const c=config('Crescer em 20 segundos, fome em 5 segundos, 2 tanques.'),s=R.create(c);
 R.act(s,c,0,'start');R.act(s,c,1,'start');R.act(s,c,0,'care');
 assert.equal(s.slots[0].satiety,100);assert.equal(s.slots[1].satiety,0);
 seconds(s,c,6);assert.equal(s.slots[0].age,5);assert.equal(s.slots[1].age,0);
 assert.ok(R.status(s,c,0).blocked.includes('fome'));
 seconds(s,c,3);assert.equal(s.slots[0].age,5);
 assert.equal(R.act(s,c,0,'care'),true);seconds(s,c,2);assert.equal(s.slots[0].age,7);
 assert.equal(s.slots[1].age,0);assert.equal(s.slots[1].satiety,0);
});
test('GF-TRAIN-06: água é do tanque, afeta crescimento e limpeza não gera renda',()=>{
 const c=config('Sem fome. Água suja em 5 segundos. Crescer em 20 segundos.'),s=R.create(c);
 R.act(s,c,0,'start');R.act(s,c,0,'care');const balance=s.money;
 seconds(s,c,6);assert.equal(s.slots[0].age,5);assert.equal(s.tanks[0].water,0);
 assert.equal(R.act(s,c,0,'clean'),true);assert.equal(s.money,balance);assert.equal(s.tanks[0].water,100);
 assert.equal(R.act(s,c,0,'clean'),false);seconds(s,c,2);assert.equal(s.slots[0].age,7);
});
test('GF-TRAIN-06: cotação cresce com idade e venda antecipada não duplica moedas',()=>{
 const c=config('Crescer em 10 segundos. Filhote vale 4, jovem vale 12, adulto vale 30. Vender filhotes.'),s=R.create(c);
 R.act(s,c,0,'start');assert.equal(R.quote(s.slots[0],c),4);R.act(s,c,0,'care');seconds(s,c,5);
 assert.equal(R.quote(s.slots[0],c),12);assert.equal(R.status(s,c,0).stage,'young');const balance=s.money;
 assert.equal(R.act(s,c,0,'finish'),true);assert.equal(s.money,balance+12);assert.equal(s.sales,1);
 assert.equal(R.act(s,c,0,'finish'),false);assert.equal(s.money,balance+12);
 R.act(s,c,0,'start');R.act(s,c,0,'care');seconds(s,c,10);assert.equal(R.quote(s.slots[0],c),30);
 assert.equal(R.status(s,c,0).stage,'adult');
});
test('GF-TRAIN-06: venda só adulta, exceção sem alimentação e sem fome são executáveis',()=>{
 const c=config('Sem precisar alimentar. Crescer em 10 segundos. Vender só quando adulto.'),s=R.create(c);
 R.act(s,c,0,'start');assert.equal(R.act(s,c,0,'finish'),false);seconds(s,c,10);
 assert.equal(R.act(s,c,0,'finish'),true);
 const n=config('Sem fome. Crescer em 10 segundos.'),t=R.create(n);R.act(t,n,0,'start');seconds(t,n,4);assert.equal(t.slots[0].age,0,'primeiro cuidado ainda é solicitado');
 R.act(t,n,0,'care');seconds(t,n,10);assert.equal(t.slots[0].age,10);
});
test('GF-TRAIN-06: resultado independe de dt e tempo inválido não altera estado',()=>{
 const c=config('Fome em 7 segundos. Água suja em 9 segundos. Crescer em 30 segundos.'),a=R.create(c),b=R.create(c);
 for(const s of [a,b]){R.act(s,c,0,'start');R.act(s,c,0,'care');}
 seconds(a,c,10,1);seconds(b,c,10,1/60);
 assert.ok(Math.abs(a.slots[0].age-b.slots[0].age)<1e-7);assert.ok(Math.abs(a.slots[0].age-7)<1e-8);
 assert.equal(a.slots[0].satiety,b.slots[0].satiety);assert.equal(a.tanks[0].water,b.tanks[0].water);
 const before=JSON.stringify(a);for(const dt of [0,-1,NaN,Infinity])R.tick(a,c,dt);assert.equal(JSON.stringify(a),before);
});
test('GF-TRAIN-06: comando recente prevalece e parâmetros inválidos são limitados',()=>{
 const s=Parser.parseGdd('# Aquário\nCuidar de peixes, com fome em 10 segundos, vender filhotes.','Agora sem fome e vender somente adultos.');
 assert.equal(s.simulation.aquariumCare.hungerEnabled,false);assert.equal(s.simulation.aquariumCare.sellYoung,false);
 assert.equal(config('n quero fome').aquariumCare.hungerEnabled,false);
 assert.equal(config('Sem fome, depois alimentar a cada 15 segundos.').aquariumCare.hungerEnabled,true);
 assert.equal(config('Alimentar a cada 20 segundos e fome em 10 segundos.').aquariumCare.hungerSeconds,10);
 assert.equal(config('Fome em 10 segundos e alimentar a cada 20 segundos.').aquariumCare.hungerSeconds,20);
 const c=config('Fome em 0 segundos. Água suja em 9999 segundos. Filhote vale 100, jovem vale 2, adulto vale 20.');
 assert.equal(c.aquariumCare.hungerSeconds,5);assert.equal(c.aquariumCare.waterSeconds,600);
 assert.ok(c.aquariumCare.juvenilePrice<=c.aquariumCare.youngPrice&&c.aquariumCare.youngPrice<=c.price);
});
test('GF-TRAIN-06: planos legados preservam ciclo v1 e custos não implementados ficam pendentes',()=>{
 const c=config();delete c.aquariumCare;c.version=1;const s=R.create(c);
 R.act(s,c,0,'start');R.act(s,c,0,'care');seconds(s,c,c.seconds);assert.equal(R.act(s,c,0,'finish'),true);assert.equal(s.earned,c.price);
 const spec=Parser.parseGdd('','Quero cuidar de aquário com ração custa 5, salvar progresso e doenças.');
 for(const id of ['simulation-paid-food','simulation-save','simulation-health'])assert.ok(spec.implementation.pending.some(x=>x.id===id),id);
 assert.ok(spec.implementation.audit.items.some(x=>x.id==='aquarium-care'&&x.status==='implementada'));
});
