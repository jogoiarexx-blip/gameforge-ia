/* GF-VOXEL-11: deterministic atmosphere, bounded visual effects; no physical weather. */
function gameForgeVoxelAtmosphereFactory(K){
 'use strict';
 function sample(seed,time){
  const t=Math.max(0,Number(time)||0),phase=(t%120)/120,day=Math.max(0,Math.sin(phase*Math.PI*2)),night=phase>=.6667;
  const period=Math.floor(t/35),wet=K.hash(seed^16381,period,4)>.68;
  return {phase,day,night,rain:wet&&t%35>3&&t%35<31,clouds:wet?1:.35};
 }
 function create(T,scene,seed){
  const sky=new T.Color(),fog=new T.Color(),dayColor=new T.Color(0x8bbce1),nightColor=new T.Color(0x14233e),rainColor=new T.Color(0x657a91);
  const sphere=new T.SphereGeometry(3,12,8),sun=new T.Mesh(sphere,new T.MeshBasicMaterial({color:0xffdb8a,fog:false})),moon=new T.Mesh(sphere,new T.MeshBasicMaterial({color:0xcbdaf1,fog:false}));moon.scale.setScalar(.68);scene.add(sun,moon);
  const cloudGeo=new T.BoxGeometry(1,1,1),cloudMat=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.65,depthWrite:false,fog:false}),clouds=new T.InstancedMesh(cloudGeo,cloudMat,24),o=new T.Object3D();clouds.frustumCulled=false;scene.add(clouds);
  const n=160,arr=new Float32Array(n*6),rainGeo=new T.BufferGeometry(),attr=new T.BufferAttribute(arr,3);attr.setUsage(T.DynamicDrawUsage);rainGeo.setAttribute('position',attr);
  const rain=new T.LineSegments(rainGeo,new T.LineBasicMaterial({color:0xa5c9e8,transparent:true,opacity:.55,depthWrite:false}));rain.frustumCulled=false;scene.add(rain);
  let latest=sample(seed,0);
  function update(time,p,mobile,baseFar,material,foliageMaterial){
   latest=sample(seed,time);
   const angle=latest.phase*Math.PI*2,day=latest.night?.28:Math.max(.58,latest.day);
   sky.copy(nightColor).lerp(dayColor,day);if(latest.rain)sky.lerp(rainColor,.58);
   scene.background.copy(sky);scene.fog.color.copy(sky);scene.fog.far=baseFar*(latest.rain?.62:1);scene.fog.near=Math.min(baseFar*.52,scene.fog.far*.65);
   const light=latest.night?.50:latest.rain?.72:.85+.15*latest.day;material.color.setScalar(light);foliageMaterial.color.setScalar(light);
   const radius=68,dx=Math.cos(angle)*radius,dy=Math.sin(angle)*radius;
   sun.visible=!latest.night&&!latest.rain;moon.visible=latest.night&&!latest.rain;
   sun.position.set(p.x+dx,p.y+Math.max(10,dy),p.z-27);moon.position.set(p.x-dx,p.y+Math.max(18,-dy),p.z+25);
   cloudMat.opacity=latest.clouds*.65;cloudMat.color.setScalar(latest.night?.48:1);
   for(let i=0;i<24;i++){
    const x=((K.hash(seed,i,1)*160+time*.75)%160)-80,z=K.hash(seed,i,2)*160-80;
    o.position.set(p.x+x,p.y+32+K.hash(seed,i,3)*12,p.z+z);o.scale.set(7+K.hash(seed,i,4)*12,1.4,3+K.hash(seed,i,5)*6);o.updateMatrix();clouds.setMatrixAt(i,o.matrix);
   }
   clouds.instanceMatrix.needsUpdate=true;rain.visible=latest.rain;
   if(rain.visible){
    const count=mobile?64:n;rainGeo.setDrawRange(0,count*2);
    for(let i=0;i<count;i++){
     const x=p.x+(K.hash(seed,i,7)-.5)*24,z=p.z+(K.hash(seed,i,8)-.5)*24,y=p.y+((K.hash(seed,i,9)*18-time*12)%18+18)%18-2;
     arr.set([x,y,z,x-.12,y+.8,z+.04],i*6);
    }attr.needsUpdate=true;
   }
  }
  return {update,snapshot:()=>({...latest,particles:rain.visible?rainGeo.drawRange.count/2:0,cloudInstances:24})};
 }
 return {sample,create};
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelAtmosphereFactory=gameForgeVoxelAtmosphereFactory;
if(typeof module!=='undefined')module.exports=gameForgeVoxelAtmosphereFactory;
