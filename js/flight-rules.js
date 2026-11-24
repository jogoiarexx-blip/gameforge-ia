/* GF-TRAIN-28: bounded, deterministic arcade flight in XYZ. +Z is forward at yaw 0. */
(function(root){
'use strict';
function gameForgeFlightFactory(){
 const profiles={dragon:{min:4,max:23,boost:34,accel:15,turn:1.8,climb:1.25},airplane:{min:12,max:42,boost:57,accel:20,turn:1.05,climb:.9},spaceship:{min:2,max:50,boost:75,accel:28,turn:2,climb:1.4}};
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),unit=x=>Number.isFinite(x)?clamp(x,-1,1):0;
 const angle=x=>Math.atan2(Math.sin(x),Math.cos(x));
 const vec=(x,y,z)=>({x,y,z});
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
 function direction(yaw,pitch){return vec(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));}
 function approach(a,b,n){return a+clamp(b-a,-n,n);}
 function target(player,enemies,range=100,cone=.8){
  const f=direction(player.yaw,player.pitch);let best=null,score=Infinity;
  for(const e of enemies){
   if(e.hp<=0)continue;const d=dist(player,e);if(d<.001||d>range)continue;
   const dot=((e.x-player.x)*f.x+(e.y-player.y)*f.y+(e.z-player.z)*f.z)/d;
   if(dot<Math.cos(cone))continue;const cost=d*(2-dot);if(cost<score){best=e;score=cost;}
  }return best;
 }
 function segmentDistance(a,b,p){const x=b.x-a.x,y=b.y-a.y,z=b.z-a.z,l=x*x+y*y+z*z;
  const t=l?clamp(((p.x-a.x)*x+(p.y-a.y)*y+(p.z-a.z)*z)/l,0,1):0;
  return Math.hypot(a.x+x*t-p.x,a.y+y*t-p.y,a.z+z*t-p.z);
 }
 function create(options={}){
  const kind=Object.hasOwn(profiles,options.kind)?options.kind:'dragon',profile=profiles[kind];
  const size=Number.isFinite(options.size)?clamp(options.size,100,800):240,ceiling=80;
  let p,enemies,shots,score,phase,status,cooldown,enemyClock,acc,steps,lockId,boosting;
  function reset(){
   p={x:0,y:1,z:0,yaw:0,pitch:0,roll:0,speed:0,energy:100,hp:100,grounded:true};
   enemies=[{id:'scout-1',x:-14,y:16,z:48,hp:35,maxHp:35,radius:2},{id:'scout-2',x:15,y:20,z:64,hp:35,maxHp:35,radius:2},
    {id:'boss',x:0,y:30,z:95,hp:150,maxHp:150,radius:4}];
   shots=[];score=0;phase=1;status='play';cooldown=0;enemyClock=0;acc=0;steps=0;lockId=null;boosting=false;
  }reset();
  function fire(origin,yaw,pitch,hostile=false){
   if(shots.length>=96)return;const d=direction(yaw,pitch),speed=hostile?35:90;
   shots.push({...vec(origin.x,origin.y,origin.z),vx:d.x*speed,vy:d.y*speed,vz:d.z*speed,hostile,life:3});
  }
  function simulate(dt,input){
   if(status!=='play')return;
   const turn=unit(input.turn),pitch=unit(input.pitch),throttle=unit(input.throttle);
   boosting=!!input.boost&&!p.grounded&&p.energy>0;
   p.energy=clamp(p.energy+(boosting?-24:12)*dt,0,100);
   p.yaw=angle(p.yaw+turn*profile.turn*dt);
   p.pitch=approach(p.pitch,p.grounded?0:pitch*.65,profile.climb*dt);
   p.roll=approach(p.roll,-turn*.58,2.4*dt);
   if(p.grounded){
    p.speed=approach(p.speed,throttle>0?profile.min+3:0,profile.accel*dt);
    if(throttle>.4&&pitch>.3&&p.speed>=profile.min){p.grounded=false;p.pitch=.3;p.y=1.1;}
   }else{
    const wanted=boosting?profile.boost:throttle<0?profile.min:profile.min+(profile.max-profile.min)*(.55+.45*Math.max(0,throttle));
    p.speed=approach(p.speed,wanted,profile.accel*dt);
   }
   const f=direction(p.yaw,p.pitch);
   p.x=clamp(p.x+f.x*p.speed*dt,-size/2,size/2);
   p.z=clamp(p.z+f.z*p.speed*dt,-size/2,size/2);
   if(!p.grounded){
    p.y=clamp(p.y+f.y*p.speed*dt,1,ceiling);
    if(p.y<=1){if(p.speed<=profile.min+2&&Math.abs(p.pitch)<.45){p.grounded=true;p.speed=0;p.pitch=0;}else{p.hp=0;status='defeat';}}
   }
   const locked=target(p,enemies);lockId=locked?.id??null;
   cooldown=Math.max(0,cooldown-dt);
   if(input.fire&&!p.grounded&&cooldown===0){fire(p,p.yaw,p.pitch);cooldown=.18;}
   enemyClock+=dt;
   for(const e of enemies){
    if(e.hp<=0)continue;
    if(e.id==='boss')phase=e.hp<=50?3:e.hp<=100?2:1;
    const dx=p.x-e.x,dz=p.z-e.z,d=Math.hypot(dx,dz);
    if(d>18){const v=e.id==='boss'?3+phase:6;e.x+=dx/d*v*dt;e.z+=dz/d*v*dt;}
    e.y=approach(e.y,clamp(p.y+8,8,ceiling-5),dt*2);
    if(enemyClock>=1.4&&dist(p,e)<95&&!p.grounded){
     fire(e,Math.atan2(dx,dz),Math.atan2(p.y-e.y,d),true);
    }
   }
   if(enemyClock>=1.4)enemyClock=0;
   for(const s of shots){
    const old=vec(s.x,s.y,s.z);s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;s.life-=dt;
    if(s.hostile){if(segmentDistance(old,s,p)<1.5){p.hp=Math.max(0,p.hp-8);s.life=0;}}
    else for(const e of enemies){if(e.hp>0&&segmentDistance(old,s,e)<e.radius){
     e.hp=Math.max(0,e.hp-10);s.life=0;if(!e.hp)score+=e.id==='boss'?500:100;break;
    }}
   }
   shots=shots.filter(s=>s.life>0&&Math.abs(s.x)<=size&&Math.abs(s.z)<=size&&s.y>=0&&s.y<=ceiling+20);
   if(p.hp<=0)status='defeat';else if(enemies.every(e=>e.hp<=0))status='victory';
   steps++;
  }
  function update(dt,input={}){
   if(!Number.isFinite(dt)||dt<=0)return 0;acc+=Math.min(.1,dt);let n=0;
   while(acc+1e-10>=1/60&&n<6){simulate(1/60,input);acc=Math.max(0,acc-1/60);n++;}return n;
  }
  function snapshot(){return {kind,player:{...p},enemies:enemies.map(e=>({...e})),shots:shots.map(s=>({...s})),score,phase,status,steps,lockId,boosting,size,ceiling};}
  function camera(){const d=direction(p.yaw,p.pitch);return {position:vec(p.x-d.x*12,p.y+5,p.z-d.z*12),focus:vec(p.x+d.x*13,p.y+d.y*13,p.z+d.z*13),fov:58+p.speed/profile.boost*12};}
  return {update,snapshot,reset,camera};
 }
 return {create,direction,target,segmentDistance};
}
root.gameForgeFlightFactory=gameForgeFlightFactory;
if(typeof module!=='undefined')module.exports=gameForgeFlightFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
