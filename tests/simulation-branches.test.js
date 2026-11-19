'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const Parser=require('../js/parser.js'),Generator=require('../js/generator.js'),Caps=require('../js/game-capabilities.js');
const E=require('../js/simulation-events.js')(),R=require('../js/simulation-rules.js')(E),F=require('../js/exploration-2d.js')();
const corpus=require('../training/branches-patrol-ptbr-v14.json');
test('GF-TRAIN-14: 30 textos PT-BR de escolhas, contagens e patrulhas respeitam a intenção',()=>{
 assert.equal(corpus.cases.length,30);
 const problems=[];
 for(const row of corpus.cases){
  const spec=Parser.parseGdd('',row.instruction),c=spec.simulation,e=row.expected;
  if(spec.genre!=='simulation'||c?.domain!==e.domain)problems.push(row.instruction+': domínio');
  const branch=c?.story?.version===2;
  const patrol=c?.exploration?.patrol?.enabled===true;
  if(branch!==e.branch)problems.push(row.instruction+': ramificação '+branch+' esperado '+e.branch);
  if(patrol!==e.patrol)problems.push(row.instruction+': patrulha '+patrol+' esperado '+e.patrol);
  if(branch){
   const [a,b]=c.story.mission.branches;
   if(!E.validConfig(c.story)||a.event!==e.eventA||b.event!==e.eventB||
    a.count!==e.countA||b.count!==e.countB)
    problems.push(row.instruction+': condições '+JSON.stringify(c.story.mission.branches));
   if(!spec.implementation.audit.items.some(x=>x.id==='simulation-branches'&&x.status==='implementada'))
    problems.push(row.instruction+': capacidade de escolha');
  }
  if(patrol){
   if(!spec.implementation.audit.items.some(x=>x.id==='simulation-patrol'&&x.status==='implementada'))
    problems.push(row.instruction+': capacidade de patrulha');
   if(c.exploration?.mode!=='free'||c.exploration?.guide!==true)problems.push(row.instruction+': sem guia livre');
  }
  if(Caps.check(spec).length)problems.push(row.instruction+': '+Caps.check(spec).join(', '));
 }
 assert.deepEqual(problems,[]);
});
test('GF-TRAIN-14: v2 permite escolher uma tarefa após conversar, conta apenas ações aceitas',()=>{
 const c=Parser.parseGdd('','Cuidar de aquário. Missão: escolher entre alimentar dois peixes ou vender tres peixes.').simulation;
 assert.equal(c.story.version,2);assert.equal(c.story.mission.branches[0].count,2);assert.equal(c.story.mission.branches[1].count,3);
 const s=R.create(c);
 assert.equal(R.choose(s,c,0),false,'antes de conversar');
 assert.equal(E.options(s.story,c.story).length,0);
 assert.equal(R.act(s,c,0,'start'),true);
 assert.equal(R.act(s,c,0,'care'),true);
 assert.equal(s.story.step,0,'ação antes do NPC não progride');
 assert.match(R.talk(s,c),/Cuidador/);
 assert.equal(s.story.step,1);
 assert.equal(E.status(s.story,c.story).event,'choice');
 assert.equal(E.options(s.story,c.story).length,2);
 assert.equal(R.choose(s,c,0),true);
 assert.equal(R.choose(s,c,1),false,'escolha única');
 assert.equal(s.story.choice,'a');
 assert.equal(s.story.count,0);
 assert.equal(R.act(s,c,1,'start'),true);
 assert.equal(s.story.count,0,'iniciar não equivale alimentar');
 assert.equal(R.act(s,c,1,'care'),true);
 assert.equal(s.story.count,1);
 assert.equal(R.act(s,c,1,'care'),false,'ação repetida inválida não conta');
 assert.equal(s.story.count,1);
 assert.equal(R.act(s,c,2,'start'),true);
 assert.equal(R.act(s,c,2,'care'),true);
 assert.equal(s.story.completed,true);
 assert.equal(s.story.rewards,5);
 assert.equal(s.money,c.startingMoney-c.cost*3+5);
 assert.equal(R.choose(s,c,1),false);
 assert.equal(R.talk(s,c).includes('Cuidador'),true);
 assert.equal(s.story.rewards,5,'sem recompensa extra');
});
test('GF-TRAIN-14: segundo caminho paga 8 moedas e exige venda real',()=>{
 const c=Parser.parseGdd('','Cuidar de aquário. Missão: escolher entre alimentar ou vender. Crescer em dois segundos, meta de dez moedas.').simulation;
 const s=R.create(c);
 R.talk(s,c);assert.equal(R.choose(s,c,1),true);
 assert.equal(s.story.choice,'b');
 R.act(s,c,0,'start');R.act(s,c,0,'care');
 R.tick(s,c,1);R.tick(s,c,1);
 const prev=s.money;
 assert.equal(R.act(s,c,0,'finish'),true);
 assert.equal(s.money,prev+c.price+8);
 assert.equal(s.story.rewards,8);
 assert.equal(s.story.completed,true);
 assert.equal(s.complete,true);
 const snapshot=JSON.stringify(s);assert.equal(R.act(s,c,0,'finish'),false);assert.equal(JSON.stringify(s),snapshot);
});
test('GF-TRAIN-14: v1 de GF-TRAIN-13 continua idêntico sem escolha',()=>{
 const c=Parser.parseGdd('','Cuidar de aquário. Missão: vender um peixe.').simulation;
 assert.equal(c.story.version,1);
 const s=R.create(c);
 assert.deepEqual(s.story,{step:0,count:0,completed:false,rewards:0,talks:0});
 assert.deepEqual(E.options(s.story,c.story),[]);
 assert.equal(R.choose(s,c,0),false);
 assert.equal(R.talk(s,c).includes('Cuidador'),true);
 assert.equal(s.story.step,1);
});
test('GF-TRAIN-14: NPC segue patrulha delimitada e não atravessa obstáculos',()=>{
 const c=Parser.parseGdd('','Cuidar de aquário. NPC patrulhando.').simulation;
 const scene=F.layout(c.slots,c.domain,c.exploration.guide),config=c.exploration.patrol;
 assert.equal(scene.guide.x,860);assert.equal(config.left,810);assert.equal(config.right,885);
 let reversals=0,previous=scene.guide.x,dir=-1;
 for(let i=0;i<450;i++){
  assert.equal(F.patrolGuide(scene,.1,config),true);
  assert.ok(scene.guide.x>=config.left&&scene.guide.x<=config.right);
  assert.ok(Math.abs(scene.guide.x-previous)<=config.speed*.1+1e-6);
  if(scene.guide.dir!==dir)reversals++;
  previous=scene.guide.x;dir=scene.guide.dir;
 }
 assert.ok(reversals>=2);
 const old=scene.guide.x;assert.equal(F.patrolGuide(scene,0,config),false);assert.equal(scene.guide.x,old);
 assert.equal(F.walkable(scene,scene.guide.x,scene.guide.y),false,'NPC é sólido');
});
test('GF-TRAIN-14: save restaura ramo, contagem, posição e patrulha e recusa adulteração',()=>{
 const c=Parser.parseGdd('','Cuidar de aquário. Missão: escolher entre alimentar dois peixes ou vender um peixe. NPC patrulhando.').simulation;
 const store=new Map(),memory={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 const save=R.persistence(c,'Ramos',()=>memory),s=R.create(c);
 R.talk(s,c);R.choose(s,c,0);
 R.act(s,c,0,'start');R.act(s,c,0,'care');
 assert.equal(s.story.count,1);
 const pos={x:91,y:489,guideX:852,guideDir:-1};
 assert.equal(save.write(s,0,pos),true);
 const restored=save.read();
 assert.deepEqual(restored.position,pos);
 assert.equal(restored.state.story.choice,'a');
 assert.equal(restored.state.story.count,1);
 const raw=JSON.parse(store.get(save.key));raw.state.story.rewards=50;
 store.set(save.key,JSON.stringify(raw));assert.equal(save.read(),null);
 raw.state.story.rewards=0;raw.state.story.choice='c';
 store.set(save.key,JSON.stringify(raw));assert.equal(save.read(),null);
 raw.state.story.choice='a';raw.position.guideX=777;
 store.set(save.key,JSON.stringify(raw));assert.equal(save.read(),null);
 raw.position.guideX=852;raw.position.guideDir=0;
 store.set(save.key,JSON.stringify(raw));assert.equal(save.read(),null);
});
test('GF-TRAIN-14: capacidades rejeitam patrulha fora dos limites e ramo não autorizado',()=>{
 const spec=Parser.parseGdd('','Cuidar de aquário. Missão com escolhas de diálogo. NPC patrulhando.');
 assert.deepEqual(Caps.check(spec),[]);
 const invalid=JSON.parse(JSON.stringify(spec));invalid.simulation.exploration.patrol.right=9999;
 assert.ok(Caps.check(invalid).some(x=>/Patrulha/.test(x)));
 const wrong=JSON.parse(JSON.stringify(spec));wrong.simulation.story.mission.branches[0].event='eval';
 assert.ok(Caps.check(wrong).some(x=>/Missão/.test(x)));
 assert.equal(Caps.capability('simulation-branches',{genre:'rpg',dimension:'3d'}).allowed,false);
});
test('GF-TRAIN-14: exporta controles, missões e patrulha sem carregar CDN',()=>{
 const spec=Parser.parseGdd('','Cuidar de aquário. Missão: escolher entre alimentar ou vender. NPC patrulhando.');
 const files=Generator.generate(spec,'');
 assert.match(files['game.js'],/function gameForgeSimulationEventsFactory/);
 assert.match(files['game.js'],/function patrolGuide/);
 assert.match(files['game.js'],/simulation-choice-/);
 assert.match(files['game.js'],/const GameForgeSimulationEvents/);
 new vm.Script(files['game.js']);
 assert.doesNotMatch(files['index.html'],/<script[^>]+src=["']https?:/i);
 const plain=Generator.generate(Parser.parseGdd('','Cuidar de aquário.'),'');
 assert.doesNotMatch(plain['game.js'],/const GameForgeSimulationEvents/);
});
