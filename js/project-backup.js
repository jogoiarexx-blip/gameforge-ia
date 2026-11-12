/* Backups portáteis do Studio. Validação de dados sem executar código. */
(function(root){
'use strict';
const allowedFiles=['index.html','style.css','game.js','engine-3d.js','THREE-LICENSE.txt','GDD_original.md','RELATORIO_GERACAO.md','RELATORIO_QA.md','RELATORIO_VISUAL_IA.md','RELATORIO_REFERENCIAS.md','MANIFESTO_SHMUP.md','RELATORIO_EVOLUCAO.md','PLANO_DESENVOLVIMENTO.md','RELATORIO_LEITURA_GDD.md','PLANO_TAREFAS_GDD.md','TAREFAS_GDD.json','CAMPANHA_EDITOR.md'];
const states=['pendente','em andamento','aguardando revisão','validada','bloqueada'];
const bytes=s=>new TextEncoder().encode(s).length;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function text(value,max,label,fallback=''){
 if(value===undefined)return fallback;
 if(typeof value!=='string'||bytes(value)>max)throw Error(label+' inválido ou acima do limite.');
 return value;
}
function files(value){
 if(!object(value))throw Error('Lista de arquivos inválida.');
 const result={};
 for(const [name,source] of Object.entries(value)){
  if(!allowedFiles.includes(name))throw Error('Arquivo não permitido no backup: '+name);
  result[name]=text(source,name==='GDD_original.md'?1000000:2000000,'Arquivo '+name);
 }
 if(Boolean(result['game.js'])!==Boolean(result['style.css']))throw Error('O jogo precisa de game.js e style.css completos.');
 return result;
}
function records(value=[]){
 if(!Array.isArray(value)||value.length>50000)throw Error('Tarefas inválidas.');
 return value.map(r=>{
  if(!object(r)||typeof r.id!=='string'||!states.includes(r.status))throw Error('Registro de tarefa inválido.');
  return {id:text(r.id,160,'ID'),status:r.status,notes:text(r.notes,2000,'Notas'),revision:Number.isSafeInteger(r.revision)&&r.revision>=0?r.revision:0};
 });
}
function normalize(snap){
 if(!object(snap))throw Error('Projeto inválido.');
 const history=snap.history??[];
 if(!Array.isArray(history)||history.length>4)throw Error('Histórico inválido; limite de quatro versões.');
 const result={name:text(snap.name,360,'Nome'),gdd:text(snap.gdd,1000000,'GDD'),instruction:text(snap.instruction,40000,'Instrução'),files:files(snap.files),
  selected:allowedFiles.includes(snap.selected)?snap.selected:'game.js',
  roadmapRecords:records(snap.roadmapRecords),selectedTaskId:text(snap.selectedTaskId??'',160,'Tarefa selecionada'),
  pinnedReferences:Array.isArray(snap.pinnedReferences)?snap.pinnedReferences.filter(x=>typeof x==='string'&&x.length<160).slice(0,5):[],
  deepPlan:snap.deepPlan!==false,
  creationOptions:object(snap.creationOptions)?{dimension:['2d','3d'].includes(snap.creationOptions.dimension)?snap.creationOptions.dimension:'auto',genre:['arena','shooter','racing','platform','rpg','fps','tower-defense','lane-defense','block-td'].includes(snap.creationOptions.genre)?snap.creationOptions.genre:'auto',theme:['forest','desert','neon','ruins'].includes(snap.creationOptions.theme)?snap.creationOptions.theme:'auto',size:snap.creationOptions.size===72?72:48,quality:['low','high'].includes(snap.creationOptions.quality)?snap.creationOptions.quality:'auto'}:undefined,
  history:history.map(h=>{
   if(!object(h))throw Error('Versão anterior inválida.');
   return {instruction:text(h.instruction,1000,'Descrição'),at:text(h.at,100,'Data'),gdd:text(h.gdd,1000000,'GDD anterior'),files:files(h.files),taskRecords:records(h.taskRecords)};
  })};
 return result;
}
function encode(snap){
 const encoded=JSON.stringify({format:'gameforge-project',version:1,studioVersion:'0.15.0',savedAt:new Date().toISOString(),project:normalize(snap)});
 if(bytes(encoded)>20000000)throw Error('Backup acima de 20 MB. Reduza o histórico antes de exportar.');
 return encoded;
}
function decode(raw){
 if(typeof raw!=='string'||bytes(raw)>20000000)throw Error('Backup inválido ou acima de 20 MB.');
 let data;try{data=JSON.parse(raw);}catch{throw Error('JSON inválido. Selecione um arquivo .gameforge.json.');}
 if(!object(data)||data.format!=='gameforge-project'||data.version!==1)throw Error('Formato ou versão de backup não compatível.');
 return normalize(data.project);
}
function save(storage,key,snapshot){
 let raw;
 try{
  // Evita duplicar bibliotecas e arquivos inalterados em quatro versões.
  const pool=[],indices=new Map();
  const intern=source=>{if(!indices.has(source)){indices.set(source,pool.length);pool.push(source);}return indices.get(source);};
  const pack=value=>object(value)?Object.fromEntries(Object.entries(value).map(([name,source])=>[name,intern(source)])):value;
  const packed={...snapshot,fileEncoding:'pool-v1',files:pack(snapshot.files),history:Array.isArray(snapshot.history)?snapshot.history.map(h=>({...h,files:pack(h.files)})):snapshot.history,filePool:pool};
  raw=JSON.stringify(packed);restoreStored(raw);
 }
 catch(e){return {ok:false,message:'Não salvo no navegador: '+e.message+' Revise o conteúdo para salvar ou baixar o backup.'};}
 try{storage.setItem(key,raw);return {ok:true,message:'Salvo neste navegador'};}
 catch{return {ok:false,message:'Não salvo no navegador. Baixe um backup para preservar o projeto.'};}
}
function restoreStored(raw){
 let snap=JSON.parse(raw);
 if(!object(snap))throw Error('Projeto salvo inválido.');
 if(snap.fileEncoding==='pool-v1'){
  if(!Array.isArray(snap.filePool)||snap.filePool.length>100||snap.filePool.some(x=>typeof x!=='string'))throw Error('Arquivos compartilhados inválidos.');
  const unpack=value=>{
   if(!object(value))return value;
   return Object.fromEntries(Object.entries(value).map(([name,index])=>{
    if(!Number.isInteger(index)||index<0||index>=snap.filePool.length)throw Error('Referência de arquivo inválida.');
    return [name,snap.filePool[index]];
   }));
  };
  snap={...snap,files:unpack(snap.files),history:Array.isArray(snap.history)?snap.history.map(h=>({...h,files:unpack(h.files)})):snap.history};
 }
 const filter=value=>object(value)?Object.fromEntries(Object.entries(value).filter(([name])=>allowedFiles.includes(name))):value;
 return normalize({...snap,files:filter(snap.files),history:Array.isArray(snap.history)?snap.history.map(h=>object(h)?{...h,files:filter(h.files)}:h):snap.history});
}
function activeSpec(files,fallback){
 const match=files?.['game.js']?.match(/const GAME_SPEC = (\{[^\n]*\});/);
 if(match){try{
  const value=JSON.parse(match[1]);
  if(object(value)&&typeof value.title==='string'&&typeof value.genre==='string'&&Array.isArray(value.stages)&&value.stages.length>0&&value.stages.every(x=>typeof x==='string')&&(!value.tuning||(object(value.tuning)&&Object.values(value.tuning).every(x=>typeof x==='number'&&Number.isFinite(x)))))return value;
 }catch{}}
 return fallback;
}
root.GameForgeProject={allowedFiles,normalize,encode,decode,save,restoreStored,activeSpec};
if(typeof module!=='undefined')module.exports=root.GameForgeProject;
})(typeof globalThis!=='undefined'?globalThis:this);
