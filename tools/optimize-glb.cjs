/* GF-OPEN-01b — otimizacao local conservadora para GLBs GameForge.
 * Ferramenta opcional Node.js: nao entra no runtime/Paginas HTML.
 * Requer @gltf-transform/cli instalado por npm.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const GLB=require('../js/glb-runtime.js');

const MAX_INPUT=100*1024*1024;
const MAX_GAMEFORGE=25*1024*1024;
const MAX_TOTAL=50*1024*1024;

function usage(){
 return [
  'GameForge GF-OPEN-01b — otimizar GLB para importar na engine',
  'Uso: npm run optimize:glb -- entrada.glb saida.glb [--webp] [--resize=1024] [--force]',
  'Por padrao aplica dedup e prune (sem Draco, Meshopt, KTX2 ou perda de texturas).',
  '--webp: converte texturas baseColor em WebP (mudanca visual possivel).',
  '--resize=1024: reduz texturas maiores (aceita 512, 1024 ou 2048; mudanca visual possivel).',
  'O arquivo original nunca e alterado. A saida passa pelo leitor GLB do GameForge.'
 ].join('\n');
}
function argsFrom(argv){
 const args={webp:false,resize:0,force:false,paths:[]};
 for(const raw of argv){
  if(raw==='--webp'){args.webp=true;continue;}
  if(raw==='--force'){args.force=true;continue;}
  if(raw==='--help'||raw==='-h'){args.help=true;continue;}
  if(raw.startsWith('--resize=')){
   const n=Number(raw.split('=')[1]);
   if(![512,1024,2048].includes(n))throw Error('Use --resize=512, --resize=1024 ou --resize=2048.');
   args.resize=n;continue;
  }
  if(raw.startsWith('-'))throw Error('Opcao desconhecida: '+raw);
  args.paths.push(raw);
 }
 if(args.help)return args;
 if(args.paths.length!==2)throw Error('Informe caminho de entrada e saida. Veja --help.');
 args.input=path.resolve(args.paths[0]);
 args.output=path.resolve(args.paths[1]);
 if(args.input===args.output)throw Error('O destino nao pode ser igual ao original.');
 if(!/\.glb$/i.test(args.input)||!/\.glb$/i.test(args.output))throw Error('A entrada e a saida devem ser arquivos .glb.');
 return args;
}
function jsonOf(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<20||bytes.length>MAX_INPUT)throw Error('GLB invalido ou acima de 100 MB.');
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==bytes.length)
  throw Error('Cabecalho GLB 2.0 invalido.');
 const len=v.getUint32(12,true);
 if(v.getUint32(16,true)!==0x4e4f534a||len>bytes.length-20||len>12_000_000)
  throw Error('Bloco JSON invalido.');
 const doc=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(20,20+len)).trim());
 if(doc?.asset?.version!=='2.0')throw Error('O arquivo nao declara glTF 2.0.');
 return doc;
}
function snapshot(json){
 const a=v=>Array.isArray(v)?v:[];
 const clips=a(json.animations).map((clip,i)=>({
  name:String(clip.name||'').trim()||'(sem nome '+i+')',
  channels:a(clip.channels).length,
  paths:a(clip.channels).map(ch=>String(ch?.target?.path||'')).sort()
 })).sort((x,y)=>x.name.localeCompare(y.name));
 return {clips,skins:a(json.skins).map(s=>a(s.joints).length).sort((x,y)=>x-y),meshes:a(json.meshes).length};
}
function assertPreserved(before,after){
 const b=snapshot(before),a=snapshot(after);
 if(JSON.stringify(b.clips)!==JSON.stringify(a.clips))
  throw Error('Otimizacao alterou o nome, numero ou os canais de animacoes. Nenhum arquivo foi publicado.');
 if(JSON.stringify(b.skins)!==JSON.stringify(a.skins))
  throw Error('Otimizacao alterou a estrutura de skins/ossos. Nenhum arquivo foi publicado.');
 if(b.meshes>0&&a.meshes===0)throw Error('Otimizacao removeu todas as malhas.');
 return {before:b,after:a};
}
function cliRunner(command,src,dst,options=[]){
 const cli=path.join(__dirname,'..','node_modules','@gltf-transform','cli','bin','cli.js');
 if(!fs.existsSync(cli))throw Error('Instale dependencias antes: npm install --no-audit --no-fund.');
 const out=spawnSync(process.execPath,[cli,command,src,dst,...options],{
  encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024,windowsHide:true
 });
 if(out.error)throw Error('Falha no glTF-Transform ('+command+'): '+out.error.message);
 if(out.status!==0)throw Error('glTF-Transform ('+command+') falhou: '+(out.stderr||out.stdout||'codigo '+out.status).trim().slice(0,1100));
 if(!fs.existsSync(dst))throw Error('glTF-Transform ('+command+') nao criou a saida.');
}
function optimize(args,run=cliRunner){
 if(!args||!args.input||!args.output)throw Error('Informe os caminhos de entrada e saida.');
 const input=path.resolve(args.input),output=path.resolve(args.output);
 if(input===output)throw Error('Nao sobrescrever o original.');
 if(!fs.existsSync(input)||!fs.statSync(input).isFile())throw Error('GLB de entrada nao encontrado.');
 if(fs.existsSync(output)&&!args.force)throw Error('Destino ja existe; use --force apenas se quiser substitui-lo.');
 if(!fs.existsSync(path.dirname(output)))throw Error('Pasta de destino nao existe.');
 const original=fs.readFileSync(input);
 const first=jsonOf(original);
 if(original.length<=MAX_GAMEFORGE)GLB.decode(null,original); // input importavel deve ser valido
 let workDir=null;
 try{
  workDir=fs.mkdtempSync(path.join(path.dirname(output),'.gf-glb-opt-'));
  const tasks=[
   ['dedup',[]],
   ['prune',[]]
  ];
  if(args.resize)tasks.push(['resize',['--width',String(args.resize),'--height',String(args.resize)]]);
  if(args.webp)tasks.push(['webp',['--slots','baseColor']]);
  let prev=input;
  for(let i=0;i<tasks.length;i++){
   const [name,flags]=tasks[i],next=path.join(workDir,'step-'+i+'.glb');
   run(name,prev,next,flags);
   prev=next;
  }
  const optimized=fs.readFileSync(prev);
  const after=jsonOf(optimized);
  assertPreserved(first,after);
  if(optimized.length>MAX_GAMEFORGE)throw Error('Resultado excedeu o limite GameForge de 25 MB.');
  GLB.decode(null,optimized); // verifica extensoes, buffers, malhas, texturas e rig
  const keepOptimized=optimized.length<original.length;
  if(!keepOptimized&&original.length>MAX_GAMEFORGE)throw Error('Otimizado nao coube no limite de 25 MB.');
  const finalBytes=keepOptimized?optimized:original;
  const target=path.join(workDir,'saida-validada.glb');
  fs.writeFileSync(target,finalBytes,{flag:'wx'});
  fs.renameSync(target,output);
  return {
   inputBytes:original.length,candidateBytes:optimized.length,outputBytes:finalBytes.length,
   savedBytes:original.length-finalBytes.length,
   savedPercent:Number((100*(original.length-finalBytes.length)/original.length).toFixed(2)),
   usedOptimized:keepOptimized,
   webp:!!args.webp,resize:args.resize||0,
   importerLimitMB:25,libraryLimitMB:50,output
  };
 }finally{if(workDir)fs.rmSync(workDir,{recursive:true,force:true});}
}
if(require.main===module){
 try{
  const args=argsFrom(process.argv.slice(2));
  if(args.help)console.log(usage());
  else{
   const summary=optimize(args);
   console.log('GameForge: arquivo validado e gravado em '+summary.output);
   console.log('Original: '+summary.inputBytes+' bytes; saida: '+summary.outputBytes+' bytes; economia: '+summary.savedPercent+'%.');
   if(!summary.usedOptimized)console.log('A versao otimizada nao ficou menor: original validado preservado na saida.');
   console.log('Importe o novo GLB pela biblioteca do Studio; faca a prova visual no jogo.');
  }
 }catch(err){console.error('GameForge: '+err.message);process.exitCode=1;}
}
module.exports={usage,argsFrom,jsonOf,snapshot,assertPreserved,cliRunner,optimize,MAX_GAMEFORGE,MAX_TOTAL};
