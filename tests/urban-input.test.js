'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Input=require('../js/urban-input.js')();
require('../js/urban-rules.js');
require('../js/urban-runtime.js');
require('../js/urban-mission-flow.js');
require('../js/urban-mission-runtime.js');
require('../js/world-rules.js');
require('../js/software-renderer.js');
require('../vendor/three-source.js');
const parser=require('../js/parser.js');
const generator=require('../js/generator.js');

const pad=(pressed=[],axes=[0,0,0,0])=>({
 connected:true,mapping:'standard',axes,
 buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0}))
});
test('GF-018 zona morta filtra drift e mantem orientacao dos analogicos',()=>{
 assert.equal(Input.deadzone(.12),0);
 assert.equal(Input.deadzone(-.12),0);
 assert.equal(Input.deadzone(1),1);
 assert.equal(Input.deadzone(-1),-1);
 assert.equal(Input.deadzone(NaN),0);
 const state=Input.create().poll([pad([],[.1,-.75,.5,0])]);
 assert.equal(state.connected,true);
 assert.equal(state.moveX,0);
 assert.ok(state.moveZ<-.6);
 assert.ok(state.aimX>.3);
});
test('GF-018 d-pad, diagonal e gatilho produzem controles seguros',()=>{
 const result=Input.create().poll([pad([12,15,7])]);
 assert.ok(result.moveX>0&&result.moveZ<0);
 assert.ok(Math.hypot(result.moveX,result.moveZ)<=1.00001);
 assert.equal(result.fire,true);
});
test('GF-018 botoes de acao sao por borda, sem duplicar interação, pausa ou recarga',()=>{
 const control=Input.create(),buttons=[0,2,9];
 const first=control.poll([pad(buttons)]);
 assert.equal(first.interact,true);
 assert.equal(first.reload,true);
 assert.equal(first.pause,true);
 assert.equal(first.begin,true);
 const held=control.poll([pad(buttons)]);
 for(const key of ['interact','reload','pause','begin'])assert.equal(held[key],false);
 control.poll([pad()]);
 const released=control.poll([pad(buttons)]);
 for(const key of ['interact','reload','pause','begin'])assert.equal(released[key],true);
});
test('GF-018 desconexao de controle cancela tiro e movimento, sem tecla fantasma',()=>{
 const control=Input.create();
 control.poll([pad([7],[.9,0,0,0])]);
 const lost=control.poll([]);
 assert.equal(lost.connected,false);
 assert.equal(lost.moveX,0);
 assert.equal(lost.fire,false);
 assert.equal(lost.pause,false);
 const invalid=control.poll([{connected:true,mapping:'other',axes:[1,1],buttons:[]}]);
 assert.equal(invalid.connected,false);
});
test('GF-018 input funciona em JavaScript puro e não depende de DOM nem API de rede',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../js/urban-input.js'),'utf8');
 const sandbox={};vm.createContext(sandbox);
 vm.runInContext(source,sandbox);
 const controller=sandbox.gameForgeUrbanInputFactory().create();
 assert.equal(controller.poll([pad([0])]).interact,true);
 assert.equal(controller.poll([]).connected,false);
});
test('GF-018 os dois jogos urbanos exportam o controle, mesmo quando jogados offline',()=>{
 const gdd='# Bairro urbano\nCidade de mafia 3D em terceira pessoa com negocios, policia e missões.';
 const spec=parser.parseGdd(gdd,'',{genre:'urban-action',dimension:'3d'});
 const files=generator.generate(spec,gdd);
 assert.match(files['game.js'],/const GameForgeUrbanInput = /);
 assert.match(files['game.js'],/gameForgeUrbanInputFactory/);
 assert.doesNotThrow(()=>new vm.Script(files['game.js']));
 const missionGdd='# Cidade de mafia 3D em terceira pessoa\nNegócios e polícia.\n## Missão 1\nElimine um guarda e capture o armazém.';
 const missions=parser.parseGdd(missionGdd);
 assert.equal(missions.urbanMissions.length,1);
 const files2=generator.generate(missions,missionGdd);
 assert.match(files2['game.js'],/gameForgeUrbanMissionBoot/);
 assert.match(files2['game.js'],/gameForgeUrbanInputFactory/);
 assert.doesNotThrow(()=>new vm.Script(files2['game.js']));
});
test('GF-018 touch multiplos ponteiros, captura e reset nos dois modos urbanos',()=>{
 for(const file of ['urban-runtime.js','urban-mission-runtime.js']){
  const code=fs.readFileSync(path.join(__dirname,'../js',file),'utf8');
  assert.match(code,/touchOwners=new Map\(\)/);
  assert.match(code,/setPointerCapture\?\.\(.*pointerId/);
  assert.match(code,/lostpointercapture/);
  assert.match(code,/clearTouches\(\)/);
  assert.match(code,/padControl\.poll\(/);
  assert.match(code,/padState\.aimX/);
  assert.match(code,/gamepadConnected/);
 }
});
