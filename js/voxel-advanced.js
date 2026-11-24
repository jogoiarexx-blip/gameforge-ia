/* GF-VOXEL-08: timed mining, persistent furnace jobs and armor. */
function gameForgeVoxelAdvancedFactory(E,U){
 'use strict';
 const RECIPES={3:{input:2,qty:2,output:6,out:2,duration:4},6:{input:15,qty:1,output:16,out:1,duration:6},11:{input:21,qty:1,output:22,out:1,duration:5}};
 const initial=()=>({version:1,armor:false,jobs:[]});
 const mining=()=>({key:null,elapsed:0,duration:0});
 const key=c=>c.join(',');
 function duration(id,active){
  if([3,15,20,21].includes(id))return U.DEFS[active]?.delay*2||1.6;
  if([8,9].includes(id))return active===17?.35:1.4;
  if([1,2].includes(id))return active===18?.22:.9;
  return .8;
 }
 function advance(m,hit,active,dt){
  if(!hit||!U.canMine({active},hit.id)||!Number.isFinite(dt)||dt<=0||dt>.25){Object.assign(m,mining());return false;}
  const k=key(hit.cell)+':'+hit.id+':'+active;
  if(m.key!==k){Object.assign(m,{key:k,elapsed:0,duration:duration(hit.id,active)});}
  m.elapsed=Math.min(m.duration,m.elapsed+dt);
  return m.elapsed+1e-8>=m.duration;
 }
 function nearest(world,p){
  let best=null,dist=9;
  for(let x=Math.floor(p.x)-3;x<=Math.floor(p.x)+3;x++)for(let y=Math.floor(p.y)-3;y<=Math.floor(p.y)+4;y++)for(let z=Math.floor(p.z)-3;z<=Math.floor(p.z)+3;z++){
   const d=(x+.5-p.x)**2+(y+.5-p.y-.85)**2+(z+.5-p.z)**2;
   if(d<=dist&&world.get(x,y,z)===5){dist=d;best=[x,y,z];}
  }
  return best;
 }
 function get(s,cell){return cell&&s.jobs.find(j=>key(j.cell)===key(cell));}
 function start(s,bag,world,p,index){
  const r=RECIPES[index],c=nearest(world,p);
  if(!r||!c||get(s,c)||s.jobs.length>=32)return null;
  const fuel=E.count(bag,20)>0?20:8;
  let next=E.change(bag,r.input,-r.qty);
  if(next)next=E.change(next,fuel,-1);
  if(!next)return null;
  s.jobs.push({cell:c,recipe:index,fuel,remaining:r.duration});return next;
 }
 function tick(s,dt){
  if(!Number.isFinite(dt)||dt<=0||dt>.25)return false;
  let finished=false;
  for(const j of s.jobs){if(j.remaining>0){j.remaining=Math.max(0,j.remaining-dt);if(j.remaining<1e-8){j.remaining=0;finished=true;}}}
  return finished;
 }
 function collect(s,bag,world,p){
  const j=get(s,nearest(world,p));if(!j||j.remaining>0)return null;
  const r=RECIPES[j.recipe],next=E.change(bag,r.output,r.out);if(!next)return null;
  s.jobs=s.jobs.filter(x=>x!==j);return next;
 }
 function toggleArmor(s,bag){if(E.count(bag,23)!==1)return false;s.armor=!s.armor;return true;}
 const defense=s=>s.armor?.4:0;
 function valid(s,bag,world){
  if(!s||s.version!==1||typeof s.armor!=='boolean'||E.count(bag,23)>1||(s.armor&&E.count(bag,23)!==1)||!Array.isArray(s.jobs)||s.jobs.length>32)return false;
  const seen=new Set();
  for(const j of s.jobs){
   if(!j||!Array.isArray(j.cell)||j.cell.length!==3||!j.cell.every(Number.isSafeInteger)||world.get(...j.cell)!==5||seen.has(key(j.cell))||
    !Number.isInteger(j.recipe)||!RECIPES[j.recipe]||![8,20].includes(j.fuel)||!Number.isFinite(j.remaining)||j.remaining<0||j.remaining>RECIPES[j.recipe].duration)return false;
   seen.add(key(j.cell));
  }
  return true;
 }
 return {initial,mining,duration,advance,nearest,get,start,tick,collect,toggleArmor,defense,valid,RECIPES};
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelAdvancedFactory=gameForgeVoxelAdvancedFactory;
if(typeof module!=='undefined')module.exports=gameForgeVoxelAdvancedFactory;
