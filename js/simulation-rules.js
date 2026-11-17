/* Regras puras e serializáveis: comprar/produzir, cuidar, crescer, vender. */
(function(root){
function gameForgeSimulationRulesFactory(){
 'use strict';
 function create(c){return {money:c.startingMoney,earned:0,inventory:0,sales:0,slots:Array.from({length:c.slots},()=>null),complete:false};}
 function tick(s,c,dt){
  if(!Number.isFinite(dt)||dt<=0||s.complete)return;
  for(const item of s.slots)if(item&&item.cared)item.age=Math.min(c.seconds,item.age+Math.min(dt,1));
 }
 function act(s,c,index,action){
  if(s.complete)return false;
  const valid=Number.isInteger(index)&&index>=0&&index<s.slots.length;
  if(action==='sell'&&c.domain==='farm'){
   if(s.inventory<=0)return false;
   s.inventory--;s.money+=c.price;s.earned+=c.price;s.sales++;
  }else{
   if(!valid)return false;
   const item=s.slots[index];
   if(action==='start'){
    if(item||s.money<c.cost)return false;
    s.money-=c.cost;s.slots[index]={age:0,cared:false};return true;
   }
   if(action==='care'){
    if(!item||item.cared)return false;
    item.cared=true;return true;
   }
   if(action==='finish'){
    if(!item||!item.cared||item.age<c.seconds)return false;
    s.slots[index]=null;
    if(c.domain==='farm')s.inventory++;
    else {s.money+=c.price;s.earned+=c.price;s.sales++;}
   }else return false;
  }
  s.complete=s.earned>=c.target;
  return true;
 }
 return {create,tick,act};
}
root.gameForgeSimulationRulesFactory=gameForgeSimulationRulesFactory;
if(typeof module!=='undefined')module.exports=gameForgeSimulationRulesFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
