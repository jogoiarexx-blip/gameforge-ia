'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const StageSpec=require('../js/stage-spec');
const Parser=require('../js/parser');
const R=require('../js/world-rules')();

function boot(spec,storage=new Map()){
 const THREE_CTX={AbortController,console};
 vm.createContext(THREE_CTX);
 vm.runInContext(fs.readFileSync(require.resolve('../vendor/three-source.js'),'utf8'),THREE_CTX);
 vm.runInContext(THREE_CTX.GameForgeThreeSource,THREE_CTX);
 const handlers={},elements={},frames=[],uiButtons=[];let elapsed=0,lastScene=null;
 const element=id=>elements[id]||(elements[id]={
  textContent:'',style:{},classList:{add(){},remove(){}},dataset:{},
  addEventListener(type,fn){this[type]=fn;},focus(){},
  getContext(){return {fillRect(){},setTransform(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){}};},
  getBoundingClientRect(){return {width:960,height:540};}
 });
 element('game').parentElement={append(...nodes){uiButtons.push(...nodes);}};
 const createElement=tag=>({
  tagName:tag,style:{},dataset:{},hidden:false,textContent:'',
  setAttribute(k,v){this[k]=v;},
  addEventListener(k,fn){this[k]=fn;},
  append(){},remove(){},focus(){}
 });
 const THREE={...THREE_CTX.THREE,WebGLRenderer:class{
  constructor(){this.shadowMap={};this.info={render:{calls:0},memory:{geometries:0}};this.renderLists={dispose(){}};}
  setClearColor(){}setPixelRatio(){}setSize(w,h){element('game').width=w;element('game').height=h;}
  render(scene){lastScene=scene;}
 }};
 const localStorage={
  getItem(k){return storage.has(k)?storage.get(k):null;},
  setItem(k,v){storage.set(k,String(v));},
  removeItem(k){storage.delete(k);}
 };
 const env={THREE,GAME_SPEC:spec,localStorage,document:{
  getElementById:element,querySelectorAll:()=>[],createElement,addEventListener(){}
 },performance:{now:()=>elapsed},requestAnimationFrame:f=>frames.push(f),
 addEventListener:(type,fn)=>{(handlers[type]||(handlers[type]=[])).push(fn);},
 gameForgeWorldRules:require('../js/world-rules'),gameForgeSoftwareRenderer:require('../js/software-renderer'),
 window:null,globalThis:null};
 env.window=env;env.globalThis=env;
 vm.createContext(env);
 vm.runInContext('('+require('../js/three-runtime.js').toString()+')()',env);
 const tick=(count=1)=>{
  for(let i=0;i<count;i++){elapsed+=1000/60;const f=frames.shift();assert.equal(typeof f,'function');f(elapsed);}
 };
 return {tick,start:()=>element('start').click(),restart:()=>element('restart').click(),
  key:(type,key)=>{for(const fn of handlers[type]||[])fn({key,repeat:false,preventDefault(){}});},
  telemetry:()=>env.__gameforgeTelemetry(),scene:()=>lastScene,elements,storage,uiButtons};
}
test('GF-007: GDD separa inimigos rápidos, brutamontes, eventos e fontes por fase',()=>{
 const gdd=[
  '# Distrito Sete',
  '## Fase 1 — Pátio',
  '4 inimigos rápidos',
  'Aos 5 segundos chegam 3 reforços',
  'Cura 25 aos 8 segundos',
  '## Fase 2 — Fortaleza',
  '5 brutamontes'
 ].join('\n');
 const spec=Parser.parseGdd(gdd,'',{genre:'arena',dimension:'3d'});
 assert.match(spec.projectId,/^gf-[a-f0-9]{8}-[a-f0-9]{8}$/);
 assert.deepEqual(spec.stageConfig.map(s=>s.enemyArchetype),['runner','brute']);
 assert.deepEqual(spec.stageConfig[0].events.map(e=>[e.type,e.at,e.amount]),[
  ['reinforcements',5,3],['heal',8,25]
 ]);
 assert.equal(spec.stageSpecs[0].events[0].origin.line,4);
 assert.equal(spec.stageSpecs[1].encounters.archetypeOrigin.line,7);
 assert.equal(spec.stageSpecs[0].checkpoint.status,'implementado');
 const other=Parser.parseGdd(gdd.replace('Distrito Sete','Distrito Nove'),'',{genre:'arena',dimension:'3d'});
 assert.notEqual(spec.projectId,other.projectId);
 assert.equal(Parser.parseGdd(gdd,'',{genre:'arena',dimension:'3d'}).projectId,spec.projectId);
});
test('GF-007: comando muda inimigos apenas da fase 2 e nao reativa requisitos negados',()=>{
 const spec=Parser.parseGdd('# Jogo\n## Fase 1 — Pátio\n2 sentinelas\n## Fase 2 — Armazém\n3 brutamontes',
 'Na fase 2 ponha inimigos mistos e sem reforços aos 12 segundos.',{genre:'arena',dimension:'3d'});
 assert.deepEqual(spec.stageConfig.map(s=>s.enemyArchetype),['sentinel','mixed']);
 assert.equal(spec.stageConfig[1].events?.length||0,0);
 const no=Parser.parseGdd('','Faça um RPG 2D com três fases e 4 brutamontes na fase 2 e reforços aos 10 segundos.',{genre:'rpg',dimension:'2d'});
 assert.ok(no.stageSpecs.every(s=>s.encounters.archetype===null&&s.events.length===0));
});
test('GF-007: regras de combate tipado alteram atributos, eventos disparam uma vez',()=>{
 const r=R;
 assert.ok(r.enemyProfile('runner').speed>r.enemyProfile('brute').speed);
 assert.ok(r.enemyProfile('brute').health>r.enemyProfile('sentinel').health);
 assert.ok(r.enemyProfile('sentinel').damage>r.enemyProfile('runner').damage);
 assert.deepEqual(['runner','sentinel','brute'],[0,1,2].map(i=>r.enemyProfile('mixed',i).id));
 const events=[{id:'event-reinforcements',type:'reinforcements',at:5,amount:3},
  {id:'event-heal',type:'heal',at:8,amount:25}];
 assert.equal(r.dueStageEvents(events,4.9,[]).length,0);
 assert.equal(r.dueStageEvents(events,5,[])[0].type,'reinforcements');
 assert.deepEqual(r.dueStageEvents(events,9,['event-reinforcements']).map(e=>e.type),['heal']);
 assert.deepEqual(r.dueStageEvents(events,20,['event-reinforcements','event-heal']),[]);
});
test('GF-007: jogo 3D recebe 3 reforços em tempo real e não concede saída antes do evento',()=>{
 const spec={genre:'arena',dimension:'3d',title:'Teste Eventos',stages:['Evento'],
  stageConfig:[{mission:'eliminate',enemies:1,boss:'no',enemyArchetype:'runner',
   events:[{id:'event-reinforcements',type:'reinforcements',at:5,amount:3}]}],
  features:{bosses:false},worldOptions:{size:48,seed:42,quality:'low'},tuning:{difficulty:.25}};
 const b=boot(spec);b.start();b.tick(2);
 const initial=b.telemetry();assert.equal(initial.enemies,1);
 assert.equal(initial.enemyArchetypes[0],'runner');
 b.tick(315);
 const after=b.telemetry();
 assert.equal(after.enemies,4);
 assert.deepEqual(Array.from(after.eventsFired),['event-reinforcements']);
 assert.equal(after.state,'play');
 b.tick(20);
 assert.equal(b.telemetry().enemies,4,'reforços nao devem duplicar');
});
test('GF-007: checkpoint de fase salva, restaura em novo navegador e Reiniciar apaga',()=>{
 const spec={genre:'arena',dimension:'3d',title:'Campanha',stages:['Sobreviver','Final'],
  projectId:'gf-01234567-abcdef01',stageConfig:[{mission:'survive',seconds:5,enemies:1,boss:'no'},
   {enemies:1,boss:'no',enemyArchetype:'brute'}],
  features:{bosses:false},worldOptions:{size:48,seed:42,quality:'low'},tuning:{difficulty:.25}};
 const storage=new Map(),key=R.checkpointKey(spec);
 assert.ok(key.includes(spec.projectId));
 const a=boot(spec,storage);a.start();a.key('keydown','w');a.tick(420);a.key('keyup','w');
 assert.equal(a.telemetry().stage,2,'fase 1 deve ser concluida e avancar');
 const saved=R.readCheckpoint(storage.get(key),spec);
 assert.equal(saved?.stage,1);
 const b=boot(spec,storage);
 assert.match(b.elements.start.textContent,/Continuar da fase 2/);
 b.start();b.tick(2);
 assert.equal(b.telemetry().stage,2);
 assert.equal(b.telemetry().score,saved.score);
 assert.ok(b.telemetry().enemyArchetypes.includes('brute'));
 b.restart();assert.equal(b.telemetry().stage,1);
 assert.equal(storage.has(key),false);
});
test('GF-007: save invalido, homonimos, economia FPS e schema futuro nao escapam da validacao',()=>{
 const spec={title:'Mesmo titulo',genre:'arena',dimension:'3d',projectId:'gf-01234567-abcdef01',stages:['A','B']};
 const other={...spec,projectId:'gf-11111111-22222222'};
 assert.notEqual(R.checkpointKey(spec),R.checkpointKey(other));
 const valid=R.checkpointPayload(spec,{stage:1,health:70,score:300,ammo:80,clock:15,rpgLevel:1,rpgXP:0,rpgPotions:2});
 assert.equal(R.readCheckpoint(JSON.stringify(valid),spec)?.stage,1);
 assert.equal(R.readCheckpoint(JSON.stringify({...valid,version:99}),spec),null);
 assert.equal(R.readCheckpoint(JSON.stringify({...valid,stage:999}),spec),null);
 assert.equal(R.readCheckpoint(JSON.stringify({...valid,health:NaN}),spec),null);
 assert.equal(R.readCheckpoint(JSON.stringify(valid),other),null);
 assert.equal(R.checkpointKey({...spec,genre:'fps',combatEconomy:{enabled:true}}),null);
});


