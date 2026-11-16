'use strict';
/* Executed by the verified-Pages workflow. Does not authorize an unverified commit. */
const SHA=/^[a-f0-9]{40}$/i;
function decide(event,expectedRepository,expectedSha){
 const run=event&&event.workflow_run;
 const problems=[];
 if(!run||typeof run!=='object')return {allowed:false,problems:['Evento workflow_run ausente']};
 if(run.name!=='Validar GameForge Studio')problems.push('Workflow de origem desconhecido');
 if(run.conclusion!=='success'||run.status!=='completed')problems.push('CI não concluiu com sucesso');
 if(run.event!=='push'||run.head_branch!=='main')problems.push('Somente push na main validado pode publicar');
 const repo=String(expectedRepository||'');
 if(!repo||run.repository?.full_name!==repo||run.head_repository?.full_name!==repo)
  problems.push('Origem do repositório divergente');
 if(!SHA.test(String(expectedSha||''))||run.head_sha!==expectedSha)
  problems.push('SHA verificado não corresponde ao SHA que será publicado');
 if(run.pull_requests?.length)problems.push('Execução relacionada a PR não pode publicar');
 return {allowed:problems.length===0,problems,sha:run.head_sha};
}
function main(){
 const fs=require('node:fs');
 const filepath=process.env.GITHUB_EVENT_PATH;
 if(!filepath)throw Error('Arquivo GITHUB_EVENT_PATH indisponível');
 const raw=fs.readFileSync(filepath,'utf8');
 if(raw.length>3_000_000)throw Error('Evento acima de 3 MB');
 const event=JSON.parse(raw);
 const outcome=decide(event,process.env.GITHUB_REPOSITORY,process.env.VERIFIED_SHA);
 if(!outcome.allowed)throw Error('Publicação bloqueada: '+outcome.problems.join('; '));
 process.stdout.write('GitHub Pages autorizado para commit verificado '+outcome.sha+'\n');
}
if(require.main===module){try{main();}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={decide};
