'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const Parser=require('../js/parser.js'),Generator=require('../js/generator.js'),Caps=require('../js/game-capabilities.js');
const E=require('../js/simulation-events.js')(),R=require('../js/simulation-rules.js')(E);
const Editor=require('../js/simulation-quest-editor.js');
const corpus=require('../training/simulation-parallel-ptbr-v16.json');
test('GF-TRAIN-16: 30 instruções PT-BR compiladas com contratos reais e legados intactos',()=>{
 assert.equal(corpus.cases.length,30);
 const failures=[];
 for(const {instruction,expected:x} of corpus.cases){
  const spec=Parser.parseGdd('',instruction),c=spec.simulation,story=c?.story;
  if(c?.domain!==x.domain||story?.version!==x.version)failures.push(instruction+': domínio/versão '+c?.domain+'/'+story?.version);
  if(x.version===4){
   if(!E.validConfig(story)||story.missions.length!==x.total||c.exploration?.mode!=='free')
    failures.push(instruction+': configuração v4');
   if(x.first){
    const a=story.missions[0].objectives.map(o=>[o.event,o.count]);
    if(JSON.stringify(a)!==JSON.stringify(x.first))failures.push(instruction+': objetivos '+JSON.stringify(a));
   }
   if(x.guards){
    const guards=story.missions[0].requires.map(r=>r.kind+':'+(r.kind==='stock'?r.min:r.seconds));
    if(JSON.stringify(guards)!==JSON.stringify(x.guards))failures.push(instruction+': guardas '+JSON.stringify(guards));
   }
   if(!spec.implementation?.audit?.items?.some(e=>e.id==='simulation-parallel'&&e.status==='implementada'))
    failures.push(instruction+': auditoria');
  }
  if(Caps.check(spec).length)failures.push(instruction+': '+Caps.check(spec).join(', '));
 }
 assert.deepEqual(failures,[]);
});
test('GF-TRAIN-16: editor visual produz jogo executável para os três domínios e quatro missões',()=>{
 for(const domain of ['aquarium','farm','shop']){
  const ids=Object.keys(Editor.domains[domain].actions);
  const missions=Array.from({length:4},(_,i)=>({
   objectives:[{event:ids[i%ids.length],count:i%3+1},{event:ids[(i+1)%ids.length],count:2}],
   stock:i===1?1:0,seconds:i===2?3:0
  }));
  const prompt=Editor.buildPrompt({domain,missions});
  assert.match(prompt,/4 missões encadeadas com objetivos simultâneos/);
  const spec=Parser.parseGdd('',prompt),story=spec.simulation.story;
  assert.equal(story.version,4,prompt);
  assert.equal(story.missions.length,4);
  assert.ok(E.validConfig(story));
  for(let i=0;i<4;i++){
   assert.deepEqual(story.missions[i].objectives,missions[i].objectives);
   if(i===1)assert.deepEqual(story.missions[i].requires,[{kind:'stock',min:1}]);
   if(i===2)assert.deepEqual(story.missions[i].requires,[{kind:'time',seconds:3}]);
  }
 }
});
test('GF-TRAIN-16: editor recusa duplicatas, domínio desconhecido e valores inseguros',()=>{
 const base={domain:'aquarium',missions:Array.from({length:3},()=>({objectives:[{event:'start',count:1},{event:'care',count:2}],stock:0,seconds:0}))};
 assert.doesNotThrow(()=>Editor.buildPrompt(base));
 const clone=()=>JSON.parse(JSON.stringify(base));
 const dup=clone();dup.missions[1].objectives[1].event='start';
 assert.throws(()=>Editor.buildPrompt(dup),/duas ações diferentes/);
 const out=clone();out.missions[0].objectives[0].count=99;
 assert.throws(()=>Editor.buildPrompt(out),/inválida/);
 const bad=clone();bad.domain='fps';
 assert.throws(()=>Editor.buildPrompt(bad),/Escolha aquário/);
 const missing=clone();missing.missions.pop();
 assert.throws(()=>Editor.buildPrompt(missing),/três a quatro/);
 const stock=clone();stock.missions[0].stock=-3;
 assert.throws(()=>Editor.buildPrompt(stock),/fora do limite/);
});
test('GF-TRAIN-16: dois objetivos simultâneos avançam independente e só entregam bônus juntos',()=>{
 const c=Parser.parseGdd('','Quero cuidar de aquário. 3 missões encadeadas com objetivos simultâneos. Missão 1: comprar 2 e alimentar 2. Missão 2: comprar 1 e alimentar 1. Missão 3: comprar 1 e alimentar 1. Crescer em dois segundos. Meta de dez moedas.').simulation;
 const s=R.create(c);assert.equal(c.story.version,4);
 assert.equal(s.story.started,false);
 assert.equal(R.act(s,c,0,'start'),true);
 assert.deepEqual(s.story.progress,[0,0],'a ação antes do NPC não conta');
 R.talk(s,c,0);
 assert.equal(s.story.started,true);
 R.act(s,c,0,'care');
 assert.deepEqual(s.story.progress,[0,1],'primeiro objetivo progrediu fora da ordem');
 R.act(s,c,1,'start');
 assert.deepEqual(s.story.progress,[1,1]);
 R.act(s,c,2,'start');
 assert.deepEqual(s.story.progress,[2,1],'um objetivo já terminou e outro ainda não');
 assert.equal(E.validate(s.story,c.story),true);
 assert.equal(s.story.missionIndex,0);assert.equal(s.story.rewards,0);
 assert.equal(R.act(s,c,1,'care'),true);
 assert.equal(s.story.missionIndex,1);assert.equal(s.story.rewards,3);
 assert.deepEqual(s.story.progress,[0,0]);
 assert.equal(R.act(s,c,3,'start'),true);
 assert.equal(s.story.missionIndex,1,'novo objetivo não inicia antes de falar com NPC2');
 assert.match(R.talk(s,c,0),/outro personagem/);
 assert.equal(s.story.started,false);
 R.talk(s,c,1);assert.equal(s.story.started,true);
 R.act(s,c,3,'care');assert.deepEqual(s.story.progress,[0,1]);
 assert.equal(R.act(s,c,3,'care'),false,'a mesma ação inválida não soma');
 R.act(s,c,3,'finish');
 R.act(s,c,3,'start');
 assert.equal(s.story.missionIndex,1,'não há slot disponível para iniciar, recurso real limita');
 // Libera vaga usando o ciclo de vendas; o evento finish não soma para objetivo start/care.
 R.tick(s,c,1);R.tick(s,c,1);
 assert.equal(R.act(s,c,0,'finish'),true);
 assert.equal(R.act(s,c,0,'start'),true);
 assert.equal(s.story.missionIndex,2);assert.equal(s.story.rewards,8);
 R.talk(s,c,0);assert.equal(s.story.started,true);
 R.act(s,c,0,'care');assert.deepEqual(s.story.progress,[0,1]);
 R.tick(s,c,1);R.tick(s,c,1);
 R.act(s,c,0,'finish');R.act(s,c,0,'start');
 assert.equal(s.story.missionIndex,3);assert.equal(s.story.rewards,15);
 assert.equal(s.story.completed,true);
 assert.equal(E.validate(s.story,c.story),true);
});
test('GF-TRAIN-16: campanha de quatro missões exige NPC alternado e bônus idempotente',()=>{
 const c=Parser.parseGdd('','Quero administrar uma loja. Quatro missões encadeadas com objetivos simultâneos. Missão 1: repor 1 e atender 1. Missão 2: repor 1 e atender 1. Missão 3: repor 1 e atender 1. Missão 4: repor 1 e atender 1.').simulation;
 const s=R.create(c);
 for(let i=0;i<4;i++){
  const npc=i%2,other=1-npc,slot=i;
  R.talk(s,c,other);assert.equal(s.story.started,false,'NPC incorreto não inicia');
  R.talk(s,c,npc);assert.equal(s.story.started,true);
  R.act(s,c,slot,'start');R.act(s,c,slot,'care');
  assert.equal(s.story.missionIndex,i+1);
  assert.equal(s.story.rewards,[3,8,15,24][i]);
  assert.equal(s.story.completed,i===3);
  assert.ok(E.validate(s.story,c.story));
 }
 assert.equal(R.talk(s,c,0)?.includes('Atendente'),true);
 assert.equal(E.record(s.story,c.story,'care').bonus,0,'não paga novamente');
 assert.equal(s.story.rewards,24);
});
test('GF-TRAIN-16: guardas de inventário e tempo só deixam contar eventos válidos',()=>{
 const c=Parser.parseGdd('','Quero cuidar de aquário. Três missões encadeadas com objetivos simultâneos. Missão 1: comprar 1 e alimentar 1. Estoque de 2. Esperar 3 segundos. Missão 2: comprar 1 e alimentar 1. Missão 3: comprar 1 e alimentar 1.').simulation;
 const s=R.create(c);
 R.talk(s,c,0);
 assert.deepEqual(c.story.missions[0].requires,[{kind:'stock',min:2},{kind:'time',seconds:3}]);
 R.act(s,c,0,'start');R.act(s,c,0,'care');
 assert.deepEqual(s.story.progress,[0,0],'faltam estoque e tempo');
 R.act(s,c,1,'start');R.tick(s,c,1);R.tick(s,c,1);
 R.act(s,c,1,'care');
 assert.deepEqual(s.story.progress,[0,0],'sem espera mínima');
 R.tick(s,c,1);assert.equal(s.story.elapsed,3);
 // Já há dois peixes vivos. Uma nova ação real start requer terceiro espaço.
 R.act(s,c,2,'start');
 assert.deepEqual(s.story.progress,[1,0]);
 R.act(s,c,2,'care');assert.equal(s.story.missionIndex,1);
 assert.equal(s.story.elapsed,0,'timer reinicia na troca de missão');
});
test('GF-TRAIN-16: checkpoint persiste objetivo individual completo e rejeita adulteração',()=>{
 const c=Parser.parseGdd('','Quero cuidar de aquário. Três missões encadeadas com objetivos simultâneos. Missão 1: comprar 1 e alimentar 2. Missão 2: comprar 1 e alimentar 1. Missão 3: comprar 1 e alimentar 1.').simulation;
 const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};
 const save=R.persistence(c,'GF-16',()=>storage),s=R.create(c),pos={x:90,y:489};
 R.talk(s,c,0);R.act(s,c,0,'start');
 assert.deepEqual(s.story.progress,[1,0]);
 assert.equal(save.write(s,0,pos),true);
 const loaded=save.read();assert.deepEqual(loaded.state.story.progress,[1,0]);
 R.act(s,c,0,'care');assert.equal(s.story.missionIndex,0);
 assert.deepEqual(s.story.progress,[1,1]);
 assert.equal(save.write(s,0,pos),true);
 const recover=save.read();assert.deepEqual(recover.state.story.progress,[1,1]);
 const raw=JSON.parse(m.get(save.key));
 raw.state.story.progress=[2,0];m.set(save.key,JSON.stringify(raw));
 assert.equal(save.read(),null,'não aceita objetivo acima da meta');
 raw.state.story.progress=[1,1];raw.state.story.rewards=999;m.set(save.key,JSON.stringify(raw));
 assert.equal(save.read(),null,'bônus adulterado rejeitado');
 raw.state.story.rewards=0;raw.state.story.missionIndex=3;m.set(save.key,JSON.stringify(raw));
 assert.equal(save.read(),null,'não pula missões');
});
test('GF-TRAIN-16: exportação v4 mantém validadores, NPC2 e executa sem dependência remota',()=>{
 const cmd='Quero cuidar de aquário. Quatro missões encadeadas com objetivos simultâneos. Missão 1: comprar 1 e alimentar 1. Missão 2: comprar 1 e alimentar 1. Missão 3: comprar 1 e alimentar 1. Missão 4: comprar 1 e alimentar 1.';
 const spec=Parser.parseGdd('',cmd);assert.equal(Caps.check(spec).length,0);
 const files=Generator.generate(spec,'');
 assert.match(files['game.js'],/parallelRecord/);assert.match(files['game.js'],/guide-2/);
 new vm.Script(files['game.js']);
 assert.doesNotMatch(files['index.html'],/<script[^>]+src=["']https?:/i);
 const other=Parser.parseGdd('','Quero cuidar de aquário. Missão com escolhas de diálogo.');
 assert.equal(other.simulation.story.version,2);
 assert.equal(Parser.parseGdd('','Quero cuidar de aquário. Duas missões encadeadas.').simulation.story.version,3);
 assert.equal(Parser.parseGdd('','Quero cuidar de aquário. Missão vender um peixe.').simulation.story.version,1);
});
