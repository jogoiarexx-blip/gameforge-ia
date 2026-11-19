'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const Parser=require('../js/parser.js'),Generator=require('../js/generator.js'),Caps=require('../js/game-capabilities.js');
const E=require('../js/simulation-events.js')(),R=require('../js/simulation-rules.js')(E),Editor=require('../js/simulation-quest-editor.js');
const corpus=require('../training/simulation-quest-graph-ptbr-v18.json');
const cmd='Quero cuidar de aquário. Quatro missões paralelas com objetivos simultâneos. Missão 1: comprar 1 e alimentar 1. Recompensa de 2 aceleradores. Missão 2: comprar 1 e alimentar 1. Desbloquear após etapas 1. Recompensa de 1 kit. Missão 3: comprar 1 e alimentar 1. Desbloquear após etapas 1. Missão 4: comprar 1 e alimentar 1. Desbloquear após etapas 2 e 3. Crescer em dois segundos. Meta de novecentas moedas.';
const make=()=>Parser.parseGdd('',cmd);
const storage=()=>{const map=new Map();return {map,api:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)}};};
test('GF-TRAIN-18: 30 comandos PT-BR geram grafo válido e recompensas por tipo',()=>{
 assert.equal(corpus.cases.length,30);
 const issues=[];
 for(const {instruction,expected:x} of corpus.cases){
  const spec=Parser.parseGdd('',instruction),c=spec.simulation,story=c?.story;
  if(c?.domain!==x.domain||story?.version!==6||story.missions.length!==x.total||!E.validConfig(story))
   {issues.push(instruction+': versão/contrato');continue;}
  const first=story.missions[0];
  if(first.objectives[0].count!==x.firstCount||JSON.stringify(first.itemReward)!==JSON.stringify(x.firstReward))
   issues.push(instruction+': primeiro objetivo/prêmio '+JSON.stringify(first));
  if(JSON.stringify(story.missions[1].requiresMissions)!==JSON.stringify(x.secondDeps)||
     JSON.stringify(story.missions[2].requiresMissions)!==JSON.stringify(x.thirdDeps)||
     (x.fourthDeps&&JSON.stringify(story.missions[3].requiresMissions)!==JSON.stringify(x.fourthDeps)))
   issues.push(instruction+': pré-requisitos '+JSON.stringify(story.missions.map(m=>m.requiresMissions)));
  if(Caps.check(spec).length)issues.push(instruction+': capacidades '+Caps.check(spec).join(';'));
  if(!spec.implementation.applied.some(x=>x.id==='simulation-quest-graph'))issues.push(instruction+': auditoria');
 }
 assert.deepEqual(issues,[]);
});
test('GF-TRAIN-18: DAG inválido, ciclos e objetos falsificados são rejeitados',()=>{
 const s=make().simulation.story;
 assert.ok(E.validConfig(s));
 const clone=()=>JSON.parse(JSON.stringify(s));
 const future=clone();future.missions[1].requiresMissions=[2];assert.equal(E.validConfig(future),false);
 const self=clone();self.missions[2].requiresMissions=[2];assert.equal(E.validConfig(self),false);
 const duplicate=clone();duplicate.missions[3].requiresMissions=[1,1];assert.equal(E.validConfig(duplicate),false);
 const badPrize=clone();badPrize.missions[0].itemReward.count=15;assert.equal(E.validConfig(badPrize),false);
 const kind=clone();kind.missions[0].itemReward.kind='cash';assert.equal(E.validConfig(kind),false);
 const noop=clone();noop.missions[0].objectives[1].event='start';assert.equal(E.validConfig(noop),false);
 assert.equal(E.validate(E.create(s),s),true);
});
test('GF-TRAIN-18: NPCs desbloqueiam linhas paralelas, cada evento só avança a missão ativa',()=>{
 const c=make().simulation,s=R.create(c),m=c.story;
 assert.deepEqual(m.missions.map(x=>x.requiresMissions),[[],[0],[0],[1,2]]);
 assert.equal(s.story.activeMission,-1);
 assert.equal(E.status(s.story,m).npc,0);
 assert.equal(E.record(s.story,m,'talk',{npc:1}).changed,false,'NPC2 não libera tarefa antes de missão1');
 R.talk(s,c,0);assert.equal(s.story.activeMission,0);
 R.act(s,c,0,'start');R.act(s,c,0,'care');
 assert.equal(s.story.missionDone[0],true);assert.equal(s.story.activeMission,-1);
 assert.equal(s.items.boost,2);assert.deepEqual(s.story.itemsEarned,{kit:0,boost:2});
 assert.ok(E.validate(s.story,m));
 // Começa missão3 e avança apenas ela.
 R.talk(s,c,0);assert.equal(s.story.activeMission,2);
 R.act(s,c,1,'start');assert.deepEqual(s.story.missionProgress[2],[1,0]);
 R.talk(s,c,1);assert.equal(s.story.activeMission,1);
 assert.deepEqual(s.story.missionProgress[1],[0,0],'a ação da missão3 não foi duplicada na missão2');
 // Cuidar da planta/peixe já comprado consome acelerador e avança crescimento.
 const before=s.slots[1].age;
 R.act(s,c,1,'care');assert.equal(s.slots[1].age,before+c.seconds*.5);
 assert.equal(s.items.boost,1);assert.equal(s.itemsUsed.boost,1);
 assert.deepEqual(s.story.missionProgress[1],[0,1]);
 R.act(s,c,2,'start');assert.equal(s.story.missionDone[1],true);
 assert.equal(s.items.kit,1);assert.equal(s.story.rewards,8);
 assert.equal(E.record(s.story,m,'talk',{npc:1}).changed,false,'missão4 bloqueada até finalizar missão3');
 R.talk(s,c,0);assert.equal(s.story.activeMission,2);
 R.act(s,c,2,'care');assert.equal(s.story.missionDone[2],true);
 R.talk(s,c,1);assert.equal(s.story.activeMission,3);
 const beforeCoins=s.money;
 R.act(s,c,3,'start');assert.equal(s.money,beforeCoins,'kit paga uma compra completa');
 assert.equal(s.items.kit,0);assert.equal(s.itemsUsed.kit,1);
 R.act(s,c,3,'care');assert.equal(s.story.completed,true);
 assert.equal(s.story.activeMission,-1);
 assert.equal(s.story.rewards,3+5+7+9);
 assert.equal(s.story.itemsEarned.boost,2);
 assert.ok(E.validate(s.story,m));
 assert.equal(E.record(s.story,m,'care').bonus,0,'prêmios nunca repetidos');
});
test('GF-TRAIN-18: save v6 registra dois itens e recusa adulteração de recompensas e dependências',()=>{
 const spec=make(),c=spec.simulation,{map,api}=storage(),store=R.persistence(c,spec.title,()=>api),s=R.create(c);
 R.talk(s,c,0);R.act(s,c,0,'start');R.act(s,c,0,'care');
 assert.equal(s.items.boost,2);
 assert.equal(store.write(s,0,{x:90,y:489}),true);
 assert.equal(store.read().state.items.boost,2);
 const original=JSON.parse(map.get(store.key));
 const forged=JSON.parse(JSON.stringify(original));forged.state.items.boost=3;
 map.set(store.key,JSON.stringify(forged));assert.equal(store.read(),null,'acelerador extra');
 forged.state.items.boost=2;forged.state.story.missionDone[2]=true;
 map.set(store.key,JSON.stringify(forged));assert.equal(store.read(),null,'missão sem requisito');
 forged.state.story.missionDone[2]=false;forged.state.story.itemsEarned.boost=5;
 map.set(store.key,JSON.stringify(forged));assert.equal(store.read(),null,'bônus forjado');
 map.set(store.key,JSON.stringify(original));assert.deepEqual(store.read().state.story,s.story);
});
test('GF-TRAIN-18: editor gera v6, carrega o projeto e altera o game.js sem recriar arquivos',()=>{
 for(const domain of ['aquarium','farm','shop']){
  const acts=Object.keys(Editor.domains[domain].actions);
  const source={domain,graph:true,missions:Array.from({length:4},(_,i)=>({
   objectives:[{event:acts[0],count:1},{event:acts[1],count:1}],
   kits:i===1?2:0,boosts:i===0?2:0,afterFirst:i===2,stock:0,seconds:0,
   prerequisites:i===0?[]:i===3?[1,2]:[0]
  }))};
  const prompt=Editor.buildPrompt(source);
  const spec=Parser.parseGdd('',prompt),story=spec.simulation.story;
  assert.equal(story.version,6,prompt);
  assert.ok(E.validConfig(story));
  assert.deepEqual(story.missions[3].requiresMissions,[1,2]);
  assert.deepEqual(story.missions[0].itemReward,{kind:'boost',count:2});
  const files=Generator.generate(spec,'GDD original preservado');
  assert.deepEqual(Editor.fromSpec(files).missions[3].prerequisites,[1,2]);
  const draft=Editor.fromSpec(files);draft.missions[3].objectives[0].count=2;
  const edited=Editor.editGenerated(files,draft);
  assert.equal(edited.spec.simulation.story.missions[3].objectives[0].count,2);
  assert.equal(edited.files['style.css'],files['style.css']);
  assert.equal(edited.files['GDD_original.md'],files['GDD_original.md']);
  new vm.Script(edited.files['game.js']);
 }
 const corrupted={...Generator.generate(make(),''),'game.js':'const GAME_SPEC = doSomething();'};
 assert.throws(()=>Editor.fromSpec(corrupted),/motor sem IA/);
});
test('GF-TRAIN-18: migração opt-in v5 preserva save antigo e recusa alteração em missão concluída',()=>{
 const spec=Parser.parseGdd('','Quero cuidar de aquário. Três missões encadeadas com objetivos simultâneos. Missão 1: comprar 1 e alimentar 1. Recompensa de 2 kits. Missão 2: comprar 1 e alimentar 1. Missão 3: comprar 1 e alimentar 1.');
 assert.equal(spec.simulation.story.version,5);
 const files=Generator.generate(spec,'GDD conservado'),{map,api}=storage();
 const prior=R.persistence(spec.simulation,spec.title,()=>api),s=R.create(spec.simulation);
 R.talk(s,spec.simulation,0);R.act(s,spec.simulation,0,'start');R.act(s,spec.simulation,0,'care');
 assert.equal(s.story.missionIndex,1);
 assert.equal(prior.write(s,0,{x:90,y:489}),true);
 const change=Editor.fromSpec(files);
 change.missions[2].objectives[0].count=3;
 const result=Editor.editGenerated(files,change,{migrateSave:true});
 assert.equal(result.spec.simulation.saveMigration.version,1);
 const next=R.persistence(result.spec.simulation,spec.title,()=>api),migrated=next.read();
 assert.equal(migrated?.migrated,true);
 assert.equal(migrated.state.story.missionIndex,1);assert.equal(migrated.state.kits,2);
 assert.equal(next.read().migrated,undefined,'segunda leitura usa novo registro');
 assert.ok(map.has(prior.key),'save original não apagado');
 const unsafe=Editor.fromSpec(files);unsafe.missions[0].objectives[0].count=2;
 const changed=Editor.editGenerated(files,unsafe,{migrateSave:true}),blocked=R.persistence(changed.spec.simulation,spec.title,()=>api);
 assert.equal(blocked.read(),null,'mudar missão já concluída bloqueia migração');
 assert.equal(map.has(prior.key),true);
 const nested=Editor.fromSpec(result.files);
 assert.throws(()=>Editor.editGenerated(result.files,nested,{migrateSave:true}),/uma edição por vez/);
});
test('GF-TRAIN-18: migração v6 mantém estado das missões iniciadas e reinicializa apenas futuras',()=>{
 const spec=make(),files=Generator.generate(spec,''),{api}=storage();
 const old=R.persistence(spec.simulation,spec.title,()=>api),s=R.create(spec.simulation);
 R.talk(s,spec.simulation,0);R.act(s,spec.simulation,0,'start');R.act(s,spec.simulation,0,'care');
 R.talk(s,spec.simulation,0);R.act(s,spec.simulation,1,'start');
 assert.equal(s.story.missionProgress[2][0],1);
 assert.ok(old.write(s,0,{x:90,y:489}));
 const settings=Editor.fromSpec(files);settings.missions[3].objectives[0].count=2;
 settings.missions[3].boosts=2;
 const edited=Editor.editGenerated(files,settings,{migrateSave:true});
 const next=R.persistence(edited.spec.simulation,spec.title,()=>api),result=next.read();
 assert.equal(result?.migrated,true);
 assert.equal(result.state.story.missionProgress[2][0],1);
 assert.equal(result.state.story.missionProgress[3][0],0);
 assert.equal(result.state.items.boost,2);
 const changed=Editor.fromSpec(files);changed.missions[2].objectives[0].count=5;
 const denied=Editor.editGenerated(files,changed,{migrateSave:true});
 assert.equal(R.persistence(denied.spec.simulation,spec.title,()=>api).read(),null);
});
