/* GF-TRAIN-14 — eventos tipados, escolhas de missão e save validado; sem eval ou rede. */
(function(root){
 'use strict';
 function gameForgeSimulationEventsFactory(){
  const whitelist=new Set(['talk','start','care','clean','finish','sell']);
  const tasks=new Set(['start','care','clean','finish','sell']);
  const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&Number.isInteger(n)&&n>=min&&n<=max;
  function validConfig(c){
   if(!c||![1,2].includes(c.version)||c.enabled!==true||typeof c.requiredForVictory!=='boolean')return false;
   if(!c.npc||!['Cuidador','Agricultor','Atendente'].includes(c.npc.name)||
      !Array.isArray(c.npc.lines)||c.npc.lines.length!==3||c.npc.lines.some(s=>typeof s!=='string'||s.length>170))return false;
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
   const state={step:0,count:0,completed:false,rewards:0,talks:0};
   if(c.version===2)state.choice=null;
   return state;
  }
  function validate(s,c){
   if(!validConfig(c)||!s||typeof s!=='object'||!finite(s.talks,0,1e6)||
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
  function record(s,c,type){
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
  function talk(s,c){
   const result=record(s,c,'talk');
   const line=s.completed?c.npc.lines[2]:result.changed?c.npc.lines[0]:c.npc.lines[1];
   return {text:c.npc.name+': '+line,bonus:result.bonus,completed:result.completed,changed:result.changed};
  }
  return {validConfig,create,validate,status,record,talk,options,choose};
 }
 root.gameForgeSimulationEventsFactory=gameForgeSimulationEventsFactory;
 if(typeof module!=='undefined')module.exports=gameForgeSimulationEventsFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
