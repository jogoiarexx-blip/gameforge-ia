'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const Parser=require('../js/parser.js'),Generator=require('../js/generator.js');
const E=require('../js/simulation-events.js')(),R=require('../js/simulation-rules.js')(E);
const Caps=require('../js/game-capabilities.js');
const corpus=require('../training/simulation-story-ptbr-v13.json');
test('GF-TRAIN-13: 30 pedidos reais de missão e diálogo PT-BR são compilados sem inventar ações',()=>{
 assert.equal(corpus.cases.length,30);
 const failures=[];
 for(const row of corpus.cases){
  const s=Parser.parseGdd('',row.instruction),e=row.expected,c=s.simulation?.story;
  if(s.genre!==e.genre||s.simulation?.domain!==e.domain)failures.push(row.instruction+': domínio incorreto');
  if(!!c?.enabled!==e.enabled)failures.push(row.instruction+': enabled='+!!c?.enabled);
  if(e.enabled){
   if(s.simulation.exploration?.mode!=='free'||!s.simulation.exploration?.guide)failures.push(row.instruction+': sem NPC na sala livre');
   if(!E.validConfig(c))failures.push(row.instruction+': contrato inválido');
   if(c.mission.steps.at(-1).event!==e.event||c.mission.steps.at(-1).count!==e.count)
    failures.push(row.instruction+': evento '+JSON.stringify(c.mission.steps));
   if(c.mission.reward!==e.reward)failures.push(row.instruction+': recompensa');
   if(!s.implementation.audit.items.some(x=>x.id==='simulation-story'&&x.status==='implementada'))
    failures.push(row.instruction+': capacidade não confirmada');
  }
 }
 assert.deepEqual(failures,[]);
});
test('GF-TRAIN-13: missões só avançam com eventos válidos em ordem e recompensam uma vez',()=>{
 const c=Parser.parseGdd('','Quero cuidar de aquário. Missão: vender dois peixes. Dois tanques, crescer em dois segundos, meta de dez moedas.').simulation;
 const s=R.create(c);
 assert.equal(s.story.step,0);assert.equal(s.story.completed,false);
 assert.equal(R.act(s,c,0,'start'),true);assert.equal(R.act(s,c,0,'care'),true);
 R.tick(s,c,1);R.tick(s,c,1);
 assert.equal(R.act(s,c,0,'finish'),true);
 assert.equal(s.story.step,0,'venda anterior ao diálogo não conta');
 assert.equal(s.complete,false,'vitória deve aguardar a missão');
 const first=R.talk(s,c);assert.match(first,/Cuidador/);
 assert.equal(s.story.step,1);
 assert.equal(R.talk(s,c).includes('Cuidador'),true);
 assert.equal(s.story.step,1,'falar novamente não conta como venda');
 assert.equal(R.act(s,c,0,'start'),true);assert.equal(R.act(s,c,0,'care'),true);
 R.tick(s,c,1);R.tick(s,c,1);
 assert.equal(R.act(s,c,0,'finish'),true);
 assert.equal(s.story.count,1);assert.equal(s.complete,false);
 assert.equal(R.act(s,c,1,'start'),true);assert.equal(R.act(s,c,1,'care'),true);
 R.tick(s,c,1);R.tick(s,c,1);
 const before=s.money;
 assert.equal(R.act(s,c,1,'finish'),true);
 assert.equal(s.story.completed,true);assert.equal(s.story.rewards,5);
 assert.equal(s.money,before+c.price+5);
 assert.equal(s.complete,true);
 const final=JSON.stringify(s);
 assert.equal(R.act(s,c,1,'finish'),false);assert.equal(R.talk(s,c),null);
 assert.equal(JSON.stringify(s),final,'recompensa e venda sem duplicação');
});
test('GF-TRAIN-13: diálogos simples são opcionais e não bloqueiam a economia',()=>{
 const c=Parser.parseGdd('','Quero administrar uma loja com diálogo com npc, crescer em dois segundos e meta de dez moedas.').simulation;
 assert.equal(c.story.requiredForVictory,false);assert.equal(c.story.mission.reward,0);
 const s=R.create(c);
 assert.equal(R.act(s,c,0,'start'),true);assert.equal(R.act(s,c,0,'care'),true);
 R.tick(s,c,1);R.tick(s,c,1);
 assert.equal(R.act(s,c,0,'finish'),true);
 assert.equal(s.complete,true,'um diálogo facultativo não bloqueia a vitória');
 assert.equal(s.story.rewards,0);
});
test('GF-TRAIN-13: progressão, conversa e bônus persistem sem execução de JSON não confiável',()=>{
 const c=Parser.parseGdd('','Quero cuidar de aquário. Missão: comprar dois peixes. Dois tanques, meta de dez moedas.').simulation;
 const store=new Map(),adapter={getItem:key=>store.get(key)||null,setItem:(key,v)=>store.set(key,v)};
 const save=R.persistence(c,'aventura',()=>adapter),s=R.create(c);
 const pos={x:91,y:487};
 assert.equal(save.write(s,0,pos),true);
 assert.equal(R.talk(s,c)!==null,true);assert.equal(R.act(s,c,0,'start'),true);
 assert.equal(s.story.count,1);
 assert.equal(save.write(s,0,pos),true);
 let restored=save.read();
 assert.equal(restored.state.story.step,1);assert.equal(restored.state.story.count,1);
 assert.deepEqual(restored.position,pos);
 const copied=restored.state,bonusBefore=copied.money;
 assert.equal(R.act(copied,c,1,'start'),true);
 assert.equal(copied.story.completed,true);
 assert.equal(copied.story.rewards,5);
 assert.equal(copied.money,bonusBefore-c.cost+5);
 assert.equal(save.write(copied,1,pos),true);
 restored=save.read();
 assert.equal(restored.state.story.completed,true);
 const obj=JSON.parse(store.get(save.key));obj.state.story.rewards=999;
 store.set(save.key,JSON.stringify(obj));assert.equal(save.read(),null,'recompensa adulterada rejeitada');
 obj.state.story.rewards=5;obj.state.story.count=2;
 store.set(save.key,JSON.stringify(obj));assert.equal(save.read(),null,'contagem inválida rejeitada');
});
test('GF-TRAIN-13: contratos invalidam execução arbitrária, alterações sem guia e missões de outros motores',()=>{
 const base=Parser.parseGdd('','Cuidar de aquário com missão: vender dois peixes.');
 assert.deepEqual(Caps.check(base),[]);
 const dangerous=JSON.parse(JSON.stringify(base));
 dangerous.simulation.story.mission.steps[1].event='eval';
 assert.ok(Caps.check(dangerous).some(x=>/Missão/.test(x)));
 const off=JSON.parse(JSON.stringify(base));off.simulation.exploration.guide=false;
 assert.ok(Caps.check(off).some(x=>/Missão/.test(x)));
 assert.equal(Caps.capability('simulation-story',{genre:'fps',dimension:'3d'}).allowed,false);
 const custom=E.record(E.create(base.simulation.story),base.simulation.story,'execute');
 assert.equal(custom.changed,false);
});
test('GF-TRAIN-13: ZIP contém a máquina de estados local; jogos antigos não carregam módulo extra',()=>{
 const spec=Parser.parseGdd('','Quero cuidar de aquário, andar livremente. Missão: vender um peixe.');
 const files=Generator.generate(spec,'');
 assert.match(files['game.js'],/const GameForgeSimulationEvents = /);
 assert.match(files['game.js'],/function gameForgeSimulationEventsFactory/);
 assert.match(files['game.js'],/const GameForgeSimulationRules = /);
 new vm.Script(files['game.js']);
 const old=Generator.generate(Parser.parseGdd('','Quero cuidar de aquário.'),'');
 assert.doesNotMatch(old['game.js'],/const GameForgeSimulationEvents = /);
 new vm.Script(old['game.js']);
});
