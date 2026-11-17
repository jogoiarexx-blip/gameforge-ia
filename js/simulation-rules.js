/* Regras puras e serializáveis: ciclos econômicos e cuidado de aquários. */
(function(root){
function gameForgeSimulationRulesFactory(){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const care=c=>c.domain==='aquarium'&&c.aquariumCare?.enabled?c.aquariumCare:null;
 function create(c){
  const s={money:c.startingMoney,earned:0,inventory:0,sales:0,slots:Array.from({length:c.slots},()=>null),complete:false};
  if(care(c))s.tanks=Array.from({length:c.slots},()=>({water:100}));
  return s;
 }
 function quote(item,c){
  if(!item)return 0;
  const cfg=care(c);if(!cfg)return c.price;
  const progress=clamp(item.age/c.seconds,0,1),low=cfg.juvenilePrice,mid=cfg.youngPrice;
  return Math.round(progress<.5?low+(mid-low)*progress*2:mid+(c.price-mid)*(progress-.5)*2);
 }
 function canCare(s,c,index){
  const item=s.slots[index];if(!item||s.complete)return false;
  const cfg=care(c);
  return cfg&&cfg.hungerEnabled?item.satiety<=75:!item.cared;
 }
 function canClean(s,c,index){return !!(care(c)?.waterEnabled&&!s.complete&&s.tanks?.[index]&&s.tanks[index].water<95);}
 function canFinish(s,c,index){
  const item=s.slots[index];if(!item||s.complete)return false;
  return !!care(c)?.sellYoung||!!item.cared&&item.age+1e-8>=c.seconds;
 }
 function status(s,c,index){
  const item=s.slots[index],cfg=care(c);
  if(!item)return {label:'Vazio',stage:'empty',value:0,progress:0,satiety:null,blocked:[],remainingSeconds:0,water:s.tanks?.[index]?.water??100};
  const progress=clamp(item.age/c.seconds,0,1),blocked=[];
  if(!item.cared)blocked.push('alimentar');
  else if(cfg?.hungerEnabled&&item.satiety<=1e-8)blocked.push('fome');
  if(cfg?.waterEnabled&&(s.tanks?.[index]?.water??100)<=1e-8)blocked.push('água suja');
  const stage=progress>=1-1e-8?'adult':progress>=.5?'young':'juvenile';
  return {stage,label:{adult:'Adulto',young:'Jovem',juvenile:'Filhote'}[stage],value:quote(item,c),progress,
   satiety:item.satiety??null,water:s.tanks?.[index]?.water??100,blocked,
   remainingSeconds:Math.max(0,c.seconds-item.age)};
 }
 function tick(s,c,dt){
  if(!Number.isFinite(dt)||dt<=0||s.complete)return;
  const duration=Math.min(dt,1),cfg=care(c);
  for(let index=0;index<s.slots.length;index++){
   const item=s.slots[index];if(!item)continue;
   let growth=item.cared?duration:0;
   if(cfg?.hungerEnabled){
    const rate=100/cfg.hungerSeconds;
    growth=Math.min(growth,Math.max(0,item.satiety)/rate);
    item.satiety=clamp(item.satiety-duration*rate,0,100);
    if(item.satiety<1e-8)item.satiety=0;
   }
   if(cfg?.waterEnabled){
    const tank=s.tanks[index],rate=100/cfg.waterSeconds;
    growth=Math.min(growth,Math.max(0,tank.water)/rate);
    tank.water=clamp(tank.water-duration*rate,0,100);
    if(tank.water<1e-8)tank.water=0;
   }
   item.age=Math.min(c.seconds,item.age+growth);
   if(c.seconds-item.age<1e-8)item.age=c.seconds;
  }
 }
 function act(s,c,index,action){
  if(s.complete)return false;
  const valid=Number.isInteger(index)&&index>=0&&index<s.slots.length;
  if(action==='sell'&&c.domain==='farm'){
   if(s.inventory<=0)return false;
   s.inventory--;s.money+=c.price;s.earned+=c.price;s.sales++;
  }else{
   if(!valid)return false;
   const item=s.slots[index],cfg=care(c);
   if(action==='start'){
    if(item||s.money<c.cost)return false;
    s.money-=c.cost;s.slots[index]={age:0,cared:cfg?.feedingRequired===false};
    if(cfg)s.slots[index].satiety=cfg.feedingRequired===false?100:0;
    return true;
   }
   if(action==='care'){
    if(!canCare(s,c,index))return false;
    item.cared=true;if(cfg)item.satiety=100;return true;
   }
   if(action==='clean'){
    if(!canClean(s,c,index))return false;
    s.tanks[index].water=100;return true;
   }
   if(action==='finish'){
    if(!canFinish(s,c,index))return false;
    const value=quote(item,c);s.slots[index]=null;
    if(c.domain==='farm')s.inventory++;
    else {s.money+=value;s.earned+=value;s.sales++;}
   }else return false;
  }
  s.complete=s.earned>=c.target;
  return true;
 }
 return {create,tick,act,quote,status,canCare,canClean,canFinish};
}
root.gameForgeSimulationRulesFactory=gameForgeSimulationRulesFactory;
if(typeof module!=='undefined')module.exports=gameForgeSimulationRulesFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
