/* GF-VOXEL-02: inventory and station recipes for the optional resource mode. */
function gameForgeVoxelEconomyFactory(K){
 'use strict';
 const NAMES=['','Grama','Terra','Pedra','Bancada de pedra','Forno','Tijolo','Picareta'];
 const RECIPES=[
  {station:0,output:{id:4,qty:1},requires:[{id:3,qty:4}]},
  {station:4,output:{id:5,qty:1},requires:[{id:3,qty:5}]},
  {station:4,output:{id:7,qty:1},requires:[{id:3,qty:2}]},
  {station:5,output:{id:6,qty:2},requires:[{id:2,qty:2}]}
 ];
 const SLOTS=12,STACK=99;
 const initial=()=>[{id:2,qty:4},{id:3,qty:12},...Array(SLOTS-2).fill(null)];
 const valid=bag=>Array.isArray(bag)&&bag.length===SLOTS&&bag.every(v=>v===null||
  v&&Number.isInteger(v.id)&&v.id>=1&&v.id<=7&&Number.isInteger(v.qty)&&v.qty>=1&&v.qty<=STACK);
 const copy=bag=>bag.map(s=>s?{id:s.id,qty:s.qty}:null);
 const count=(bag,id)=>bag.reduce((n,s)=>n+(s?.id===id?s.qty:0),0);
 function change(bag,id,amount){
  if(!valid(bag)||!Number.isInteger(id)||id<1||id>7||!Number.isInteger(amount)||!amount||Math.abs(amount)>STACK)return null;
  const next=copy(bag);let left=Math.abs(amount);
  if(amount<0){
   if(count(next,id)<left)return null;
   for(let i=0;i<next.length&&left;i++)if(next[i]?.id===id){
    const n=Math.min(next[i].qty,left);next[i].qty-=n;left-=n;if(!next[i].qty)next[i]=null;
   }
  }else{
   for(const s of next)if(s?.id===id&&left){const n=Math.min(STACK-s.qty,left);s.qty+=n;left-=n;}
   for(let i=0;i<next.length&&left;i++)if(!next[i]){const n=Math.min(STACK,left);next[i]={id,qty:n};left-=n;}
  }
  return left?null:next;
 }
 function near(world,player,id){
  if(id===0)return true;
  if(![4,5].includes(id)||!world||![player?.x,player?.y,player?.z].every(Number.isFinite))return false;
  for(let y=Math.floor(player.y)-3;y<=Math.floor(player.y)+4;y++)
   for(let z=Math.floor(player.z)-3;z<=Math.floor(player.z)+3;z++)
    for(let x=Math.floor(player.x)-3;x<=Math.floor(player.x)+3;x++){
     if((x+.5-player.x)**2+(y+.5-(player.y+.85))**2+(z+.5-player.z)**2<=9&&world.get(x,y,z)===id)return true;
    }
  return false;
 }
 function craft(bag,index,station,world,player){
  if(!valid(bag))return {ok:false,reason:'invalid'};
  return K.craft({recipes:RECIPES,recipeIndex:index,station,inventory:bag,nearStation:near(world,player,station),maxStack:STACK});
 }
 // Prepare inventory BEFORE changing the world; commit only if the world edit succeeds.
 function edit(world,player,bag,hit,action,id,equipped){
  if(!valid(bag)||!hit||!Array.isArray(hit.cell))return {ok:false,reason:'invalid'};
  if(action==='mine'&&hit.id===3&&(!equipped||count(bag,7)<1))return {ok:false,reason:'pickaxe'};
  if(action==='place'&&(!Number.isInteger(id)||id<1||id>6))return {ok:false,reason:'invalid'};
  const next=action==='mine'?change(bag,hit.id,1):action==='place'?change(bag,id,-1):null;
  if(!next)return {ok:false,reason:action==='mine'?'inventory-full':'missing-materials'};
  const dirty=action==='mine'?world.mine(hit):world.place(hit,id,player);
  return dirty?{ok:true,bag:next,dirty}:{ok:false,reason:'world-edit'};
 }
 return {NAMES,RECIPES,initial,valid,copy,count,change,near,craft,edit};
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelEconomyFactory=gameForgeVoxelEconomyFactory;
if(typeof module!=='undefined')module.exports=gameForgeVoxelEconomyFactory;
