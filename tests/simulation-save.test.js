'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Parser=require('../js/parser'),R=require('../js/simulation-rules')();
const corpus=require('../training/simulation-save-ptbr-v7.json');
const cfg=extra=>Parser.parseGdd('','Quero cuidar de aquário. '+(extra||'')).simulation;
function storage(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
test('GF-TRAIN-07: 40 pedidos de save e exclusões respeitam domínio e última ordem',()=>{
 assert.equal(corpus.cases.length,40);assert.equal(new Set(corpus.cases.map(x=>x.instruction)).size,40);
 for(const row of corpus.cases){
  const s=Parser.parseGdd(row.gdd||'',row.instruction);
  assert.equal(s.genre,'simulation',row.instruction);assert.equal(s.simulation.domain,row.domain,row.instruction);
  assert.equal(s.simulation.persistence.enabled,row.enabled,row.instruction);
  assert.ok(!s.implementation.pending.some(x=>x.id==='simulation-save'));
  assert.equal(s.implementation.audit.items.find(x=>x.id==='simulation-save').status,'implementada');
 }
});
for(const domain of ['aquarium','farm','shop'])test('save recupera estado exato sem avançar tempo — '+domain,()=>{
 const c=Parser.parseGdd('',{aquarium:'Cuidar de aquário com água suja em 20 segundos',farm:'Cuidar de fazenda',shop:'Administrar loja'}[domain]).simulation;
 const mem=storage(),save=R.persistence(c,'Meu jogo',mem),s=R.create(c);R.act(s,c,0,'start');R.act(s,c,0,'care');R.tick(s,c,1);
 assert.equal(save.write(s,1),true);const a=save.read();assert.deepEqual(a,{state:s,selected:1});
 a.state.money=0;assert.deepEqual(save.read().state,s,'sem alias mutável');
 assert.deepEqual(R.persistence(c,'Meu jogo',mem).read().state,s);
 assert.equal(R.persistence(c,'Outro jogo',mem).read(),null);
 const modified={...c,slots:c.slots+1};assert.equal(R.persistence(modified,'Meu jogo',mem).read(),null);
});
test('save de colheita e vitória restaura receita sem recompensa repetida',()=>{
 const c=Parser.parseGdd('','Cuidar de fazenda, crescer em 2 segundos, meta de 10 moedas').simulation,s=R.create(c),save=R.persistence(c,'Fazenda',storage());
 R.act(s,c,0,'start');R.act(s,c,0,'care');R.tick(s,c,1);R.tick(s,c,1);R.act(s,c,0,'finish');
 assert.equal(save.write(s,0),true);const loaded=save.read().state;assert.equal(loaded.inventory,1);R.act(loaded,c,0,'sell');
 assert.equal(save.write(loaded,0),true);const victory=save.read().state;assert.equal(victory.complete,true);
 const before=JSON.stringify(victory);assert.equal(R.act(victory,c,0,'sell'),false);assert.equal(JSON.stringify(victory),before);
});
test('save recusa JSON corrompido, versão diferente, valores inválidos e outro contrato',()=>{
 const c=cfg(),s=R.create(c),mem=storage(),save=R.persistence(c,'Seguro',mem);R.act(s,c,0,'start');R.act(s,c,0,'care');R.tick(s,c,1);save.write(s,0);
 const original=mem.getItem(save.key);
 for(const mutate of [d=>d.version=2,d=>d.signature='outro',d=>d.selected=-1,d=>d.state.slots=[],d=>d.state.money=-1,d=>d.state.money=1e9,d=>d.state.earned=10,d=>d.state.slots[0].age=c.seconds+1,d=>d.state.slots[0].satiety=101,d=>d.state.tanks[0].water=-1,d=>d.state.slots[0].cared=false]){
  const d=JSON.parse(original);mutate(d);assert.equal(save.restore(JSON.stringify(d)),null);
 }
 for(const raw of ['{','null','[]','x'.repeat(30001)])assert.equal(save.restore(raw),null);
 mem.setItem(save.key,'{');assert.equal(save.read(),null);
});
test('storage negado ou cheio não derruba jogo nem apaga save anterior',()=>{
 const c=cfg(),s=R.create(c),denied=R.persistence(c,'X',()=>{throw Error('bloqueado');});
 assert.equal(denied.read(),null);assert.equal(denied.write(s,0),false);
 const mem=storage(),save=R.persistence(c,'X',mem);assert.ok(save.write(s,0));const old=mem.getItem(save.key);
 mem.setItem=()=>{throw Error('quota');};R.act(s,c,0,'start');assert.equal(save.write(s,0),false);assert.equal(mem.getItem(save.key),old);
});
test('sem save não acessa storage e configuração legada continua sem persistência',()=>{
 let accesses=0;const c=cfg('Sem salvar');const access=()=>{accesses++;throw Error('Não acessar');};
 const off=R.persistence(c,'X',access);assert.equal(off.read(),null);assert.equal(off.write(R.create(c),0),false);assert.equal(accesses,0);
 delete c.persistence;assert.equal(R.persistence(c,'X',access).enabled,false);assert.equal(accesses,0);
});
