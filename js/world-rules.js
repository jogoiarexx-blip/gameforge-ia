/* Pure shared world rules. This factory is serialized into exported offline games. */
function gameForgeWorldRules(){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};}
 function moveCircle(p,dx,dz,r,solids,size){
  let x=p.x,z=p.z;const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/Math.max(.2,r*.7)));
  const blocked=(a,b)=>solids.some(o=>{const nx=clamp(a,o.x-o.w/2,o.x+o.w/2),nz=clamp(b,o.z-o.d/2,o.z+o.d/2);return (a-nx)**2+(b-nz)**2<r*r-1e-8;});
  for(let i=0;i<steps;i++){const nx=clamp(x+dx/steps,-size/2+r,size/2-r);if(!blocked(nx,z))x=nx;const nz=clamp(z+dz/steps,-size/2+r,size/2-r);if(!blocked(x,nz))z=nz;}
  return {x,z};
 }
 function platformRoute(seed,stage,size){
  const random=rng((seed||12345)+stage*997),route=[];let y=0,z=0;
  for(let i=0;i<Math.round(clamp(Number(size)||48,32,88)/4)+Math.min(6,Math.floor(stage/5));i++){
   if(i){y=clamp(y+(random()-.45)*1.2,0,3);z=clamp(z+(random()-.5)*1.8,-2.5,2.5);}
   route.push({x:i*5.2,y,z,w:i===0?5:4.2,d:4.4});
  }return route;
 }
 function raceProgress(progress,gate,count,laps){
  let next=progress.next,lap=progress.lap;
  if(gate===next&&lap<laps){next++;if(next===count){next=0;lap++;}}
  return {next,lap,complete:lap>=laps};
 }
 function trackRibbon(rx,rz,width,segments){
  const positions=[],indices=[];
  for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;for(const offset of [-width/2,width/2])positions.push(Math.cos(a)*(rx+offset),.025,Math.sin(a)*(rz+offset));if(i<segments){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}}
  return {positions,indices};
 }
 function goalReady(genre,s){return genre==='racing'?!!s.complete:genre==='platform'?s.collected>=s.required:s.enemies===0&&s.collected>=s.required;}
 return {clamp,rng,moveCircle,platformRoute,raceProgress,trackRibbon,goalReady};
}
if(typeof module!=='undefined')module.exports=gameForgeWorldRules;
if(typeof globalThis!=='undefined')globalThis.gameForgeWorldRules=gameForgeWorldRules;
