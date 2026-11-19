'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const GF18=require('../js/qa-3d-persistence'),Evidence=require('../js/requirement-evidence');
const files={'game.js':'const GAME_SPEC={genre:"urban-action"}','style.css':'body{}'};
const urbanSpec={genre:'urban-action',dimension:'3d',title:'Cidade Teste'};
const rpgSpec={genre:'rpg',dimension:'3d',title:'RPG Teste',projectId:'gf-a1b2c3d4-11223344',
 stages:['Portal 1','Portal 2','Portal 3']};
const urban={instruction:'Salvar e continuar o jogo urbano 3D',gdd:'# Cidade',spec:urbanSpec,files};
const rpg={instruction:'Checkpoint da missão RPG 3D',gdd:'# RPG',spec:rpgSpec,files};
const html='<html><head><meta http-equiv="Content-Security-Policy" content="script-src \'unsafe-inline\'"></head><body>gameforge-qa</body></html>';
const saveKey='gameforge-urban-v1-cidade-teste';
const progress={version:1,x:6,z:9,heading:1.57,health:100,cash:1000,ammo:12,reserve:48,guardHp:75,guardDefeated:false,captured:false,missionComplete:false,rewardGranted:false};
const urbanState=(x,z=9)=>({state:'play',genre:'urban-action',dimension:'3d',
 player:{x,z},health:100,score:1000,ammo:12,reserve:48,enemyHp:75,
 mission:{guardDefeated:false,captured:false,complete:false,rewardGranted:false}});
const campaignKey='gameforge-campaign-v1:rpg:gf-a1b2c3d4-11223344';
const checkpoint={version:1,projectId:'gf-a1b2c3d4-11223344',stage:1,health:85,score:300,ammo:80,clock:20,
 rpgLevel:2,rpgXP:80,rpgPotions:2};
