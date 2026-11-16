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
 // Oclusao de camera em 3D por segmento vs. caixas AABB expandidas.
 // A camera recua ate antes do primeiro obstaculo, inclusive quando a
 // interpolacao de frames anteriores atravessaria um edificio.
 function cameraPosition(eye,wanted,solids=[],radius=.26){
  const axes=['x','y','z'];
  if(!axes.every(axis=>Number.isFinite(eye?.[axis])&&Number.isFinite(wanted?.[axis])))
   return {...wanted,occluded:false};
  let fraction=1;
  for(const rect of solids){
   if(!Number.isFinite(rect?.x)||!Number.isFinite(rect?.z)||
      !Number.isFinite(rect?.w)||!Number.isFinite(rect?.d))continue;
   const bounds={
    x:[rect.x-rect.w/2-radius,rect.x+rect.w/2+radius],
    y:[-radius,(Number.isFinite(rect.h)?rect.h:4.7)+radius],
    z:[rect.z-rect.d/2-radius,rect.z+rect.d/2+radius]
   };
   let enter=0,exit=1,possible=true;
   for(const axis of axes){
    const delta=wanted[axis]-eye[axis],min=bounds[axis][0],max=bounds[axis][1];
    if(Math.abs(delta)<1e-9){
     if(eye[axis]<min||eye[axis]>max){possible=false;break;}
     continue;
    }
    let a=(min-eye[axis])/delta,b=(max-eye[axis])/delta;
    if(a>b){const swap=a;a=b;b=swap;}
    enter=Math.max(enter,a);exit=Math.min(exit,b);
    if(enter>exit){possible=false;break;}
   }
   if(possible&&enter<=1&&exit>=0)
    fraction=Math.min(fraction,Math.max(0,enter-.018));
  }
  return {
   x:eye.x+(wanted.x-eye.x)*fraction,
   y:eye.y+(wanted.y-eye.y)*fraction,
   z:eye.z+(wanted.z-eye.z)*fraction,
   occluded:fraction<1
  };
 }
 function canHit(player,target,solids=[],maxRange=15,halfAngle=.42){
  const dx=target.x-player.x,dz=target.z-player.z,distance=Math.hypot(dx,dz);
  if(distance<.1||distance>maxRange)return false;
  const facingX=Math.sin(player.heading||0),facingZ=-Math.cos(player.heading||0);
  return (facingX*dx+facingZ*dz)/distance>=Math.cos(halfAngle)
   &&clearShot(player,target,solids);
 }
 // IA deterministica para guardas: patrulha, alerta, busca e combate.
 // Nenhum temporizador global: apenas dt, geometria e estado serializavel.
 function guardStep(guard,player,dt,solids=[]){
  if(!guard||!Number.isFinite(guard.x)||!Number.isFinite(guard.z)||
     !player||!Number.isFinite(player.x)||!Number.isFinite(player.z))
   return {...guard,mode:'patrol',canAttack:false};
  const delta=clamp(Number.isFinite(dt)?dt:0,0,.05);
  const homeX=Number.isFinite(guard.homeX)?guard.homeX:guard.x;
  const homeZ=Number.isFinite(guard.homeZ)?guard.homeZ:guard.z;
  const distance=Math.hypot(player.x-guard.x,player.z-guard.z);
  const seesPlayer=distance<8.6&&clearShot(guard,player,solids);
  const memory=seesPlayer?2.4:Math.max(0,(guard.memory||0)-delta);
  const mode=seesPlayer?(distance<=2.05?'combat':'alert'):memory>0?'search':'patrol';
  const patrolClock=(guard.patrolClock||0)+delta;
  const lastSeenX=seesPlayer?player.x:Number.isFinite(guard.lastSeenX)?guard.lastSeenX:homeX;
  const lastSeenZ=seesPlayer?player.z:Number.isFinite(guard.lastSeenZ)?guard.lastSeenZ:homeZ;
  const goal=mode==='patrol'?{x:homeX+Math.sin(patrolClock*.7)*1.6,z:homeZ}:
   mode==='search'?{x:lastSeenX,z:lastSeenZ}:{x:player.x,z:player.z};
  let x=guard.x,z=guard.z,heading=guard.heading||0;
  const gx=goal.x-x,gz=goal.z-z,remaining=Math.hypot(gx,gz);
  const minDistance=mode==='combat'?1.65:mode==='alert'?1.55:.08;
  if(remaining>minDistance&&delta>0){
   const speed=mode==='alert'?1.4:mode==='search'?1.1:.85;
   const stride=Math.min(remaining-minDistance,speed*delta);
   const moved=move({x,z},gx/remaining*stride,gz/remaining*stride,solids,17,.36);
   x=moved.x;z=moved.z;
   if(Math.hypot(x-guard.x,z-guard.z)>1e-5)heading=Math.atan2(gx,-gz);
  }
  return {x,z,homeX,homeZ,heading,mode,patrolClock,lastSeenX,lastSeenZ,memory,
   seesPlayer,canAttack:mode==='combat'&&seesPlayer};
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
 return {clamp,intersects,move,clearShot,canHit,cameraPosition,guardStep,capture,load};
}
root.gameForgeUrbanRulesFactory=gameForgeUrbanRulesFactory;
if(typeof module!=='undefined')module.exports=gameForgeUrbanRulesFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
