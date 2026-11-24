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


test('GF-010 NPC: GDD cria duas escolhas tipadas, patrulha e resultados separados',()=>{
 const source=[
  '# Vila das Colinas','## Fase 1',
  'NPC: Exploradora Lia no sul',
  'Fala do NPC: "Duas rotas, escolha uma!"',
  'NPC caminha: sim',
  'Opção 1: Proteger a vila | ir ao sul -> sobreviver 5 segundos | 120 pontos e 20 de vida',
  'Opção 2: Explorar as ruínas | ir ao norte -> coletar cristais | 300 pontos e 40 balas'
 ].join('\n');
 const spec=StageSpec.compile({title:'Vila das Colinas',genre:'arena',dimension:'3d',
  stages:['Vila'],stageConfig:[{}]},source);
 const npc=spec.stageConfig[0].npcQuest;
 assert.ok(npc);
 assert.equal(npc.name,'Exploradora Lia');
 assert.equal(npc.walk,true);
 assert.deepEqual(npc.choices.map(c=>c.id),['choice-1','choice-2']);
 assert.equal(npc.choices[0].steps[1].seconds,5);
 assert.equal(npc.choices[1].steps[0].zone,'north');
 assert.deepEqual(npc.choices[0].reward,{score:120,health:20,ammo:0});
 assert.deepEqual(npc.choices[1].reward,{score:300,health:0,ammo:40});
 assert.equal(spec.stageSpecs[0].npcQuest.choices.length,2);
 assert.equal(spec.stageSpecs[0].npcQuest.walk,true);
 assert.match(StageSpec.report(spec),/Escolhas: 2/);
 const identical=StageSpec.compile({title:'Vila das Colinas',genre:'arena',dimension:'3d',
  stages:['Vila'],stageConfig:[{}]},source);
 assert.deepEqual(spec.stageConfig,identical.stageConfig);
});
test('GF-010 NPC: rejeita escolha parcial, premio excedente e commandos que mudam outra fase',()=>{
 const base={title:'Base',genre:'arena',dimension:'3d',stages:['A','B'],stageConfig:[{},{}]};
 const source=[
  '# Vila','## Fase 1','NPC: Guia no sul','Missão do NPC: ir ao sul -> eliminar inimigos',
  '## Fase 2','NPC: Curandeira no sul','Missão do NPC: ir ao sul -> sobreviver 5 segundos'
 ].join('\n');
 const spec=StageSpec.compile(base,source,
  'Fase 2: NPC caminha: sim\nFase 2: Opção 1: Defender | ir ao sul -> sobreviver 5 segundos | 50 pontos\n'+
  'Fase 2: Opção 2: Explorar | ir ao norte -> coletar cristais | 80 pontos');
 assert.equal(spec.stageConfig[0].npcQuest.walk,undefined);
 assert.equal(spec.stageConfig[0].npcQuest.choices,undefined);
 assert.equal(spec.stageConfig[1].npcQuest.walk,true);
 assert.equal(spec.stageConfig[1].npcQuest.choices.length,2);
 const invalid=StageSpec.compile({title:'Vila',genre:'arena',dimension:'3d',stages:['A'],stageConfig:[{}]},
  '## Fase 1\nNPC: Guia no sul\nOpção 1: Opção única | ir ao sul -> eliminar inimigos | 100 pontos');
 assert.equal(invalid.stageSpecs[0].npcQuest.status,'pendente');
 assert.equal(invalid.stageConfig[0].npcQuest,undefined);
 const invalidReward=StageSpec.compile({title:'Vila',genre:'arena',dimension:'3d',stages:['A'],stageConfig:[{}]},
  '## Fase 1\nNPC: Guia no sul\nOpção 1: Ajudar | ir ao sul -> eliminar inimigos | 1000 pontos\n'+
  'Opção 2: Fugir | ir ao norte -> sobreviver 5 segundos | 200 pontos');
 assert.equal(invalidReward.stageSpecs[0].npcQuest.status,'pendente');
});
test('GF-010 NPC: contrato e regras impedem falsificar escolha e mantem patrulha limitada',()=>{
 const base={id:'npc-stage-01',name:'Guia',zone:'south',dialogue:'Escolha',
  walk:true,steps:[{id:'step-1',kind:'reach',zone:'south',label:'Ir ao sul'},
   {id:'step-2',kind:'survive',seconds:5,label:'Sobreviver'}],
  reward:{score:100,health:0,ammo:0},choices:[
   {id:'choice-1',label:'Defender',steps:[{id:'step-1',kind:'reach',zone:'south',label:'Ir ao sul'},
    {id:'step-2',kind:'survive',seconds:5,label:'Sobreviver'}],reward:{score:100,health:0,ammo:0}},
   {id:'choice-2',label:'Explorar',steps:[{id:'step-1',kind:'reach',zone:'north',label:'Ir ao norte'},
    {id:'step-2',kind:'collect',label:'Colete cristais'}],reward:{score:300,health:20,ammo:40}}
  ]};
 assert.ok(R.npcQuestContract(base));
 assert.equal(R.npcReward(base,{score:0,health:80,ammo:60},999),null);
 assert.deepEqual(R.npcReward(base,{score:0,health:80,ammo:60},999,'choice-2'),
  {score:300,health:100,ammo:100});
 assert.equal(R.npcReward(base,{score:0,health:80,ammo:60},999,'choice-3'),null);
 assert.equal(R.npcQuestContract({...base,choices:[base.choices[0]]}),null);
 assert.equal(R.npcQuestContract({...base,choices:[{...base.choices[0],label:'<img>'},base.choices[1]]}),null);
 assert.equal(R.npcQuestContract({...base,walk:'yes'}),null);
 const first=R.npcPatrolPosition(base,0,48),second=R.npcPatrolPosition(base,2,48);
 assert.ok(Math.hypot(first.x-second.x,first.z-second.z)>.5);
 for(let t=0;t<=50;t+=.5){
  const p=R.npcPatrolPosition(base,t,32);
  assert.ok(Math.abs(p.x)<=14.01&&Math.abs(p.z)<=14.01);
 }
 assert.equal(R.npcNear({...base,id:'invalid'},{x:first.x,z:first.z},48,2.6,first),false);
});
test('GF-010 NPC: tecla 2 altera tempo da missao, recompensa e textos do HUD',()=>{
 const quest={id:'npc-stage-01',name:'Guia',zone:'south',dialogue:'Escolha sua rota',walk:false,
  steps:[{id:'step-1',kind:'reach',zone:'south',label:'Chegue ao sul'},
   {id:'step-2',kind:'survive',seconds:5,label:'Resista 5s'}],
  reward:{score:120,health:10,ammo:0},choices:[
   {id:'choice-1',label:'Vila',steps:[{id:'step-1',kind:'reach',zone:'south',label:'Chegue ao sul'},
    {id:'step-2',kind:'survive',seconds:5,label:'Resista 5s'}],reward:{score:120,health:10,ammo:0}},
   {id:'choice-2',label:'Forte',steps:[{id:'step-1',kind:'reach',zone:'south',label:'Chegue ao sul'},
    {id:'step-2',kind:'survive',seconds:7,label:'Resista 7s'}],reward:{score:300,health:0,ammo:40}}
  ]};
 const spec={genre:'arena',dimension:'3d',title:'Duplo caminho',stages:['Vila'],
  stageConfig:[{enemies:1,boss:'no',npcQuest:quest}],features:{bosses:false},
  worldOptions:{size:48,seed:42,quality:'low'},tuning:{difficulty:.25}};
 const b=boot(spec);b.start();b.tick(2);
 assert.equal(b.telemetry().npc.state,'idle');
 b.key('keydown','e');b.tick(1);
 assert.equal(b.telemetry().npc.state,'offered');
 assert.equal(b.telemetry().npc.choices.length,2);
 assert.equal(b.telemetry().missionReady,false);
 assert.ok(b.uiButtons.some(x=>x['aria-label']==='Escolher missão 2'&&!x.hidden));
 b.key('keydown','2');b.tick(2);
 assert.equal(b.telemetry().npc.choice,'choice-2');
 assert.equal(b.telemetry().npc.state,'active');
 assert.equal(b.telemetry().missionStepIndex,1);
 assert.match(b.elements.mission.textContent,/7s/);
 b.tick(317);
 assert.equal(b.telemetry().npc.state,'active','ramo 2 deve durar mais que ramo 1');
 b.tick(130);
 assert.equal(b.telemetry().npc.state,'completed');
 assert.equal(b.telemetry().score,300);
 assert.equal(b.telemetry().ammo,120);
 b.key('keydown','2');b.key('keydown','e');
 assert.equal(b.telemetry().score,300,'escolhas não podem pagar novamente');
 b.restart();b.tick(2);
 assert.equal(b.telemetry().npc.choice,null);
 assert.equal(b.telemetry().npc.state,'idle');
});
test('GF-010 NPC: botão de toque escolhe opção 1 e NPC caminha com animação sem alterar inimigos',()=>{
 const quest={id:'npc-stage-01',name:'Batedor',zone:'south',dialogue:'Venha comigo',walk:true,
  steps:[{id:'step-1',kind:'reach',zone:'south',label:'Sul'},
   {id:'step-2',kind:'survive',seconds:5,label:'Espere 5s'}],
  reward:{score:150,health:0,ammo:0},choices:[
   {id:'choice-1',label:'Ajudar',steps:[{id:'step-1',kind:'reach',zone:'south',label:'Sul'},
    {id:'step-2',kind:'survive',seconds:5,label:'Espere 5s'}],reward:{score:150,health:0,ammo:0}},
   {id:'choice-2',label:'Buscar',steps:[{id:'step-1',kind:'reach',zone:'south',label:'Sul'},
    {id:'step-2',kind:'survive',seconds:8,label:'Espere 8s'}],reward:{score:270,health:0,ammo:0}}
  ]};
 const spec={genre:'arena',dimension:'3d',title:'Batedor',stages:['A'],
  stageConfig:[{enemies:1,boss:'no',npcQuest:quest}],features:{bosses:false},
  worldOptions:{size:48,seed:42,quality:'low'},tuning:{difficulty:.25}};
 const b=boot(spec);b.start();b.tick(1);
 const first=b.telemetry().npc.position;b.tick(110);
 const walked=b.telemetry().npc.position;
 assert.ok(Math.hypot(walked.x-first.x,walked.z-first.z)>.5,'NPC tem que mover realmente no mapa');
 assert.equal(b.telemetry().enemies,1,'andar não cria inimigos extras');
 const npcActors=[];b.scene().traverse(x=>{if(x.userData?.gameForgeNPC)npcActors.push(x);});
 assert.equal(npcActors.length,1);
 assert.ok(Math.abs(npcActors[0].position.x-walked.x)<1e-5);
 const talk=b.uiButtons.find(x=>x['aria-label']==='Conversar com personagem próximo');
 assert.equal(talk.hidden,false);
 talk.click();
 assert.equal(b.telemetry().npc.state,'offered');
 const frozen=b.telemetry().npc.position;b.tick(20);
 assert.deepEqual(b.telemetry().npc.position,frozen,'NPC congela enquanto opção é apresentada');
 const btn=b.uiButtons.find(x=>x['aria-label']==='Escolher missão 1');assert.ok(btn);
 assert.equal(btn.hidden,false);btn.click();
 assert.equal(b.telemetry().npc.choice,'choice-1');
 assert.equal(b.telemetry().npc.state,'active');
 b.tick(330);
 assert.equal(b.telemetry().npc.state,'completed');
 assert.equal(b.telemetry().score,150);
});


