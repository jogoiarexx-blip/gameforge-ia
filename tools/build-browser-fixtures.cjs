'use strict';
// GF-002: materializa projetos reais gerados, usados pelo teste em Chromium.
// Os arquivos são temporários e nunca entram no pacote publicado.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const name of [
 'runtime-template','shooter-runtime','world-rules','software-renderer','three-runtime',
 'shooter-3d-runtime','strategy-rules','expanded-2d-runtime','advanced-td-rules',
 'advanced-td-runtime','combat-economy','urban-rules','urban-runtime','urban-mission-flow','urban-mission-runtime','mission-semantics'
])require(path.join(root,'js',name+'.js'));
require(path.join(root,'vendor/three-source.js'));
const parser=require(path.join(root,'js/parser.js'));
const generator=require(path.join(root,'js/generator.js'));
const zipper=require(path.join(root,'js/zip.js'));
const {validateFiles}=require('./verify-exports.cjs');
const output=path.join(root,'tests','_browser_output');
fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync(output,{recursive:true});
const matrix=[];
async function main(){
for(const [dimension,genres] of Object.entries(parser.styles)){
 for(const genre of genres){
  const source='# Navegação e exportação\n## Primeira fase\nControles, objetivos e desafios.\n';
  const spec=parser.parseGdd(source,'',{dimension,genre});
  const files=generator.generate(spec,source);
  validateFiles(files,dimension,genre);
  const slug=dimension+'-'+genre;
  const directory=path.join(output,slug);
  fs.mkdirSync(directory);
  for(const [filename,contents] of Object.entries(files)){
   if(filename.includes('/')||filename.includes('\\')||filename.includes('..'))throw Error('Nome de export inseguro: '+filename);
   fs.writeFileSync(path.join(directory,filename),contents);
  }
  const zip=zipper.zipFiles(files);
  fs.writeFileSync(path.join(output,slug+'.zip'),new Uint8Array(await zip.arrayBuffer()));
  matrix.push({dimension,genre,slug,files:Object.keys(files)});
 }
}
// GF-TRAIN-04: criar cenários executáveis de gameplay a partir de comandos
// reais de iniciante. Manifesto separado para preservar a matriz GF-002.
const gameplayRequests=[
 {slug:'training-3d-survive',genre:'arena',dimension:'3d',
  command:'Crie um jogo de arena 3D com tres fases. Na fase 1, sobreviver por 5 segundos.',
  expected:{mission:'survive',seconds:5}},
 {slug:'training-3d-fps-store',genre:'fps',dimension:'3d',
  command:'Crie FPS 3D com três fases e loja para comprar munição. Balas custam 30 créditos.',
  expected:{storeEnabled:true,ammoPrice:30}},
 {slug:'training-3d-boss-final',genre:'shooter',dimension:'3d',
  command:'Crie um jogo de navinha 3D com 3 fases e chefe somente na última.',
  expected:{bosses:['no','no','yes']}}
];
for(const item of gameplayRequests){
 const spec=parser.parseGdd('',item.command,{genre:'auto',dimension:'auto'});
 if(spec.genre!==item.genre||spec.dimension!==item.dimension)
  throw Error('GF-TRAIN-04: gênero/dimensão inesperado em '+item.slug);
 if(item.expected.mission&&
   (spec.stageConfig[0]?.mission!==item.expected.mission||spec.stageConfig[0]?.seconds!==item.expected.seconds))
  throw Error('GF-TRAIN-04: missão de sobrevivência não foi compilada.');
 if(item.expected.storeEnabled&&
   (!spec.combatEconomy?.enabled||spec.combatEconomy.prices.ammo!==item.expected.ammoPrice))
  throw Error('GF-TRAIN-04: loja não corresponde ao comando.');
 if(item.expected.bosses&&
   JSON.stringify(spec.stageConfig.map(x=>x.boss))!==JSON.stringify(item.expected.bosses))
  throw Error('GF-TRAIN-04: chefes por fase não correspondem ao pedido.');
 const files=generator.generate(spec,'');
 validateFiles(files,item.dimension,item.genre);
 const dir=path.join(output,item.slug);
 fs.mkdirSync(dir);
 for(const [filename,contents] of Object.entries(files)){
  if(filename.includes('/')||filename.includes('\\')||filename.includes('..'))
   throw Error('Caminho de export inseguro: '+filename);
  fs.writeFileSync(path.join(dir,filename),contents);
 }
 const zip=zipper.zipFiles(files);
 fs.writeFileSync(path.join(output,item.slug+'.zip'),new Uint8Array(await zip.arrayBuffer()));
 item.files=Object.keys(files);
}
fs.writeFileSync(path.join(output,'gameplay-training.json'),JSON.stringify(gameplayRequests,null,2));

fs.writeFileSync(path.join(output,'matrix.json'),JSON.stringify(matrix,null,2));
process.stdout.write('GF-002: '+matrix.length+' jogos reais e ZIPs de exportação preparados para browser QA.\n');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
