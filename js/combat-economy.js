/* GameForge combat economy v1: rule-based shop state, no payments, no eval, no network. */
function gameForgeCombatEconomyFactory(){
 'use strict';
 const clamp=(value,low,high,fallback)=>{
  const n=Number(value);
  return Number.isFinite(n)?Math.max(low,Math.min(high,Math.floor(n))):fallback;
 };
 function create(config={}){
  const prices={
   ammo:clamp(config.prices?.ammo,5,500,30),
   heal:clamp(config.prices?.heal,5,500,45),
   upgrade:clamp(config.prices?.upgrade,20,2000,125)
  };
  const maximum=250,capacity=20;
  let credits=clamp(config.startingCredits,0,9999,90);
  let reserve=clamp(config.startingReserve,0,maximum,60);
  let level=1,earned=0,spent=0,purchases=0,emergencyGrants=0,lastEmergency=-20;
  const history=[];
  const cost=kind=>kind==='upgrade'?prices.upgrade*level:prices[kind];
  function state(){return {credits,reserve,level,earned,spent,purchases,capacity,maxReserve:maximum,
   prices:{ammo:cost('ammo'),heal:cost('heal'),upgrade:cost('upgrade')},
   damage:level,emergencyGrants,history:history.slice()};}
  function earn(boss=false){
   const n=boss?90:20;
   credits=Math.min(99999,credits+n);earned+=n;
   return n;
  }
  function useReserve(wanted){
   const count=clamp(wanted,0,capacity,0);
   const used=Math.min(reserve,count);
   reserve-=used;
   return used;
  }
  function requestEmergencyAmmo(elapsed,magazine){
   const time=Number(elapsed);
   if(!Number.isFinite(time)||time<0||!Number.isFinite(Number(magazine)))return 0;
   if(magazine>0||reserve>0||credits>=prices.ammo||time-lastEmergency<20)return 0;
   // Protecao contra softlock: seis balas a cada 20 segundos se nao houver recursos.
   lastEmergency=time;reserve=6;emergencyGrants++;
   return 6;
  }
  function purchase(kind,currentHealth){
   if(!['ammo','heal','upgrade'].includes(kind))return {ok:false,message:'Item desconhecido.',health:currentHealth};
   const hp=clamp(currentHealth,0,100,100);
   if(kind==='ammo'&&reserve>=maximum)return {ok:false,message:'Reserva de munição cheia.',health:hp};
   if(kind==='heal'&&hp>=100)return {ok:false,message:'Vida já está completa.',health:hp};
   if(kind==='upgrade'&&level>=3)return {ok:false,message:'Arma no nível máximo.',health:hp};
   const price=cost(kind);
   if(credits<price)return {ok:false,message:'Créditos insuficientes: '+credits+'/'+price+'.',health:hp};
   credits-=price;spent+=price;purchases++;
   let health=hp;
   if(kind==='ammo')reserve=Math.min(maximum,reserve+40);
   if(kind==='heal')health=Math.min(100,hp+40);
   if(kind==='upgrade')level++;
   const label=kind==='ammo'?'Munição +40':kind==='heal'?'Kit médico +40 vida':'Arma nível '+level;
   history.push({kind,cost:price,level});
   if(history.length>12)history.shift();
   return {ok:true,message:label+' comprado por '+price+' créditos.',health,...state()};
  }
  return {state,earn,useReserve,purchase,requestEmergencyAmmo};
 }
 return {create};
}
if(typeof module!=='undefined')module.exports=gameForgeCombatEconomyFactory;
if(typeof globalThis!=='undefined')globalThis.gameForgeCombatEconomyFactory=gameForgeCombatEconomyFactory;
