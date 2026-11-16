const {test}=require('node:test');const assert=require('node:assert/strict');
const Parser=require('../js/parser'),Compiler=require('../js/intent-compiler'),Dev=require('../js/development-engine'),Campaign=require('../js/campaign-editor');
function project(genre='shooter',dimension='3d'){
 const spec=Parser.parseGdd('# Game\n## Fase 1\n## Fase 2\n## Fase 3','',{genre,dimension});
 return {spec,files:{'game.js':'const GAME_SPEC = '+JSON.stringify(spec)+';\n// motor preservado','style.css':'body{}'}};
}
function evolve(genre,dim,instruction){
 const {spec,files}=project(genre,dim);
 const plan=Dev.plan(instruction,spec,files);
 return {plan,result:Dev.modify(files,spec,plan),files};
}
test('altera apenas a quantidade de inimigos da segunda fase do FPS',()=>{
 const {plan,result}=evolve('fps','3d','Coloque 6 inimigos na fase 2.');
 assert.equal(plan.supported,true);assert.equal(result.changed,true);
 assert.equal(result.spec.stageConfig[1].enemies,6);assert.equal(result.spec.stageConfig[0].enemies,undefined);
 assert.ok(result.files['game.js'].endsWith('// motor preservado'));
});
test('comando composto faz campanha de navinha 3D com cinco fases, quatro ondas e chefe só na última',()=>{
 const {plan,result}=evolve('shooter','3d','Quero cinco fases, quatro ondas por fase e chefe somente na última.');
 assert.equal(plan.supported,true);assert.equal(result.changed,true);
 assert.equal(result.spec.stages.length,5);
 assert.deepEqual(result.spec.stageConfig.map(x=>x.waves),[4,4,4,4,4]);
 assert.deepEqual(result.spec.stageConfig.map(x=>x.boss),['no','no','no','no','yes']);
});
test('editor permite ondas no shooter 3D e missão real no RPG 3D',()=>{
 const a=project('shooter','3d'),out=Campaign.edit(a.files,1,{waves:4,boss:'no',theme:'ruins'});
 assert.equal(out.spec.stageConfig[1].waves,4);
 const b=project('rpg','3d');b.files['game.js']+='\n'+require('../js/three-runtime').toString();
 const q=Campaign.edit(b.files,1,{mission:'survive',seconds:75});
 assert.equal(q.spec.stageConfig[1].mission,'survive');assert.equal(q.spec.stageConfig[1].seconds,75);
});
test('missão de sobrevivência da fase 3 em RPG 3D preserva outras fases',()=>{
 const {result}=evolve('rpg','3d','Na fase 3, sobreviver por 90 segundos.');
 assert.equal(result.changed,true);
 assert.equal(result.spec.stageConfig[2].mission,'survive');
 assert.equal(result.spec.stageConfig[2].seconds,90);
 assert.equal(result.spec.stageConfig[1].mission,undefined);
});
test('requisito sem implementação é registrado e não altera código',()=>{
 const {plan,result,files}=evolve('platform','3d','Crie sistema de multiplayer e crafting.');
 assert.equal(plan.supported,false);assert.equal(result.changed,false);
 assert.equal(result.files['game.js'],files['game.js']);
 assert.ok(plan.pending.some(x=>/Multijogador/.test(x)));
});
test('comando posterior tem precedência sobre valores do GDD anterior',()=>{
 const spec=Parser.parseGdd('# Teste\n## Fase 1\n3 inimigos','Coloque 7 inimigos na fase 1.',{genre:'arena',dimension:'3d'});
 assert.equal(spec.stageConfig[0].enemies,7);
 assert.match(spec.implementation.applied.find(x=>x.id==='enemies').description,/7 inimigos/);
});
test('GDD grande mantém relatórios em tamanho limitado',()=>{
 const source='# Grande\n## Fase 1\n'+Array.from({length:1500},()=>'- 5 inimigos').join('\n');
 const spec=Parser.parseGdd(source,'',{genre:'arena',dimension:'3d'});
 assert.equal(spec.stageConfig[0].enemies,5);
 assert.ok(JSON.stringify(spec).length<55000);
});
