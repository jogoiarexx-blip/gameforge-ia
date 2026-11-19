'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const Parser=require('../js/parser.js'),Generator=require('../js/generator.js');
const Caps=require('../js/game-capabilities.js'),F=require('../js/exploration-2d.js')();
const E=require('../js/simulation-events.js')(),R=require('../js/simulation-rules.js')(E);
const corpus=require('../training/simulation-chains-ptbr-v15.json');
test('GF-TRAIN-15: 30 instruções PT-BR de missões, tempo, inventário e legados',()=>{
 assert.equal(corpus.cases.length,30);
 const failures=[];
 for(const {instruction,expected:e} of corpus.cases){
  const spec=Parser.parseGdd('',instruction),c=spec.simulation,story=c?.story;
  if(spec.genre!=='simulation'||c?.domain!==e.domain)failures.push(instruction+' domínio');
  if((story?.version??null)!==e.version)failures.push(instruction+' versão '+story?.version+' esperada '+e.version);
  if(e.version===3){
   if(c.exploration?.mode!=='free'||c.exploration.guide!==true)failures.push(instruction+' sala livre');
   if(!E.validConfig(story))failures.push(instruction+' contrato');
   const [a,b]=story.missions;
   if(a.event!==e.first||a.count!==e.firstCount||b.event!==e.second||b.count!==e.secondCount)
    failures.push(instruction+' etapas '+JSON.stringify(story.missions));
   const guards=b.requires.map(r=>r.kind+':'+(r.kind==='stock'?r.min:r.seconds));
   if(JSON.stringify(guards)!==JSON.stringify(e.guards))failures.push(instruction+' guards '+JSON.stringify(guards));
   if(!spec.implementation.audit.items.some(x=>x.id==='simulation-chain'&&x.status==='implementada'))
    failures.push(instruction+' contrato auditado');
   if(story.missions[1].requires.length&&
     !spec.implementation.audit.items.some(x=>x.id==='simulation-conditions'&&x.status==='implementada'))
    failures.push(instruction+' guard auditada');
  }
  if(Caps.check(spec).length)failures.push(instruction+': '+Caps.check(spec).join(', '));
 }
 assert.deepEqual(failures,[]);
});
test('GF-TRAIN-15: segundo NPC é físico e distinto, legado sem segundo NPC',()=>{
 for(let count=1;count<=12;count++){
  const scene=F.layout(count,'aquarium',true,true);
  assert.equal(scene.guide.id,'guide');assert.equal(scene.guide2.id,'guide-2');
  assert.equal(F.walkable(scene,scene.guide2.x,scene.guide2.y),false);
  assert.equal(F.hitAt(scene,scene.guide2.x,scene.guide2.y)?.id,'guide-2');
  assert.equal(F.nearest({x:scene.guide2.x,y:scene.guide2.y+40},scene,55)?.id,'guide-2');
  assert.ok(F.walkable(scene,F.spawn(scene).x,F.spawn(scene).y));
 }
 assert.equal(F.layout(4,'aquarium',true,false).guide2,null);
});
test('GF-TRAIN-15: ordem de NPCs, estoque atual no instante da venda e recompensa sem duplicar',()=>{
 const c=Parser.parseGdd('','Quero cuidar de fazenda. Duas missões encadeadas. Primeira missão: plantar um canteiro. Segunda missão: vender uma colheita; precisa de 1 item no estoque. Crescer em dois segundos, meta de dez moedas.').simulation;
 assert.equal(c.story.version,3);
 const s=R.create(c),original=c.startingMoney;
 assert.equal(s.story.missionIndex,0);
 assert.match(R.talk(s,c,1),/Conclua primeiro/);
 assert.equal(s.story.step,0);assert.equal(s.story.npcTalks[1],0);
 assert.match(R.talk(s,c,0),/Agricultor/);
 assert.equal(s.story.step,1);
 assert.equal(R.act(s,c,0,'start'),true);
 assert.equal(s.story.missionIndex,1);assert.equal(s.story.rewards,3);
 assert.equal(s.money,original-c.cost+3);
 assert.match(R.talk(s,c,0),/outro personagem/);
 assert.equal(s.story.step,0);
 assert.match(R.talk(s,c,1),/Feirante/);
 assert.equal(s.story.step,1);
 assert.equal(R.act(s,c,0,'sell'),false,'sem estoque a ação falha');
 assert.equal(s.story.count,0);
 assert.equal(R.act(s,c,0,'care'),true);
 R.tick(s,c,1);R.tick(s,c,1);
 assert.equal(R.act(s,c,0,'finish'),true);
 assert.equal(s.inventory,1);assert.equal(s.story.count,0,'colher não é vender');
 const before=s.money;
 assert.equal(R.act(s,c,0,'sell'),true);
 assert.equal(s.inventory,0,'ação consumiu inventário');
 assert.equal(s.money,before+c.price+7,'guard avaliada antes de consumir inventário');
 assert.equal(s.story.missionIndex,2);assert.equal(s.story.rewards,10);
 assert.equal(s.story.completed,true);assert.equal(s.complete,true);
 const state=JSON.stringify(s);
 assert.equal(R.act(s,c,0,'sell'),false);assert.equal(R.talk(s,c,1),null);
 assert.equal(JSON.stringify(s),state);
});
test('GF-TRAIN-15: timer jogado começa após falar com NPC2; exige evento depois da espera',()=>{
 const c=Parser.parseGdd('','Quero cuidar de aquário. Duas missões seguidas. Primeira missão: comprar um peixe. Segunda missão: vender um peixe, esperar 5 segundos. Crescer em dois segundos, meta de dez moedas.').simulation;
 const s=R.create(c);
 R.talk(s,c,0);R.act(s,c,0,'start');R.talk(s,c,1);
 assert.equal(s.story.elapsed,0);
 R.act(s,c,0,'care');
 for(let i=0;i<4;i++)R.tick(s,c,1);
 assert.equal(s.story.elapsed,4);assert.equal(E.status(s.story,c.story).event,'finish');
 assert.equal(R.act(s,c,0,'finish'),true,'venda econômica permitida mas ainda não conta para a missão');
 assert.equal(s.story.missionIndex,1);assert.equal(s.story.rewards,3);assert.equal(s.complete,false);
 R.act(s,c,0,'start');R.act(s,c,0,'care');R.tick(s,c,1);
 assert.equal(s.story.elapsed,5);
 R.tick(s,c,1);assert.equal(R.act(s,c,0,'finish'),true);
 assert.equal(s.story.missionIndex,2);assert.equal(s.story.rewards,10);assert.equal(s.complete,true);
});
test('GF-TRAIN-15: com tempo e estoque, ambos devem ser satisfeitos ao executar evento',()=>{
 const c=Parser.parseGdd('','Quero cuidar de aquário. Duas missões encadeadas. Primeira missão: comprar um peixe. Segunda missão: vender um peixe, estoque de um peixe e aguardar 3 segundos. Crescer em dois segundos, meta de dez moedas.').simulation;
 const s=R.create(c);
 R.talk(s,c,0);R.act(s,c,0,'start');R.talk(s,c,1);
 R.act(s,c,0,'care');R.tick(s,c,1);R.tick(s,c,1);
 assert.equal(s.story.elapsed,2);
 assert.equal(R.act(s,c,0,'finish'),true);assert.equal(s.story.missionIndex,1);
 // Sem estoque, esperar não adianta; sem tempo, estoque não adianta.
 R.tick(s,c,1);assert.equal(s.story.elapsed,3);
 assert.equal(R.act(s,c,0,'start'),true);R.act(s,c,0,'care');
 R.tick(s,c,1);R.tick(s,c,1);
 assert.equal(R.act(s,c,0,'finish'),true);
 assert.equal(s.story.completed,true);
});
test('GF-TRAIN-15: salvar duas missões preserva checkpoint e rejeita fases forjadas',()=>{
 const c=Parser.parseGdd('','Cuidar de aquário. Duas missões encadeadas. Segunda missão: vender um peixe, esperar 3 segundos.').simulation;
 const mem=new Map(),storage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)};
 const save=R.persistence(c,'Dois NPCs',()=>storage),s=R.create(c),pos={x:90,y:489};
 R.talk(s,c,0);R.act(s,c,0,'start');
 assert.equal(s.story.missionIndex,1);
 assert.equal(save.write(s,0,pos),true);
 let recovered=save.read();
 assert.equal(recovered.state.story.missionIndex,1);assert.equal(recovered.state.story.step,0);
 assert.equal(recovered.state.story.rewards,3);
 R.talk(s,c,1);R.tick(s,c,1);R.tick(s,c,1);
 assert.equal(save.write(s,0,pos),true);
 recovered=save.read();assert.equal(recovered.state.story.elapsed,2);
 assert.deepEqual(recovered.state.story.npcTalks,[1,1]);
 const raw=JSON.parse(mem.get(save.key));
 raw.state.story.rewards=10;mem.set(save.key,JSON.stringify(raw));assert.equal(save.read(),null,'bônus falso');
 raw.state.story.rewards=3;raw.state.story.npcTalks[1]=0;
 mem.set(save.key,JSON.stringify(raw));assert.equal(save.read(),null,'NPC não conversou');
 raw.state.story.npcTalks[1]=1;raw.state.story.elapsed=-3;
 mem.set(save.key,JSON.stringify(raw));assert.equal(save.read(),null,'tempo adulterado');
});
test('GF-TRAIN-15: configuração inválida e outros gêneros não anunciam capacidade inexistente',()=>{
 const spec=Parser.parseGdd('','Cuidar de aquário. Duas missões encadeadas. Segunda missão: vender, estoque de um peixe e esperar 5 segundos.');
 assert.deepEqual(Caps.check(spec),[]);
 const config=JSON.parse(JSON.stringify(spec));
 config.simulation.story.missions[1].requires[0].kind='execute';
 assert.ok(Caps.check(config).some(e=>/Missão/.test(e)));
 assert.equal(Caps.capability('simulation-chain',{genre:'fps',dimension:'3d'}).allowed,false);
});
test('GF-TRAIN-15: código exportado offline inclui NPC2 e máquina v3; jogos clássicos intactos',()=>{
 const spec=Parser.parseGdd('','Cuidar de aquário. Duas missões encadeadas. Segunda missão: vender, esperar 5 segundos.');
 const files=Generator.generate(spec,'');
 assert.match(files['game.js'],/function gameForgeSimulationEventsFactory/);
 assert.match(files['game.js'],/npcTalks/);
 assert.match(files['game.js'],/guide-2/);
 new vm.Script(files['game.js']);
 assert.doesNotMatch(files['index.html'],/<script[^>]+src=["']https?:/i);
 const plain=Generator.generate(Parser.parseGdd('','Cuidar de aquário.'),'');
 assert.doesNotMatch(plain['game.js'],/const GameForgeSimulationEvents = /);
 new vm.Script(plain['game.js']);
});
