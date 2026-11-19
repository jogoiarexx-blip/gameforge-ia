/* GF-TRAIN-13: máquina de eventos pura. Sem eval, rede ou código dinâmico do GDD. */
(function(root){
 'use strict';
 function gameForgeSimulationEventsFactory(){
  const whitelist=new Set(['talk','start','care','clean','finish','sell']);
  const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&Number.isInteger(n)&&n>=min&&n<=max;
  function validConfig(c){
   if(!c||c.version!==1||c.enabled!==true||typeof c.requiredForVictory!=='boolean')return false;
   if(!c.npc||!['Cuidador','Agricultor','Atendente'].includes(c.npc.name)||
      !Array.isArray(c.npc.lines)||c.npc.lines.length!==3||c.npc.lines.some(s=>typeof s!=='string'||s.length>170))return false;
   const m=c.mission;
   return !!m&&m.id==='primeira-tarefa'&&typeof m.label==='string'&&m.label.length<=170&&
     finite(m.reward,0,50)&&Array.isArray(m.steps)&&m.steps.length>=1&&m.steps.length<=3&&
     m.steps.every(step=>step&&whitelist.has(step.event)&&finite(step.count,1,5));
  }
  function create(c){
   if(!validConfig(c))throw Error('Configuração de eventos inválida.');
   return {step:0,count:0,completed:false,rewards:0,talks:0};
  }
  function validate(s,c){
   if(!validConfig(c)||!s||typeof s!=='object'||!finite(s.step,0,c.mission.steps.length)||
     !finite(s.talks,0,1e6)||typeof s.completed!=='boolean'||
     !finite(s.rewards,0,c.mission.reward)||!finite(s.count,0,5))return false;
   if(s.completed!== (s.step===c.mission.steps.length))return false;
   if(s.completed)return s.count===0&&s.rewards===c.mission.reward;
   const step=c.mission.steps[s.step];
   return s.count<step.count&&s.rewards===0;
  }
  function status(s,c){
   if(!s||!c)return {complete:false,text:'Sem missão'};
   if(s.completed)return {complete:true,text:'Missão concluída · recompensa '+s.rewards+' moedas'};
   const step=c.mission.steps[s.step],labels={
    talk:'Converse com o guia',start:'Inicie a produção',care:'Cuide da produção',
    finish:'Finalize / venda',sell:'Venda a colheita',clean:'Troque a água'
   };
   return {complete:false,index:s.step,progress:s.count,required:step.count,event:step.event,
    text:c.mission.label+' · '+labels[step.event]+' '+s.count+'/'+step.count};
  }
  function record(s,c,type){
   if(!validate(s,c)||!whitelist.has(type))return {changed:false,bonus:0,completed:!!s?.completed};
   if(type==='talk')s.talks=Math.min(1e6,s.talks+1);
   if(s.completed)return {changed:false,bonus:0,completed:true};
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
  return {validConfig,create,validate,status,record,talk};
 }
 root.gameForgeSimulationEventsFactory=gameForgeSimulationEventsFactory;
 if(typeof module!=='undefined')module.exports=gameForgeSimulationEventsFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
