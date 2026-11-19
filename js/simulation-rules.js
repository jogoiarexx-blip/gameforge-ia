/* Regras puras e serializáveis: ciclos econômicos e cuidado de aquários. */
(function(root){
function gameForgeSimulationRulesFactory(events){
 'use strict';
 const E=events||null;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const care=c=>c.domain==='aquarium'&&c.aquariumCare?.enabled?c.aquariumCare:null;
 function create(c){
  const s={money:c.startingMoney,earned:0,inventory:0,sales:0,slots:Array.from({length:c.slots},()=>null),complete:false};
  if(c.automation?.enabled)s.automation={elapsed:0,paused:false,actions:0};
  if(care(c))s.tanks=Array.from({length:c.slots},()=>({water:100}));
  if(c.story?.enabled){if(!E)throw Error('Motor de eventos não disponível.');s.story=E.create(c.story);}
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
 function grow(s,c,duration){
  const cfg=care(c);
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
 function automate(s,c){
  const a=c.automation;if(!a?.enabled||s.automation?.paused||s.complete)return;
  const perform=(index,action)=>{if(act(s,c,index,action))s.automation.actions++;};
  // Colheita/venda só de adultos/prontos, mesmo se venda antecipada for permitida.
  if(a.finish)for(let i=0;i<c.slots&&!s.complete;i++)if(s.slots[i]?.age+1e-8>=c.seconds)perform(i,'finish');
  if(a.sell&&c.domain==='farm')for(let n=0;n<c.slots&&s.inventory>0&&!s.complete;n++)perform(0,'sell');
  if(a.start)for(let i=0;i<c.slots&&!s.complete;i++)if(!s.slots[i])perform(i,'start');
  for(let i=0;i<c.slots&&!s.complete;i++){
   if(a.care&&canCare(s,c,i))perform(i,'care');
   if(a.clean&&canClean(s,c,i))perform(i,'clean');
  }
 }
 function tick(s,c,dt){
  if(!Number.isFinite(dt)||dt<=0||s.complete)return;
  let remaining=Math.min(dt,1);
  if(!c.automation?.enabled||s.automation.paused){grow(s,c,remaining);return;}
  const period=c.automation.intervalSeconds;
  while(remaining>1e-10&&!s.complete){
   const step=Math.min(remaining,Math.max(0,period-s.automation.elapsed));
   grow(s,c,step);s.automation.elapsed+=step;remaining-=step;
   if(s.automation.elapsed+1e-9>=period){s.automation.elapsed=0;automate(s,c);}
  }
 }
 function win(s,c){return s.earned>=c.target&&(!c.story?.requiredForVictory||s.story?.completed===true);}
 function storyEvent(s,c,kind){
  if(!c.story?.enabled||!s.story||!E)return;
  const outcome=E.record(s.story,c.story,kind);
  if(outcome.bonus)s.money+=outcome.bonus;
 }
 function talk(s,c){
  if(s.complete||!E||!c.story?.enabled||!s.story)return null;
  const result=E.talk(s.story,c.story);
  if(result.bonus)s.money+=result.bonus;
  s.complete=win(s,c);
  return result.text;
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
    storyEvent(s,c,'start');s.complete=win(s,c);return true;
   }
   if(action==='care'){
    if(!canCare(s,c,index))return false;
    item.cared=true;if(cfg)item.satiety=100;
    storyEvent(s,c,'care');s.complete=win(s,c);return true;
   }
   if(action==='clean'){
    if(!canClean(s,c,index))return false;
    s.tanks[index].water=100;storyEvent(s,c,'clean');s.complete=win(s,c);return true;
   }
   if(action==='finish'){
    if(!canFinish(s,c,index))return false;
    const value=quote(item,c);s.slots[index]=null;
    if(c.domain==='farm')s.inventory++;
    else {s.money+=value;s.earned+=value;s.sales++;}
   }else return false;
  }
  storyEvent(s,c,action);
  s.complete=win(s,c);
  return true;
 }
 // Save local versionado: nunca avança relógio de parede nem aceita outro contrato.
 function persistence(c,title,accessStorage){
  const signature=JSON.stringify([String(title),c]),key='gameforge-simulation-v1-'+hash(signature);
  const enabled=c.persistence?.enabled===true;
  function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);}
  const number=(v,min,max,integer=false)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max&&(!integer||Number.isInteger(v));
  function restore(raw){
   try{
    if(typeof raw!=='string'||raw.length>30000)return null;
    const data=JSON.parse(raw),v=data.state,cfg=care(c),free=c.exploration?.mode==='free';
    if(free&&(!data.position||!number(data.position.x,0,960)||!number(data.position.y,0,540)))return null;
    if(data.version!==1||data.signature!==signature||!v||!number(data.selected,0,c.slots-1,true))return null;
    for(const k of ['money','earned','inventory','sales'])if(!number(v[k],0,1e9,true))return null;
    if(c.story?.enabled&&(!E||!E.validate(v.story,c.story)))return null;
    if(v.money>c.startingMoney+v.earned+(c.story?.enabled?v.story.rewards:0)||v.earned>v.sales*c.price||v.sales>1e6||v.inventory>1e6)return null;
    if(c.domain!=='aquarium'&&v.earned!==v.sales*c.price||c.domain!=='farm'&&v.inventory!==0)return null;
    if(!Array.isArray(v.slots)||v.slots.length!==c.slots)return null;
    const result=create(c);
    for(let i=0;i<c.slots;i++){
     const item=v.slots[i];if(item===null)continue;
     if(!item||!number(item.age,0,c.seconds)||typeof item.cared!=='boolean'||!item.cared&&item.age!==0)return null;
     result.slots[i]={age:item.age,cared:item.cared};
     if(cfg){if(!number(item.satiety,0,100))return null;result.slots[i].satiety=item.satiety;}
    }
    if(cfg){
     if(!Array.isArray(v.tanks)||v.tanks.length!==c.slots)return null;
     for(let i=0;i<c.slots;i++){if(!number(v.tanks[i]?.water,0,100))return null;result.tanks[i].water=v.tanks[i].water;}
    }
    if(c.automation?.enabled){
     const a=v.automation;if(!a||!number(a.elapsed,0,c.automation.intervalSeconds)||typeof a.paused!=='boolean'||!number(a.actions,0,1e9,true))return null;
     result.automation={elapsed:a.elapsed,paused:a.paused,actions:a.actions};
    }
    for(const k of ['money','earned','inventory','sales'])result[k]=v[k];
    if(c.story?.enabled)result.story={step:v.story.step,count:v.story.count,completed:v.story.completed,rewards:v.story.rewards,talks:v.story.talks};
    result.complete=win(result,c);
    return free?{state:result,selected:data.selected,position:{x:data.position.x,y:data.position.y}}:{state:result,selected:data.selected};
   }catch(_){return null;}
  }
  const target=()=>typeof accessStorage==='function'?accessStorage():accessStorage;
  function read(){if(!enabled)return null;try{return restore(target()?.getItem(key));}catch(_){return null;}}
  function write(state,selected,position){
   if(!enabled)return false;
   try{
    const data={version:1,signature,state,selected};
    if(c.exploration?.mode==='free')data.position=position;
    const raw=JSON.stringify(data);if(!restore(raw))return false;
    const storage=target();storage.setItem(key,raw);return storage.getItem(key)===raw;
   }catch(_){return false;}
  }
  return {enabled,key,read,write,restore};
 }
 return {create,tick,act,talk,storyEvent,quote,status,canCare,canClean,canFinish,persistence};
}
root.gameForgeSimulationRulesFactory=gameForgeSimulationRulesFactory;
if(typeof module!=='undefined')module.exports=gameForgeSimulationRulesFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
