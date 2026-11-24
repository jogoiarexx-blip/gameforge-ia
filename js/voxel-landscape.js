/* GF-VOXEL-09: deterministic landscape, coherent mountains, shallow river and cave tunnels. */
function gameForgeVoxelLandscapeFactory(K){
 'use strict';
 function noise(seed,x,z,scale){
  const ix=Math.floor(x/scale),iz=Math.floor(z/scale),a=x/scale-ix,b=z/scale-iz;
  const u=a*a*(3-2*a),v=b*b*(3-2*b);
  return (K.hash(seed,ix,iz)*(1-u)+K.hash(seed,ix+1,iz)*u)*(1-v)+(K.hash(seed,ix,iz+1)*(1-u)+K.hash(seed,ix+1,iz+1)*u)*v;
 }
 function column(seed,x,z){
  const region=noise(seed^73481,x,z,48),detail=noise(seed^1833,x,z,12);
  const channel=Math.abs(x-(Math.sin(z/28+seed%17)*15+Math.sin(z/65)*9));
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
  return {h,biome,river,wall:wall?1+Math.floor(K.hash(seed^914,x,z)*2):0};
 }
 function block(seed,x,y,z,c,tools,advanced){
  const h=c.h;
  if(y>h){if(c.wall&&y<=h+c.wall)return 6;if(c.river&&y<=54)return 28;return 0;}
  if(y===h)return c.river||c.biome==='dry'?29:1;
  if(y>=h-3)return 2;
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
