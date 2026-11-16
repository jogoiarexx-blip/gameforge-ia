/* Regras puras do vertical slice Urban Action 3D.
 * Geometria de colisão em XZ independente dos meshes Three.js.
 * Incluído no game.js exportado; não utiliza rede, timers nem DOM.
 */
(function(root){
'use strict';
function gameForgeUrbanRulesFactory(){
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 const finite=(n,fallback,min,max)=>Number.isFinite(n)?clamp(n,min,max):fallback;
 function intersects(x,z,r,rect){
  const closestX=clamp(x,rect.x-rect.w/2,rect.x+rect.w/2);
  const closestZ=clamp(z,rect.z-rect.d/2,rect.z+rect.d/2);
  const dx=x-closestX,dz=z-closestZ;
  return dx*dx+dz*dz<r*r;
 }
 function move(actor,dx,dz,solids=[],limit=17,radius=.36){
  let x=clamp(actor.x+dx,-limit+radius,limit-radius),z=clamp(actor.z,-limit+radius,limit-radius);
  if(solids.some(rect=>intersects(x,z,radius,rect)))x=actor.x;
  z=clamp(actor.z+dz,-limit+radius,limit-radius);
  if(solids.some(rect=>intersects(x,z,radius,rect)))z=actor.z;
  return {x,z};
 }
 function clearShot(a,b,solids=[]){
  // Mesmo teste de volumes usados pelo movimento: nenhum tiro atravessa edifícios.
  const dist=Math.hypot(b.x-a.x,b.z-a.z);
  const steps=Math.max(1,Math.ceil(dist/.24));
  for(let i=1;i<steps;i++){
   const t=i/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
   if(solids.some(rect=>intersects(x,z,.08,rect)))return false;
  }
  return true;
 }
 function canHit(player,target,solids=[],maxRange=15,halfAngle=.42){
  const dx=target.x-player.x,dz=target.z-player.z,distance=Math.hypot(dx,dz);
  if(distance<.1||distance>maxRange)return false;
  const facingX=Math.sin(player.heading||0),facingZ=-Math.cos(player.heading||0);
  return (facingX*dx+facingZ*dz)/distance>=Math.cos(halfAngle)
   &&clearShot(player,target,solids);
 }
 function capture(state,nearBusiness){
  if(!nearBusiness||!state.guardDefeated||state.captured)
   return {state:{...state},changed:false};
  return {state:{...state,captured:true,missionComplete:true,
    cash:state.cash+(state.rewardGranted?0:450),rewardGranted:true},changed:true};
 }
 function load(raw){
  if(!raw||typeof raw!=='object'||raw.version!==1)return null;
  if(!Number.isFinite(raw.x)||!Number.isFinite(raw.z)||!Number.isFinite(raw.cash)||
     typeof raw.guardDefeated!=='boolean'||typeof raw.captured!=='boolean')return null;
  const guardDefeated=raw.guardDefeated,captured=!!raw.captured&&guardDefeated;
  return {
   x:finite(raw.x,0,-16.5,16.5),z:finite(raw.z,9,-16.5,16.5),
   health:finite(raw.health,100,1,100),cash:finite(raw.cash,1000,0,10000000),
   ammo:finite(raw.ammo,12,0,12),reserve:finite(raw.reserve,48,0,120),
   guardHp:guardDefeated?0:finite(raw.guardHp,75,1,75),
   guardDefeated,captured,missionComplete:captured,
   rewardGranted:captured&&raw.rewardGranted===true,
   heading:finite(raw.heading,0,-Math.PI*4,Math.PI*4)
  };
 }
 return {clamp,intersects,move,clearShot,canHit,capture,load};
}
root.gameForgeUrbanRulesFactory=gameForgeUrbanRulesFactory;
if(typeof module!=='undefined')module.exports=gameForgeUrbanRulesFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
