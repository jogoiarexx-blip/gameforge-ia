/* GF-TRAIN-14 — eventos tipados, escolhas de missão e save validado; sem eval ou rede. */
(function(root){
 'use strict';
 function gameForgeSimulationEventsFactory(){
  const whitelist=new Set(['talk','start','care','clean','finish','sell']);
  const tasks=new Set(['start','care','clean','finish','sell']);
  const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&Number.isInteger(n)&&n>=min&&n<=max;
  const number=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
  const npcNames=new Set(['Cuidador','Agricultor','Atendente','Pesquisador','Feirante','Gerente']);
  const validNpc=n=>!!n&&npcNames.has(n.name)&&Array.isArray(n.lines)&&n.lines.length===3&&
   n.lines.every(t=>typeof t==='string'&&t.length>0&&t.length<=170);
  function validChain(c){
   if(!validNpc(c.npc2)||!Array.isArray(c.missions)||c.missions.length!==2||c.mission!==undefined)return false;
   return c.missions.every((m,i)=>m&&m.id==='m'+(i+1)&&typeof m.label==='string'&&m.label.length>0&&m.label.length<=110&&
    tasks.has(m.event)&&finite(m.count,1,5)&&finite(m.reward,0,50)&&Array.isArray(m.requires)&&m.requires.length<=2&&
    new Set(m.requires.map(r=>r.kind)).size===m.requires.length&&
    m.requires.every(r=>r&&(r.kind==='stock'?finite(r.min,1,12):r.kind==='time'?finite(r.seconds,1,60):false)));
  }
  function chainCreate(){return {missionIndex:0,step:0,count:0,completed:false,rewards:0,talks:0,npcTalks:[0,0],elapsed:0};}
  function chainValidate(s,c){
   if(!s||typeof s!=='object'||!finite(s.missionIndex,0,2)||!finite(s.step,0,1)||
    !finite(s.count,0,5)||!finite(s.talks,0,1e6)||!Array.isArray(s.npcTalks)||s.npcTalks.length!==2||
    !s.npcTalks.every(n=>finite(n,0,1e6))||s.talks!==s.npcTalks[0]+s.npcTalks[1]||!number(s.elapsed,0,600)||
    typeof s.completed!=='boolean'||!finite(s.rewards,0,100))return false;
   const i=s.missionIndex;
   if(s.completed!==(i===2)||s.rewards!==(i===0?0:i===1?c.missions[0].reward:c.missions[0].reward+c.missions[1].reward))return false;
   if(i===2)return s.step===0&&s.count===0&&s.npcTalks[0]>=1&&s.npcTalks[1]>=1;
   if(i===0&&s.elapsed!==0)return false;
   if(i===1&&s.talks<1)return false;
   if(s.step===0)return s.count===0&&(i===0?s.npcTalks[0]===0&&s.npcTalks[1]===0:s.npcTalks[0]>=1&&s.npcTalks[1]===0);
   return s.npcTalks[i]>=1&&(i===0?s.npcTalks[1]===0:s.npcTalks[0]>=1)&&s.count<c.missions[i].count;
  }
  function chainStatus(s,c){
   if(s.completed)return {complete:true,missionIndex:2,total:2,text:'Duas missões concluídas · bônus total '+s.rewards+' moedas'};
   const m=c.missions[s.missionIndex];
   if(s.step===0)return {complete:false,missionIndex:s.missionIndex,total:2,event:'talk',npc:s.missionIndex,
    text:'Missão '+(s.missionIndex+1)+'/2 · Fale com '+(s.missionIndex===0?c.npc.name:c.npc2.name)};
   const clauses=m.requires.map(r=>r.kind==='stock'?'Estoque mínimo '+r.min:
    'Aguardar '+r.seconds+'s de jogo ('+Math.floor(s.elapsed)+'s)');
   return {complete:false,missionIndex:s.missionIndex,total:2,event:m.event,progress:s.count,required:m.count,
    elapsed:s.elapsed,text:'Missão '+(s.missionIndex+1)+'/2 · '+m.label+' · '+s.count+'/'+m.count+
    (clauses.length?' · '+clauses.join(' + '):'')};
  }
  function chainRecord(s,c,type,context){
   if(!chainValidate(s,c)||s.completed||!whitelist.has(type))return {changed:false,bonus:0,completed:!!s?.completed};
   const i=s.missionIndex,m=c.missions[i];
   if(type==='talk'){
    if(context?.npc!==i)return {changed:false,bonus:0,completed:false};
    s.talks=Math.min(1e6,s.talks+1);s.npcTalks[i]=Math.min(1e6,s.npcTalks[i]+1);
    if(s.step===0){s.step=1;return {changed:true,bonus:0,completed:false};}
    return {changed:false,bonus:0,completed:false};
   }
   if(s.step!==1||m.event!==type)return {changed:false,bonus:0,completed:false};
   for(const r of m.requires){
    if(r.kind==='stock'&&(!finite(context?.stock,0,1e6)||context.stock<r.min))return {changed:false,bonus:0,completed:false};
    if(r.kind==='time'&&s.elapsed+1e-7<r.seconds)return {changed:false,bonus:0,completed:false};
   }
   s.count++;
   if(s.count<m.count)return {changed:true,bonus:0,completed:false};
   s.rewards+=m.reward;s.missionIndex++;s.step=0;s.count=0;
   s.completed=s.missionIndex===2;
   return {changed:true,bonus:m.reward,completed:s.completed,checkpoint:true};
  }
  function advance(s,c,dt){
   if(c?.version===4)return parallelAdvance(s,c,dt);
   if(!c||c.version!==3||!chainValidate(s,c)||!number(dt,0,1)||s.completed)return false;
   if(s.missionIndex===1&&s.step===1){s.elapsed=Math.min(600,s.elapsed+dt);return true;}
   return false;
  }
  // GF-TRAIN-16: até quatro missões encadeadas, dois objetivos paralelos por missão.
  // Um evento bem-sucedido progride exclusivamente seu objetivo: nunca avança dois por acidente.
  function validParallel(c){
   if(!validNpc(c.npc2)||!Array.isArray(c.missions)||c.missions.length<3||c.missions.length>4||c.mission!==undefined)return false;
   return c.missions.every((m,i)=>m&&m.id==='m'+(i+1)&&typeof m.label==='string'&&m.label.length>0&&m.label.length<=110&&
    finite(m.reward,0,50)&&Array.isArray(m.objectives)&&m.objectives.length>=1&&m.objectives.length<=2&&
    new Set(m.objectives.map(o=>o.event)).size===m.objectives.length&&
    m.objectives.every(o=>o&&tasks.has(o.event)&&finite(o.count,1,5))&&
    Array.isArray(m.requires)&&m.requires.length<=2&&new Set(m.requires.map(r=>r.kind)).size===m.requires.length&&
    m.requires.every(r=>r&&(r.kind==='stock'?finite(r.min,1,12):r.kind==='time'?finite(r.seconds,1,60):false)));
  }
  function parallelCreate(c){
   return {missionIndex:0,started:false,progress:c.missions[0].objectives.map(()=>0),
    completed:false,rewards:0,talks:0,npcTalks:[0,0],elapsed:0};
  }
  function parallelValidate(s,c){
   if(!s||typeof s!=='object'||!finite(s.missionIndex,0,c.missions.length)||
    typeof s.started!=='boolean'||typeof s.completed!=='boolean'||!finite(s.rewards,0,200)||
    !finite(s.talks,0,1e6)||!Array.isArray(s.npcTalks)||s.npcTalks.length!==2||
    !s.npcTalks.every(t=>finite(t,0,1e6))||s.npcTalks[0]+s.npcTalks[1]!==s.talks||
    !number(s.elapsed,0,600)||!Array.isArray(s.progress))return false;
   const i=s.missionIndex,done=i===c.missions.length;
   if(done!==s.completed)return false;
   const reward=c.missions.slice(0,i).reduce((n,m)=>n+m.reward,0);
   if(s.rewards!==reward)return false;
   if(done)return !s.started&&s.progress.length===0&&s.elapsed===0&&s.talks>=i;
   const m=c.missions[i];
   if(s.progress.length!==m.objectives.length)return false;
   if(s.progress.some((n,k)=>!finite(n,0,m.objectives[k].count-1)))return false;
   if(i===0&&s.talks===0&&!s.started)return s.progress.every(n=>n===0)&&s.elapsed===0;
   if(s.talks<i)return false;
   if(!s.started)return s.progress.every(n=>n===0)&&s.elapsed===0&&s.talks>=i;
   return s.talks>=i+1;
  }
  function parallelStatus(s,c){
   const n=c.missions.length;
   if(s.completed)return {complete:true,missionIndex:n,total:n,text:n+' missões concluídas · bônus '+s.rewards+' moedas'};
   const i=s.missionIndex,m=c.missions[i];
   if(!s.started)return {complete:false,missionIndex:i,total:n,event:'talk',npc:i%2,
    text:'Missão '+(i+1)+'/'+n+' · Fale com '+(i%2===0?c.npc.name:c.npc2.name)};
   const labels={start:'Iniciar',care:'Cuidar',finish:'Finalizar',sell:'Vender',clean:'Limpar'};
   const chunks=m.objectives.map((o,k)=>labels[o.event]+' '+s.progress[k]+'/'+o.count);
   const guards=m.requires.map(r=>r.kind==='stock'?'estoque '+r.min:'aguardar '+r.seconds+'s ('+Math.floor(s.elapsed)+'s)');
   return {complete:false,missionIndex:i,total:n,event:m.objectives[0].event,
    objectives:m.objectives.map((o,k)=>({event:o.event,count:o.count,progress:s.progress[k]})),
    text:'Missão '+(i+1)+'/'+n+' · '+chunks.join(' + ')+(guards.length?' · '+guards.join(' e '):'')};
  }
  function parallelRecord(s,c,type,context){
   if(!parallelValidate(s,c)||s.completed||!whitelist.has(type))return {changed:false,bonus:0,completed:!!s?.completed};
   const i=s.missionIndex,m=c.missions[i];
   if(type==='talk'){
    if(context?.npc!==i%2)return {changed:false,bonus:0,completed:false};
    s.talks++;s.npcTalks[context.npc]++;
    if(!s.started){s.started=true;return {changed:true,bonus:0,completed:false};}
    return {changed:false,bonus:0,completed:false};
   }
   if(!s.started)return {changed:false,bonus:0,completed:false};
   const k=m.objectives.findIndex(o=>o.event===type);
   if(k<0||s.progress[k]>=m.objectives[k].count)return {changed:false,bonus:0,completed:false};
   for(const r of m.requires){
    if(r.kind==='stock'&&(!finite(context?.stock,0,1e6)||context.stock<r.min))return {changed:false,bonus:0,completed:false};
    if(r.kind==='time'&&s.elapsed+1e-7<r.seconds)return {changed:false,bonus:0,completed:false};
   }
   s.progress[k]++;
   const fulfilled=m.objectives.every((o,index)=>s.progress[index]===o.count);
   if(!fulfilled)return {changed:true,bonus:0,completed:false};
   s.rewards+=m.reward;s.missionIndex++;s.elapsed=0;s.started=false;
   s.completed=s.missionIndex===c.missions.length;
   s.progress=s.completed?[]:c.missions[s.missionIndex].objectives.map(()=>0);
   return {changed:true,bonus:m.reward,completed:s.completed,checkpoint:true};
  }
  function parallelAdvance(s,c,dt){
   if(!parallelValidate(s,c)||!number(dt,0,1)||s.completed||!s.started)return false;
   s.elapsed=Math.min(600,s.elapsed+dt);
   return true;
  }
  function validConfig(c){
   if(!c||![1,2,3,4].includes(c.version)||c.enabled!==true||typeof c.requiredForVictory!=='boolean')return false;
   if(!c.npc||!['Cuidador','Agricultor','Atendente'].includes(c.npc.name)||
      !Array.isArray(c.npc.lines)||c.npc.lines.length!==3||c.npc.lines.some(s=>typeof s!=='string'||s.length>170))return false;
   if(c.version===3)return validChain(c);
   if(c.version===4)return validParallel(c);
   const m=c.mission;
   if(!m||m.id!=='primeira-tarefa'||typeof m.label!=='string'||m.label.length>170||!Array.isArray(m.steps))return false;
   if(c.version===1)return finite(m.reward,0,50)&&m.steps.length>=1&&m.steps.length<=3&&
     m.steps.every(step=>step&&whitelist.has(step.event)&&finite(step.count,1,5));
   if(m.steps.length!==1||m.steps[0].event!=='talk'||m.steps[0].count!==1||
      !Array.isArray(m.branches)||m.branches.length!==2||m.reward!==undefined)return false;
   return m.branches.every((b,i)=>b&&b.id===(i===0?'a':'b')&&
     typeof b.label==='string'&&b.label.length>0&&b.label.length<=80&&
     tasks.has(b.event)&&finite(b.count,1,5)&&finite(b.reward,0,50));
  }
  function create(c){
   if(!validConfig(c))throw Error('Configuração de eventos inválida.');
   if(c.version===3)return chainCreate();
   if(c.version===4)return parallelCreate(c);
   const state={step:0,count:0,completed:false,rewards:0,talks:0};
   if(c.version===2)state.choice=null;
   return state;
  }
  function validate(s,c){
   if(!validConfig(c))return false;
   if(c.version===3)return chainValidate(s,c);
   if(c.version===4)return parallelValidate(s,c);
   if(!s||typeof s!=='object'||!finite(s.talks,0,1e6)||
      typeof s.completed!=='boolean'||!finite(s.count,0,5))return false;
   if(c.version===1){
    if(!finite(s.step,0,c.mission.steps.length)||!finite(s.rewards,0,c.mission.reward))return false;
    if(s.completed!==(s.step===c.mission.steps.length))return false;
    if(s.completed)return s.count===0&&s.rewards===c.mission.reward;
    return s.count<c.mission.steps[s.step].count&&s.rewards===0;
   }
   if(!finite(s.step,0,2)||![null,'a','b'].includes(s.choice))return false;
   if(s.step===0)return !s.completed&&s.choice===null&&s.count===0&&s.talks===0&&s.rewards===0;
   if(s.talks===0)return false;
   if(s.step===1){
    if(s.completed||s.rewards!==0)return false;
    if(s.choice===null)return s.count===0;
    const branch=c.mission.branches[s.choice==='a'?0:1];
    return s.count<branch.count;
   }
   if(s.choice===null||!s.completed||s.count!==0)return false;
   return s.rewards===c.mission.branches[s.choice==='a'?0:1].reward;
  }
  const labels={talk:'Converse com o guia',start:'Inicie a produção',care:'Cuide da produção',
   finish:'Finalize / venda',sell:'Venda a colheita',clean:'Troque a água'};
  function status(s,c){
   if(!s||!c)return {complete:false,text:'Sem missão'};
   if(c.version===3)return chainStatus(s,c);
   if(c.version===4)return parallelStatus(s,c);
   if(s.completed)return {complete:true,text:'Missão concluída · recompensa '+s.rewards+' moedas',choice:c.version===2?s.choice:null};
   if(c.version===2){
    if(s.step===0)return {complete:false,event:'talk',text:c.mission.label+' · Converse com o guia 0/1'};
    if(s.choice===null)return {complete:false,event:'choice',text:'Escolha sua missão com 5 ou 6 (ou toque nos botões)'};
    const branch=c.mission.branches[s.choice==='a'?0:1];
    return {complete:false,event:branch.event,choice:s.choice,index:1,progress:s.count,required:branch.count,
     text:c.mission.label+' · '+branch.label+' · '+s.count+'/'+branch.count};
   }
   const step=c.mission.steps[s.step];
   return {complete:false,index:s.step,progress:s.count,required:step.count,event:step.event,
    text:c.mission.label+' · '+labels[step.event]+' '+s.count+'/'+step.count};
  }
  function options(s,c){
   if(!validate(s,c)||c.version!==2||s.step!==1||s.choice!==null)return [];
   return c.mission.branches.map((b,i)=>({id:b.id,index:i,label:b.label,event:b.event,count:b.count,reward:b.reward}));
  }
  function choose(s,c,index){
   if(!options(s,c).length||!finite(index,0,1))return {changed:false};
   s.choice=index===0?'a':'b';
   return {changed:true,branch:c.mission.branches[index]};
  }
  function record(s,c,type,context){
   if(c?.version===3)return chainRecord(s,c,type,context);
   if(c?.version===4)return parallelRecord(s,c,type,context);
   if(!validate(s,c)||!whitelist.has(type))return {changed:false,bonus:0,completed:!!s?.completed};
   if(type==='talk')s.talks=Math.min(1e6,s.talks+1);
   if(s.completed)return {changed:false,bonus:0,completed:true};
   if(c.version===2){
    if(s.step===0&&type==='talk'){s.step=1;return {changed:true,bonus:0,completed:false};}
    if(s.step!==1||s.choice===null)return {changed:false,bonus:0,completed:false};
    const branch=c.mission.branches[s.choice==='a'?0:1];
    if(branch.event!==type)return {changed:false,bonus:0,completed:false};
    s.count++;
    if(s.count===branch.count){
     s.step=2;s.count=0;s.completed=true;s.rewards=branch.reward;
     return {changed:true,bonus:branch.reward,completed:true};
    }
    return {changed:true,bonus:0,completed:false};
   }
   const step=c.mission.steps[s.step];
   if(step.event!==type)return {changed:false,bonus:0,completed:false};
   s.count++;
   let bonus=0;
   if(s.count>=step.count){
    s.step++;s.count=0;
    if(s.step===c.mission.steps.length){s.completed=true;bonus=c.mission.reward;s.rewards=bonus;}
   }
   return {changed:true,bonus,completed:s.completed};
  }
  function talk(s,c,npc=0){
   const result=record(s,c,'talk',c.version>=3?{npc}:undefined);
   if(c.version===4){
    const guide=npc===0?c.npc:c.npc2;
    const correct=s.missionIndex%2===npc;
    const line=s.completed?guide.lines[2]:correct?result.changed?guide.lines[0]:guide.lines[1]:
     'A próxima tarefa pertence ao outro personagem.';
    return {text:guide.name+': '+line,bonus:result.bonus,completed:result.completed,changed:result.changed};
   }
   if(c.version===3){
    const guide=npc===0?c.npc:c.npc2;
    const correct=s.missionIndex===npc;
    const text=s.completed?guide.lines[2]:correct?result.changed?guide.lines[0]:guide.lines[1]:
     'Conclua primeiro a missão do outro personagem.';
    return {text:guide.name+': '+text,bonus:result.bonus,completed:result.completed,changed:result.changed};
   }
   const line=s.completed?c.npc.lines[2]:result.changed?c.npc.lines[0]:c.npc.lines[1];
   return {text:c.npc.name+': '+line,bonus:result.bonus,completed:result.completed,changed:result.changed};
  }
  return {validConfig,create,validate,status,record,talk,options,choose,advance};
 }
 root.gameForgeSimulationEventsFactory=gameForgeSimulationEventsFactory;
 if(typeof module!=='undefined')module.exports=gameForgeSimulationEventsFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
