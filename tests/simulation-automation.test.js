'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../js/parser'),R=require('../js/simulation-rules')(),C=require('../js/game-capabilities'),corpus=require('../training/simulation-automation-ptbr-v10.json');
const config=(domain,extra='')=>P.parseGdd('',{farm:'Quero cuidar de fazenda',aquarium:'Quero cuidar de aquário',shop:'Quero administrar loja'}[domain]+'. '+extra).simulation;
const run=(s,c,seconds,dt=1)=>{for(let t=0;t<seconds-1e-8;t+=dt)R.tick(s,c,Math.min(dt,seconds-t));};
test('GF-TRAIN-10: 48 pedidos de automação geram contrato ou preservam restrições',()=>{
 assert.equal(corpus.cases.length,48);assert.equal(new Set(corpus.cases.map(x=>(x.gdd||'')+'\n'+x.instruction)).size,48);
 const errors=[];
 for(const row of corpus.cases){
  const s=P.parseGdd(row.gdd||'',row.instruction),a=s.simulation?.automation;
  if(s.genre!=='simulation'||s.simulation?.domain!==row.domain){errors.push(row.instruction+': domínio');continue;}
  for(const [key,value] of Object.entries(row.expected))if((a?.[key]??false)!==value)errors.push(row.instruction+': '+key+'='+a?.[key]);
  if(row.pending&&!s.implementation.pending.some(x=>x.id===row.pending))errors.push(row.instruction+': faltou '+row.pending);
  if(row.noPending&&s.implementation.pending.some(x=>x.id==='simulation-automation'))errors.push(row.instruction+': automação pendente');
  if(a&&!s.implementation.audit.items.some(x=>x.id==='simulation-automation'&&x.status==='implementada'))errors.push(row.instruction+': auditoria');
  if(s.designIR.blocked.length)errors.push(row.instruction+': bloqueado');
 }
 assert.deepEqual(errors,[]);
});
for(const domain of ['farm','aquarium','shop'])test('automação completa paga os custos e atinge vitória uma vez — '+domain,()=>{
 const c=config(domain,'Produção automática. Crescer em dois segundos, atendimento em dois segundos, dois espaços, meta de dez moedas.'),s=R.create(c);
 run(s,c,8);assert.equal(s.complete,true);assert.equal(s.sales,1);assert.ok(s.automation.actions>0);
 assert.equal(s.money,c.startingMoney-2*c.cost+c.price);assert.equal(s.earned,c.price);
 const before=JSON.stringify(s);run(s,c,10);assert.equal(JSON.stringify(s),before);
});
test('automação parcial cuida mas não compra, colhe nem vende',()=>{
 const c=config('aquarium','Alimentação automática. Crescer em dois segundos. Fome em cinco segundos.'),s=R.create(c);
 run(s,c,3);assert.equal(s.slots.filter(Boolean).length,0);R.act(s,c,0,'start');run(s,c,9);
 assert.equal(s.slots[0].age,c.seconds);assert.ok(s.slots[0].satiety>0);assert.equal(s.sales,0);
 const clean=config('aquarium','Limpeza automática. Água suja em cinco segundos.'),t=R.create(clean);
 assert.equal(clean.aquariumCare.waterEnabled,true);R.act(t,clean,0,'start');R.act(t,clean,0,'care');run(t,clean,8);
 assert.ok(t.tanks[0].water>0);assert.ok(t.automation.actions>0);
 const off=config('aquarium','Limpeza automática, mas sem água suja.');assert.equal(off.automation,undefined);
});
test('colheita automática guarda estoque até venda manual, sem renda fictícia',()=>{
 const c=config('farm','Plantio automático, irrigação automática e colheita automática. Venda manual. Crescer em dois segundos, dois canteiros.'),s=R.create(c);
 run(s,c,3);assert.equal(s.inventory,2);assert.equal(s.earned,0);assert.equal(s.sales,0);
 assert.equal(R.act(s,c,0,'sell'),true);assert.equal(s.inventory,1);assert.equal(s.earned,c.price);
});
test('saldo insuficiente impede nova compra, e alimentação/limpeza não cobram',()=>{
 const c=config('aquarium','Produção automática. Começar com vinte moedas. Peixe custa vinte. Dois tanques. Água suja em cinco segundos.'),s=R.create(c);
 run(s,c,1);assert.equal(s.slots.filter(Boolean).length,1);assert.equal(s.money,0);
 run(s,c,10);assert.equal(s.money,0);assert.equal(s.slots.filter(Boolean).length,1);assert.ok(s.tanks[0].water>0);
});
test('desligar só a automação conserva crescimento manual e congela relógio automático',()=>{
 const c=config('farm','Produção automática. Crescer em dez segundos. Automação a cada dois segundos.'),s=R.create(c);
 run(s,c,2);s.automation.paused=true;const actions=s.automation.actions;run(s,c,5);
 assert.equal(s.slots[0].age,5);assert.equal(s.automation.actions,actions);assert.equal(s.automation.elapsed,0);
 s.automation.paused=false;run(s,c,2);assert.ok(s.slots[0].age>=7);
});
test('venda automática de aquário espera adulto mesmo com filhotes vendáveis',()=>{
 const c=config('aquarium','Produção automática. Vender filhotes. Crescer em cinco segundos.'),s=R.create(c);
 run(s,c,5);assert.equal(s.sales,0);run(s,c,1);assert.equal(s.sales,c.slots);assert.equal(s.earned,c.slots*c.price);
});
test('automação é determinística no passo de um segundo ou 60 FPS',()=>{
 const c=config('aquarium','Produção automática. Crescer em seis segundos. Água suja em cinco segundos. Fome em cinco segundos. Meta de 999 moedas.'),a=R.create(c),b=R.create(c);
 run(a,c,20,1);run(b,c,20,1/60);
 for(const key of ['money','earned','sales','inventory'])assert.equal(a[key],b[key],key);
 assert.equal(a.automation.actions,b.automation.actions);
 for(let i=0;i<c.slots;i++){assert.equal(!!a.slots[i],!!b.slots[i]);if(a.slots[i])assert.ok(Math.abs(a.slots[i].age-b.slots[i].age)<1e-7);}
});
test('save preserva automação desligada, fase do relógio e impede estados inválidos',()=>{
 const c=config('shop','Produção automática. Automação a cada dois segundos.'),s=R.create(c),data=new Map(),save=R.persistence(c,'Auto',{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)});
 run(s,c,2.5,.5);s.automation.paused=true;assert.ok(save.write(s,0));assert.deepEqual(save.read().state,s);
 for(const bad of [{elapsed:-1,paused:false,actions:0},{elapsed:3,paused:false,actions:0},{elapsed:0,paused:'sim',actions:0},{elapsed:0,paused:false,actions:-1}]){
  const raw=JSON.parse(data.get(save.key));raw.state.automation=bad;assert.equal(save.restore(JSON.stringify(raw)),null);
 }
});
test('contrato recusa domínio inválido, frequência e tipos de automação',()=>{
 const s=P.parseGdd('','Cuidar de fazenda com produção automática.');assert.deepEqual(C.check(s),[]);
 s.simulation.automation.intervalSeconds=0;assert.ok(C.check(s).some(x=>/Automação/.test(x)));
 s.simulation.automation.intervalSeconds=1;s.simulation.automation.clean=true;assert.ok(C.check(s).some(x=>/domínio/.test(x)));
});
