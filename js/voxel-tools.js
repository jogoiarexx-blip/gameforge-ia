/* GF-VOXEL-07: single durable tool per tier, independent of legacy stacks. */
function gameForgeVoxelToolsFactory(E,advanced){
 'use strict';
 const TIERS=[13,7,14,...(advanced?[17,18,19]:[])],DEFS={
  13:{name:'Picareta de madeira',max:24,delay:.70,damage:1,repair:8},
  7:{name:'Picareta de pedra',max:64,delay:.38,damage:2,repair:3},
  14:{name:'Picareta de ferro',max:160,delay:.18,damage:3,repair:16},
  17:{name:'Machado de cobre',max:80,delay:.35,damage:2,repair:22},
  18:{name:'Pá de cobre',max:80,delay:.22,damage:1,repair:22},
  19:{name:'Espada de ferro',max:160,delay:.8,damage:4,repair:16}
 };
 const initial=()=>({version:1,active:0,wear:{}});
 const isTool=id=>TIERS.includes(id);
 const valid=(s,bag)=>!!s&&s.version===1&&[0,...TIERS].includes(s.active)&&s.wear&&typeof s.wear==='object'&&!Array.isArray(s.wear)&&
  Object.keys(s.wear).every(k=>TIERS.includes(Number(k))&&String(Number(k))===k)&&
  TIERS.every(id=>{const n=E.count(bag,id),v=s.wear[id];return n===0?v===undefined:n===1&&Number.isInteger(v)&&v>0&&v<=DEFS[id].max;})&&
  (!s.active||E.count(bag,s.active)===1);
 function equip(s,bag){
  const available=[0,...TIERS.filter(id=>E.count(bag,id)===1&&s.wear[id]>0)];
  s.active=available[(available.indexOf(s.active)+1)%available.length];return s.active;
 }
 function craft(s,bag,index,station,world,player){
  const recipe=E.RECIPES[index],id=recipe?.output.id;
  if(isTool(id)&&E.count(bag,id)>0)return {ok:false,reason:'owned'};
  const r=E.craft(bag,index,station,world,player);
  if(r.ok&&isTool(id))s.wear[id]=DEFS[id].max;
  return r;
 }
 function canMine(s,id){
  if(id===3||id===20)return [13,7,14].includes(s.active);
  if(id===15||id===21)return s.active===7||s.active===14;
  return true;
 }
 function wear(s,bag){
  const id=s.active;if(!id||!s.wear[id])return {bag,broken:false};
  if(s.wear[id]>1){s.wear[id]--;return {bag,broken:false};}
  const next=E.change(bag,id,-1);if(!next)return {bag,broken:false};
  delete s.wear[id];s.active=0;return {bag:next,broken:true};
 }
 function repair(s,bag,world,player){
  const id=s.active,d=DEFS[id];if(!d||s.wear[id]===d.max||!E.near(world,player,4))return null;
  const next=E.change(bag,d.repair,-1);if(!next)return null;
  s.wear[id]=d.max;return next;
 }
 return {initial,valid,isTool,equip,craft,canMine,wear,repair,TIERS,DEFS};
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelToolsFactory=gameForgeVoxelToolsFactory;
if(typeof module!=='undefined')module.exports=gameForgeVoxelToolsFactory;
