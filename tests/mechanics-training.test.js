'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Parser=require('../js/parser.js');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'../training/mechanics-ptbr-v2.json'),'utf8'));

test('GF-TRAIN-02: 100 pedidos únicos de mecânicas e expectativas explícitas',()=>{
 assert.equal(fixture.version,2);
 assert.equal(fixture.cases.length,100);
 assert.equal(new Set(fixture.cases.map(x=>x.instruction)).size,100);
 for(const row of fixture.cases)assert.ok(row.instruction.length>12);
});

test('GF-TRAIN-02: 100 comandos geram as configurações suportadas e registram pendências',()=>{
 const failures=[];
 for(let i=0;i<fixture.cases.length;i++){
  const {instruction,expected:e}=fixture.cases[i];
  try{
   const spec=Parser.parseGdd('',instruction,{genre:'auto',dimension:'auto'});
   const fail=(field,want,got)=>{if(!Object.is(want,got))failures.push('#'+(i+1)+' '+field+' esperado '+JSON.stringify(want)+', obtido '+JSON.stringify(got)+' | '+instruction);};
   fail('genre',e.genre,spec.genre);
   fail('dimension',e.dimension,spec.dimension);
   if(e.stages!==undefined)fail('stages',e.stages,spec.stages.length);
   if(e.waves!==undefined)for(const [j,s] of spec.stageConfig.entries())fail('waves fase '+(j+1),e.waves,s.waves);
   if(e.laps!==undefined)for(const [j,s] of spec.stageConfig.entries())fail('laps fase '+(j+1),e.laps,s.laps);
   if(e.bossPattern==='last')for(const [j,s] of spec.stageConfig.entries())fail('boss fase '+(j+1),j===spec.stageConfig.length-1?'yes':'no',s.boss);
   if(e.bossPattern==='none')for(const [j,s] of spec.stageConfig.entries())fail('boss fase '+(j+1),'no',s.boss);
   if(e.stage){
    fail(e.stage.field+' fase '+(e.stage.index+1),e.stage.value,spec.stageConfig[e.stage.index]?.[e.stage.field]);
    if(e.othersUnset)for(let j=0;j<spec.stageConfig.length;j++)if(j!==e.stage.index)fail(e.othersUnset+' fase '+(j+1),undefined,spec.stageConfig[j]?.[e.othersUnset]);
   }
   if(e.seconds!==undefined)fail('seconds',e.seconds,spec.stageConfig[e.stage.index]?.seconds);
   if(e.difficulty!==undefined)fail('difficulty',e.difficulty,spec.tuning?.difficulty);
   if(e.store!==undefined)fail('store',e.store,!!spec.combatEconomy?.enabled);
   if(e.ammoPrice!==undefined)fail('ammoPrice',e.ammoPrice,spec.combatEconomy?.prices?.ammo);
   for(const id of e.pendingIncludes||[])if(!spec.implementation?.pending?.some(x=>x.id===id))
    failures.push('#'+(i+1)+' requisito pendente '+id+' não identificado | '+instruction);
  }catch(error){failures.push('#'+(i+1)+' '+error.message+' | '+instruction);}
 }
 assert.deepEqual(failures,[],failures.length+' divergências:\n'+failures.join('\n'));
});

test('GF-TRAIN-02: uma regra no GDD não pode vencer o comando recente',()=>{
 const spec=Parser.parseGdd('# Arena 3D\nDificuldade alta',
   'Quero que o jogo fique mais fácil.',{genre:'arena',dimension:'3d'});
 assert.equal(spec.tuning.difficulty,0.8);
 const reversed=Parser.parseGdd('# Arena 3D\nDificuldade baixa',
   'Agora quero dificuldade alta.',{genre:'arena',dimension:'3d'});
 assert.equal(reversed.tuning.difficulty,1.4);
});

test('GF-TRAIN-02: pedidos negativos não apagam requisitos posteriores na mesma frase',()=>{
 const spec=Parser.parseGdd('', 'Jogo de arena 3D com 3 fases, sem chefe, com 7 inimigos na fase 2.');
 assert.equal(spec.stageConfig[1].enemies,7);
 assert.equal(spec.stageConfig[0].enemies,undefined);
 assert.equal(spec.stageConfig[2].enemies,undefined);
});

test('GF-TRAIN-02: requisitos sem suporte não viram sistema executável',()=>{
 const spec=Parser.parseGdd('','Crie RPG 3D com crafting, árvore de habilidades e multiplayer.');
 for(const id of ['craft','skill-tree','network'])
  assert.ok(spec.implementation.pending.some(x=>x.id===id),id);
 for(const id of ['craft','skill-tree','network'])
  assert.equal(spec.implementation.applied.some(x=>x.id===id),false,id);
});

test('GF-TRAIN-02: evolução incremental por nome da fase não modifica fases vizinhas',()=>{
 const Dev=require('../js/development-engine.js');
 const spec=Parser.parseGdd('# Arena 3D\n## Fase 1\n## Fase 2\n## Fase 3','',{genre:'arena',dimension:'3d'});
 const files={'game.js':'const GAME_SPEC = '+JSON.stringify(spec)+';\n// R.missionReady( presente no motor','style.css':''};
 const plan=Dev.plan('Na fase dois, sobreviver por 70 segundos.',spec,files);
 assert.equal(plan.supported,true);
 const result=Dev.modify(files,spec,plan);
 assert.equal(result.changed,true);
 assert.equal(result.spec.stageConfig[1].mission,'survive');
 assert.equal(result.spec.stageConfig[1].seconds,70);
 assert.equal(result.spec.stageConfig[0].mission,undefined);
 assert.equal(result.spec.stageConfig[2].mission,undefined);
});


test('GF-TRAIN-02: pedido sem pontuação separa ausência de chefes de contagem de inimigos',()=>{
 const spec=Parser.parseGdd('', 'Quero jogo de arena 3D com 3 fases sem chefe com 7 inimigos na fase dois.');
 assert.equal(spec.stageConfig.length,3);
 assert.equal(spec.stageConfig[1].enemies,7,'com 7 inimigos continua valendo sem vírgula');
 assert.equal(spec.stageConfig[0].enemies,undefined);
 assert.equal(spec.stageConfig[2].enemies,undefined);
 assert.equal(spec.stageConfig[1].boss,'no');
 const negated=Parser.parseGdd('', 'Quero jogo de arena 3D com 3 fases sem 7 inimigos na fase dois.');
 assert.equal(negated.stageConfig[1].enemies,undefined,'sem inimigos não pode criar inimigos');
});