test('GF-008: GDD simples cria objetivos na ordem e eventos de localizacao rastreaveis',()=>{
 const source=[
  '# Missão do Forte','## Fase 1 — Pátio',
  'Etapas: ir ao norte -> eliminar inimigos -> coletar cristais',
  'Ao entrar na área norte surgem 3 reforços',
  'Quando chegar ao centro, cura 25',
  '## Fase 2 — Armazém','Etapas: ir ao leste -> sobreviver 7 segundos'
 ].join('\n');
 const spec=StageSpec.compile({title:'Missão do Forte',genre:'arena',dimension:'3d',
  stages:['Pátio','Armazém'],stageConfig:[{},{}]},source);
 assert.deepEqual(spec.stageSpecs[0].missionSequence.steps.map(s=>s.kind),['reach','eliminate','collect']);
 assert.equal(spec.stageConfig[0].missionSteps[0].zone,'north');
 assert.equal(spec.stageConfig[1].missionSteps[0].zone,'east');
 assert.equal(spec.stageConfig[1].missionSteps[1].seconds,7);
 assert.deepEqual(spec.stageConfig[0].zoneEvents.map(e=>[e.type,e.zone,e.amount]),[
  ['reinforcements','north',3],['heal','center',25]
 ]);
 assert.equal(spec.stageSpecs[0].zoneEvents[0].origin.line,4);
 assert.equal(spec.stageSpecs[0].missionSequence.origin.line,3);
 assert.equal(spec.stageSpecs[0].missionSequence.status,'implementado');
 assert.match(StageSpec.report(spec),/Missão encadeada: implementado/);
 const same=StageSpec.compile({title:'Missão do Forte',genre:'arena',dimension:'3d',
  stages:['Pátio','Armazém'],stageConfig:[{},{}]},source);
 assert.deepEqual(spec.stageConfig,same.stageConfig);
});
test('GF-008: comando na fase 2 substitui so sua ordem, nega eventos e nao inventa cinco cristais',()=>{
 const original='# Forte\n## Fase 1\nEtapas: ir ao norte -> eliminar inimigos\n'+
  '## Fase 2\nEtapas: ir ao sul -> coletar cristais\nQuando entrar na área sul surgem 3 reforços';
 const cfg={title:'Forte',genre:'arena',dimension:'3d',stages:['A','B'],stageConfig:[{},{}]};
 const spec=StageSpec.compile(cfg,original,
  'Fase 2: Etapas: ir ao oeste -> sobreviver 10 segundos\nNa fase 2, quando entrar na área sul sem reforços');
 assert.equal(spec.stageConfig[0].missionSteps[0].zone,'north');
 assert.equal(spec.stageConfig[1].missionSteps[0].zone,'west');
 assert.equal(spec.stageConfig[1].missionSteps[1].seconds,10);
 assert.equal(spec.stageConfig[1].zoneEvents?.length||0,0);
 const pending=StageSpec.compile({title:'Forte',genre:'arena',dimension:'3d',stages:['A'],stageConfig:[{}]},
  '## Fase 1\nEtapas: ir ao norte -> coletar 5 cristais');
 assert.equal(pending.stageSpecs[0].missionSequence.status,'pendente');
 assert.equal(pending.stageConfig[0].missionSteps,undefined);
 const two=StageSpec.compile({title:'Forte',genre:'rpg',dimension:'2d',stages:['A'],stageConfig:[{}]},
  '## Fase 1\nEtapas: ir ao norte -> eliminar inimigos\nAo entrar na área norte surgem 3 reforços');
 assert.deepEqual(two.stageSpecs[0].missionSequence.steps,[]);
 assert.deepEqual(two.stageSpecs[0].zoneEvents,[]);
});
test('GF-008: regras de area e objetivos recusam coordenadas malformadas e IDs externos',()=>{
 assert.deepEqual(R.waypoint('north',48),{x:0,z:-13.440000000000001});
 assert.equal(R.waypoint('outside',48),null);
 assert.equal(R.enteredZone('center',{x:0,z:0},48),true);
 assert.equal(R.enteredZone('center',{x:8,z:8},48),false);
 assert.equal(R.missionStepReady({kind:'eliminate'},{enemies:0,pendingReinforcements:true}),false);
 assert.equal(R.missionStepReady({kind:'eliminate'},{enemies:0,pendingReinforcements:false}),true);
 assert.equal(R.missionStepReady({kind:'survive',seconds:7},{elapsedInStep:6.9}),false);
 assert.equal(R.missionStepReady({kind:'survive',seconds:7},{elapsedInStep:7}),true);
 const valid={id:'zone-reinforcements-center',type:'reinforcements',zone:'center',amount:3};
 const forged={...valid,id:'zone-reinforcements-north'};
 const invalid={...valid,amount:99};
 assert.deepEqual(R.dueZoneEvents([valid,forged,invalid],{x:0,z:0},48,[]),[valid]);
 assert.deepEqual(R.dueZoneEvents([valid],{x:0,z:0},48,[valid.id]),[]);
});
test('GF-008: mapa 3D mostra marcador ativo e so avanca a sequencia em sua ordem',()=>{
 const spec={genre:'arena',dimension:'3d',title:'Missao Encadeada',stages:['Fase 1'],
  stageConfig:[{enemies:1,boss:'no',missionSteps:[
   {id:'step-1',kind:'reach',zone:'north',label:'Ir ao norte'},
   {id:'step-2',kind:'eliminate',label:'Eliminar inimigos'}
  ]}],
  features:{bosses:false},worldOptions:{size:48,seed:42,quality:'low'},tuning:{difficulty:.25}};
 const b=boot(spec);b.start();b.tick(2);
 const t=b.telemetry();
 assert.equal(t.missionStepIndex,0);
 assert.equal(t.missionSteps,2);
 assert.equal(t.activeMissionStep,'reach');
 assert.equal(t.missionReady,false);
 assert.ok(Array.from(t.zoneGuides).includes('north'));
 assert.match(b.elements.mission.textContent,/Etapa 1\/2/);
 b.tick(80);
 assert.equal(b.telemetry().missionStepIndex,0);
});
test('GF-008: ponto sul dispara reforcos uma so vez, depois exige eliminar',()=>{
 const spec={genre:'arena',dimension:'3d',title:'Trigger por zona',stages:['Fase 1'],
  stageConfig:[{enemies:1,boss:'no',
   missionSteps:[{id:'step-1',kind:'reach',zone:'south',label:'Ir ao sul'},
    {id:'step-2',kind:'eliminate',label:'Eliminar inimigos'}],
   zoneEvents:[{id:'zone-reinforcements-south',type:'reinforcements',zone:'south',amount:2}]}],
  features:{bosses:false},worldOptions:{size:48,seed:42,quality:'low'},tuning:{difficulty:.25}};
 const b=boot(spec);b.start();b.tick(2);
 const t=b.telemetry();
 assert.equal(t.missionStepIndex,1);
 assert.equal(t.enemies,3);
 assert.equal(t.missionReady,false);
 assert.deepEqual(Array.from(t.eventsFired),['zone-reinforcements-south']);
 assert.equal(t.activeMissionStep,'eliminate');
 b.tick(40);
 assert.equal(b.telemetry().enemies,3);
 assert.deepEqual(Array.from(b.telemetry().zoneGuides),[]);
});
test('GF-008: sobrevivencia so conta tempo depois de chegar ao ponto inicial',()=>{
 const spec={genre:'arena',dimension:'3d',title:'Sobrevivência progressiva',stages:['A'],
  stageConfig:[{enemies:1,boss:'no',missionSteps:[
   {id:'step-1',kind:'reach',zone:'south',label:'Chegue ao sul'},
   {id:'step-2',kind:'survive',seconds:5,label:'Sobreviva por 5s'}
  ]}],features:{bosses:false},worldOptions:{size:48,seed:42,quality:'low'},
  tuning:{difficulty:.25}};
 const b=boot(spec);b.start();b.tick(3);
 assert.equal(b.telemetry().missionStepIndex,1);
 assert.equal(b.telemetry().missionReady,false);
 b.tick(140);
 assert.equal(b.telemetry().missionStepIndex,1);
 b.tick(210);
 assert.equal(b.telemetry().missionStepIndex,2);
 assert.equal(b.telemetry().missionReady,true);
 assert.equal(b.telemetry().state,'play','portal deve ser alcancado para completar a fase');
});