test('GF-011: GDD gera rotina diaria, missao secundaria e consequencias por escolha',()=>{
 const gdd=[
  '# Vila','## Fase 1','NPC: Exploradora Lia no sul',
  'Missão secundária do NPC: sim',
  'NPC rotina: manhã sul, tarde centro, noite norte',
  'Opção 1: Proteger | ir ao sul -> sobreviver 5 segundos | 120 pontos',
  'Opção 2: Investigar | ir ao sul -> sobreviver 7 segundos | 280 pontos',
  'Consequência opção 1: apoio na próxima fase',
  'Consequência opção 2: emboscada na próxima fase',
  '## Fase 2','3 inimigos rápidos'
 ].join('\n');
 const make=()=>StageSpec.compile({title:'Vila',genre:'arena',dimension:'3d',
  stages:['Vila','Ruínas'],stageConfig:[{},{}]},gdd);
 const spec=make(),npc=spec.stageConfig[0].npcQuest;
 assert.ok(npc);
 assert.equal(npc.sideQuest,true);
 assert.deepEqual(npc.routine,{morning:'south',afternoon:'center',night:'north'});
 assert.deepEqual(npc.choices.map(c=>c.effect),['aid','threat']);
 assert.equal(spec.stageSpecs[0].npcQuest.sideQuest,true);
 assert.deepEqual(spec.stageConfig,make().stageConfig);
 assert.match(StageSpec.report(spec),/Missão secundária: sim/);
 assert.ok(R.npcQuestContract(npc));
});
test('GF-011: rotina muda de zona no relogio de jogo; contratos invalidos sao pendentes',()=>{
 const npc={id:'npc-stage-01',name:'Lia',zone:'south',dialogue:'Ola',
  steps:[{id:'step-1',kind:'reach',zone:'south',label:'Ir ao sul'},
   {id:'step-2',kind:'survive',seconds:5,label:'Resistir'}],
  reward:{score:10,health:0,ammo:0},routine:{morning:'south',afternoon:'center',night:'north'},
  sideQuest:true};
 assert.deepEqual([0,29.9,30,59.9,60,89,90].map(R.npcDailyPeriod),
  ['morning','morning','afternoon','afternoon','night','night','morning']);
 assert.ok(R.npcRoutineTarget(npc,0,48).z>10);
 assert.equal(R.npcRoutineTarget(npc,32,48).z,0);
 assert.ok(R.npcRoutineTarget(npc,65,48).z<0);
 assert.equal(R.npcQuestContract({...npc,routine:{morning:'moon',afternoon:'center',night:'north'}}),null);
 assert.equal(R.npcQuestContract({...npc,sideQuest:'sim'}),null);
 const invalid=StageSpec.compile({title:'Vila',genre:'arena',dimension:'3d',
  stages:['A'],stageConfig:[{}]},'# Vila\n## Fase 1\nNPC: Guia no sul\nNPC rotina: manhã lua, tarde centro, noite sul\n'+
  'Missão do NPC: ir ao sul -> eliminar inimigos');
 assert.equal(invalid.stageSpecs[0].npcQuest.status,'pendente');
 const unsupported=StageSpec.compile({title:'Vila',genre:'arena',dimension:'3d',
  stages:['A'],stageConfig:[{}]},'# Vila\n## Fase 1\nNPC: Guia no sul\n'+
  'Opção 1: Ajudar | ir ao sul -> eliminar inimigos | 100 pontos\n'+
  'Opção 2: Fugir | ir ao norte -> coletar cristais | 100 pontos\n'+
  'Consequência opção 2: construir um castelo na fase 2');
 assert.equal(unsupported.stageSpecs[0].npcQuest.status,'pendente');
});
test('GF-011: quest secundaria não bloqueia missão principal e rotina move NPC de verdade',()=>{
 const quest={id:'npc-stage-01',name:'Lia',zone:'south',dialogue:'Posso ajudar',
  steps:[{id:'step-1',kind:'reach',zone:'south',label:'Sul'},
   {id:'step-2',kind:'survive',seconds:9,label:'Resistir'}],
  reward:{score:100,health:0,ammo:0},sideQuest:true,
  routine:{morning:'north',afternoon:'center',night:'south'}};
 const spec={genre:'arena',dimension:'3d',title:'Opcional',stages:['A'],
  stageConfig:[{mission:'survive',seconds:5,enemies:1,boss:'no',npcQuest:quest}],
  features:{bosses:false},worldOptions:{size:48,seed:42,quality:'low'},tuning:{difficulty:.25}};
 const b=boot(spec);b.start();b.tick(2);
 assert.equal(b.telemetry().npc.sideQuest,true);
 assert.equal(b.telemetry().npc.dayPeriod,'morning');
 assert.equal(b.telemetry().npc.state,'idle');
 assert.equal(b.telemetry().missionReady,false);
 const before=b.telemetry().npc.position;b.tick(60);
 const after=b.telemetry().npc.position;
 assert.ok(Math.hypot(before.x-after.x,before.z-after.z)>.7,'rotina tem que andar na direção norte');
 assert.equal(b.telemetry().missionSteps,0);
 assert.equal(b.telemetry().sideQuestSteps,2);
 b.tick(255);
 assert.equal(b.telemetry().missionReady,true,'o portal deve liberar sem falar com NPC opcional');
 assert.equal(b.telemetry().npc.state,'idle');
});
test('GF-011: apoio e emboscada persistem em checkpoint entre fases e não podem ser forjados',()=>{
 const npc={id:'npc-stage-01',name:'Guia',zone:'south',dialogue:'Escolha',sideQuest:true,
  steps:[{id:'step-1',kind:'reach',zone:'south',label:'Sul'},
   {id:'step-2',kind:'survive',seconds:5,label:'Resistir'}],
  reward:{score:100,health:0,ammo:0},choices:[
   {id:'choice-1',label:'Aliados',steps:[{id:'step-1',kind:'reach',zone:'south',label:'Sul'},
    {id:'step-2',kind:'survive',seconds:5,label:'Resistir'}],reward:{score:100,health:0,ammo:0},effect:'aid'},
   {id:'choice-2',label:'Inimigos',steps:[{id:'step-1',kind:'reach',zone:'south',label:'Sul'},
    {id:'step-2',kind:'survive',seconds:5,label:'Resistir'}],reward:{score:200,health:0,ammo:0},effect:'threat'}
  ]};
 const spec={title:'Campanha',genre:'arena',dimension:'3d',projectId:'gf-01234567-abcdef01',
  stages:['Vila','Fortaleza'],
  stageConfig:[{mission:'survive',seconds:5,enemies:1,boss:'no',npcQuest:npc},
   {mission:'eliminate',enemies:1,boss:'no'}],
  features:{bosses:false},worldOptions:{size:48,seed:42,quality:'low'},tuning:{difficulty:.25}};
 const key=R.checkpointKey(spec),run=number=>{
  const storage=new Map(),b=boot(spec,storage);b.start();b.tick(2);
  b.key('keydown','e');b.key('keydown',String(number));b.tick(2);
  assert.equal(b.telemetry().npc.state,'active');
  assert.equal(b.telemetry().sideQuestStepIndex,1);
  b.tick(315);
  assert.equal(b.telemetry().npc.state,'completed','missão extra precisa terminar antes de sair');
  b.key('keydown','w');b.tick(425);b.key('keyup','w');
  assert.equal(b.telemetry().stage,2,'campanha deve avançar para fase 2');
  assert.equal(b.telemetry().npc,null,'fase 2 não inclui NPC');
  const saved=R.readCheckpoint(storage.get(key),spec);
  assert.ok(saved,'checkpoint deve existir');
  assert.equal(saved.campaignEffect.kind,number===1?'aid':'threat');
  const restored=boot(spec,storage);restored.start();restored.tick(2);
  assert.equal(restored.telemetry().stage,2);
  assert.equal(restored.telemetry().campaignEffect.kind,saved.campaignEffect.kind);
  assert.equal(restored.telemetry().enemies,b.telemetry().enemies);
  restored.restart();restored.tick(1);
  assert.equal(restored.telemetry().campaignEffect,null);
  assert.equal(storage.has(key),false);
  return {saved,live:b.telemetry()};
 };
 const aid=run(1),threat=run(2);
 assert.equal(aid.live.enemies,1);
 assert.equal(threat.live.enemies,3,'emboscada cria dois inimigos adicionais');
 assert.ok(aid.saved.ammo>=100,'apoio inclui munição extra');
 assert.equal(R.readCheckpoint(JSON.stringify({...aid.saved,campaignEffect:
  {...aid.saved.campaignEffect,kind:'threat'}}),spec),null,'não se pode trocar ajuda por ameaça no save');
 assert.equal(R.readCheckpoint(JSON.stringify({...threat.saved,campaignEffect:
  {...threat.saved.campaignEffect,sourceStage:99}}),spec),null);
 assert.equal(R.npcMissionEffect({...npc,choices:npc.choices.map(c=>({...c,effect:'invented'}))},
  'choice-1',0),null);
});


