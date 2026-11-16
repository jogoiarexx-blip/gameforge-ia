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

test('URB-02 route planner contorna edificio entre guarda e ultimo destino',()=>{
 const building={x:0,z:4,w:3,d:3},start={x:0,z:0},goal={x:0,z:8};
 assert.equal(R.routeClear(start,goal,[building]),false);
 const route=R.planGuardRoute(start,goal,[building]);
 assert.ok(route.length>=3,'desvio tem curvas de esquina ate o destino');
 assert.deepEqual(route.at(-1),goal);
 let previous=start,distance=0;
 for(const point of route){
  assert.equal(R.routeClear(previous,point,[building]),true,'cada segmento deve estar livre');
  assert.equal(R.intersects(point.x,point.z,.42,building),false);
  distance+=Math.hypot(point.x-previous.x,point.z-previous.z);previous=point;
 }
 assert.ok(distance>8,'caminho de desvio nao e a reta que atravessa o predio');
 assert.deepEqual(R.planGuardRoute(start,goal,[]),[goal],'sem obstaculo nao precisa desvio');
});
test('URB-02 nao inventa rotas inalcancaveis ou para destino dentro de edificio',()=>{
 const wall={x:0,z:4,w:5,d:4};
 assert.deepEqual(R.planGuardRoute({x:0,z:0},{x:0,z:4},[wall]),[]);
 assert.deepEqual(R.planGuardRoute({x:0,z:0},{x:25,z:0},[wall]),[]);
 assert.deepEqual(R.planGuardRoute({x:0,z:0},{x:NaN,z:1},[wall]),[]);
 const pair=[{x:0,z:4,w:3,d:3},{x:-8,z:4,w:4,d:5}];
 const route=R.planGuardRoute({x:0,z:0},{x:-11,z:8},pair);
 assert.ok(route.length>0);
 let source={x:0,z:0};
 for(const destination of route){
  assert.ok(R.routeClear(source,destination,pair));
  source=destination;
 }
});
test('URB-02 guarda executa rota com timestep fixo, sem cortar parede nem se teletransportar',()=>{
 const building={x:0,z:4,w:3,d:3};
 const player={x:25,z:25}; // fora do raio: procura a ultima posicao conhecida
 let g={x:0,z:0,homeX:0,homeZ:0,memory:12,lastSeenX:0,lastSeenZ:8};
 let travelled=0,hadWaypoints=false;
 for(let i=0;i<600;i++){
  const next=R.guardStep(g,player,1/60,[building]);
  const dist=Math.hypot(next.x-g.x,next.z-g.z);
  assert.ok(dist<=1.1/60+.001,'velocidade nunca ultrapassa a configurada');
  assert.equal(R.intersects(next.x,next.z,.36,building),false,'nao atravessa o predio');
  assert.equal(next.canAttack,false,'nao ataca sem visao do jogador');
  hadWaypoints ||= next.navRoute.length>1;
  travelled+=dist;g=next;
 }
 assert.equal(hadWaypoints,true);
 assert.ok(g.z>7.5&&Math.abs(g.x)<1,'guarda chega ao objetivo por outro caminho');
 assert.ok(travelled>8.5,'caminhou mais que a distancia em linha reta');
});
test('URB-02 cache de rota reduz recalculo continuo e nao muda estado parado',()=>{
 const building={x:0,z:4,w:3,d:3},player={x:25,z:25};
 const start={x:0,z:0,homeX:0,homeZ:0,memory:8,lastSeenX:0,lastSeenZ:8};
 const a=R.guardStep(start,player,1/60,[building]);
 assert.ok(a.navCooldown>.6);
 const b=R.guardStep(a,player,1/60,[building]);
 assert.ok(b.navCooldown<a.navCooldown,'decrementa cooldown de caminho');
 assert.deepEqual(b.navRoute,a.navRoute,'mantem rota em vez de refazer sem necessidade');
 const frozen=R.guardStep(b,player,0,[building]);
 assert.equal(frozen.x,b.x);
 assert.equal(frozen.z,b.z);
 assert.equal(frozen.navCooldown,b.navCooldown);
});

test('URB-02 falha de rota nao causa replanejamento 60 vezes por segundo',()=>{
 const block={x:0,z:2,w:3,d:2},target={x:0,z:2,noise:true};
 const start={x:0,z:0,homeX:0,homeZ:0};
 const first=R.guardStep(start,target,1/60,[block]);
 assert.deepEqual(first.navRoute,[],'destino dentro de predio e inalcancavel');
 assert.ok(first.navCooldown>.6);
 const second=R.guardStep(first,{...target,noise:false},1/60,[block]);
 assert.ok(second.navCooldown<first.navCooldown,'falha e armazenada ate o proximo intervalo');
 assert.equal(R.intersects(second.x,second.z,.36,block),false);
});

test('URB-02 som faz guarda investigar atras de predio por caminho sem atacar atraves da parede',()=>{
 const building={x:0,z:2,w:3,d:1};
 const start={x:0,z:0,homeX:0,homeZ:0},player={x:0,z:4,noise:true};
 assert.equal(R.clearShot(start,player,[building]),false);
 const silent=R.guardStep(start,{...player,noise:false},1/60,[building]);
 assert.equal(silent.mode,'patrol','jogador parado nao e localizado por som inventado');
 const heard=R.guardStep(start,player,1/60,[building]);
 assert.equal(heard.mode,'search');
 assert.equal(heard.hearsPlayer,true);
 assert.equal(heard.seesPlayer,false);
 assert.equal(heard.canAttack,false);
 assert.ok(heard.navRoute.length>=2,'guarda planejou desvio real a partir de som');
 assert.ok(heard.memory>=4);
 let current=heard,advanced=false;
 for(let i=0;i<250;i++){
  current=R.guardStep(current,{...player,noise:false},1/60,[building]);
  if(current.canAttack)assert.equal(R.clearShot(current,player,[building]),true,'ataque so apos contornar o muro e ter visao');
  assert.equal(R.intersects(current.x,current.z,.36,building),false);
  if(Math.abs(current.x)>.65)advanced=true;
 }
 assert.equal(advanced,true,'guarda contorna lateralmente em vez de ficar parado');
 const fs=require('node:fs'),path=require('node:path');
 for(const file of ['urban-runtime.js','urban-mission-runtime.js']){
  const source=fs.readFileSync(path.join(__dirname,'../js',file),'utf8');
  assert.match(source,/R\.guardStep\([^;\n]+noise:len>0\|\|shotNoise>0/);
 }
});