function transportSimulator(options={}){
 const lifecycle={frames:0,removed:0,closed:0,events:[],srcdoc:[]};
 const frameFactory=()=>({set srcdoc(value){lifecycle.srcdoc.push(value);},remove(){lifecycle.removed++;}});
 const transportFactory=()=>{
  const number=++lifecycle.frames;let moved=false,started=false;
  return {send:async(a,params={})=>{
   lifecycle.events.push({number,a,params});
   if(a==='ping')return {ready:true};
   if(a==='start'){started=true;return {};}
   if(a==='press'){moved=true;return {};}
   if(a==='release')return {};
   if(a==='qa-click'&&params.target==='pause')return {clicked:true};
   if(a==='qa-storage'){
    return {virtual:true,entries:options.missingRecord?{}:
      options.campaign?{[campaignKey]:JSON.stringify(checkpoint)}:{[saveKey]:JSON.stringify(options.saved||progress)}};
   }
   if(a==='inspect'){
    const tel=options.campaign?
     {state:started?'play':'menu',genre:'rpg',stage:number===2?2:1,health:85,score:300,ammo:80,
      rpg:{level:2,xp:80,potions:2}}:
     {...urbanState(number===2||moved?6:0),state:started?'play':'menu'};
    if(number===2&&options.recoverMismatch){tel.player.x=1;}
    return {telemetry:tel};
   }
   throw Error('Action not supported '+a);
  },close(){lifecycle.closed++;}};
 };
 return {...lifecycle,frameFactory,transportFactory,
  get removedCount(){return lifecycle.removed;},get closeCount(){return lifecycle.closed;},
  get frameCount(){return lifecycle.frames;}};
}
test('GF18: plano distingue contrato urbano, RPG válido e projetos sem checkpoint',()=>{
 assert.equal(GF18.plan(urban).contract,'URBAN_AUTOSAVE_V1');
 assert.equal(GF18.plan(rpg).contract,'CAMPAIGN_CHECKPOINT_V1');
 assert.equal(GF18.plan({...rpg,spec:{...rpgSpec,projectId:'sem-id'}}).applicable,false);
 assert.equal(GF18.plan({...urban,spec:{...urbanSpec,genre:'simulation'}}).applicable,false);
});
test('GF18: chaves permitidas limitam acesso à origem e backups externos',()=>{
 assert.equal(GF18.permittedKey(saveKey),true);
 assert.equal(GF18.permittedKey(saveKey+':backup'),true);
 assert.equal(GF18.permittedKey(campaignKey),true);
 for(const forbidden of ['gameforge-studio-v03','token','gameforge-campaign-v1:rpg:evil',
  '__proto__',saveKey+':secrets','gameforge-urban-v1-../foo'])
  assert.equal(GF18.permittedKey(forbidden),false,forbidden);
 assert.deepEqual(Object.keys(GF18.clean({[saveKey]:'ok',password:'bad'})),[saveKey]);
});
test('GF18: armazenamento virtual realmente não usa storage do Studio',()=>{
 const fakeWindow={};
 new Function('window','('+GF18.boot.toString()+')({});')(fakeWindow);
 fakeWindow.localStorage.setItem(saveKey,'ok');
 assert.equal(fakeWindow.__gameforgeQA18Storage.dump()[saveKey],'ok');
 assert.throws(()=>fakeWindow.localStorage.setItem('gameforge-studio-v03','secret'),/recusado/);
});
test('GF18: injeção usa CSP existente e mantém o sandbox opaco',()=>{
 const clone=GF18.inject(html,{[saveKey]:'ok'});
 assert.match(clone,/GF18_VIRTUAL_STORE/);
 assert.doesNotMatch(clone,/sandbox="allow-same-origin"/);
 assert.throws(()=>GF18.inject('<html>gameforge-qa</html>'),/CSP/);
});
test('GF18: compara campos estáveis, rejeita restauração parcial',()=>{
 assert.equal(GF18.sameUrban(progress,urbanState(6)),true);
 assert.equal(GF18.sameUrban(progress,urbanState(1)),false);
 assert.equal(GF18.sameUrban({...progress,version:8},urbanState(6)),false);
 assert.equal(GF18.campaignMatches(checkpoint,{genre:'rpg',stage:2,health:85,score:300,ammo:80,
  rpg:{level:2,xp:80,potions:2}}),true);
 assert.equal(GF18.campaignMatches(checkpoint,{genre:'rpg',stage:1,health:85,score:300,ammo:80,
  rpg:{level:2,xp:80,potions:2}}),false);
});
test('GF18: salva urbano após movimento e recupera em outro clone',async()=>{
 const fake=transportSimulator();
 const suite=await GF18.run({...urban,html,plan:GF18.plan(urban),
  frameFactory:fake.frameFactory,transportFactory:fake.transportFactory,sleep:async()=>{}});
 assert.equal(suite.status,'PASS');
 assert.equal(suite.scenario.observed.destroyedClone,true);
 assert.equal(fake.frameCount,2);
 assert.equal(fake.removedCount,2);
 assert.equal(fake.closeCount,2);
 assert.ok(fake.events.some(e=>e.a==='press'&&e.params.key==='ArrowRight'));
 assert.ok(fake.events.some(e=>e.a==='release'&&e.params.key==='ArrowRight'));
 assert.ok(!fake.events.some(e=>['reset','evaluate','edit'].includes(e.a)));
});
test('GF18: gravação ausente não é aprovada e fecha o clone',async()=>{
 const fake=transportSimulator({missingRecord:true});
 const r=await GF18.run({...urban,html,frameFactory:fake.frameFactory,
  transportFactory:fake.transportFactory,sleep:async()=>{}});
 assert.equal(r.status,'INCONCLUSIVE');
 assert.equal(fake.removedCount,1);
 assert.equal(fake.closeCount,1);
});
test('GF18: registro incompatível é erro, não aprovação',async()=>{
 const fake=transportSimulator({recoverMismatch:true});
 const result=await GF18.run({...urban,html,frameFactory:fake.frameFactory,
  transportFactory:fake.transportFactory,sleep:async()=>{}});
 assert.equal(result.status,'FAIL');
 assert.equal(fake.removedCount,2);
});
test('GF18: checkpoint só é positivo quando foi gerado e restaurado na fase correta',async()=>{
 const fake=transportSimulator({campaign:true});
 const result=await GF18.run({...rpg,html,frameFactory:fake.frameFactory,
  transportFactory:fake.transportFactory,sleep:async()=>{}});
 assert.equal(result.status,'PASS');
 assert.equal(fake.removedCount,2);
 const absent=transportSimulator({campaign:true,missingRecord:true});
 const unverified=await GF18.run({...rpg,html,frameFactory:absent.frameFactory,
  transportFactory:absent.transportFactory,sleep:async()=>{}});
 assert.equal(unverified.status,'INCONCLUSIVE');
 assert.match(unverified.reason,/fase/);
});
test('GF18: alteração no GLB ou GDD invalida evidências',()=>{
 const p=GF18.plan(urban),suite=GF18.decision(p,'PASS','observado');
 assert.equal(GF18.valid(suite,urban,files),true);
 assert.equal(GF18.valid(suite,urban,{...files,'ASSET_LIBRARY.json':'updated'}),false);
 assert.equal(GF18.valid(suite,{...urban,instruction:'Mude tudo'},files),false);
});
test('GF18: observação 3D é sempre parcial na matriz',()=>{
 const p=GF18.plan(urban),suite=GF18.decision(p,'PASS','Observação urbana 3D');
 const matrix=Evidence.extract(urban);
 const merged=GF18.attach(matrix,suite,urban,files);
 assert.ok(merged.requirements.some(r=>r.status==='OBSERVED_PARTIAL'));
 assert.ok(!merged.requirements.some(r=>r.status==='VERIFIED'));
});
test('GF18: compatibilidade real de chave e payload do checkpoint de mundo',()=>{
 const World=require('../js/world-rules')();
 assert.equal(World.checkpointKey(rpgSpec),campaignKey);
 assert.deepEqual(World.readCheckpoint(JSON.stringify(checkpoint),rpgSpec),checkpoint);
 assert.equal(World.readCheckpoint(JSON.stringify({...checkpoint,stage:0}),rpgSpec),null);
 assert.equal(World.checkpointKey({...rpgSpec,projectId:'invalid'}),null);
});
test('GF18: arquivos de evidência sobrevivem ao backup sem reescrever game.js',()=>{
 const Backup=require('../js/project-backup');
 const original={name:'GF18',gdd:'# Teste',files:{...files,
  'RESULTADOS_3D_GF18.json':'{"version":18}','RELATORIO_3D_GF18.md':'# GF18'}};
 const restored=Backup.decode(Backup.encode(original));
 assert.equal(restored.files['RESULTADOS_3D_GF18.json'],'{"version":18}');
 assert.equal(restored.files['RELATORIO_3D_GF18.md'],'# GF18');
 assert.equal(restored.files['game.js'],files['game.js']);
});
test('GF18: painel, scripts e bridge para storage virtual conectados',()=>{
 const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 const html=read('index.html'),app=read('js/app.js'),bridge=read('js/qa-bridge.js');
 assert.match(html,/id="gf18-run"/);
 assert.ok(html.indexOf('js/qa-3d-persistence.js')<html.indexOf('js/app.js'));
 assert.match(app,/GameForge3DPersistenceQA\.run/);
 assert.match(app,/suite3DForCurrent/);
 assert.match(bridge,/GF18_VIRTUAL_STORE/);
});

