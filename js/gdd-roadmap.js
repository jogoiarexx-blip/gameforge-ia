/* Planejador auditável de GDD, 100% local. Não declara tarefas implementadas. */
(function(root){
'use strict';
const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const statusOptions=['pendente','em andamento','aguardando revisão','validada','bloqueada'];
const rules=[
 ['Fases e progressão',/\b(fase|level|missao|capitulo|ato|stage|progressao|campanha)\b/],
 ['Combate e inimigos',/\b(inimig|boss|chefe|combat|arma|ataque|tiro|dano|colis|projetil)/],
 ['Interface e menus',/\b(menu|hud|inventar|interface|pause|pausa|opcoes|loja|tela)/],
 ['Personagens e animação',/\b(personag|modelo|rig|esqueleto|osso|animac|glb|gltf|moviment)/],
 ['Gráficos e mundo',/\b(graf|cenario|ambiente|render|textur|shader|lod|mundo|mapa|ilumin)/],
 ['Áudio e música',/\b(audio|som|musica|trilha|efeito sonoro|sfx)/],
 ['Salvamento e dados',/\b(save|salvar|persist|checkpoint|progresso|carregar jogo)/],
 ['Performance e testes',/\b(otimiz|fps|desempenho|performance|test|bug|memoria|travamento)/]
];
function group(title,body){let val=clean(title+' '+body.slice(0,220));return rules.find(r=>r[1].test(val))?.[0]||'Design e narrativa';}
function fingerprint(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
function requirements(title,kind){
 const base=['Implementação observável na prévia','Sem regressão de controles, pausa e sistemas anteriores'];
 if(kind==='Fases e progressão')base.unshift('Objetivo de fase e transição reproduzíveis');
 else if(kind==='Combate e inimigos')base.unshift('Inimigos/ataques observáveis e colisões verificadas');
 else if(kind==='Interface e menus')base.unshift('Menus utilizáveis com teclado e toque');
 else if(kind==='Personagens e animação')base.unshift('Animação e orientação verificadas em execução');
 else if(kind==='Performance e testes')base.unshift('Medir FPS e repetir a situação problemática');
 return base;
}
function build(markdown,previous=[]){
 const md=String(markdown||'');const previousMap=new Map((previous||[]).filter(x=>x&&typeof x.id==='string').map(x=>[x.id,x]));
 const lines=md.split(/\r?\n/);let position=0,inFence=false,fence='',stack=[],chunks=[];
 for(let lineNum=0;lineNum<lines.length;lineNum++){
   const line=lines[lineNum];const trimmed=line.trim();
   const f=trimmed.match(/^(`{3,}|~{3,})/);
   if(f){if(!inFence){inFence=true;fence=f[1][0];}else if(f[1][0]===fence){inFence=false;}}
   if(!inFence){const h=line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*$/);
     if(h){const level=h[1].length,title=h[2].replace(/\s+#+\s*$/,'').trim();
       if(chunks.length)chunks[chunks.length-1].end=position;
       stack=stack.slice(0,level-1);stack[level-1]=title;
       chunks.push({title,level,path:stack.filter(Boolean).join(' / '),line:lineNum+1,start:position,end:md.length});
     }
   }
   position+=line.length+(lineNum<lines.length-1?1:0);
 }
 if(chunks.length)chunks[chunks.length-1].end=md.length;
 if(!chunks.length&&md.trim())chunks=[{title:'Requisitos gerais',level:1,path:'Requisitos gerais',line:1,start:0,end:md.length}];
 const counter=new Map();
 return chunks.filter(c=>c.title&&c.level>1 || chunks.length===1).map(c=>{
    const body=md.slice(c.start,c.end);const kind=group(c.title,body);const base=c.path+'\n'+body.slice(0,280);
    const fp=fingerprint(base);const repeats=counter.get(fp)||0;counter.set(fp,repeats+1);
    const id=fp+(repeats?'-'+repeats:'');const prior=previousMap.get(id);
    const status=statusOptions.includes(prior?.status)?prior.status:'pendente';
    return {id,title:c.title,path:c.path,line:c.line,start:c.start,end:c.end,kind,status,
     checks:requirements(c.title,kind),notes:typeof prior?.notes==='string'?prior.notes.slice(0,450):'',
     revision:Number.isInteger(prior?.revision)?prior.revision:0};
 });
}
function context(task,markdown){
 if(!task)return '';
 const section=String(markdown||'').slice(task.start,task.end);
 const excerpt=section.slice(0,6000);
 return `TAREFA DO GDD: ${task.title}\nÁrea: ${task.kind}\nOrigem: linha ${task.line}\nObjetivo: implementar e testar esta seção sem remover sistemas existentes.\nCritérios:\n${task.checks.map(c=>'- '+c).join('\n')}\n\nTrecho original:\n${excerpt}${section.length>6000?'\n[continua no GDD original enviado ao backend]':''}`;
}
function changeStatus(tasks,id,status,notes){if(!statusOptions.includes(status))throw Error('Estado inválido');return tasks.map(t=>t.id===id?{...t,status,notes:String(notes??t.notes).slice(0,450),revision:t.revision+1}:t);}
function summary(tasks){const count=s=>tasks.filter(t=>t.status===s).length;return {total:tasks.length,pending:count('pendente'),doing:count('em andamento'),review:count('aguardando revisão'),validated:count('validada'),blocked:count('bloqueada')};}
function report(tasks,markdown){let lines=['# Plano de implementação do GDD','','**Registro de acompanhamento — não significa código implementado automaticamente.**','',`Total de tarefas: ${tasks.length}`,`GDD: ${new Blob([String(markdown||'')]).size} bytes`,''];
 for(const k of [...new Set(tasks.map(t=>t.kind))]){
   lines.push('## '+k,'');for(const t of tasks.filter(t=>t.kind===k)){
     lines.push(`- **[${t.status}]** ${t.title} (linha ${t.line}, id ${t.id})`);
     if(t.notes)lines.push(`  - Evidência/nota: ${t.notes.replace(/[\r\n]+/g,' ')}`);
   }lines.push('');
 }
 return lines.join('\n')+'\n';
}
root.GameForgeRoadmap={build,context,changeStatus,summary,report,statusOptions};
if(typeof module!=='undefined')module.exports=root.GameForgeRoadmap;
})(typeof globalThis!=='undefined'?globalThis:this);
