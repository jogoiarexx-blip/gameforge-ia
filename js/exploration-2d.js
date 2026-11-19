/* GF-TRAIN-12 — navegação 2D autoral, pura e exportável. Sem DOM, rede ou bibliotecas externas. */
(function(root){
'use strict';
function gameForgeExploration2DFactory(){
 const WIDTH=960,HEIGHT=540,RADIUS=13;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function layout(slots,domain='aquarium',withGuide=true,withSecondNpc=false){
  const count=Math.max(1,Math.min(12,Math.trunc(Number(slots)||1))),cols=Math.min(count,4);
  const stations=Array.from({length:count},(_,index)=>{
   const col=index%cols,row=Math.floor(index/cols),cx=(col+1)*WIDTH/(cols+1),cy=148+row*127;
   return {id:'station-'+index,type:'station',index,x:cx-57,y:cy-30,w:114,h:60};
  });
  const furniture=count<=4?[{id:'counter',type:'obstacle',x:425,y:309,w:110,h:36}]:[];
  const guide=withGuide?{id:'guide',type:'npc',x:860,y:485,r:14,
   label:domain==='aquarium'?'Cuidador':domain==='farm'?'Agricultor':'Atendente'}:null;
  const guide2=withGuide&&withSecondNpc?{id:'guide-2',type:'npc',x:700,y:450,r:14,
   label:domain==='aquarium'?'Pesquisador':domain==='farm'?'Feirante':'Gerente'}:null;
  return {width:WIDTH,height:HEIGHT,bounds:{left:25,top:90,right:935,bottom:520},radius:RADIUS,
   stations,furniture,guide,guide2};
 }
 function rectDistance(x,y,r){
  const dx=x-clamp(x,r.x,r.x+r.w),dy=y-clamp(y,r.y,r.y+r.h);
  return Math.hypot(dx,dy);
 }
 function hitCircleRect(x,y,rad,rect){return rectDistance(x,y,rect)<rad-1e-6;}
 function obstacles(scene){
  return [...scene.stations,...scene.furniture,...(scene.guide?[{x:scene.guide.x-12,y:scene.guide.y-12,w:24,h:24}]:[]),...(scene.guide2?[{x:scene.guide2.x-12,y:scene.guide2.y-12,w:24,h:24}]:[])];
 }
 function walkable(scene,x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  const b=scene.bounds,r=scene.radius;
  if(x<b.left+r||x>b.right-r||y<b.top+r||y>b.bottom-r)return false;
  return !obstacles(scene).some(o=>hitCircleRect(x,y,r,o));
 }
 function spawn(scene){const initial={x:90,y:489};return walkable(scene,initial.x,initial.y)?initial:{x:scene.bounds.left+scene.radius+3,y:scene.bounds.bottom-scene.radius-3};}
 function move(actor,dx,dy,seconds,scene,speed=190){
  if(!Number.isFinite(seconds)||seconds<=0)return {...actor};
  dx=Number.isFinite(dx)?dx:0;dy=Number.isFinite(dy)?dy:0;
  const magnitude=Math.hypot(dx,dy);
  if(magnitude<1e-8)return {...actor};
  const step=clamp(Number(speed)||190,70,350)*Math.min(seconds,.1)/Math.max(1,magnitude);
  const next={x:actor.x,y:actor.y},nx=next.x+dx*step,ny=next.y+dy*step;
  // Separar eixos permite deslizar junto às paredes, sem atravessar prateleiras.
  if(walkable(scene,nx,next.y))next.x=nx;
  if(walkable(scene,next.x,ny))next.y=ny;
  return next;
 }
 function distance(actor,target){
  if(!target)return Infinity;
  return target.type==='station'?rectDistance(actor.x,actor.y,target):
   Math.hypot(actor.x-target.x,actor.y-target.y);
 }
 function inRange(actor,target,reach=55){return !!target&&distance(actor,target)<=clamp(Number(reach)||55,15,100);}
 function nearest(actor,scene,reach=55){
  const list=[...scene.stations,...(scene.guide?[scene.guide]:[]),...(scene.guide2?[scene.guide2]:[])];
  let best=null,d=Infinity;
  for(const item of list){const next=distance(actor,item);if(next<d){d=next;best=item;}}
  return d<=reach?best:null;
 }
 function hitAt(scene,x,y){
  for(const item of [...scene.stations,...(scene.guide?[scene.guide]:[]),...(scene.guide2?[scene.guide2]:[])]){
   if(item.type==='station'&&x>=item.x&&x<=item.x+item.w&&y>=item.y&&y<=item.y+item.h)return item;
   if(item.type==='npc'&&Math.hypot(item.x-x,item.y-y)<item.r+12)return item;
  }
  return null;
 }
 function approachPoint(target){
  if(!target)return null;
  return target.type==='station'?{x:target.x+target.w/2,y:target.y+target.h+24}:{x:target.x-42,y:target.y};
 }
 function patrolGuide(scene,seconds,options){
  const guide=scene?.guide;
  if(!guide||!options?.enabled||!Number.isFinite(seconds)||seconds<=0)return false;
  const left=Math.max(755,Math.min(875,options.left)),right=Math.min(900,Math.max(815,options.right));
  const speed=Math.max(10,Math.min(90,options.speed));
  if(left>=right)return false;
  let dir=guide.dir===1?1:-1;
  let next=guide.x+dir*speed*Math.min(seconds,.1);
  if(next<left){next=left+(left-next);dir=1;}
  if(next>right){next=right-(next-right);dir=-1;}
  guide.x=clamp(next,left,right);guide.dir=dir;
  return true;
 }
 return {layout,spawn,move,walkable,nearest,inRange,distance,hitAt,approachPoint,patrolGuide};
}
root.gameForgeExploration2DFactory=gameForgeExploration2DFactory;
if(typeof module!=='undefined')module.exports=gameForgeExploration2DFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
