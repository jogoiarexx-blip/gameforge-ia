'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const createRules=require('../js/urban-rules.js');
const R=createRules();
test('URB-01 colisão do jogador usa volumes XZ reais e permite deslizar na parede',()=>{
 const blocks=[{x:-8,z:0,w:4,d:5}];
 const actor={x:-5,z:0};
 const blocked=R.move(actor,-3,0,blocks,17,.4);
 assert.equal(blocked.x,-5,'não atravessa edifício');
 const slide=R.move(actor,-3,-4,blocks,17,.4);
 assert.equal(slide.x,-5);
 assert.equal(slide.z,-4,'continua deslizando pelo eixo livre');
 const bounds=R.move({x:16.5,z:16.5},80,90,[],17,.4);
 assert.ok(bounds.x<=16.6&&bounds.z<=16.6);
});
test('URB-01 tiro respeita direção, alcance e oclusão dos edifícios',()=>{
 const shot={x:0,z:9,heading:0};
 assert.equal(R.canHit(shot,{x:0,z:1.5},[]),true);
 assert.equal(R.canHit(shot,{x:0,z:19},[]),false,'nunca atirar para trás');
 assert.equal(R.canHit(shot,{x:0,z:-20},[]),false,'respeita alcance');
 const wall=[{x:0,z:5,w:2,d:2}];
 assert.equal(R.canHit(shot,{x:0,z:1.5},wall),false,'muro bloqueia o disparo');
});
test('URB-01 captura exige proximidade, eliminação do guarda e concede recompensa uma vez',()=>{
 const base={cash:1000,guardDefeated:false,captured:false,rewardGranted:false};
 assert.equal(R.capture(base,true).changed,false);
 assert.equal(R.capture({...base,guardDefeated:true},false).changed,false);
 const first=R.capture({...base,guardDefeated:true},true);
 assert.equal(first.changed,true);
 assert.equal(first.state.cash,1450);
 assert.equal(first.state.missionComplete,true);
 const repeated=R.capture(first.state,true);
 assert.equal(repeated.changed,false);
 assert.equal(repeated.state.cash,1450);
});
test('URB-01 save valida versão/tipos/posições e nunca recupera objetos de motor',()=>{
 const saved={version:1,x:100,z:-100,health:150,cash:2000,ammo:9,reserve:20,
  guardHp:0,guardDefeated:true,captured:true,rewardGranted:true,heading:0};
 const restored=R.load(saved);
 assert.equal(restored.x,16.5);assert.equal(restored.z,-16.5);
 assert.equal(restored.health,100);
 assert.equal(restored.captured,true);
 assert.equal(restored.rewardGranted,true);
 assert.equal(restored.guardHp,0);
 assert.equal(R.load({...saved,version:2}),null);
 assert.equal(R.load({...saved,x:'alert(1)'}),null);
 assert.equal(R.load({...saved,cash:Infinity}),null);
 assert.equal(R.load({...saved,guardDefeated:'yes'}),null);
});

test('URB-02 camera recua diante de paredes, sem atravessar volumes ou teletransportar o jogador',()=>{
 const buildings=[{x:2,z:2,w:2,d:2}];
 const eye={x:0,y:1.5,z:0},requested={x:4,y:4.4,z:4};
 const camera=R.cameraPosition(eye,requested,buildings);
 assert.equal(camera.occluded,true,'camera detecta o obstaculo no trajeto');
 assert.ok(camera.x<.75&&camera.z<.75,'camera para antes da parede com margem');
 assert.equal(R.intersects(camera.x,camera.z,.26,buildings[0]),false);
 assert.deepEqual(eye,{x:0,y:1.5,z:0},'calculo nao move o personagem');
 const unobstructed=R.cameraPosition(eye,{x:-4,y:4.4,z:4},buildings);
 assert.equal(unobstructed.occluded,false);
 assert.equal(unobstructed.x,-4);
 assert.equal(unobstructed.z,4);
});
test('URB-02 considera altura e impede camera de cortar uma esquina durante a suavizacao',()=>{
 const eye={x:0,y:1.5,z:0},building={x:2,z:2,w:2,d:2,h:1};
 const high=R.cameraPosition(eye,{x:4,y:8,z:4},[building]);
 assert.equal(high.occluded,false,'camera pode passar por cima de objeto baixo');
 const tall={...building,h:5};
 const first=R.cameraPosition(eye,{x:4,y:4,z:4},[tall]);
 assert.equal(first.occluded,true);
 const blended=R.cameraPosition(eye,{x:3,y:3.2,z:3},[tall]);
 assert.ok(blended.x<.75);
 assert.equal(R.intersects(blended.x,blended.z,.26,tall),false);
});
test('URB-02 ambos os modos 3D utilizam colisao da camera na atualizacao e inicializacao',()=>{
 const fs=require('node:fs'),path=require('node:path');
 for(const file of ['urban-runtime.js','urban-mission-runtime.js']){
  const code=fs.readFileSync(path.join(__dirname,'../js',file),'utf8');
  assert.match(code,/const desired=R\.cameraPosition\(/);
  assert.match(code,/const safe=R\.cameraPosition\(/);
  assert.match(code,/const firstCamera=R\.cameraPosition\(/);
  assert.match(code,/cameraOccluded/);
 }
});

test('URB-02 guardas transitam entre patrulha, alerta, busca e combate com visao geometrica',()=>{
 const start={x:0,z:0,homeX:0,homeZ:0};
 const idle=R.guardStep(start,{x:25,z:25},.05);
 assert.equal(idle.mode,'patrol');
 assert.equal(idle.canAttack,false);
 const alert=R.guardStep(start,{x:0,z:7},.05);
 assert.equal(alert.mode,'alert');
 assert.ok(alert.z>start.z,'guarda caminha em direcao ao jogador percebido');
 assert.equal(alert.memory,2.4);
 const hidden=R.guardStep(alert,{x:0,z:7},.05,[{x:0,z:3,w:3,d:1.6}]);
 assert.equal(hidden.mode,'search','guarda procura a ultima posicao apos perder a visao');
 assert.equal(hidden.canAttack,false,'nao causa dano atraves de parede');
 assert.ok(hidden.memory<alert.memory);
 const expired=R.guardStep({...hidden,memory:.01},{x:25,z:25},.05);
 assert.equal(expired.mode,'patrol','guarda volta ao patrulhamento quando a busca termina');
 const fight=R.guardStep(start,{x:0,z:1},.05);
 assert.equal(fight.mode,'combat');
 assert.equal(fight.canAttack,true);
});
test('URB-02 IA respeita timestep e colisao e integra os dois runtimes',()=>{
 const obstacle={x:0,z:3,w:2,d:2};
 let guard={x:0,z:0,homeX:0,homeZ:0};
 for(let i=0;i<120;i++)guard=R.guardStep(guard,{x:0,z:7},1/60,[obstacle]);
 assert.equal(R.intersects(guard.x,guard.z,.36,obstacle),false);
 assert.ok(Number.isFinite(guard.x)&&Number.isFinite(guard.z));
 const noDelta=R.guardStep(guard,{x:0,z:7},0,[obstacle]);
 assert.equal(noDelta.x,guard.x);
 assert.equal(noDelta.z,guard.z);
 const fs=require('node:fs'),path=require('node:path');
 for(const file of ['urban-runtime.js','urban-mission-runtime.js']){
  const source=fs.readFileSync(path.join(__dirname,'../js',file),'utf8');
  assert.match(source,/R\.guardStep\(/);
 }
});
