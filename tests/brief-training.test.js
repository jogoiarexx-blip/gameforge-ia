'use strict';
/* GF-TRAIN-01 — benchmark offline para pedidos escritos como usuários iniciantes.
 * A avaliação não executa nem injeta JavaScript recebido do usuário.
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Parser=require('../js/parser');
const Intent=require('../js/intent-compiler');
const corpus=JSON.parse(fs.readFileSync(path.join(__dirname,'../training/briefs-ptbr-v1.json'),'utf8'));

test('GF-TRAIN-01: corpus rotulado tem 144 casos, cobertura de gêneros e entradas únicas',()=>{
 assert.equal(corpus.version,1);
 assert.equal(corpus.cases.length,144);
 const unique=new Set(corpus.cases.map(x=>x.instruction.toLocaleLowerCase('pt-BR').trim()));
 assert.equal(unique.size,corpus.cases.length,'não contar pedidos repetidos como treino novo');
 const genres=new Set(corpus.cases.map(x=>x.expect.genre));
 for(const required of ['shooter','fps','racing','platform','rpg','arena','tower-defense','lane-defense','block-td','urban-action'])
  assert.ok(genres.has(required),'faltou gênero: '+required);
 for(const row of corpus.cases){
  assert.ok(typeof row.instruction==='string'&&row.instruction.length>=8);
  assert.ok(['2d','3d'].includes(row.expect.dimension));
 }
});

test('GF-TRAIN-01: a classificação e a dimensão dos 144 pedidos coincidem com os rótulos',()=>{
 const failures=[];
 for(let i=0;i<corpus.cases.length;i++){
  const row=corpus.cases[i];
  try{
   const spec=Parser.parseGdd('',row.instruction,{dimension:'auto',genre:'auto'});
   if(spec.genre!==row.expect.genre||spec.dimension!==row.expect.dimension)
    failures.push('#'+(i+1)+' '+JSON.stringify(row.instruction)+' => '+spec.genre+'/'+spec.dimension+
      ', esperado '+row.expect.genre+'/'+row.expect.dimension);
   if(row.expect.stages!==undefined&&spec.stages.length!==row.expect.stages)
    failures.push('#'+(i+1)+' fases '+spec.stages.length+', esperado '+row.expect.stages);
  }catch(error){failures.push('#'+(i+1)+' '+JSON.stringify(row.instruction)+': '+error.message);}
 }
 assert.deepEqual(failures,[],failures.length+' de '+corpus.cases.length+' pedidos divergentes:\n'+failures.join('\n'));
});

test('GF-TRAIN-01: entrada original permanece intocada e erros leves são corrigidos apenas para leitura',()=>{
 const raw='qro navina 3 d com treis fases e chefe';
 assert.equal(Intent.normalize(raw),'quero navinha 3d com tres fases e chefe');
 const spec=Parser.parseGdd('',raw,{dimension:'auto',genre:'auto'});
 assert.equal(spec.instructions,raw);
 assert.equal(spec.stages.length,3);
 assert.equal(spec.genre,'shooter');
 assert.equal(spec.dimension,'3d');
});

test('GF-TRAIN-01: não confundir referência a FPS, exclusão de 3D ou proibição de recursos',()=>{
 const ship=Parser.parseGdd('','navinha 2d com meta de 60 FPS no celular');
 assert.equal(ship.genre,'shooter');
 const old=Parser.parseGdd('','jogo de plataforma 2d sem 3d');
 assert.equal(old.genre,'platform');
 assert.equal(old.dimension,'2d');
 const noGuns=Parser.parseGdd('','FPS 3D em primeira pessoa mas sem armas e sem tiros');
 assert.ok(noGuns.designIR.blocked.some(x=>x.id==='no-shooting'));
 const pending=Parser.parseGdd('','RPG 3D com árvore de habilidades e multiplayer');
 assert.ok(pending.implementation.pending.some(x=>x.id==='skill-tree'));
 assert.ok(pending.implementation.pending.some(x=>x.id==='network'));
});
