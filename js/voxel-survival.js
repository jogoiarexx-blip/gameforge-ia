/* GF-VOXEL-04: pure active-time survival and deterministic creature rules. */
function gameForgeVoxelSurvivalFactory(K,E){
 'use strict';
 const PERIOD=120,DAY=80,MAX=100;
 const finite=Number.isFinite,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const initial=()=>({time:0,health:100,hunger:100,attack:0,respawns:0,animals:[],spawned:false});
 const night=s=>s.time%PERIOD>=DAY;
 function ground(world,x,z,nearY,up=1,down=2){
  for(let y=Math.min(158,Math.floor(nearY)+up);y>=Math.max(1,Math.floor(nearY)-down);y--)
   if(world.get(Math.floor(x),y-1,Math.floor(z))&&!world.collides(x,y,z))return y;
  return null;
 }
 function populate(s,world,player){
  if(s.spawned)return;
  s.spawned=true;
  for(let i=0;i<4;i++){
   const x=player.x+Math.sin(i*Math.PI/2+.7)*4,z=player.z+Math.cos(i*Math.PI/2+.7)*4;
   const y=ground(world,x,z,player.y,5,5);
   if(y!==null)s.animals.push({id:i,kind:'sheep',x,y,z,hp:2});
  }
 }
 function valid(s,world){
  return s&&finite(s.time)&&s.time>=0&&s.time<=1e8&&finite(s.health)&&s.health>=0&&s.health<=100&&
   finite(s.hunger)&&s.hunger>=0&&s.hunger<=100&&finite(s.attack)&&s.attack>=0&&s.attack<=1&&
   Number.isSafeInteger(s.respawns)&&s.respawns>=0&&s.respawns<=1e6&&typeof s.spawned==='boolean'&&
   Array.isArray(s.animals)&&s.animals.length<=8&&new Set(s.animals.map(a=>a?.id)).size===s.animals.length&&
   s.animals.every(a=>a&&Number.isInteger(a.id)&&a.id>=0&&a.id<8&&['sheep','shade'].includes(a.kind)&&
    (a.kind==='sheep'?a.id<4:a.id>=4)&&[a.x,a.y,a.z].every(finite)&&Number.isInteger(a.hp)&&a.hp>0&&a.hp<=(a.kind==='sheep'?2:3)&&
    Math.abs(a.x)<32&&Math.abs(a.z)<32&&a.y>=1&&a.y<159)&&(!world||s.animals.every(a=>!world.collides(a.x,a.y,a.z)));
 }
 function tick(s,dt,world,player,moving=false,defense=0){
  if(!finite(dt)||dt<=0||dt>.25||s.health<=0)return;
  const wasNight=night(s),oldDay=Math.floor(s.time/PERIOD);
  s.time+=dt;s.attack=Math.max(0,s.attack-dt);
  s.hunger=Math.max(0,s.hunger-dt*(moving?.55:.27));
  if(s.hunger===0)s.health=Math.max(0,s.health-3*dt);
  else if(s.hunger>=80)s.health=Math.min(MAX,s.health+.35*dt);
  if(!night(s))s.animals=s.animals.filter(a=>a.kind!=='shade');
  if(Math.floor(s.time/PERIOD)>oldDay){s.spawned=false; s.animals=s.animals.filter(a=>a.kind!=='sheep');populate(s,world,player);}
  if(!wasNight&&night(s)){
   let count=0;
   const offset=K.hash(world.seed,Math.floor(s.time),0)*Math.PI*2;
   for(let i=0;i<16&&count<3;i++){
    const angle=offset+i*Math.PI/8;
    const x=player.x+Math.cos(angle)*5,z=player.z+Math.sin(angle)*5,y=ground(world,x,z,player.y,5,5);
    if(y!==null&&!s.animals.some(a=>Math.hypot(x-a.x,z-a.z)<1.6)){
     s.animals.push({id:4+count,kind:'shade',x,y,z,hp:3});count++;
    }
   }
  }
  for(const a of s.animals){
   if(world.collides(a.x,a.y,a.z)){
    const y=ground(world,a.x,a.z,a.y);if(y===null){a.hp=0;continue;}a.y=y;
   }
   const dx=player.x-a.x,dz=player.z-a.z,d=Math.hypot(dx,dz);
   if(a.kind==='shade'&&d<1.2&&Math.abs(player.y-a.y)<1.6){
    s.health=Math.max(0,s.health-dt*9*(1-clamp(defense,0,.8)));continue;
   }
   const angle=a.kind==='shade'?Math.atan2(dz,dx):a.id*2+s.time*.4;
   const speed=a.kind==='shade'?1.45:.45;
   const x=a.x+Math.cos(angle)*speed*dt,z=a.z+Math.sin(angle)*speed*dt,y=ground(world,x,z,a.y);
   if(y!==null){a.x=x;a.y=y;a.z=z;}
  }
  s.animals=s.animals.filter(a=>a.hp>0);
 }
 function eat(s,bag){
  if(s.health<=0||s.hunger>=99.99)return null;
  const next=E.change(bag,11,-1);if(!next)return null;
  s.hunger=Math.min(100,s.hunger+35);s.health=Math.min(100,s.health+8);return next;
 }
 function target(s,origin,dir,reach=3){
  let best=null;
  for(const a of s.animals){
   const v=[a.x-origin[0],a.y+.6-origin[1],a.z-origin[2]];
   const d=v[0]*dir[0]+v[1]*dir[1]+v[2]*dir[2];
   if(d<0||d>reach||Math.hypot(v[0]-d*dir[0],v[1]-d*dir[1],v[2]-d*dir[2])>.65)continue;
   if(!best||d<best.distance)best={id:a.id,distance:d};
  }
  return best;
 }
 function hit(s,id,bag,equipped,damageOverride=null){
  if(s.health<=0||s.attack>0)return {ok:false,reason:'cooldown'};
  const a=s.animals.find(a=>a.id===id);if(!a)return {ok:false,reason:'invalid'};
  const damage=Number.isInteger(damageOverride)&&damageOverride>=1&&damageOverride<=4?damageOverride:equipped?2:1;
  let next=bag;
  if(a.hp<=damage&&a.kind==='sheep'){next=E.change(bag,11,2);if(!next)return {ok:false,reason:'inventory-full'};}
  s.attack=.5;a.hp-=damage;
  if(a.hp<=0)s.animals=s.animals.filter(v=>v!==a);
  return {ok:true,bag:next};
 }
 function respawn(s){
  s.health=100;s.hunger=100;s.attack=0;s.respawns++;
  // Keep world and inventory, remove immediate attackers; time does not reset.
  s.animals=s.animals.filter(a=>a.kind!=='shade');
 }
 return {initial,night,valid,populate,tick,eat,target,hit,respawn,PERIOD,DAY};
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelSurvivalFactory=gameForgeVoxelSurvivalFactory;
if(typeof module!=='undefined')module.exports=gameForgeVoxelSurvivalFactory;
