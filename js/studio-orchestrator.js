/* GF-ARCH-13 — roteamento especializado e propostas com aprovação explícita.
 * Pipeline local/determinístico. "Agentes" são responsabilidades planejadas:
 * nenhum modelo externo é chamado nem código é executado por este módulo. */
(function(root){
'use strict';
const Studio=root.GameForgeStudioIntelligence||(typeof require==='function'?require('./studio-intelligence'):null);
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const filename=path=>/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-z0-9][a-z0-9._/-]{0,179}$/i.test(path||'')&&!String(path).includes('//');
const roles=[
 {id:'architecture',name:'Arquitetura e planejamento',tests:['Conferir requisitos e arquivos protegidos','Confirmar escopo antes de alterar código']},
 {id:'gameplay',name:'Programação e jogabilidade',pattern:/\b(inimig|chefe|boss|fase|miss|combate|tiro|atira|arma|moviment|personag|jogab|velocid|fisic|colis|controle|w a s d|wasd|salvament|save|inventar|craft|corrid|obstacul|voar|pulo|camer|camera|checkpoint|npc|rpg|fps|dificuld|pontua|vida|mecanica|motor)\w*\b/,keys:['game.js','js/development-engine.js','js/intent-compiler.js','js/generator.js','js/stage-spec.js','js/stage-branches.js','js/urban-runtime.js','js/shooter-3d-runtime.js','js/three-runtime.js'],tests:['Testar controles, condições de vitória e derrota','Verificar missões, estado e salvamento']},
 {id:'graphics',name:'Gráficos e apresentação',pattern:/\b(graf|visual|desenh|model|textur|sombra|luz|ilumina|animac|sprite|hud|menu|estil|cor|cenario|cenario|interface|ui|render|3d|glb|css|camera)\w*\b/,keys:['style.css','game.js','css/app.css','css/visual-composer.css','js/graphics-design.js','js/graphics-runtime.js','js/render-cache.js','js/three-runtime.js','js/glb-runtime.js','js/actor-animations.js'],tests:['Comparar capturas antes/depois','Inspecionar legibilidade e desempenho']},
 {id:'quality',name:'QA e regressões',tests:['Verificar sintaxe e iniciar prévia','Executar regressões automatizadas','Solicitar revisão manual da jogabilidade']}
];
const DOCUMENTS=new Set(['RELATORIO_EVOLUCAO.md','PLANO_DESENVOLVIMENTO.md','CAMPANHA_EDITOR.md','BRIEF_E_CHECKLIST_STUDIO.md','MAPA_DEPENDENCIAS.json']);
const EDITABLE=new Set(['game.js','style.css']);
function clauses(instruction){
 const positive=[],negative=[];
 for(const part of String(instruction||'').split(/[.;!?\n]|\bmas\b|\bpor[eé]m\b/i)){
  const raw=part.trim();if(!raw)continue;
  const marker=/\b(?:n[aã]o|sem|evitar|preservar|preserve|mantenha|manter|nunca)\b/i.exec(raw);
  if(marker){
   const before=raw.slice(0,marker.index).trim(),after=raw.slice(marker.index).trim();
   if(before)positive.push(before);
   if(after)negative.push(after.slice(0,180));
  }else positive.push(raw);
 }
 return {positive,negative};
}
function restrictions(instruction){return [...new Set(clauses(instruction).negative)].slice(0,20);}
function protectedFiles(instruction,files){
 const available=new Set(Object.keys(files||{}));
 const protectedPaths=new Set();
 for(const clause of restrictions(instruction)){
  const mentioned=clause.match(/\b[a-z0-9_./-]+\.(?:js|mjs|css|html|json|md)\b/gi)||[];
  for(const path of mentioned){
   const present=[...available].find(key=>key.toLowerCase()===path.toLowerCase());
   if(present)protectedPaths.add(present);
  }
 }
 return [...protectedPaths].sort();
}
function intentText(instruction){return norm(clauses(instruction).positive.join(' '));}
function chooseTargets(role,files,protectedPaths){
 const available=Object.keys(files||{}),blocked=new Set(protectedPaths);
 const engine=available.some(k=>k.startsWith('js/'));
 if(role.id==='architecture'||role.id==='quality')return [];
 const paths=role.keys.filter(k=>available.includes(k)&&!blocked.has(k));
 if(engine)return paths.filter(k=>k.startsWith('js/')||k.startsWith('css/')).slice(0,8);
 if(role.id==='graphics')return paths.filter(k=>k==='style.css'||k==='game.js');
 return paths.filter(k=>k==='game.js');
}
function plan(input={}){
 const instruction=String(input.instruction||'').slice(0,12000),spec=input.spec||{},files=input.files||{};
 const preserved=restrictions(instruction),blocked=protectedFiles(instruction,files);
 const positive=intentText(instruction);
 const graph=Studio?Studio.dependencyGraph(files):{nodes:Object.keys(files),edges:[],unresolved:[]};
 const agents=roles.map(role=>{
  const relevant=role.id==='architecture'||role.id==='quality'||role.pattern.test(positive);
  const targets=relevant?chooseTargets(role,files,blocked):[];
  return {id:role.id,name:role.name,status:relevant?'PLANNED':'NOT_NEEDED',
   execution:'NOT_RUN',targetFiles:targets,evidence:targets.length?'HEURISTIC':'NONE',
   tests:role.tests||[],reason:!relevant?'Pedido não exige esta especialidade':
    !targets.length&&['gameplay','graphics'].includes(role.id)?'Nenhum arquivo compatível editável identificado; exige revisão humana':
    'Etapa a executar; nenhum agente executado automaticamente'};
 });
 const targets=[...new Set(agents.flatMap(a=>a.targetFiles))].sort();
 const impacted=Studio?Studio.affectedFiles(graph,targets):targets;
 const warnings=[];
 if(!instruction.trim())warnings.push('Nenhum pedido informado.');
 if(!Object.keys(files).length)warnings.push('Projeto vazio; não há código a modificar.');
 if(!targets.length)warnings.push('Nenhum módulo selecionado para edição: planejar manualmente antes de gerar patch.');
 if(blocked.length)warnings.push('Arquivos protegidos por instrução explícita: '+blocked.join(', '));
 const result={
  version:13,mode:'PLAN_ONLY',instruction,specSummary:{genre:String(spec.genre||'não identificado'),dimension:String(spec.dimension||'não identificada')},
  restrictions:preserved,protectedFiles:blocked,agents,targets,impacted,
  dependencies:{extracted:graph.edges.filter(e=>e.evidence==='EXTRACTED').length,unresolved:graph.unresolved.length},
  checks:[{id:'syntax',status:'PENDING'},{id:'preview',status:'PENDING'},{id:'regression',status:'PENDING'},{id:'human',status:'PENDING'}],
  warnings,
  guarantee:'Planejamento heurístico. Não executa modelos, não produz código, não aprova testes.'
 };
 return result;
}
function checksum(text){
 const s=String(text);let hash=2166136261;
 for(let i=0;i<s.length;i++){hash^=s.charCodeAt(i);hash=Math.imul(hash,16777619);}
 return (hash>>>0).toString(16).padStart(8,'0')+':'+s.length;
}
function stage(input={}){
 const baseline=input.currentFiles||{},proposed=input.proposedFiles||{},route=input.route||plan({files:baseline});
 const protectedPaths=new Set(route.protectedFiles||[]);
 const changes=[];
 for(const path of new Set([...Object.keys(baseline),...Object.keys(proposed)])){
  if(!filename(path))throw Error('Nome de arquivo inseguro: '+path);
  const before=baseline[path],after=proposed[path];
  if(before===after)continue;
  if(after===undefined)throw Error('Exclusão automática bloqueada: '+path);
  if(typeof after!=='string'||after.length>2_500_000)throw Error('Conteúdo inválido ou muito grande: '+path);
  if(!EDITABLE.has(path)&&!DOCUMENTS.has(path))throw Error('Arquivo fora da lista de edição permitida: '+path);
  if(protectedPaths.has(path))throw Error('Arquivo protegido por instrução: '+path);
  if(before===undefined&&!DOCUMENTS.has(path))throw Error('Criação de código não autorizada: '+path);
  changes.push({path,previousHash:checksum(before===undefined?'<ABSENT>':before),nextHash:checksum(after),
   next:after,kind:before===undefined?'CREATE':'UPDATE',characters:after.length});
 }
 if(!changes.length)throw Error('A proposta não modifica nenhum arquivo.');
 if(changes.length>12)throw Error('A proposta excede o limite de 12 arquivos.');
 changes.sort((a,b)=>a.path.localeCompare(b.path));
 return {version:13,approval:'REQUIRED',status:'STAGED',changes,restricted:route.restrictions||[],
  filesTouched:changes.map(c=>c.path),checklist:['Revisar arquivos alterados','Confirmar impacto da alteração','Aprovar explicitamente','Rodar QA depois de aplicar'],
  note:'Conteúdo não executado. Assinaturas são detectores de conflito, não segurança criptográfica.'};
}
/* Prévia limitada de alterações por faixa divergente. Não é diff linha a linha
 * completo: evita despejar arquivos enormes antes de aprovar. */
function preview(candidate,currentFiles,limit=1100){
 if(!candidate||!Array.isArray(candidate.changes))throw Error('Proposta inválida.');
 const budget=Math.max(120,Math.min(4000,Number(limit)||1100));
 return candidate.changes.map(change=>{
  const original=String((currentFiles||{})[change.path]||''),newer=change.next||'';
  let start=0;
  while(start<original.length&&start<newer.length&&original[start]===newer[start])start++;
  let tail=0;
  while(tail<original.length-start&&tail<newer.length-start&&original[original.length-1-tail]===newer[newer.length-1-tail])tail++;
  const oldPart=original.slice(Math.max(0,start-80),original.length-tail);
  const newPart=newer.slice(Math.max(0,start-80),newer.length-tail);
  const excerpt=s=>s.length>budget?s.slice(0,budget)+'\n[…trecho abreviado…]':s;
  return 'ARQUIVO: '+change.path+' ('+change.kind+')\nTrecho antigo:\n- '+excerpt(oldPart)+
   '\nTrecho proposto:\n+ '+excerpt(newPart)+'\n';
 }).join('\n');
}
function apply(currentFiles,candidate,option={}){
 if(option.approved!==true)throw Error('É necessária aprovação explícita para aplicar a proposta.');
 if(!candidate||candidate.version!==13||candidate.status!=='STAGED'||candidate.approval!=='REQUIRED')throw Error('Proposta inválida.');
 if(!Array.isArray(candidate.changes)||!candidate.changes.length||candidate.changes.length>12)throw Error('Lista de mudanças inválida.');
 const out={...currentFiles},seen=new Set();
 for(const c of candidate.changes){
  if(!filename(c.path)||seen.has(c.path)||!EDITABLE.has(c.path)&&!DOCUMENTS.has(c.path))throw Error('Arquivo não permitido na proposta.');
  seen.add(c.path);
  if(typeof c.next!=='string'||c.next.length>2_500_000||checksum(c.next)!==c.nextHash)throw Error('A proposta foi modificada após ser criada.');
  const current=Object.prototype.hasOwnProperty.call(currentFiles,c.path)?currentFiles[c.path]:'<ABSENT>';
  if(checksum(current)!==c.previousHash)throw Error('Conflito: o arquivo '+c.path+' mudou desde o planejamento. Gere outra proposta.');
 }
 for(const c of candidate.changes)out[c.path]=c.next;
 return out;
}
function report(p){
 return '# GameForge — Orquestração GF-ARCH-13\n\n'+
  '**Modo:** '+p.mode+' (planejar, sem executar agentes ou alterar código)\n\n'+
  '## Pedido\n'+p.instruction+'\n\n## Restrições que devem ser preservadas\n'+(p.restrictions.map(x=>'- '+x).join('\n')||'- Nenhuma explícita detectada')+
  '\n\n## Módulos sugeridos — evidência heurística\n'+(p.targets.map(x=>'- '+x).join('\n')||'- Nenhum')+
  '\n\n## Arquivos potencialmente afetados\n'+(p.impacted.map(x=>'- '+x).join('\n')||'- Nenhum')+
  '\n\n## Especialidades (não executadas)\n'+p.agents.map(a=>'- '+a.name+' — '+a.status+'; '+(a.targetFiles.join(', ')||'sem arquivos selecionados')+'; '+a.reason).join('\n')+
  '\n\n## Gates de validação\n'+p.checks.map(c=>'- [ ] '+c.id+' — '+c.status).join('\n')+
  '\n\n## Alertas\n'+(p.warnings.map(x=>'- '+x).join('\n')||'- Nenhum')+
  '\n\nNenhuma alteração é aplicada sem proposta revisada e aprovação explícita. Gates só avançam quando o teste realmente acontece.\n';
}
const api={plan,stage,apply,preview,report,checksum,protectedFiles};
root.GameForgeStudioOrchestrator=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
