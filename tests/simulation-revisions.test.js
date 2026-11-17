'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../js/parser'),D=require('../js/simulation-design'),R=require('../js/simulation-rules')(),corpus=require('../training/simulation-revisions-ptbr-v9.json');
const value=(o,path)=>path.split('.').reduce((o,k)=>o?.[k],o);
test('GF-TRAIN-09: 72 revisões respeitam números, negações e pedidos recentes',()=>{
 assert.equal(corpus.cases.length,72);assert.equal(new Set(corpus.cases.map(x=>x.gdd+'\n'+x.instruction)).size,72);
 const failures=[];
 for(const row of corpus.cases){
  const s=P.parseGdd(row.gdd,row.instruction),c=s.simulation;
  if(s.genre!=='simulation'||c?.domain!==row.domain){failures.push(row.instruction+': domínio');continue;}
  for(const [key,v] of Object.entries(row.expected))if(value(c,key)!==v)failures.push(row.instruction+': '+key+'='+value(c,key)+' esperado '+v);
  if(row.pending&&!s.implementation.pending.some(x=>x.id===row.pending))failures.push(row.instruction+': faltou '+row.pending);
  if(row.absentPending&&s.implementation.pending.some(x=>x.id===row.absentPending))failures.push(row.instruction+': não removeu '+row.absentPending);
  if(s.designIR.blocked.length)failures.push(row.instruction+': bloqueado');
 }
 assert.deepEqual(failures,[]);
});
test('GF-TRAIN-09: mudar quantidade preserva cuidados, preços, meta, save e visual',()=>{
 const gdd='# Aquário\nCuidar de aquário com 4 tanques. Fome em 20 segundos. Água suja em 30 segundos. Filhote vale 5, jovem vale 15, adulto vale 30. Meta de 200 moedas. Sem salvar. Cartoon, qualidade leve.';
 const a=P.parseGdd(gdd,''),b=P.parseGdd(gdd,'Agora dois tanques, não quero dez tanques.');
 const expected=JSON.parse(JSON.stringify(a.simulation));expected.slots=2;
 assert.deepEqual(b.simulation,expected);assert.deepEqual(b.renderProfile,a.renderProfile);
});
test('GF-TRAIN-09: duração por extenso vira segundos executáveis, sem mudança de regras do motor',()=>{
 const c=P.parseGdd('','Quero cuidar de aquário com dois tanques. Crescer em um minuto. Sem fome.').simulation,s=R.create(c);
 assert.equal(c.slots,2);assert.equal(c.seconds,60);R.act(s,c,0,'start');R.act(s,c,0,'care');
 for(let i=0;i<59;i++)R.tick(s,c,1);assert.equal(R.act(s,c,0,'finish'),false);R.tick(s,c,1);
 assert.equal(R.act(s,c,0,'finish'),true);assert.equal(R.act(s,c,0,'finish'),false);
});
test('GF-TRAIN-09: preço recente vence e saldo/preço continuam viáveis',()=>{
 const c=D.compile('Cuidar de aquário. Peixe custa vinte. Começar com cinco moedas. Filhote vale 100 e filhote vale quatro. Adulto vale quinze.').config;
 assert.equal(c.cost,20);assert.equal(c.startingMoney,20);assert.equal(c.price,21);assert.equal(c.aquariumCare.juvenilePrice,4);
 assert.ok(c.aquariumCare.youngPrice<=c.price);
 assert.equal(D.compile('Cuidar de aquário. Adulto vale vinte e vender por trinta.').config.price,30);
 assert.equal(D.compile('Cuidar de aquário. Vender por trinta e adulto vale vinte.').config.price,20);
 assert.equal(D.compile('Cuidar de aquário. Vender somente adultos e vender filhotes.').config.aquariumCare.sellYoung,true);
 assert.equal(D.compile('Cuidar de aquário. Vender filhotes e vender somente adultos.').config.aquariumCare.sellYoung,false);
});
test('GF-TRAIN-09: remover morte não esconde doenças ainda pedidas',()=>{
 const s=P.parseGdd('# Aquário\nCuidar de aquário com doenças e morte dos peixes.','Sem morte dos peixes.');
 assert.ok(s.implementation.pending.some(x=>x.id==='simulation-health'));
 const q=P.parseGdd('# Aquário\nCuidar de aquário com doenças e morte dos peixes.','Sem morte dos peixes e sem doenças.');
 assert.ok(!q.implementation.pending.some(x=>x.id==='simulation-health'));
});

test('GF-TRAIN-09: palavras longas e dezenas compostas não são lidas pela metade',()=>{
 const c=D.compile('Cuidar de aquário com doze tanques. Peixe custa dezesseis, venda por vinte e cinco. Crescer em trinta e dois segundos.').config;
 assert.equal(c.slots,12);assert.equal(c.cost,16);assert.equal(c.price,25);assert.equal(c.seconds,32);
 const q=D.compile('Cuidar de fazenda. Crescer em vinte e cinco minutos. Meta de noventa e nove moedas.').config;
 assert.equal(q.seconds,300);assert.equal(q.target,99);
});
