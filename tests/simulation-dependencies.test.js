'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const Parser=require('../js/parser.js');
const Generator=require('../js/generator.js');
const Caps=require('../js/game-capabilities.js');
const E=require('../js/simulation-events.js')();
const R=require('../js/simulation-rules.js')(E);
const Editor=require('../js/simulation-quest-editor.js');
const corpus=require('../training/simulation-dependencies-ptbr-v17.json');
const base='Quero cuidar de aquário. Três missões encadeadas com objetivos simultâneos. Missão 1: comprar 2 e alimentar 1. Objetivo 2 depois do objetivo 1. Recompensa de 2 kits. Missão 2: comprar 1 e alimentar 1. Recompensa de 1 kit. Missão 3: comprar 1 e alimentar 1.';
test('GF-TRAIN-17: 30 instruções reais compilam e mantêm versões anteriores',()=>{
 assert.equal(corpus.cases.length,30);
 const failures=[];
 for(const {instruction,expected:x} of corpus.cases){
  const spec=Parser.parseGdd('',instruction),c=spec.simulation,story=c?.story;
  if(c?.domain!==x.domain||story?.version!==x.version)failures.push(instruction+' versão '+story?.version+' esperada '+x.version);
  if(x.version>=4){
   if(story.missions.length!==x.total||!E.validConfig(story))failures.push(instruction+' contrato');
   const m=story.missions[0],after=!!m.objectives[1]?.requiresFirst;
   if(after!==x.firstAfter||((m.itemReward||0)!==x.firstKits))failures.push(instruction+' relação/recompensa '+after+'/'+m.itemReward);
   const stock=m.requires.find(r=>r.kind==='stock')?.min||0,time=m.requires.find(r=>r.kind==='time')?.seconds||0;
   if(stock!==x.firstStock||time!==x.firstTime)failures.push(instruction+' estoque/tempo '+stock+'/'+time);
   if(Caps.check(spec).length)failures.push(instruction+' capacidades '+Caps.check(spec).join('; '));
  }
 }
 assert.deepEqual(failures,[]);
});
test('GF-TRAIN-17: objetivo dependente bloqueado até primeiro terminar; recompensa de kits só uma vez',()=>{
 const c=Parser.parseGdd('',base).simulation,s=R.create(c);
 assert.equal(c.story.version,5);
 assert.deepEqual(c.story.missions[0].objectives,[{event:'start',count:2,requiresFirst:false},{event:'care',count:1,requiresFirst:true}]);
 assert.equal(E.validConfig(c.story),true);
 R.act(s,c,0,'start');assert.deepEqual(s.story.progress,[0,0]);
 R.talk(s,c,0);
 R.act(s,c,1,'start');assert.deepEqual(s.story.progress,[1,0]);
 R.act(s,c,1,'care');assert.deepEqual(s.story.progress,[1,0],'o cuidado é ação real, mas objetivo ainda bloqueado');
 assert.equal(E.status(s.story,c.story).objectives[1].locked,true);
 R.act(s,c,2,'start');assert.deepEqual(s.story.progress,[2,0]);
 assert.equal(E.status(s.story,c.story).objectives[1].locked,false);
 R.act(s,c,2,'care');assert.equal(s.story.missionIndex,1);
 assert.equal(s.story.rewards,3);assert.equal(s.story.itemsEarned,2);
 assert.equal(s.kits,2);assert.equal(s.kitsUsed,0);
 assert.ok(E.validate(s.story,c.story));
 const coins=s.money;
 R.act(s,c,3,'start');assert.equal(s.money,coins,'kit cobre o custo inteiro da compra');
 assert.equal(s.kits,1);assert.equal(s.kitsUsed,1);
 assert.equal(s.story.missionIndex,1,'não progride missão sem diálogo com o segundo NPC');
 R.talk(s,c,0);assert.equal(s.story.started,false);
 R.talk(s,c,1);R.act(s,c,3,'care');
 assert.deepEqual(s.story.progress,[0,1]);
 // Objetivo start requer slot vazio e consegue utilizar kit.
 R.tick(s,c,1);R.tick(s,c,1);
 R.act(s,c,1,'finish');const prior=s.money;
 R.act(s,c,1,'start');
 assert.equal(s.money,prior);assert.equal(s.story.missionIndex,2);
 assert.equal(s.kits,1,'recompensa da segunda missão devolve um kit');
 assert.equal(s.kitsUsed,2);assert.equal(s.story.itemsEarned,3);
 assert.equal(s.story.rewards,8);
 assert.equal(E.validate(s.story,c.story),true);
});
test('GF-TRAIN-17: kit pago não permite duplicar prêmio ou adulterar save',()=>{
 const c=Parser.parseGdd('',base).simulation;
 const store=new Map(),storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 const p=R.persistence(c,'Kits e bloqueios',()=>storage),s=R.create(c),position={x:90,y:489};
 R.talk(s,c,0);R.act(s,c,0,'start');R.act(s,c,1,'start');R.act(s,c,0,'care');
 assert.equal(s.kits,2);assert.equal(p.write(s,0,position),true);
 assert.equal(p.read().state.story.itemsEarned,2);
 const raw=JSON.parse(store.get(p.key));
 raw.state.kits=3;store.set(p.key,JSON.stringify(raw));assert.equal(p.read(),null,'kit falso');
 raw.state.kits=2;raw.state.story.itemsEarned=3;store.set(p.key,JSON.stringify(raw));assert.equal(p.read(),null,'recompensa falsa');
 raw.state.story.itemsEarned=2;raw.state.story.progress=[1,0];
 store.set(p.key,JSON.stringify(raw));assert.equal(p.read(),null,'estado de missão forjado');
 raw.state.story.progress=[];raw.state.story.missionIndex=3;
 store.set(p.key,JSON.stringify(raw));assert.equal(p.read(),null,'conclusão forjada');
});
test('GF-TRAIN-17: editor de missões traduz kits e dependências para versão 5 sem código',()=>{
 for(const domain of ['aquarium','farm','shop']){
  const ids=Object.keys(Editor.domains[domain].actions);
  const input={domain,missions:Array.from({length:3},(_,i)=>({
   objectives:[{event:ids[0],count:i+1},{event:ids[1],count:1}],
   stock:0,seconds:0,afterFirst:i===0,kits:i===0?2:0
  }))};
  const text=Editor.buildPrompt(input);
  assert.match(text,/Objetivo 2 depois do objetivo 1/);
  assert.match(text,/Recompensa de 2 kits/);
  const spec=Parser.parseGdd('',text);
  assert.equal(spec.simulation.story.version,5);
  assert.deepEqual(spec.simulation.story.missions[0].objectives.map(o=>o.requiresFirst),[false,true]);
  assert.equal(spec.simulation.story.missions[0].itemReward,2);
  assert.equal(E.validConfig(spec.simulation.story),true);
 }
 const data={domain:'aquarium',missions:Array.from({length:3},()=>({
  objectives:[{event:'start',count:1},{event:'care',count:1}],afterFirst:true,kits:0,stock:0,seconds:0}))};
 data.missions[0].kits=4;assert.throws(()=>Editor.buildPrompt(data),/fora do limite/);
 data.missions[0].kits=2;data.missions[0].afterFirst='true';
 assert.equal(Editor.normalize(data).missions[0].afterFirst,false,'strings não são consideradas true');
});
test('GF-TRAIN-17: editar missão no game.js existente preserva o resto do projeto e gera código válido',()=>{
 const spec=Parser.parseGdd('',base),files=Generator.generate(spec,'# História original do jogador');
 const previous=Editor.fromSpec(files);
 assert.equal(previous.missions[0].afterFirst,true);assert.equal(previous.missions[0].kits,2);
 previous.missions[0].objectives[0].count=3;
 previous.missions[0].kits=1;
 previous.missions[1].afterFirst=true;
 previous.missions[2].seconds=4;
 const patched=Editor.editGenerated(files,previous);
 assert.equal(files['game.js']!==patched.files['game.js'],true);
 assert.equal(patched.files['index.html'],files['index.html']);
 assert.equal(patched.files['GDD_original.md'],files['GDD_original.md']);
 assert.equal(patched.files['style.css'],files['style.css']);
 assert.deepEqual(Object.keys(patched.files).sort(),Object.keys(files).sort());
 assert.equal(Editor.fromSpec(patched.files).missions[0].objectives[0].count,3);
 assert.equal(Editor.fromSpec(patched.files).missions[0].kits,1);
 assert.equal(Editor.fromSpec(patched.files).missions[1].afterFirst,true);
 assert.equal(Editor.fromSpec(patched.files).missions[2].seconds,4);
 assert.equal(E.validConfig(patched.spec.simulation.story),true);
 new vm.Script(patched.files['game.js']);
 const source=files['game.js'],modified=patched.files['game.js'];
 assert.equal(source.slice(source.indexOf('const gameForgeRenderCacheFactory')),modified.slice(modified.indexOf('const gameForgeRenderCacheFactory')),'motor preservado byte a byte');
 assert.equal(Editor.extractGenerated(files).spec.simulation.story.missions[0].objectives[0].count,2,'arquivo de entrada não mutado');
 const a=R.persistence(spec.simulation,spec.title,null),b=R.persistence(patched.spec.simulation,patched.spec.title,null);
 assert.notEqual(a.key,b.key,'nova configuração invalida save anterior deliberadamente');
});
test('GF-TRAIN-17: editor rejeita mudança de motor v4 para v5, alterações não canônicas e domínio trocado',()=>{
 const v4=Generator.generate(Parser.parseGdd('','Quero cuidar de aquário. Três missões encadeadas com objetivos simultâneos.'),'');
 const plain=Editor.fromSpec(v4);
 assert.equal(Editor.editGenerated(v4,plain).spec.simulation.story.version,4,'edição v4 comum é permitida');
 plain.missions[0].kits=1;
 assert.throws(()=>Editor.editGenerated(v4,plain),/motor já exportado v4/);
 const v5=Generator.generate(Parser.parseGdd('',base),'');
 const wrong=Editor.fromSpec(v5);wrong.domain='shop';
 assert.throws(()=>Editor.editGenerated(v5,wrong),/trocar o tipo/);
 const polluted={...v5,'game.js':v5['game.js'].replace('const GAME_SPEC = ','const GAME_SPEC = (')};
 assert.throws(()=>Editor.extractGenerated(polluted),/GAME_SPEC/);
 const stock=Editor.fromSpec(v5);stock.missions[0].stock=12;
 assert.throws(()=>Editor.editGenerated(v5,stock),/maior que a quantidade de espaços/);
});
