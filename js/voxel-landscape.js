/* GF-VOXEL-09: deterministic landscape, coherent mountains, shallow river and cave tunnels. */
function gameForgeVoxelLandscapeFactory(K){
 'use strict';
 function noise(seed,x,z,scale){
  const ix=Math.floor(x/scale),iz=Math.floor(z/scale),a=x/scale-ix,b=z/scale-iz;
  const u=a*a*(3-2*a),v=b*b*(3-2*b);
  return (K.hash(seed,ix,iz)*(1-u)+K.hash(seed,ix+1,iz)*u)*(1-v)+(K.hash(seed,ix,iz+1)*(1-u)+K.hash(seed,ix+1,iz+1)*u)*v;
 }
 function riverCenter(seed,z){return Math.sin(z/28+seed%17)*15+Math.sin(z/65)*9;}
 const villages=new Map();
 function village(seed,sx,sz){
  const key=seed+','+sx+','+sz;if(villages.has(key))return villages.get(key);
  const x=sx*48+24,z=sz*48+24,h=K.heightAt(seed,x,z);
  const valid=Math.abs(x-riverCenter(seed,z))>20&&Math.hypot(x,z)>22;
  const v=valid?{x,z,h}:null;villages.set(key,v);if(villages.size>512)villages.delete(villages.keys().next().value);return v;
 }
 function column(seed,x,z,details=false,biomes=false){
  const region=noise(seed^73481,x,z,48),detail=noise(seed^1833,x,z,12);
  const channel=Math.abs(x-riverCenter(seed,z));
  const river=channel<3.5&&Math.hypot(x,z)>10;
  const mountain=region>.65,biome=river?'river':mountain?'mountain':region<.30?'dry':'forest';
  let h=K.heightAt(seed,x,z)+Math.floor((detail-.5)*6)+(mountain?Math.floor((region-.65)*100):0);
  if(river)h=51+Math.floor(channel/2);
  const bank=!river&&channel<8&&Math.hypot(x,z)>10;
  if(bank)h=Math.min(h,54+Math.floor(channel-3));
  // Deterministic small ruined brick walls at widely spaced grid sites.
  const gx=Math.floor((x+24)/48),gz=Math.floor((z+24)/48),rx=x-gx*48,rz=z-gz*48;
  const ruins=Math.hypot(x,z)>18&&!river&&!bank&&K.hash(seed^9271,gx,gz)>.56&&Math.abs(rx)<=3&&Math.abs(rz)<=3;
  const wall=ruins&&(Math.abs(rx)===3||Math.abs(rz)===3)&&!(rz===3&&Math.abs(rx)<=1);
  const c={h,biome,river,wall:wall?1+Math.floor(K.hash(seed^914,x,z)*2):0};
  if(biomes&&!river&&!bank&&Math.hypot(x,z)>12){
   const heat=noise(seed^982731,x,z,96),wet=noise(seed^61571,x,z,64);
   if(heat<.36){c.biome='snow';c.surface=31;}
   else if(heat>.64&&wet<.62){c.biome='desert';c.surface=29;c.wall=0;if(K.hash(seed^814,x,z)>.982){c.cactus=2+Math.floor(K.hash(seed^317,x,z)*2);c.top=c.h+c.cactus;}}
   else if(wet>.65){c.biome='swamp';c.surface=32;c.h=Math.min(c.h,53);c.wall=0;if(wet>.76){c.h=51;c.waterLevel=53;c.biome='lake';}}
   if(c.biome==='snow')c.wall=0;
  }
  if(!details)return c;
  const v=village(seed,Math.floor(x/48),Math.floor(z/48));
  if(v){
   const dx=x-v.x,dz=z-v.z;
   if(Math.abs(dx)<=13&&Math.abs(dz)<=10){
    // Two compact houses face a central stone road, with deterministic garden plots.
    c.h=v.h;c.river=false;c.wall=0;c.site=true;c.biome='village';delete c.waterLevel;delete c.cactus;delete c.top;delete c.surface;
    if(Math.abs(dz)<=1||Math.abs(dx)<=1)c.surface=3;
    for(const offset of [-7,7]){
     const a=dx-offset,b=dz-5;
     if(Math.abs(a)<=3&&Math.abs(b)<=3){
      c.surface=3;c.house={a,b};c.top=c.h+6;
     }
    }
   }else if(Math.abs(dx)<=16&&Math.abs(dz)<=13){
    const blend=Math.max(Math.max(Math.abs(dx)-13,Math.abs(dz)-10),0)/3;
    c.h=Math.round(v.h+(h-v.h)*Math.min(1,blend));
   }
  }
  const crossing=Math.round(z/48)*48;
  if(Math.abs(crossing)>12&&Math.abs(z-crossing)<=1){
   const dx=Math.abs(x-riverCenter(seed,crossing));
   if(dx<=7){c.bridge=true;c.site=true;c.top=Math.max(c.h,55);c.wall=0;if(c.h>54)c.h=54;}
  }
  return c;
 }
 function block(seed,x,y,z,c,tools,advanced){
  const h=c.h;
  if(y>h){
   if(c.bridge&&y===55)return 3;
   if(c.cactus&&y<=h+c.cactus)return 33;
   if(c.house){
    const {a,b}=c.house,dy=y-h,edge=Math.abs(a)===3||Math.abs(b)===3;
    if(dy<=3&&edge){
     if(b===-3&&a===0&&dy<=2)return 0;
     if(dy===2&&((Math.abs(a)===3&&b===0)||(b===3&&a===0)))return 0;
     return dy===1?3:6;
    }
    if(dy===4+Math.floor((3-Math.abs(a))/2))return 6;
    if(dy===4&&edge)return 6;
   }
   if(c.wall&&y<=h+c.wall)return 6;if((c.river&&y<=54)||(c.waterLevel&&y<=c.waterLevel))return 28;return 0;
  }
  if(y===h)return c.surface||(c.river||c.biome==='dry'?29:1);
  if(y>=h-3)return c.surface===29&&c.biome==='desert'?29:c.surface===32?32:2;
  // Two coherent subterranean tunnel families; retain a solid foundation and roof.
  if(y>5&&y<h-5){
   const center=31+Math.sin(z*.065+seed%11)*5+Math.sin(x*.06)*3;
   const sideways=Math.abs(Math.sin(x*.075+Math.sin(z*.04)*2+seed%13));
   if(sideways<.17&&Math.abs(y-center)<2.2)return 0;
   const shaft=Math.abs(Math.sin(z*.091+Math.sin(x*.055)*1.7));
   if(shaft<.12&&Math.abs(y-(center-8))<2)return 0;
  }
  if(tools&&y>0&&y>=h-14){const r=K.hash(seed^Math.imul(y,2654435761),x,z);if(r>.86)return 15;if(advanced&&r>.78)return 21;if(advanced&&r>.70)return 20;}
  return 3;
 }
 return {column,block};
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelLandscapeFactory=gameForgeVoxelLandscapeFactory;
if(typeof module!=='undefined')module.exports=gameForgeVoxelLandscapeFactory;
