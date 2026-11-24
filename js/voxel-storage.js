/* GF-VOXEL-06: bounded, persistent local chests and ground drops. */
function gameForgeVoxelStorageFactory(E){
 'use strict';
 const CHEST=12,MAX_CHESTS=64,MAX_DROPS=96,SLOTS=12;
 const empty=()=>Array(SLOTS).fill(null),initial=()=>({version:1,chests:[],drops:[],nextId:1});
 const key=c=>c.join(','),cell=(c,bound=128)=>Array.isArray(c)&&c.length===3&&c.every(Number.isSafeInteger)&&c[0]>=-bound&&c[0]<bound&&c[1]>=1&&c[1]<160&&c[2]>=-bound&&c[2]<bound;
 const distance=(p,x,y,z)=>Math.hypot(p.x-x,p.y+.85-y,p.z-z);
 const idAllowed=(id,cfg)=>([1,2,3,4,5,6,12].includes(id)||(!cfg.tools&&id===7)||(cfg.tools&&[15,16].includes(id))||(cfg.advanced&&[20,21,22].includes(id)))||(cfg.forest&&[8,10].includes(id))||(cfg.survival&&id===11)||(cfg.landscape&&id===29);
 const bagAllowed=(bag,cfg)=>E.valid(bag)&&bag.every(s=>!s||idAllowed(s.id,cfg));
 function valid(s,world,cfg){
  if(!s||s.version!==1||!Number.isSafeInteger(s.nextId)||s.nextId<1||s.nextId>1e9||
   !Array.isArray(s.chests)||s.chests.length>MAX_CHESTS||!Array.isArray(s.drops)||s.drops.length>MAX_DROPS)return false;
  const keys=new Set(),ids=new Set();
  for(const c of s.chests){
   if(!c||!cell(c.cell,world.MAX||32)||keys.has(key(c.cell))||world.get(...c.cell)!==CHEST||!bagAllowed(c.bag,cfg))return false;
   keys.add(key(c.cell));
  }
  // Every chest block must have a matching record.
  for(const [x,y,z,id] of world.edits())if(id===CHEST&&!keys.has(key([x,y,z])))return false;
  for(const d of s.drops){
   if(!d||!Number.isSafeInteger(d.uid)||d.uid<1||d.uid>=s.nextId||ids.has(d.uid)||
    !idAllowed(d.id,cfg)||!Number.isInteger(d.qty)||d.qty<1||d.qty>99||
    ![d.x,d.y,d.z,d.delay].every(Number.isFinite)||d.x<(world.MIN??-32)||d.x>=(world.MAX??32)||d.z<(world.MIN??-32)||d.z>=(world.MAX??32)||d.y<1||d.y>=160||d.delay<0||d.delay>2)return false;
   ids.add(d.uid);
  }
  return true;
 }
 function chest(s,c){return s.chests.find(v=>key(v.cell)===key(c));}
 function access(s,world,p,c){return cell(c)&&world.get(...c)===CHEST&&distance(p,c[0]+.5,c[1]+.5,c[2]+.5)<=3?chest(s,c):null;}
 function place(s,world,p,bag,hit){
  if(s.chests.length>=MAX_CHESTS||!cell(hit?.previous)||chest(s,hit.previous))return null;
  const next=E.change(bag,CHEST,-1);if(!next)return null;
  const dirty=world.place(hit,CHEST,p);if(!dirty)return null;
  s.chests.push({cell:[...hit.previous],bag:empty()});return {bag:next,dirty};
 }
 function mine(s,world,bag,hit){
  const c=cell(hit?.cell)&&chest(s,hit.cell);
  if(!c||c.bag.some(Boolean))return null;
  const next=E.change(bag,CHEST,1);if(!next)return null;
  const dirty=world.mine(hit);if(!dirty)return null;
  s.chests=s.chests.filter(v=>v!==c);return {bag:next,dirty};
 }
 function transfer(s,world,p,bag,c,id,qty,direction){
  const target=access(s,world,p,c);if(!target||!Number.isInteger(qty)||qty<1||qty>99||!['deposit','withdraw'].includes(direction))return null;
  const deposit=direction==='deposit',from=deposit?bag:target.bag,to=deposit?target.bag:bag;
  const a=E.change(from,id,-qty),b=E.change(to,id,qty);
  if(!a||!b)return null;
  target.bag=deposit?b:a;return deposit?a:b;
 }
 function drop(s,bag,p,id,qty,bound=32){
  if(!Number.isInteger(qty)||qty<1||qty>99||s.drops.length>=MAX_DROPS||s.nextId>=1e9||![p.x,p.y,p.z].every(Number.isFinite)||p.x< -bound||p.x>=bound||p.z< -bound||p.z>=bound||p.y<1||p.y>=159)return null;
  const next=E.change(bag,id,-qty);if(!next)return null;
  s.drops.push({uid:s.nextId++,id,qty,x:p.x,y:p.y+.35,z:p.z,delay:1.5});
  return next;
 }
 function collect(s,bag,p,dt){
  if(!Number.isFinite(dt)||dt<0||dt>.25)return {bag,collected:0};
  let next=bag,collected=0;
  s.drops=s.drops.filter(d=>{
   d.delay=Math.max(0,d.delay-dt);
   if(d.delay>0||distance(p,d.x,d.y,d.z)>1.4)return true;
   const b=E.change(next,d.id,d.qty);if(!b)return true;
   next=b;collected+=d.qty;return false;
  });
  return {bag:next,collected};
 }
 return {initial,valid,access,place,mine,transfer,drop,collect,CHEST,MAX_CHESTS,MAX_DROPS};
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelStorageFactory=gameForgeVoxelStorageFactory;
if(typeof module!=='undefined')module.exports=gameForgeVoxelStorageFactory;