test('GF-009: GDD cria NPC com fala, quest oferecida, prêmios e origem por fase',()=>{
 const source=[
  '# A Vila','## Fase 1 — Pátio',
  'NPC: exploradora Lia no sul',
  'Fala do NPC: "Socorro, precisamos defender a cidade!"',
  'Missão do NPC: ir ao sul -> sobreviver 5 segundos',
  'Recompensa do NPC: 200 pontos e 20 de vida e 30 balas',
  '## Fase 2 — Outpost',
  'NPC: médico no leste',
  'Missão do NPC: ir ao leste -> coletar cristais',
  'Recompensa do NPC: 100 pontos'
 ].join('\n');
 const make=()=>StageSpec.compile({title:'A Vila',genre:'arena',dimension:'3d',
  stages:['Vila','Posto'],stageConfig:[{},{}]},source);
 const spec=make();
 const one=spec.stageConfig[0].npcQuest,two=spec.stageConfig[1].npcQuest;
 assert.equal(one.id,'npc-stage-01');
 assert.equal(one.name,'exploradora Lia');
 assert.equal(one.zone,'south');
 assert.equal(one.dialogue,'Socorro, precisamos defender a cidade!');
 assert.deepEqual(one.steps.map(s=>s.kind),['reach','survive']);
 assert.equal(one.steps[1].seconds,5);
 assert.deepEqual(one.reward,{score:200,health:20,ammo:30});
 assert.equal(two.zone,'east');
 assert.deepEqual(two.reward,{score:100,health:0,ammo:0});
 assert.equal(spec.stageSpecs[0].npcQuest.origin.line,3);
 assert.equal(spec.stageSpecs[1].npcQuest.origin.line,8);
 assert.equal(spec.stageSpecs[0].npcQuest.status,'implementado');
 assert.match(StageSpec.report(spec),/NPC: implementado/);
 assert.deepEqual(spec.stageConfig,make().stageConfig);
 assert.equal(R.npcQuestContract(one).id,'npc-stage-01');
});
test('GF-009: comando muda NPC apenas na fase 2 e rejects quests sem contrato valido',()=>{
 const source=[
  '# Base','## Fase 1','NPC: guia no sul','Missão do NPC: ir ao sul -> eliminar inimigos',
  '## Fase 2','NPC: comerciante no oeste','Missão do NPC: ir ao oeste -> coletar cristais'
 ].join('\n');
 const c=StageSpec.compile({title:'Base',genre:'rpg',dimension:'3d',stages:['A','B'],stageConfig:[{},{}]},source,
  'Fase 2: NPC: ferreiro no norte\nFase 2: Fala do NPC: "Nova tarefa!"\nFase 2: Missão do NPC: ir ao norte -> sobreviver 7 segundos');
 assert.equal(c.stageConfig[0].npcQuest.name,'guia');
 assert.equal(c.stageConfig[1].npcQuest.name,'ferreiro');
 assert.equal(c.stageConfig[1].npcQuest.zone,'north');
 assert.equal(c.stageConfig[1].npcQuest.dialogue,'Nova tarefa!');
 assert.equal(c.stageConfig[1].npcQuest.steps[1].seconds,7);
 const pending=StageSpec.compile({title:'Base',genre:'arena',dimension:'3d',stages:['A'],stageConfig:[{}]},
  '## Fase 1\nNPC: guia no centro\nMissão do NPC: entrar no castelo -> coletar 5 moedas\nRecompensa do NPC: 99999 pontos');
 assert.equal(pending.stageSpecs[0].npcQuest.status,'pendente');
 assert.equal(pending.stageConfig[0].npcQuest,undefined);
 const no=StageSpec.compile({title:'Base',genre:'rpg',dimension:'2d',stages:['A'],stageConfig:[{}]},
  '## Fase 1\nNPC: guia no centro\nMissão do NPC: ir ao norte -> eliminar inimigos');
 assert.equal(no.stageSpecs[0].npcQuest.status,'nao_verificado');
 assert.equal(no.stageConfig[0].npcQuest,undefined);
 const remove=StageSpec.compile({title:'Base',genre:'arena',dimension:'3d',stages:['A'],
  stageConfig:[{npcQuest:c.stageConfig[0].npcQuest}]},'','Na fase 1: sem NPC');
 assert.equal(remove.stageConfig[0].npcQuest,undefined);
 assert.equal(remove.stageSpecs[0].npcQuest.status,'nao_solicitado');
});
test('GF-009: contrato valida limites, evita recompensa arbitraria e calcula pagamento limitado',()=>{
 const valid={id:'npc-stage-01',name:'Guia',zone:'south',dialogue:'Precisamos de ajuda',
  steps:[{id:'step-1',kind:'reach',zone:'south',label:'Vá ao sul'},
   {id:'step-2',kind:'eliminate',label:'Derrote os inimigos'}],
  reward:{score:200,health:30,ammo:40}};
 assert.ok(R.npcQuestContract(valid));
 assert.equal(R.npcNear(valid,{x:1.6,z:13.44},48),true);
 assert.equal(R.npcNear(valid,{x:0,z:-13.44},48),false);
 const payout=R.npcReward(valid,{score:999,health:90,ammo:70},99);
 assert.deepEqual(payout,{score:1199,health:100,ammo:99});
 assert.equal(R.npcQuestContract({...valid,reward:{...valid.reward,score:999999}}),null);
 assert.equal(R.npcQuestContract({...valid,name:'<script>'}),null);
 assert.equal(R.npcQuestContract({...valid,steps:[{...valid.steps[0],zone:'outside'},valid.steps[1]]}),null);
 assert.equal(R.npcQuestContract({...valid,dialogue:'<img onerror=alert(1)>'}),null);
 assert.equal(R.npcQuestContract({...valid,steps:[{...valid.steps[0],id:'bad'},valid.steps[1]]}),null);
});
test('GF-009: 3D bloqueia a fase ate dialogar, aceitar, concluir e receber prêmio uma vez',()=>{
 const quest={id:'npc-stage-01',name:'Guia',zone:'south',dialogue:'Proteja a vila!',
  steps:[{id:'step-1',kind:'reach',zone:'south',label:'Chegue ao sul'},
   {id:'step-2',kind:'survive',seconds:5,label:'Resista por 5s'}],
  reward:{score:200,health:20,ammo:30}};
 const spec={genre:'arena',dimension:'3d',title:'Guia e a vila',
  stages:['Vila'],stageConfig:[{enemies:1,boss:'no',npcQuest:quest}],features:{bosses:false},
  worldOptions:{size:48,seed:42,quality:'low'},tuning:{difficulty:.25}};
 const b=boot(spec);b.start();b.tick(2);
 assert.equal(b.telemetry().npc.state,'idle');
 assert.equal(b.telemetry().npc.near,true);
 assert.equal(b.telemetry().missionReady,false);
 assert.equal(b.telemetry().missionStepIndex,0);
 assert.ok(b.uiButtons.some(x=>x.textContent==='Conversar [E]'&&!x.hidden));
 const actors=[];b.scene().traverse(o=>{if(o.userData?.gameForgeNPC)actors.push(o);});
 assert.equal(actors.length,1,'NPC deve possuir um modelo visivel na cena 3D');
 assert.equal(actors[0].visible,true);
 const btn=b.uiButtons.find(x=>x['aria-label']==='Conversar com personagem próximo');
 assert.ok(btn);btn.click();
 assert.equal(b.telemetry().npc.state,'offered');
 assert.match(b.elements.message.textContent,/Proteja a vila/);
 assert.equal(b.telemetry().score,0);
 b.key('keydown','e');
 assert.equal(b.telemetry().npc.state,'active');
 b.tick(2);
 assert.equal(b.telemetry().missionStepIndex,1);
 assert.equal(b.telemetry().missionReady,false);
 b.tick(315);
 assert.equal(b.telemetry().npc.state,'completed');
 assert.equal(b.telemetry().missionReady,true);
 assert.equal(b.telemetry().score,200);
 assert.equal(b.telemetry().ammo,110);
 assert.equal(b.telemetry().npc.rewardsGiven,true);
 b.key('keydown','e');b.tick(120);
 assert.equal(b.telemetry().score,200,'não deve pagar ao repetir conversa');
 assert.match(b.elements.mission.textContent,/Missão de Guia concluída/);
 b.restart();b.tick(2);
 assert.equal(b.telemetry().npc.state,'idle');
 assert.equal(b.telemetry().score,0);
 assert.equal(b.telemetry().missionReady,false);
});
test('GF-009: jogos 3D sem NPC conservam progressão e controles anteriores',()=>{
 const spec={genre:'arena',dimension:'3d',title:'Sem NPC',stages:['A'],
  stageConfig:[{mission:'survive',seconds:5,enemies:1,boss:'no'}],
  features:{bosses:false},worldOptions:{size:48,seed:42,quality:'low'},tuning:{difficulty:.25}};
 const b=boot(spec);b.start();b.tick(2);
 assert.equal(b.telemetry().npc,null);
 assert.equal(b.telemetry().missionSteps,0);
 assert.equal(b.telemetry().missionReady,false);
 b.tick(315);
 assert.equal(b.telemetry().missionReady,true);
});
