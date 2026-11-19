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
  const source=genre==='simulation'?'# Fazendinha de teste\nCuidar de fazenda, crescer em 2 segundos, meta de 10 moedas.':'# Navegação e exportação\n## Primeira fase\nControles, objetivos e desafios.\n';
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
const graphicsMatrix=[];
for(const entry of [
 {slug:'graphics-pixel-2d',dimension:'2d',genre:'shooter',style:'pixel',shadows:false,particles:true,instruction:'Não quero mais cartoon, quero pixel art. Qualidade alta. Não ativar sombras, com partículas.'},
 {slug:'graphics-natural-3d',dimension:'3d',genre:'rpg',style:'natural',shadows:false,particles:false,instruction:'Retire low poly. Quero naturalista, qualidade alta, pôr do sol. Não ativar sombras e desliga partículas.'}
]){
 const source='# Perfil gráfico '+entry.slug+'\nVisual '+(entry.dimension==='2d'?'cartoon':'low poly')+', qualidade leve, com sombras e partículas.';
 const spec=parser.parseGdd(source,entry.instruction,{genre:entry.genre,dimension:entry.dimension});
 const files=generator.generate(spec,source);validateFiles(files,entry.dimension,entry.genre);
 const directory=path.join(output,entry.slug);fs.mkdirSync(directory);
 for(const [filename,contents] of Object.entries(files))fs.writeFileSync(path.join(directory,filename),contents);
 graphicsMatrix.push(entry);
}
const careInstruction='Agora dois tanques, não quero dez tanques. Crescer em doze segundos, fome em cinco segundos, água suja em seis segundos. Filhote vale quatro, jovem vale doze, adulto vale vinte e quatro. Vender filhotes, meta de dez moedas.';
const careSpec=parser.parseGdd('# Aquário de cuidado\nQuero cuidar de aquário com quatro tanques. Crescer em um minuto, fome em 15 segundos e água suja em 30 segundos.',careInstruction);
const careFiles=generator.generate(careSpec,'');validateFiles(careFiles,'2d','simulation');
const careDirectory=path.join(output,'aquarium-care');fs.mkdirSync(careDirectory);
for(const [filename,contents] of Object.entries(careFiles))fs.writeFileSync(path.join(careDirectory,filename),contents);
for(const [domain,instruction] of [['farm','Quero cuidar de fazenda com dois canteiros, crescer em dois segundos, meta de dez moedas.'],['shop','Quero administrar uma loja com duas prateleiras, atendimento em dois segundos, meta de dez moedas.']]){
 const spec=parser.parseGdd('# Save '+domain,instruction),files=generator.generate(spec,'');
 const directory=path.join(output,'save-'+domain);fs.mkdirSync(directory);
 for(const [filename,contents] of Object.entries(files))fs.writeFileSync(path.join(directory,filename),contents);
}
for(const [domain,intro] of [['farm','Cuidar de fazenda'],['aquarium','Cuidar de aquário'],['shop','Administrar loja']]){
 const spec=parser.parseGdd('# Automação '+domain,intro+'. Produção automática. Dois espaços, crescer em dois segundos, atendimento em dois segundos e meta de dez moedas.'),files=generator.generate(spec,'');
 validateFiles(files,'2d','simulation');
 const directory=path.join(output,'automation-'+domain);fs.mkdirSync(directory);
 for(const [filename,contents] of Object.entries(files))fs.writeFileSync(path.join(directory,filename),contents);
}
// GF-TRAIN-12: cenário de aceitação no Chromium com movimento livre e save de posição.
const freeSpec=parser.parseGdd('','Quero cuidar de aquário. Quero andar livremente com WASD. Dois tanques, crescer em dois segundos e meta de dez moedas.');
const freeFiles=generator.generate(freeSpec,'');validateFiles(freeFiles,'2d','simulation');
const freeDirectory=path.join(output,'free-aquarium');fs.mkdirSync(freeDirectory);
for(const [filename,contents] of Object.entries(freeFiles))fs.writeFileSync(path.join(freeDirectory,filename),contents);
// GF-TRAIN-13: gerar missão real com NPC, diálogo e venda para QA do navegador.
const storySpec=parser.parseGdd('','Cuidar de aquário. Missão: vender um peixe. Andar livremente com WASD. Dois tanques, crescer em dois segundos e meta de dez moedas.');
const storyFiles=generator.generate(storySpec,'');validateFiles(storyFiles,'2d','simulation');
const storyDirectory=path.join(output,'story-aquarium');fs.mkdirSync(storyDirectory);
for(const [filename,contents] of Object.entries(storyFiles))fs.writeFileSync(path.join(storyDirectory,filename),contents);
// GF-TRAIN-14: dois cenários físicos com escolhas e patrulha.
for(const [slug,instruction] of [
 ['branch-aquarium','Cuidar de aquário. Missão: escolher entre alimentar ou vender. Dois tanques, crescer em dois segundos e meta de dez moedas.'],
 ['patrol-aquarium','Cuidar de aquário. NPC patrulhando. Dois tanques, crescer em dois segundos e meta de 999 moedas.']
]){
 const spec=parser.parseGdd('',instruction),files=generator.generate(spec,'');
 validateFiles(files,'2d','simulation');
 const directory=path.join(output,slug);fs.mkdirSync(directory);
 for(const [filename,contents] of Object.entries(files))fs.writeFileSync(path.join(directory,filename),contents);
}
// GF-TRAIN-15: fixture de integração de duas missões e dois NPCs no navegador real.
const chainSpec=parser.parseGdd('','Cuidar de aquário. Duas missões encadeadas. Primeira missão: comprar um peixe. Segunda missão: vender um peixe, estoque de um peixe e esperar 3 segundos. Dois tanques, crescer em dois segundos, meta de dez moedas.');
const chainFiles=generator.generate(chainSpec,'');validateFiles(chainFiles,'2d','simulation');
const chainDir=path.join(output,'chain-aquarium');fs.mkdirSync(chainDir);
for(const [filename,contents] of Object.entries(chainFiles))fs.writeFileSync(path.join(chainDir,filename),contents);
// GF-TRAIN-16: 3 missões com duas tarefas reais por missão e NPCs alternados.
const parallelSpec=parser.parseGdd('','Cuidar de aquário. Três missões encadeadas com objetivos simultâneos. Missão 1: comprar 1 e alimentar 1. Missão 2: comprar 1 e alimentar 1. Missão 3: comprar 1 e alimentar 1. Dois tanques, crescer em dois segundos, meta de dez moedas.');
const parallelFiles=generator.generate(parallelSpec,'');validateFiles(parallelFiles,'2d','simulation');
const parallelDir=path.join(output,'parallel-aquarium');fs.mkdirSync(parallelDir);
for(const [filename,contents] of Object.entries(parallelFiles))fs.writeFileSync(path.join(parallelDir,filename),contents);
fs.writeFileSync(path.join(output,'graphics-matrix.json'),JSON.stringify(graphicsMatrix,null,2));
fs.writeFileSync(path.join(output,'matrix.json'),JSON.stringify(matrix,null,2));
process.stdout.write('GF-002: '+matrix.length+' jogos reais e ZIPs de exportação preparados para browser QA.\n');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
