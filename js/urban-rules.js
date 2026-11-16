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
 // Planejador de rotas 2D para NPCs: grafo de visibilidade em torno das
 // esquinas dos edificios (sem malha de navegacao, sem Three.js).
 // Crescimento limitado: quatro pontos por obstaculo e recalculo com cooldown.
 function routeClear(a,b,solids=[],radius=.42){
  if(!Number.isFinite(a?.x)||!Number.isFinite(a?.z)||
     !Number.isFinite(b?.x)||!Number.isFinite(b?.z))return false;
  const dx=b.x-a.x,dz=b.z-a.z;
  for(const rect of solids){
   if(!Number.isFinite(rect?.x)||!Number.isFinite(rect?.z)||
      !Number.isFinite(rect?.w)||!Number.isFinite(rect?.d))continue;
   let near=0,far=1;
   let intersectsSegment=true;
   for(const axis of ['x','z']){
    const center=rect[axis],half=(axis==='x'?rect.w:rect.d)/2+radius;
    const start=a[axis],velocity=axis==='x'?dx:dz;
    if(Math.abs(velocity)<1e-9){
     if(start<center-half||start>center+half){intersectsSegment=false;break;}
    }else{
     let t0=(center-half-start)/velocity,t1=(center+half-start)/velocity;
     if(t0>t1){const tmp=t0;t0=t1;t1=tmp;}
     near=Math.max(near,t0);far=Math.min(far,t1);
     if(near>far){intersectsSegment=false;break;}
    }
   }
   if(intersectsSegment&&near<=far)return false;
  }
  return true;
 }
 function planGuardRoute(start,goal,solids=[],radius=.42){
  if(!Number.isFinite(start?.x)||!Number.isFinite(start?.z)||
     !Number.isFinite(goal?.x)||!Number.isFinite(goal?.z))return [];
  const edge=16.5;
  if(Math.abs(goal.x)>edge||Math.abs(goal.z)>edge||
     solids.some(b=>intersects(goal.x,goal.z,radius,b)))return [];
  if(routeClear(start,goal,solids,radius))return [{x:goal.x,z:goal.z}];
  const corners=[],pad=radius+.18;
  for(const b of solids){
   if(!Number.isFinite(b?.x)||!Number.isFinite(b?.z)||
      !Number.isFinite(b?.w)||!Number.isFinite(b?.d))continue;
   const ex=b.w/2+pad,ez=b.d/2+pad;
   for(const sx of [-1,1])for(const sz of [-1,1]){
    const point={x:b.x+sx*ex,z:b.z+sz*ez};
    if(Math.abs(point.x)>edge||Math.abs(point.z)>edge||
       solids.some(other=>intersects(point.x,point.z,radius,other)))continue;
    corners.push(point);
   }
  }
  const nodes=[{x:start.x,z:start.z},{x:goal.x,z:goal.z},...corners];
  const scores=nodes.map(()=>Infinity),parent=nodes.map(()=>-1),visited=new Set();
  scores[0]=0;
  for(let round=0;round<nodes.length;round++){
   let current=-1;
   for(let i=0;i<nodes.length;i++){
    if(!visited.has(i)&&(current<0||scores[i]<scores[current]))current=i;
   }
   if(current<0||!Number.isFinite(scores[current]))break;
   if(current===1)break;
   visited.add(current);
   for(let i=1;i<nodes.length;i++){
    if(i===current||visited.has(i)||!routeClear(nodes[current],nodes[i],solids,radius))continue;
    const cost=scores[current]+Math.hypot(nodes[i].x-nodes[current].x,nodes[i].z-nodes[current].z);
    if(cost+1e-9<scores[i]){scores[i]=cost;parent[i]=current;}
   }
  }
  if(!Number.isFinite(scores[1]))return [];
  const route=[],seen=new Set();
  for(let i=1;i>0&&i<nodes.length&&!seen.has(i);i=parent[i]){
   seen.add(i);route.unshift({x:nodes[i].x,z:nodes[i].z});
  }
  return route.length&&route.length<=nodes.length?route:[];
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
  // Passos e disparos proximo de um predio permitem investigar sem visao:
  // ouviu -> busca por caminho; ataque ainda exige linha visual real.
  const hearsPlayer=!seesPlayer&&player.noise===true&&distance<6.5;
  const memory=seesPlayer?2.4:hearsPlayer?4.5:Math.max(0,(guard.memory||0)-delta);
  const mode=seesPlayer?(distance<=2.05?'combat':'alert'):memory>0?'search':'patrol';
  const patrolClock=(guard.patrolClock||0)+delta;
  const lastSeenX=seesPlayer||hearsPlayer?player.x:Number.isFinite(guard.lastSeenX)?guard.lastSeenX:homeX;
  const lastSeenZ=seesPlayer||hearsPlayer?player.z:Number.isFinite(guard.lastSeenZ)?guard.lastSeenZ:homeZ;
  const goal=mode==='patrol'?{x:homeX+Math.sin(patrolClock*.7)*1.6,z:homeZ}:
   mode==='search'?{x:lastSeenX,z:lastSeenZ}:{x:player.x,z:player.z};
  let x=guard.x,z=guard.z,heading=guard.heading||0;
  const minDistance=mode==='combat'?1.65:mode==='alert'?1.55:.08;
  const remaining=Math.hypot(goal.x-x,goal.z-z);
  let navRoute=Array.isArray(guard.navRoute)?guard.navRoute.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)).slice(0,30):[];
  let navCooldown=Math.max(0,(guard.navCooldown||0)-delta);
  const goalChanged=Math.hypot(goal.x-(guard.navGoalX??goal.x),goal.z-(guard.navGoalZ??goal.z))>1.25;
  const direct=routeClear({x,z},goal,solids);
  // Reutilizar caminho entre frames para nao executar busca de grafo a 60 FPS.
  // Se a rota fica livre, elimina desvios e volta a caminhar diretamente.
  if(direct){navRoute=[];navCooldown=0;}
  else if(guard.navMode!==mode||goalChanged||navCooldown<=0){
   navRoute=planGuardRoute({x,z},goal,solids);
   navCooldown=.65;
  }
  let waypoint=direct?goal:navRoute[0];
  while(!direct&&navRoute.length&&
        Math.hypot(navRoute[0].x-x,navRoute[0].z-z)<.22){
   navRoute=navRoute.slice(1);
   waypoint=navRoute[0];
  }
  if(remaining>minDistance&&delta>0&&waypoint){
   const gx=waypoint.x-x,gz=waypoint.z-z,distance=Math.hypot(gx,gz);
   if(distance>.01){
    const speed=mode==='alert'?1.4:mode==='search'?1.1:.85;
    const stride=Math.min(Math.max(0,remaining-minDistance),distance,speed*delta);
    const moved=move({x,z},gx/distance*stride,gz/distance*stride,solids,17,.36);
    x=moved.x;z=moved.z;
    if(Math.hypot(x-guard.x,z-guard.z)>1e-5)heading=Math.atan2(gx,-gz);
   }
  }
  return {x,z,homeX,homeZ,heading,mode,patrolClock,lastSeenX,lastSeenZ,memory,
   navRoute,navCooldown,navGoalX:goal.x,navGoalZ:goal.z,navMode:mode,
   seesPlayer,hearsPlayer,canAttack:mode==='combat'&&seesPlayer};
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
 return {clamp,intersects,move,clearShot,canHit,cameraPosition,routeClear,planGuardRoute,guardStep,capture,load};
}
root.gameForgeUrbanRulesFactory=gameForgeUrbanRulesFactory;
if(typeof module!=='undefined')module.exports=gameForgeUrbanRulesFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