test('GF18: fluxo de missões urbanas v2 usa chave própria e restaura objetivos',async()=>{
 const plan=[{id:'mission-01',title:'Capturar provas',reward:200,steps:[
  {id:'item-01',action:'collect',target:'evidence',quantity:1,requires:[]}
 ]}];
 const Flow=require('../js/urban-mission-flow')();
 const base=Flow.initial(plan),record={...base,position:{x:6,z:9}};
 const key='gameforge-urban-missions-v2-bairro-de-teste';
 const v2spec={genre:'urban-action',dimension:'3d',title:'Bairro de teste',urbanMissions:plan};
 const v2={...urban,spec:v2spec};
 assert.equal(GF18.plan(v2).contract,'URBAN_MISSIONS_V2');
 assert.equal(GF18.permittedKey(key),true);
 assert.equal(GF18.permittedKey(key+':pending'),true);
 assert.equal(GF18.sameUrbanMission(record,{
  ...urbanState(6),stage:1,mission:{progress:Flow.progress(plan,record).steps,rewards:[]}
 }),true);
 assert.equal(GF18.sameUrbanMission({...record,counts:{'item-01':1}},{
  ...urbanState(6),stage:1,mission:{progress:Flow.progress(plan,record).steps,rewards:[]}
 }),false);
 let count=0,deleted=0,closed=0;
 const factory=()=>({set srcdoc(_){},remove(){deleted++;}});
 const transport=()=>{const instance=++count;let moved=false,playing=false;return {
  send:async(action,args={})=>{
   if(action==='ping')return {ready:true};
   if(action==='start'){playing=true;return {};}
   if(action==='press'){moved=true;return {};}
   if(action==='release')return {};
   if(action==='qa-click'&&args.target==='pause')return {clicked:true};
   if(action==='qa-storage')return {virtual:true,entries:{[key]:JSON.stringify(record)}};
   if(action==='inspect'){
    const x=instance===2||moved?6:0;
    const t={...urbanState(x),state:playing?'play':'menu',stage:1,
     mission:{progress:Flow.progress(plan,{...record,position:{x,z:9}}).steps,rewards:[]}};
    return {telemetry:t};
   }
   throw Error(action);
  },close(){closed++}
 }};
 const result=await GF18.run({...v2,html,frameFactory:factory,transportFactory:transport,sleep:async()=>{}});
 assert.equal(result.status,'PASS');
 assert.equal(result.contract,'URBAN_MISSIONS_V2');
 assert.equal(deleted,2);assert.equal(closed,2);
});
test('GF18: salva e valida registro real produzido pelas regras urbanas v2',()=>{
 const Flow=require('../js/urban-mission-flow')();
 const Save=require('../js/urban-save')();
 const plan=[{id:'m1',title:'Missão',reward:10,steps:[
  {id:'s1',action:'deliver',target:'warehouse',quantity:1,requires:[]}
 ]}];
 const fakeWindow={};
 new Function('window','('+GF18.boot.toString()+')({});')(fakeWindow);
 const key='gameforge-urban-missions-v2-teste';
 const store=Save.create(()=>fakeWindow.localStorage,key,raw=>Flow.restore(plan,raw));
 let state=Flow.initial(plan);state={...state,position:{x:5,z:7}};
 assert.equal(store.write(state),true);
 const restored=store.read();
 assert.equal(restored.position.x,5);
 assert.deepEqual(restored.rewards,[]);
 assert.ok(Object.keys(fakeWindow.__gameforgeQA18Storage.dump()).includes(key));
});

test('GF18: a gravação urbana deve ocorrer pela pausa do jogo, não por injeção de estado',async()=>{
 const fake=transportSimulator();
 await GF18.run({...urban,html,frameFactory:fake.frameFactory,
  transportFactory:fake.transportFactory,sleep:async()=>{}});
 assert.ok(fake.events.some(e=>e.a==='qa-click'&&e.params.target==='pause'));
 const bridge=fs.readFileSync(path.join(__dirname,'..','js/qa-bridge.js'),'utf8');
 assert.match(bridge,/window\.__gameforgeQA18Storage\?\.kind/);
});
