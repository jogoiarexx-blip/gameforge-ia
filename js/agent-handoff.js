/* GF-ARCH-14 — manifesto somente-leitura para futuros agentes isolados.
 * Não instancia agentes, não executa código e não concede direitos de escrita.
 */
(function(root){
'use strict';
const Engine=root.GameForgeStudioOrchestrator||(typeof require==='function'?require('./studio-orchestrator'):null);
const Map=root.GameForgeCodeProvenance||(typeof require==='function'?require('./code-provenance'):null);
const Evidence=root.GameForgeRequirementEvidence||(typeof require==='function'?require('./requirement-evidence'):null);
function create(input={}){
 const files=input.files||{},route=Engine.plan({instruction:input.instruction,spec:input.spec,files}),
  codeMap=Map.index(files),requirements=Evidence.extract({...input,files});
 const blocked=new Set(route.protectedFiles);
 const tasks=route.agents.filter(a=>a.status==='PLANNED').map(a=>{
  const targets=a.targetFiles.filter(f=>typeof files[f]==='string'&&!blocked.has(f)).slice(0,8);
  const symbols=codeMap.definitions.filter(s=>targets.includes(s.file)).slice(0,45)
   .map(s=>({name:s.name,file:s.file,line:s.line,evidence:s.evidence}));
  const related=requirements.requirements.filter(r=>{
   if(a.id==='quality'||a.id==='architecture')return true;
   if(a.id==='graphics')return r.category==='graphics'||r.category==='performance';
   if(a.id==='gameplay')return !['graphics','export'].includes(r.category);
   return false;
  }).slice(0,25).map(r=>({id:r.id,category:r.category,status:r.status}));
  return {agentId:a.id,title:a.name,mode:'PLAN_ONLY',permissions:['READ_MANIFEST','PROPOSE_PATCH'],
   executable:false,files:targets.map(f=>({path:f,revision:Evidence.checksum(files[f])})),
   symbols,requirements:related,acceptance:a.tests,reviewRequired:true};
 });
 return {version:14,type:'AGENT_HANDOFF_MANIFEST',policy:'NO_EXECUTION',
  instructions:'Manifesto para ferramentas confiáveis futuras. Não concede acesso aos conteúdos, shell, rede ou capacidade de gravar arquivos.',
  restrictions:route.restrictions,protectedFiles:route.protectedFiles,tasks,
  gate:'Toda proposta deve passar pela lista permitida, revisão explícita e QA real antes da aplicação.',
  note:'Hash usado para detectar mudanças acidentais, não como assinatura criptográfica.'};
}
root.GameForgeAgentHandoff={create};
if(typeof module!=='undefined')module.exports=root.GameForgeAgentHandoff;
})(typeof globalThis!=='undefined'?globalThis:this);
