/* Urban Mission Flow v2 — estado e transições testáveis sem WebGL.
 * Eventos são aceitos apenas quando os pré-requisitos do Action Model foram cumpridos.
 */
(function(root){
'use strict';
function gameForgeUrbanMissionFlowFactory(){
 const actions={eliminate:'kill',collect:'pickup',deliver:'interact',capture:'interact'};
 const target={eliminate:'guard',collect:'evidence',deliver:'warehouse',capture:'warehouse'};
 function key(plan){
  const text=JSON.stringify((plan||[]).map(m=>[m.id,m.title,m.reward,(m.steps||[]).map(s=>[s.id,s.action,s.quantity,s.requires])]));
  let hash=2166136261;
  for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619)>>>0;
  return hash.toString(36);
 }
 function initial(plan){
  if(!Array.isArray(plan)||!plan.length)throw Error('É preciso ao menos uma missão suportada');
  return {version:2,schema:key(plan),stage:0,position:{x:0,z:9},health:100,cash:1000,
   ammo:12,reserve:48,counts:{},completed:[],rewards:[],status:'play'};
 }
 function mission(plan,state){return plan[state.stage]||null;}
 function nextStep(plan,state){
  const m=mission(plan,state);
  if(!m||state.status!=='play')return null;
  return (m.steps||[]).find(s=>(state.counts[s.id]||0)<s.quantity&&
   (s.requires||[]).every(id=>state.completed.includes(id)))||null;
 }
 function progress(plan,state){
  const m=mission(plan,state);
  if(!m)return {step:null,steps:[],completed:false};
  const step=nextStep(plan,state);
  return {step,steps:m.steps.map(s=>({id:s.id,action:s.action,target:s.target,quantity:s.quantity,
   done:Math.min(s.quantity,state.counts[s.id]||0),
   ready:!!step&&step.id===s.id,requires:s.requires||[]})),
   completed:state.status==='intermission'||state.status==='victory'};
 }
 function signal(plan,state,event){
  const s=nextStep(plan,state);
  if(!s||!event||actions[s.action]!==event.type||target[s.action]!==event.target)
   return {state,accepted:false,complete:false};
  const copy={...state,counts:{...state.counts},completed:[...state.completed],rewards:[...state.rewards]};
  copy.counts[s.id]=Math.min(s.quantity,(copy.counts[s.id]||0)+1);
  if(copy.counts[s.id]===s.quantity&&!copy.completed.includes(s.id))copy.completed.push(s.id);
  const m=mission(plan,copy);
  let complete=false;
  if((m.steps||[]).every(step=>copy.completed.includes(step.id))){
   complete=true;
   if(!copy.rewards.includes(m.id)){
    copy.cash+=m.reward;
    copy.rewards.push(m.id);
   }
   copy.status=copy.stage+1<plan.length?'intermission':'victory';
  }
  return {state:copy,accepted:true,complete,step:s.id};
 }
 function advance(plan,state){
  if(!state||state.status!=='intermission'||state.stage>=plan.length-1)return {state,changed:false};
  return {state:{...state,stage:state.stage+1,position:{x:0,z:9},counts:{},completed:[],status:'play'},changed:true};
 }
 function restore(plan,raw){
  if(!raw||raw.version!==2||raw.schema!==key(plan)||!Number.isInteger(raw.stage)||
    raw.stage<0||raw.stage>=plan.length||!['play','intermission','victory'].includes(raw.status)||
    typeof raw.position?.x!=='number'||typeof raw.position?.z!=='number'||
    !Number.isFinite(raw.position.x)||!Number.isFinite(raw.position.z)||
    !Number.isFinite(raw.cash)||raw.cash<0||raw.cash>10000000||
    !Number.isFinite(raw.health)||raw.health<=0||raw.health>100||
    !Number.isFinite(raw.ammo)||raw.ammo<0||raw.ammo>12||
    !Number.isFinite(raw.reserve)||raw.reserve<0||raw.reserve>120||
    !raw.counts||typeof raw.counts!=='object'||Array.isArray(raw.counts)||
    !Array.isArray(raw.completed)||!Array.isArray(raw.rewards))return null;
  const m=plan[raw.stage],validIds=(m.steps||[]).map(s=>s.id);
  const counts={};
  for(const s of m.steps){
   const value=raw.counts[s.id]||0;
   if(!Number.isInteger(value)||value<0||value>s.quantity)return null;
   if(Object.prototype.hasOwnProperty.call(raw.counts,s.id))counts[s.id]=value;
  }
  if(raw.completed.some(id=>!validIds.includes(id)))return null;
  if(raw.rewards.some(id=>!plan.some(m=>m.id===id)))return null;
  if(raw.rewards.length!==new Set(raw.rewards).size)return null;
  if(raw.completed.some(id=>!m.steps.some(s=>s.id===id&&counts[id]===s.quantity)))return null;
  return {version:2,schema:key(plan),stage:raw.stage,
   position:{x:Math.max(-16.5,Math.min(16.5,raw.position.x)),z:Math.max(-16.5,Math.min(16.5,raw.position.z))},
   health:raw.health,cash:raw.cash,ammo:raw.ammo,reserve:raw.reserve,
   counts,completed:[...raw.completed],rewards:[...raw.rewards],status:raw.status};
 }
 return {initial,signal,nextStep,progress,advance,restore,key};
}
root.gameForgeUrbanMissionFlowFactory=gameForgeUrbanMissionFlowFactory;
if(typeof module!=='undefined')module.exports=gameForgeUrbanMissionFlowFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
