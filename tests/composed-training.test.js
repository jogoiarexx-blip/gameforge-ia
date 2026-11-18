'use strict';
/* GF-TRAIN-03: avaliar interpretação composta em GAME_SPEC e exportação real.
 * Os rótulos são sintéticos; isso não re-treina um modelo de IA.
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Parser=require('../js/parser.js');
const Intent=require('../js/intent-compiler.js');
const corpus=JSON.parse(fs.readFileSync(path.join(__dirname,'../training/composed-ptbr-v3.json'),'utf8'));

function validate(spec,e,label){
 const bad=[];
 const compare=(field,want,actual)=>{if(!Object.is(want,actual))bad.push(field+' esperado '+JSON.stringify(want)+' obtido '+JSON.stringify(actual));};
 compare('genre',e.genre,spec.genre);
 compare('dimension',e.dimension,spec.dimension);
 compare('stages',e.stages,spec.stages.length);
 if(e.waves!==undefined)spec.stageConfig.forEach((cfg,i)=>compare('waves '+i,e.waves,cfg.waves));
 if(e.laps!==undefined)spec.stageConfig.forEach((cfg,i)=>compare('laps '+i,e.laps,cfg.laps));
 if(e.boss)spec.stageConfig.forEach((cfg,i)=>compare('boss '+i,e.boss[i],cfg.boss));
 for(const [index,values] of Object.entries(e.stageConfigs||{})){
  for(const [field,value] of Object.entries(values))compare('fase '+(Number(index)+1)+' '+field,value,spec.stageConfig[index]?.[field]);
 }
 for(const [index,fields] of Object.entries(e.absence||{})){
  for(const field of fields)compare('fase '+(Number(index)+1)+' '+field,undefined,spec.stageConfig[index]?.[field]);
 }
 for(const id of e.pending||[]){
  if(!spec.implementation?.pending?.some(row=>row.id===id))bad.push('pendente '+id+' ausente');
  if(spec.implementation?.applied?.some(row=>row.id===id))bad.push('pendente '+id+' anunciado como aplicado');
 }
 return bad.map(x=>label+': '+x);
}

test('GF-TRAIN-03: corpus de 120 pedidos compostos é único e contém escopo por fase',()=>{
 assert.equal(corpus.version,3);
 assert.equal(corpus.cases.length,120);
 assert.equal(new Set(corpus.cases.map(x=>x.instruction)).size,120);
 assert.ok(corpus.cases.filter(x=>x.gdd).length>=15,'cobrir GDD + comando atualizado');
 assert.ok(corpus.cases.filter(x=>x.expected.pending).length>=14,'cobrir módulos não implementados');
});

test('GF-TRAIN-03: 120 comandos compostos preservam as regras de cada fase',()=>{
 const differences=[];
 for(let i=0;i<corpus.cases.length;i++){
  const row=corpus.cases[i],label='#'+(i+1)+' '+row.instruction;
  try{
   const spec=Parser.parseGdd(row.gdd||'',row.instruction,{genre:'auto',dimension:'auto'});
   differences.push(...validate(spec,row.expected,label));
  }catch(error){differences.push(label+': '+error.message);}
 }
 assert.deepEqual(differences,[],differences.length+' divergências de configuração:\n'+differences.join('\n'));
});

test('GF-TRAIN-03: 10 pedidos mistos são exportados como JavaScript válido com o plano preservado',()=>{
 require('../js/runtime-template');
 require('../js/shooter-runtime');
 require('../js/world-rules');
 require('../js/three-runtime');
 require('../js/shooter-3d-runtime');
 require('../js/software-renderer');
 require('../js/strategy-rules');
 require('../js/expanded-2d-runtime');
 require('../js/advanced-td-rules');
 require('../js/advanced-td-runtime');
 require('../vendor/three-source');
 const Generator=require('../js/generator.js');
 const samples=[0,11,35,36,52,56,64,71,88,100];
 for(const i of samples){
  const row=corpus.cases[i];
  const spec=Parser.parseGdd(row.gdd||'',row.instruction,{genre:'auto',dimension:'auto'});
  const files=Generator.generate(spec,row.gdd||'');
  assert.ok(files['game.js']?.length>5000,'game.js real deve existir #'+i);
  assert.doesNotThrow(()=>new vm.Script(files['game.js']),'JS inválido #'+i);
  const match=/const GAME_SPEC = (\{[^\n]*\});/.exec(files['game.js']);
  assert.ok(match,'GAME_SPEC não incluído #'+i);
  const embedded=JSON.parse(match[1]);
  assert.deepEqual(embedded.stageConfig,spec.stageConfig,'regras não chegaram ao runtime #'+i);
  assert.equal(embedded.stages.length,spec.stages.length,'fases não foram exportadas #'+i);
 }
});

test('GF-TRAIN-03: comandos em uma linha são isolados em fases diferentes',()=>{
 const rows=Intent.requirements('Crie arena 3D com 4 fases; na fase 2 coloque 7 inimigos, e na fase 3 sobreviver por 60 segundos.','Comando');
 assert.equal(rows.filter(x=>x.stage===1&&x.normal.includes('inimigos')).length,1);
 assert.equal(rows.filter(x=>x.stage===2&&x.normal.includes('sobreviver')).length,1);
 assert.ok(rows.some(x=>x.stage===null&&x.normal.includes('4 fases')),'quantidade global não pode virar regra de uma fase');
});

test('GF-TRAIN-03: títulos do GDD continuam delimitando linhas sem fase explícita',()=>{
 const rows=Intent.requirements('# Projeto\n## Fase 1\n6 inimigos\n## Fase 2\n10 inimigos\n## Ambiente\nFloresta','GDD');
 assert.equal(rows.find(x=>x.normal==='6 inimigos').stage,0);
 assert.equal(rows.find(x=>x.normal==='10 inimigos').stage,1);
 assert.equal(rows.find(x=>x.normal==='floresta').stage,null);
});

test('GF-TRAIN-03: nenhum requisito textual executa JavaScript enviado pelo usuário',()=>{
 const malicious='Crie arena 3D com 3 fases; na fase 2 6 inimigos; <script>throw Error("danger")</script>';
 const spec=Parser.parseGdd('',malicious);
 assert.equal(spec.stageConfig[1].enemies,6);
 assert.equal(spec.stages.length,3);
 assert.equal(spec.instructions,malicious);
});
