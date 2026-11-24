/* GF-VOXEL-05: lightweight reusable procedural actors and first-person viewmodel.
 * Shared unit-cube geometry/material cache; no external models or animation libraries.
 */
function gameForgeVoxelActorsFactory(T){
 'use strict';
 const geo=new T.BoxGeometry(1,1,1),materials=new Map(),actors=new Map();
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function mat(color){
  if(!materials.has(color))materials.set(color,new T.MeshBasicMaterial({color}));
  return materials.get(color);
 }
 function part(parent,name,size,pos,color){
  const m=new T.Mesh(geo,mat(color));m.name=name;m.scale.set(...size);m.position.set(...pos);parent.add(m);return m;
 }
 function pivot(parent,name,pos){
  const g=new T.Group();g.name=name;g.position.set(...pos);parent.add(g);return g;
 }
 function makeSheep(){
  const g=new T.Group(),legs=[];
  part(g,'wool',[.74,.65,1.02],[0,.83,0],0xe9e2cf);
  part(g,'wool-back',[.65,.23,.82],[0,1.2,.03],0xf5efd9);
  const head=pivot(g,'head',[0,.91,-.62]);
  part(head,'face',[.42,.46,.38],[0,0,-.08],0xbeb0a2);
  for(const side of [-1,1]){
   part(head,'ear',[.18,.14,.23],[side*.29,.12,0],0x9e8e7a);
   part(head,'eye',[.085,.085,.035],[side*.12,.07,-.285],0x21242d);
  }
  for(const x of [-.25,.25])for(const z of [-.33,.33]){
   const leg=pivot(g,'leg',[x,.56,z]);legs.push(leg);
   part(leg,'shin',[.17,.43,.19],[0,-.215,0],0xa99480);
   part(leg,'hoof',[.19,.12,.21],[0,-.48,0],0x4b4140);
  }
  return {group:g,legs,arms:[],head};
 }
 function makeShade(){
  const g=new T.Group(),legs=[],arms=[];
  part(g,'torso',[.55,.57,.32],[0,.91,0],0x4c394f);
  const head=pivot(g,'head',[0,1.38,0]);
  part(head,'skull',[.43,.39,.36],[0,0,0],0x6a536f);
  for(const side of [-1,1]){
   part(head,'eye',[.12,.07,.035],[side*.115,.03,-.195],0xff7365);
   const leg=pivot(g,'leg',[side*.15,.63,0]);legs.push(leg);
   part(leg,'boot',[.22,.59,.26],[0,-.30,0],0x322c40);
   const arm=pivot(g,'arm',[side*.39,1.14,0]);arms.push(arm);
   part(arm,'sleeve',[.21,.56,.23],[0,-.25,0],0x755363);
  }
  return {group:g,legs,arms,head};
 }
 function sync(scene,animals,time,player){
  const ids=new Set(animals.map(a=>a.id));
  for(const [id,a] of actors)if(!ids.has(id)){scene.remove(a.group);actors.delete(id);}
  for(const a of animals){
   let v=actors.get(a.id);
   if(v&&v.kind!==a.kind){scene.remove(v.group);actors.delete(a.id);v=null;}
   if(!v){
    v=a.kind==='sheep'?makeSheep():makeShade();v.kind=a.kind;v.lastX=a.x;v.lastZ=a.z;v.lastTime=time;
    v.yaw=0;v.phase=0;v.hp=a.hp;v.flashUntil=0;actors.set(a.id,v);scene.add(v.group);
   }
   const dx=a.x-v.lastX,dz=a.z-v.lastZ,dist=Math.hypot(dx,dz);
   if(dist>.0001){v.yaw=Math.atan2(-dx,-dz);v.phase+=dist*8;}
   v.group.position.set(a.x,a.y,a.z);v.group.rotation.y=v.yaw;
   const stride=dist>.0001?Math.sin(v.phase)*.48:0;
   for(let i=0;i<v.legs.length;i++)v.legs[i].rotation.x=stride*(i%2?1:-1);
   const near=a.kind==='shade'&&player&&Math.hypot(player.x-a.x,player.z-a.z)<1.4;
   for(let i=0;i<v.arms.length;i++)v.arms[i].rotation.x=near?-1.1+Math.sin(time*9+i)*.25:-stride*(i%2?1:-1);
   v.head.rotation.x=a.kind==='sheep'?Math.sin(time*1.7+a.id)*.10:0;
   if(a.hp<v.hp)v.flashUntil=time+.18;
   v.group.scale.setScalar(time<v.flashUntil?1.05:1);
   v.lastX=a.x;v.lastZ=a.z;v.lastTime=time;v.hp=a.hp;
  }
 }
 const viewScene=new T.Scene(),viewCamera=new T.PerspectiveCamera(60,1,.05,8);
 const hand=pivot(viewScene,'hand',[.48,-.38,-1.05]);
 part(hand,'sleeve',[.22,.35,.23],[.04,-.16,.06],0x486b75);
 part(hand,'fist',[.22,.19,.22],[0,.08,-.05],0xc69b76);
 const tool=pivot(hand,'pickaxe',[0,.10,-.08]);
 part(tool,'handle',[.075,.64,.075],[0,.23,0],0x825c37);
 part(tool,'head',[.49,.10,.10],[0,.54,0],0x9ea6b3);
 for(const x of [-.25,.25])part(tool,'tip',[.10,.17,.11],[x,.48,0],0x7a8999);
 tool.rotation.z=-.32;
 const block=part(hand,'held-block',[.23,.23,.23],[0,.18,-.13],0x947654);
 const blockColors={1:0x74a64c,2:0x93623d,3:0x8a9399,4:0x9e7538,5:0x505963,6:0xbf5337,8:0x714721,10:0x6bb63a,12:0xb98537};
 let started=-100,action='none',actions=0,shown=false,held='hand',bob=0;
 function swing(time,kind){
  if(!Number.isFinite(time)||!['mine','place','attack'].includes(kind))return false;
  started=time;action=kind;actions++;return true;
 }
 function pose({time,active,equipped,selected,available,moving}){
  shown=!!active;hand.visible=shown;
  tool.visible=shown&&!!equipped;block.visible=shown&&!equipped&&!!available&&!!blockColors[selected];
  held=tool.visible?'pickaxe':block.visible?'block':'hand';
  if(block.visible)block.material=mat(blockColors[selected]);
  const progress=clamp((time-started)/.30,0,1),arc=progress<1?Math.sin(progress*Math.PI):0;
  bob=moving?Math.sin(time*10)*.025:0;
  hand.position.set(Math.min(.48,viewCamera.aspect*.32)+arc*.07,-.38+bob-arc*.12,-1.05+arc*.16);
  hand.rotation.set(-arc*(action==='place'?.25:.95),arc*.13,-arc*.28);
 }
 function resize(aspect){viewCamera.aspect=Math.max(.25,aspect);viewCamera.updateProjectionMatrix();}
 function render(renderer){
  if(!shown)return;
  const old=renderer.autoClear;
  try{renderer.autoClear=false;renderer.clearDepth();renderer.render(viewScene,viewCamera);}
  finally{renderer.autoClear=old;}
 }
 function reset(scene){for(const v of actors.values())scene.remove(v.group);actors.clear();started=-100;action='none';actions=0;shown=false;}
 function snapshot(){return {actors:actors.size,parts:[...actors.values()].reduce((sum,v)=>{v.group.traverse(n=>{if(n.isMesh)sum++;});return sum;},0),held,actions,action,visible:shown,geometryCount:1,materialCount:materials.size,swingAngle:hand.rotation.x};}
 return {sync,swing,pose,resize,render,reset,snapshot};
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelActorsFactory=gameForgeVoxelActorsFactory;
if(typeof module!=='undefined')module.exports=gameForgeVoxelActorsFactory;