test('GF-TRAIN-21: fase simples salva progresso real, retoma na mesma posicao e Reiniciar limpa',()=>{
 const spec={genre:'arena',dimension:'3d',title:'Campo com Save',projectId:'gf-01234567-abcdef01',
  stages:['Pátio','Fortaleza'],stageConfig:[{mission:'survive',seconds:40,enemies:1,boss:'no'},{}],
  features:{bosses:false},worldOptions:{size:48,seed:42,quality:'low'},tuning:{difficulty:.25}};
 const store=new Map(),key=R.midStageKey(spec),a=boot(spec,store);
 assert.ok(key&&key!==R.checkpointKey(spec));
 assert.equal(a.telemetry().midStageAvailable,false);
 a.start();a.key('keydown','w');a.tick(180);a.key('keyup','w');
 a.elements.pause.click(); // pausa grava o estado atual, alem do autosave periodico
 const saved=R.readMidStage(store.get(key),spec);
 assert.ok(saved,'save real deve existir após 3 segundos de simulação');
 assert.equal(saved.stage,0);assert.ok(saved.stageClock>=2.9);
 assert.ok(saved.player.z<13.44,'jogador moveu na fase antes de salvar');
 assert.ok(saved.enemies.length>0);
 const resumed=boot(spec,store);
 assert.match(resumed.elements.start.textContent,/Continuar fase 1/);
 resumed.start();resumed.tick(1);
 const t=resumed.telemetry();
 assert.equal(t.midStageRestored,true);
 assert.equal(t.stage,1,'deve continuar na fase 1, não pular para a fase 2');
 assert.ok(Math.abs(t.player.y/100-saved.player.z)<.05,
  'Telemetria 3D usa player.y para o eixo Z do mundo, nao player.z (altura)');
 assert.ok(Math.abs(t.clock-saved.clock)<.1);
 assert.ok(Math.abs(t.enemies-saved.enemies.length)<1);
 resumed.restart();
 assert.equal(store.has(key),false,'Reiniciar deve limpar save intermediário');
 assert.equal(store.has(R.checkpointKey(spec)),false);
});
test('GF-TRAIN-21: validações de snapshot rejeitam fraude e estado incompativel',()=>{
 const spec={genre:'fps',dimension:'3d',title:'Teste FPS',projectId:'gf-01234567-abcdef01',
  stages:['Rua','Torre'],stageConfig:[{mission:'collect'},{}],
  worldOptions:{size:48},features:{}};
 const base={stage:0,health:80,score:140,ammo:20,clock:35,stageClock:19,
  rpgLevel:1,rpgXP:0,rpgPotions:2,player:{x:2,z:1,yaw:0},
  enemies:[{id:0,x:0,z:0,hp:2}],coinsTaken:[0,2]};
 const valid=R.midStagePayload(spec,base);
 assert.ok(valid);assert.equal(R.readMidStage(JSON.stringify(valid),spec).coinsTaken.length,2);
 for(const changed of [
  {...valid,stage:-1},{...valid,health:0},{...valid,player:{x:800,z:0,yaw:0}},
  {...valid,enemies:[valid.enemies[0],valid.enemies[0]]},
  {...valid,coinsTaken:[0,0]},{...valid,stageClock:-3},
  {...valid,fingerprint:'wrong'}, {...valid,version:99}
 ])assert.equal(R.readMidStage(JSON.stringify(changed),spec),null);
 assert.equal(R.readMidStage(JSON.stringify(valid),{...spec,projectId:'gf-22222222-abcdef01'}),null);
 assert.equal(R.readMidStage(JSON.stringify(valid),{...spec,stageConfig:[{mission:'eliminate'},{}]}),null);
 assert.equal(R.midStagePayload({...spec,combatEconomy:{enabled:true}},base),null);
});
test('GF-TRAIN-22: contratos inválidos, shooter e plataforma não recebem save indevido',()=>{
 const base={genre:'rpg',dimension:'3d',projectId:'gf-01234567-abcdef01',stages:['A','B']};
 for(const config of [
  {npcQuest:{id:'npc'}},
  {events:[{id:'heal',at:5,type:'heal'}]},
  {zoneEvents:[{id:'entered',zone:'north'}]},
  {missionSteps:[{id:'reach',kind:'reach'}]},
  {sideQuestSteps:[{id:'one'}]}
 ]){
  const spec={...base,stageConfig:[config,{}]};
  assert.equal(R.midStageEligible(spec,0),false);
 }
 for(const genre of ['shooter','platform','racing','urban-action']){
  assert.equal(R.midStageKey({...base,genre}),null);
 }
 const spec={...base,stageConfig:[{mission:'survive',seconds:40,enemies:1,boss:'no'},{}],
  worldOptions:{size:48,seed:42,quality:'low'},tuning:{difficulty:.25}};
 const storage=new Map(),saved=boot(spec,storage);
 saved.start();saved.tick(125);
 const key=R.midStageKey(spec);assert.ok(storage.has(key));
 const sameTitleDifferentProject={...spec,projectId:'gf-00000000-00000001'};
 assert.notEqual(R.midStageKey(spec),R.midStageKey(sameTitleDifferentProject));
});

