'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const Branches=require('../js/stage-branches.js')();
const Parser=require('../js/parser.js');
require('../js/world-rules.js');
require('../js/software-renderer.js');
require('../js/shooter-3d-runtime.js');
require('../vendor/three-source.js');
const Generator=require('../js/generator.js');
test('GF-010 pedido leigo gera escolha de tres caminhos e segredo, sem exigir JSON',()=>{
 const prompt='crie uma navinha 3D com 3 caminhos alternativos em cada fase e caminho secreto com inimigos e recompensas diferentes';
 const spec=Parser.parseGdd('# Ninho das nuvens\n## Fase 1\n## Fase 2',prompt,{genre:'shooter',dimension:'3d'});
 assert.equal(spec.stageBranches.enabled,true);
 assert.deepEqual(spec.stageBranches.choices,['high','middle','low']);
 assert.equal(spec.stageBranches.secret,true);
 const high=Branches.choose(spec.stageBranches,'high'),low=Branches.choose(spec.stageBranches,'low');
 assert.ok(high.enemyMultiplier<low.enemyMultiplier);
 assert.ok(high.reward<low.reward);
 assert.equal(Branches.choose(spec.stageBranches,'secret'),null);
 assert.equal(Branches.choose(spec.stageBranches,'secret',true).reward,500);
 const files=Generator.generate(spec,'# Ninho das nuvens\n## Fase 1\n## Fase 2');
 assert.match(files['game.js'],/GameForgeStageBranches/);
 assert.match(files['game.js'],/GameForgeUrbanSave/);
 assert.doesNotThrow(()=>new vm.Script(files['game.js']));
});
test('GF-010 texto sem pedido de caminhos nao ativa escolha silenciosamente',()=>{
 const spec=Parser.parseGdd('# Nave\n## Fase 1','crie um game de navinha 3D',{genre:'shooter',dimension:'3d'});
 assert.equal(spec.stageBranches,null);
 assert.deepEqual(Branches.options(spec.stageBranches),[]);
});
test('GF-010 duas rotas limitam botoes, nomes e recompensas',()=>{
 const d=Branches.parse('Crie dois caminhos diferentes para as fases');
 assert.deepEqual(d.choices,['high','low']);
 assert.deepEqual(Branches.options(d).map(x=>x.id),['high','low']);
 assert.equal(Branches.choose(d,'middle'),null);
});
test('GF-010 checkpoint so restaura escolha valida sem injetar dinheiro ou fase',()=>{
 const opts=Branches.parse('3 caminhos e passagem secreta');
 const raw={version:1,stage:1,route:'middle',health:90,score:2000,weapon:2,kills:11};
 assert.deepEqual(Branches.validateCheckpoint(opts,raw,3),raw);
 assert.equal(Branches.validateCheckpoint(opts,{...raw,stage:999},3),null);
 assert.equal(Branches.validateCheckpoint(opts,{...raw,score:-1},3),null);
 assert.equal(Branches.validateCheckpoint(opts,{...raw,route:'hacked'},3),null);
 assert.equal(Branches.validateCheckpoint(opts,{...raw,route:'secret',kills:2},3),null);
 assert.ok(Branches.validateCheckpoint(opts,{...raw,route:'secret',kills:11},3));
});

test('GF-010 v2 cada caminho possui cenário e evento diferentes com ID persistente por fase',()=>{
 const d=Branches.parse('3 caminhos diferentes e passagem secreta');
 const paths=Branches.options(d,true);
 assert.deepEqual(paths.map(p=>p.scene.id),['sky-bridges','central-outpost','canyon-ruins','hidden-rift']);
 assert.equal(new Set(paths.map(p=>p.scene.bg)).size,4);
 assert.deepEqual(paths.map(p=>Branches.events(p,0)[0].type),['supply','ambush','hazard','cache']);
 const events=paths.map(p=>Branches.events(p,2)[0]);
 assert.equal(new Set(events.map(e=>e.id)).size,4);
 assert.ok(events.every(e=>e.id.startsWith('s2:')));
 assert.deepEqual(Branches.events(null,0),[]);
 assert.deepEqual(Branches.events(paths[0],99),[]);
});
test('GF-010 v2 checkpoint de evento exclusivo impede recompensas duplicadas e rejeita IDs externos',()=>{
 const config=Branches.parse('3 caminhos diferentes e rota secreta');
 const route=Branches.choose(config,'high'),event=Branches.events(route,1)[0];
 const base={version:1,stage:1,route:'high',health:86,score:2400,weapon:1,kills:6};
 const old=Branches.validateCheckpoint(config,base,3);
 assert.deepEqual(old.claimed,[],'saves anteriores sem o novo campo continuam legíveis');
 const saved=Branches.validateCheckpoint(config,{...base,claimed:[event.id]},3);
 assert.deepEqual(saved.claimed,[event.id]);
 assert.equal(Branches.validateCheckpoint(config,{...base,claimed:[event.id,event.id]},3),null);
 assert.equal(Branches.validateCheckpoint(config,{...base,claimed:['s2:high:supply']},3),null);
 assert.equal(Branches.validateCheckpoint(config,{...base,claimed:['s1:low:hazard']},3),null);
 assert.equal(Branches.validateCheckpoint(config,{...base,claimed:['hacked']},3),null);
 assert.deepEqual(Branches.validateCheckpoint(config,{...base,route:null,claimed:[]},3).claimed,[]);
});
