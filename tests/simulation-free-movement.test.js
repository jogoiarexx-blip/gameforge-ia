'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const Parser=require('../js/parser.js'),Generator=require('../js/generator.js');
const Capabilities=require('../js/game-capabilities.js');
const R=require('../js/simulation-rules.js')(),F=require('../js/exploration-2d.js')();
const corpus=require('../training/free-exploration-ptbr-v12.json');
test('GF-TRAIN-12: 28 instruções PT-BR escolhem livre, estações ou modo clássico',()=>{
 assert.equal(corpus.cases.length,28);
 const problems=[];
 for(const row of corpus.cases){
  const spec=Parser.parseGdd('',row.instruction),e=spec.simulation?.exploration;
  const got=e?.mode==='free'?'free':e?.enabled?'stations':null;
  if(spec.genre!=='simulation'||spec.simulation?.domain!==row.domain)problems.push(row.instruction+': domínio');
  if(got!==row.mode)problems.push(row.instruction+': modo='+got+' esperado='+row.mode);
  if(got==='free'){
   if(e.guide!==row.guide)problems.push(row.instruction+': guia='+e.guide);
   if(!spec.implementation.audit.items.some(x=>x.id==='simulation-free'&&x.status==='implementada'))
    problems.push(row.instruction+': contrato de capacidade');
   if(spec.implementation.pending.some(x=>x.id==='simulation-walk'))problems.push(row.instruction+': pendência indevida');
  }
 }
 assert.deepEqual(problems,[]);
});
test('GF-TRAIN-12: caminho e obstáculos em grade de 1 a 12 espaços são consistentes',()=>{
 for(let slots=1;slots<=12;slots++){
  const scene=F.layout(slots,'aquarium',true),start=F.spawn(scene);
  assert.equal(scene.stations.length,slots);
  assert.equal(F.walkable(scene,start.x,start.y),true);
  assert.equal(F.walkable(scene,-1,200),false);
  assert.equal(F.walkable(scene,480,5),false);
  for(const p of scene.stations){
   assert.equal(F.walkable(scene,p.x+p.w/2,p.y+p.h/2),false,'estação sólida '+p.id);
   assert.equal(F.hitAt(scene,p.x+5,p.y+5)?.id,p.id,'alvo de toque '+p.id);
   const near={x:p.x+p.w/2,y:p.y+p.h+28};
   assert.equal(F.walkable(scene,near.x,near.y),true,'frente acessível '+p.id);
   assert.equal(F.inRange(near,p,55),true,'interação válida '+p.id);
  }
 }
});
test('GF-TRAIN-12: colisão impede atravessar tanques e desliza nos eixos',()=>{
 const scene=F.layout(2,'aquarium',false),p=scene.stations[0];
 let player={x:p.x+p.w/2,y:p.y+p.h+35};
 for(let i=0;i<120;i++)player=F.move(player,0,-1,1/60,scene,190);
 assert.ok(player.y>=p.y+p.h+scene.radius-.001);
 assert.equal(F.walkable(scene,player.x,player.y),true);
 const edge={x:scene.bounds.left+scene.radius+3,y:scene.bounds.bottom-scene.radius-3};
 for(let i=0;i<150;i++)player=F.move(player,-1,1,1/60,scene,190);
 assert.ok(player.x>=scene.bounds.left+scene.radius-.001);
 assert.ok(player.y<=scene.bounds.bottom-scene.radius+.001);
 assert.equal(F.move(edge,1,0,0,scene).x,edge.x);
 assert.equal(F.move(edge,1,0,NaN,scene).x,edge.x);
});
test('GF-TRAIN-12: NPC guia e estações são interações distintas sem economia fictícia',()=>{
 const scene=F.layout(4,'shop',true);
 const nearNpc={x:scene.guide.x-40,y:scene.guide.y};
 assert.equal(F.nearest(nearNpc,scene,55).type,'npc');
 assert.equal(F.nearest({x:40,y:500},scene,55),null);
 assert.equal(F.hitAt(scene,scene.guide.x,scene.guide.y)?.type,'npc');
 const without=F.layout(4,'shop',false);
 assert.equal(without.guide,null);
 assert.equal(F.nearest(nearNpc,without,55),null);
});
test('GF-TRAIN-12: save guarda posição e recusa coordenadas adulteradas',()=>{
 const c=Parser.parseGdd('','Quero cuidar de aquário. Movimentação livre.').simulation;
 const saved=new Map(),storage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
 const save=R.persistence(c,'Teste de posição',()=>storage),state=R.create(c),position={x:91,y:488};
 assert.equal(R.act(state,c,0,'start'),true);
 assert.equal(R.act(state,c,0,'care'),true);
 assert.equal(save.write(state,0,position),true);
 const retrieved=save.read();
 assert.deepEqual(retrieved.position,position);
 assert.equal(retrieved.state.slots[0].cared,true);
 const invalid=JSON.parse(saved.get(save.key));invalid.position.x=-99;
 saved.set(save.key,JSON.stringify(invalid));assert.equal(save.read(),null);
 invalid.position.x=91;invalid.position.y=Infinity;
 saved.set(save.key,JSON.stringify(invalid));assert.equal(save.read(),null);
 assert.equal(save.write(state,0),false,'save sem posição em modo livre é inválido');
});
test('GF-TRAIN-12: contrato rejeita configuração livre inválida',()=>{
 const spec=Parser.parseGdd('','Quero cuidar de aquário com movimentação livre.');
 assert.deepEqual(Capabilities.check(spec),[]);
 const invalid=JSON.parse(JSON.stringify(spec));
 invalid.simulation.exploration.speed=9000;
 assert.ok(Capabilities.check(invalid).some(x=>/explora/i.test(x)));
 assert.equal(Capabilities.capability('simulation-free',{genre:'fps',dimension:'3d'}).allowed,false);
});
test('GF-TRAIN-12: ZIP usa código local e jogo livre não depende de CDN',()=>{
 const spec=Parser.parseGdd('','Quero cuidar de aquário. Andar livremente com WASD.');
 const files=Generator.generate(spec,'');
 assert.match(files['game.js'],/const GameForgeExploration2D = /);
 assert.match(files['game.js'],/function gameForgeExploration2DFactory/);
 assert.match(files['game.js'],/drawRoom/);
 assert.match(files['game.js'],/held\.has/);
 new vm.Script(files['game.js']);
 assert.doesNotMatch(files['index.html'],/<script[^>]+src=["']https?:/i,'sem scripts remotos no jogo exportado');
 const classic=Generator.generate(Parser.parseGdd('','Quero cuidar de aquário.'),'');
 assert.doesNotMatch(classic['game.js'],/const GameForgeExploration2D = /);
});
