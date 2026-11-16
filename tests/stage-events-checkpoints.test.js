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
 const handlers={},elements={},frames=[];let elapsed=0;
 const element=id=>elements[id]||(elements[id]={
  textContent:'',style:{},classList:{add(){},remove(){}},dataset:{},
  addEventListener(type,fn){this[type]=fn;},focus(){},
  getContext(){return {fillRect(){},setTransform(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){}};},
  getBoundingClientRect(){return {width:960,height:540};}
 });
 const THREE={...THREE_CTX.THREE,WebGLRenderer:class{
  constructor(){this.shadowMap={};this.info={render:{calls:0},memory:{geometries:0}};this.renderLists={dispose(){}};}
  setClearColor(){}setPixelRatio(){}setSize(w,h){element('game').width=w;element('game').height=h;}
  render(){}
 }};
 const localStorage={
  getItem(k){return storage.has(k)?storage.get(k):null;},
  setItem(k,v){storage.set(k,String(v));},
  removeItem(k){storage.delete(k);}
 };
 const env={THREE,GAME_SPEC:spec,localStorage,document:{
  getElementById:element,querySelectorAll:()=>[],addEventListener(){}
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
  telemetry:()=>env.__gameforgeTelemetry(),elements,storage};
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
