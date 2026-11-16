'use strict';
/* Deterministic export preflight for the Pages CI gate.
 * Fails the job on invalid JS or a missing local dependency.
 */
const vm=require('node:vm');
const path=require('node:path');
const fs=require('node:fs');
function validateFiles(files,dimension,genre){
 if(!files||typeof files!=='object')throw Error('Exportação ausente');
 for(const file of ['index.html','game.js','style.css']){
  if(typeof files[file]!=='string'||!files[file].length)throw Error('Exportação '+genre+': faltando '+file);
 }
 const html=files['index.html'];
 const scripts=[...html.matchAll(/<script\s+[^>]*src=["']([^"']+)["']/gi)].map(x=>x[1]);
 for(const script of scripts){
  if(/^(?:https?:|\/\/|data:|javascript:)/i.test(script)||script.startsWith('/')||script.includes('..'))
   throw Error('Script remoto ou inseguro em '+genre+': '+script);
  if(typeof files[script]!=='string'||!files[script].length)
   throw Error('Arquivo local ausente em '+genre+': '+script);
 }
 if(scripts.length===0||scripts.at(-1)!=='game.js')throw Error('Exportação '+genre+': script principal não encontrado');
 new vm.Script(files['game.js'],{filename:'export-'+dimension+'-'+genre+'-game.js',timeout:10000});
 if(dimension==='3d'){
  if(!files['engine-3d.js']||!files['THREE-LICENSE.txt'])
   throw Error('Motor Three ou licença ausente');
  if(!scripts.includes('engine-3d.js'))throw Error('HTML 3D não carrega motor local');
 }
 return {dimension,genre,scripts,bytes:Buffer.byteLength(files['game.js'])};
}
function validateCatalog(){
 const root=path.resolve(__dirname,'..');
 for(const file of [
  'js/runtime-template.js','js/shooter-runtime.js','js/world-rules.js',
  'js/software-renderer.js','js/three-runtime.js','js/shooter-3d-runtime.js',
  'js/strategy-rules.js','js/expanded-2d-runtime.js',
  'js/advanced-td-rules.js','js/advanced-td-runtime.js',
  'js/combat-economy.js','js/urban-rules.js','js/urban-runtime.js','js/qa-bridge.js','vendor/three-source.js'
 ])require(path.join(root,file));
 const parser=require('../js/parser.js');
 const generator=require('../js/generator.js');
 const reports=[];
 for(const [dimension,genres] of Object.entries(parser.styles)){
  for(const genre of genres){
   const gdd='# Exportação segura\n## Fase 1\nInimigos, controles e objetivos básicos.';
   const spec=parser.parseGdd(gdd,'',{dimension,genre});
   const files=generator.generate(spec,gdd);
   reports.push(validateFiles(files,dimension,genre));
  }
 }
 // Testa um subproduto com loja FPS habilitada, onde múltiplos módulos são serializados.
 const command='Crie um FPS 3D com loja para comprar munição, kit médico e melhorar as armas.';
 const withStore=parser.parseGdd('',command,{dimension:'3d',genre:'fps'});
 if(!withStore.combatEconomy?.enabled)throw Error('Compilador não ativou economia FPS');
 reports.push(validateFiles(generator.generate(withStore,''),'3d','fps+loja'));
 const total=reports.reduce((n,r)=>n+r.bytes,0);
 process.stdout.write('Exportações seguras: '+reports.length+' variantes, '+total+' bytes de código JS verificados.\n');
 return reports;
}
if(require.main===module){
 try{validateCatalog();}catch(e){console.error('Exportação bloqueada: '+e.stack);process.exitCode=1;}
}
module.exports={validateFiles,validateCatalog};