test('GF-TRAIN-22: NPC completo, escolhas, cura e reforços não repetem após recarregar',()=>{
 const steps=[{id:'step-1',kind:'reach',zone:'south',label:'Sul'},
  {id:'step-2',kind:'survive',seconds:5,label:'Resistir'}];
 const npc={id:'npc-stage-01',name:'Guia',zone:'south',dialogue:'Escolha',
  steps,reward:{score:200,health:0,ammo:30},choices:[
   {id:'choice-1',label:'Aliados',steps,reward:{score:200,health:0,ammo:30}},
   {id:'choice-2',label:'Outro',steps,reward:{score:300,health:0,ammo:20}}]};
 const spec={genre:'arena',dimension:'3d',projectId:'gf-01234567-abcdef01',
  stages:['Vila','Torre'],stageConfig:[{enemies:1,boss:'no',npcQuest:npc,
   events:[{id:'event-heal',type:'heal',at:5,amount:10}],
   zoneEvents:[{id:'zone-reinforcements-south',type:'reinforcements',zone:'south',amount:2}]},{}],
  features:{bosses:false},worldOptions:{size:48,seed:42,quality:'low'},tuning:{difficulty:.25}};
 const storage=new Map(),key=R.midStageKey(spec),a=boot(spec,storage);
 assert.ok(R.midStageEligible(spec,0));a.start();a.tick(2);
 a.key('keydown','e');a.key('keydown','1');a.tick(2);a.tick(130);a.elements.pause.click();
 const active=R.readMidStage(storage.get(key),spec);assert.ok(active);
 assert.equal(active.script.npcStatus,'active');assert.equal(active.script.choice,'choice-1');
 assert.equal(active.script.mainIndex,1);assert.ok(active.script.fired.includes('zone-reinforcements-south'));
 const b=boot(spec,storage);b.start();b.tick(1);
 assert.equal(b.telemetry().midStageRestored,true);
 assert.equal(b.telemetry().npc.choice,'choice-1');assert.equal(b.telemetry().enemies,active.enemies.length);
 b.tick(200);assert.equal(b.telemetry().npc.state,'completed');assert.equal(b.telemetry().score,200);
 assert.ok(b.telemetry().eventsFired.includes('event-heal'));b.elements.pause.click();
 const done=R.readMidStage(storage.get(key),spec);assert.ok(done);
 const c=boot(spec,storage);c.start();c.tick(1);assert.equal(c.telemetry().midStageRestored,true);
 assert.equal(c.telemetry().npc.state,'completed');assert.equal(c.telemetry().score,200);
 const count=c.telemetry().enemies;c.key('keydown','e');c.tick(60);
 assert.equal(c.telemetry().score,200);assert.equal(c.telemetry().enemies,count);
 for(const script of [{...done.script,fired:['unknown']},{...done.script,fired:[]},
  {...done.script,mainIndex:0},{...done.script,choice:'choice-99'}]){
  assert.equal(R.readMidStage(JSON.stringify({...done,script}),spec),null);
 }
 assert.equal(R.readMidStage(JSON.stringify({...done,script:undefined}),spec),null);
});
