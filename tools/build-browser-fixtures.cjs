'use strict';
// GF-002: materializa projetos reais gerados, usados pelo teste em Chromium.
// Os arquivos são temporários e nunca entram no pacote publicado.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const name of [
 'runtime-template','shooter-runtime','world-rules','software-renderer','three-runtime',
 'shooter-3d-runtime','strategy-rules','expanded-2d-runtime','advanced-td-rules',
 'advanced-td-runtime','combat-economy'
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
fs.writeFileSync(path.join(output,'matrix.json'),JSON.stringify(matrix,null,2));
process.stdout.write('GF-002: '+matrix.length+' jogos reais e ZIPs de exportação preparados para browser QA.\n');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
