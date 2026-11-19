'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Design=require('../js/simulation-design'),R=require('../js/simulation-rules')(),Parser=require('../js/parser');
const Generator=require('../js/generator');
for(const domain of ['farm','aquarium','shop'])test('simulação: ciclo econômico real, pausável pelo chamador, sem duplicar venda — '+domain,()=>{
 const c=Design.compile({farm:'Quero cuidar da fazenda e plantar',aquarium:'Quero cuidar de peixes no aquário',shop:'Quero administrar uma loja'}[domain]).config;
 assert.equal(c.domain,domain);
 const s=R.create(c),initial=s.money;
 assert.equal(R.act(s,c,-1,'start'),false);
 assert.equal(R.act(s,c,0,'finish'),false);
 assert.equal(R.act(s,c,0,'start'),true);
 assert.equal(R.act(s,c,0,'start'),false);
 assert.equal(s.money,initial-c.cost);
 R.tick(s,c,1);assert.equal(s.slots[0].age,0,'sem cuidado não produz');
 assert.equal(R.act(s,c,0,'care'),true);
 assert.equal(R.act(s,c,0,'care'),false);
 assert.equal(R.act(s,c,0,'finish'),false,'não vende antes de crescer');
 for(let i=0;i<c.seconds;i++)R.tick(s,c,1);
 assert.equal(R.act(s,c,0,'finish'),true);
 assert.equal(R.act(s,c,0,'finish'),false,'uma unidade só rende uma vez');
 if(domain==='farm'){
  assert.equal(s.inventory,1);assert.equal(s.earned,0);
  assert.equal(R.act(s,c,0,'sell'),true);assert.equal(R.act(s,c,0,'sell'),false);
 }
 assert.equal(s.money,initial-c.cost+c.price);assert.equal(s.sales,1);
 c.target=c.price*2;
 R.act(s,c,1,'start');R.act(s,c,1,'care');
 for(let i=0;i<c.seconds;i++)R.tick(s,c,1);
 R.act(s,c,1,'finish');if(domain==='farm')R.act(s,c,1,'sell');
 assert.equal(s.complete,true);assert.equal(R.act(s,c,2,'start'),false);
});
test('simulação: quantidades, preços, limites e última ordem prevalecem',()=>{
 const s=Parser.parseGdd('# Minha fazenda\nPlantar e colher, começar com 50 moedas.','Quero cuidar da fazenda com 6 canteiros, começar com 90 moedas, meta de 200 moedas, crescer em 7 segundos, semente custa 4, venda por 18.');
 assert.equal(s.genre,'simulation');
 for(const [k,v] of Object.entries({slots:6,startingMoney:90,target:200,seconds:7,cost:4,price:18}))assert.equal(s.simulation[k],v,k);
 assert.equal(s.implementation.audit.items.find(x=>x.id==='simulation-cycle').status,'implementada');
 const bounded=Design.compile('Administrar fazenda com 999 canteiros crescer em 0 segundos, venda por 0');
 assert.equal(bounded.config.slots,12);assert.equal(bounded.config.seconds,2);assert.ok(bounded.warnings.length);
});
test('simulação: dinheiro insuficiente, tempo inválido e venda sem estoque preservam estado',()=>{
 const c=Design.compile('Cuidar de fazenda').config,s=R.create(c);s.money=0;
 const before=JSON.stringify(s);
 assert.equal(R.act(s,c,0,'start'),false);assert.equal(R.act(s,c,0,'sell'),false);
 for(const dt of [NaN,Infinity,-5,0])R.tick(s,c,dt);
 assert.equal(JSON.stringify(s),before);
});
test('simulação: exporta regras offline, registra recursos não prontos e não inventa campanha',()=>{
 const s=Parser.parseGdd('','Quero cuidar de aquário com reprodução e personagem andando, 5 fases.');
 assert.equal(s.stages.length,1);
 for(const id of ['simulation-breeding','simulation-campaign'])assert.ok(s.implementation.pending.some(x=>x.id===id),id);
 assert.ok(s.implementation.audit.items.some(x=>x.id==='simulation-walk'&&x.status==='implementada'));
 const files=Generator.generate(s,'');
 assert.match(files['game.js'],/GameForgeSimulationRules/);
 assert.match(files['RELATORIO_GERACAO.md'],/Ciclo econômico/);
 new (require('node:vm').Script)(files['game.js']);
});
