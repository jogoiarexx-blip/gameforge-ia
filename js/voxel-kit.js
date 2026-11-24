/* GF-TRAIN-22 — regras portáteis aprendidas com Prismal Voxel.
 * Protótipo sem dependência do browser: NÃO é ainda um motor voxel completo.
 * Contratos: chunks/seed determinísticos, invalidação de worker, crafting atômico,
 * bússola por direção e métricas de frame sem rede.
 */
(function(root){
'use strict';
const DEFAULT_CHUNK=16,DEFAULT_HEIGHT=160;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const int=n=>Number.isSafeInteger(n);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function chunkOf(x,z,size=DEFAULT_CHUNK){
 if(!finite(x)||!finite(z)||!int(size)||size<4||size>64)throw Error('Coordenada voxel inválida');
 return {cx:Math.floor(x/size),cz:Math.floor(z/size)};
}
function key(cx,cz){if(!int(cx)||!int(cz))throw Error('Chunk inválido');return cx+','+cz;}
function localBlock(x,y,z,size=DEFAULT_CHUNK,height=DEFAULT_HEIGHT){
 if(!int(x)||!int(y)||!int(z)||y<0||y>=height)throw Error('Bloco inválido');
 const {cx,cz}=chunkOf(x,z,size);
 const lx=x-cx*size,lz=z-cz*size;
 return {cx,cz,lx,lz,index:((lx*height)+y)*size+lz};
}
function hash(seed,x,z){
 let n=(Number(seed)||0)|0;
 n=Math.imul(n^(x|0),0x45d9f3b);
 n=Math.imul(n^(z|0),0x119de1f3);
 n^=n>>>16;n=Math.imul(n,0x85ebca6b);n^=n>>>13;
 return (n>>>0)/4294967296;
}
function heightAt(seed,x,z){
 if(!int(x)||!int(z))throw Error('Local do terreno inválido');
 // Amostras de coordenadas globais: fronteiras e ordem dos jobs não mudam o relevo.
 const q=16,ix=Math.floor(x/q),iz=Math.floor(z/q),dx=(x-ix*q)/q,dz=(z-iz*q)/q;
 const smooth=t=>t*t*(3-2*t),a=smooth(dx),b=smooth(dz);
 const p=(i,j)=>hash(seed,i,j);
 const left=p(ix,iz)*(1-a)+p(ix+1,iz)*a;
 const right=p(ix,iz+1)*(1-a)+p(ix+1,iz+1)*a;
 return 50+Math.floor((left*(1-b)+right*b)*18);
}
function generateChunk(seed,cx,cz,{size=DEFAULT_CHUNK,height=DEFAULT_HEIGHT}={}){
 if(!int(cx)||!int(cz)||!int(size)||size<4||size>32||
  !int(height)||height<32||height>256)throw Error('Geometria do chunk inválida');
 const voxels=new Uint8Array(size*size*height);
 for(let x=0;x<size;x++)for(let z=0;z<size;z++){
  const h=clamp(heightAt(seed,cx*size+x,cz*size+z),1,height-1);
  for(let y=0;y<=h;y++)voxels[((x*height)+y)*size+z]=
   y===h?1:y>=h-3?2:3; // 1=grama, 2=terra, 3=pedra; 0=ar.
 }
 return {seed,cx,cz,size,height,voxels,generatorVersion:1};
}
function streamRequests(player,quality='medium',mobile=false){
 const {cx,cz}=chunkOf(player?.x,player?.z);
 const desktop={low:3,medium:4,high:5},handset={low:2,medium:3,high:4};
 const radius=(mobile?handset:desktop)[quality]??(mobile?3:4);
 const wanted=[];
 for(let x=-radius;x<=radius;x++)for(let z=-radius;z<=radius;z++){
  if(x*x+z*z>(radius+.4)*(radius+.4))continue;
  wanted.push({cx:cx+x,cz:cz+z,distance2:x*x+z*z});
 }
 wanted.sort((a,b)=>a.distance2-b.distance2||a.cx-b.cx||a.cz-b.cz);
 return {center:{cx,cz},radius,wanted,unloadRadius:radius+1};
}
function batchEdits(state,ops,{size=DEFAULT_CHUNK,height=DEFAULT_HEIGHT}={}){
 // Imutável e tudo-ou-nada: um único bloco inválido aborta o lote.
 if(!Array.isArray(ops)||ops.length>300||!int(size)||size<4||size>32||
  !int(height)||height<32||height>256)throw Error('Lote voxel inválido');
 const input=ops.map(e=>{
  if(!Array.isArray(e)||e.length!==4||
    !e.every(int)||Math.abs(e[0])>100000||Math.abs(e[2])>100000||
    e[1]<1||e[1]>=height||e[3]<0||e[3]>255)throw Error('Edição voxel inválida');
  return e;
 });
 const edits=Object.assign(Object.create(null),state?.edits||{});
 const revisions=Object.assign(Object.create(null),state?.revisions||{});
 const dirty=new Set();
 for(const [x,y,z,id] of input){
  const p=localBlock(x,y,z,size,height),at=key(p.cx,p.cz);
  edits[at]=Object.assign(Object.create(null),edits[at]||{});
  edits[at][p.index]=id;
  const xs=[0],zs=[0],lx=p.lx,lz=p.lz;
  if(lx<3)xs.push(-1);if(lx>size-4)xs.push(1);
  if(lz<3)zs.push(-1);if(lz>size-4)zs.push(1);
  for(const dx of xs)for(const dz of zs)dirty.add(key(p.cx+dx,p.cz+dz));
 }
 for(const id of dirty)revisions[id]=(int(revisions[id])?revisions[id]:0)+1;
 return {edits,revisions,dirty:[...dirty].sort()};
}
function meshJobValid(job,state,{center,radius}={}){
 if(!job||!int(job.cx)||!int(job.cz)||!int(job.rev))return false;
 const k=key(job.cx,job.cz);
 if(job.rev!==(state?.revisions?.[k]||0))return false;
 if(center&&finite(radius)){
  if(Math.abs(job.cx-center.cx)>radius+1||Math.abs(job.cz-center.cz)>radius+1)return false;
 }
 return true;
}
function recipesAtStation(recipes,station){
 if(!Array.isArray(recipes))return [];
 return recipes.map((recipe,index)=>({recipe,index})).filter(({recipe})=>recipe&&recipe.station===station);
}
function validInventory(inventory,maxSlots=40){
 return Array.isArray(inventory)&&inventory.length<=maxSlots&&inventory.every(s=>s===null||
  (s&&int(s.id)&&s.id>=0&&s.id<65536&&int(s.qty)&&s.qty>0&&s.qty<=999));
}
function craft({recipes,recipeIndex,station,inventory,nearStation=true,maxStack=99}={}){
 if(!Array.isArray(recipes)||!int(recipeIndex)||recipeIndex<0||recipeIndex>=recipes.length||
  !validInventory(inventory)||!int(maxStack)||maxStack<1||maxStack>999)return {ok:false,reason:'invalid'};
 const recipe=recipes[recipeIndex];
 if(!recipe||recipe.station!==station||(!nearStation&&station!=='bag')||
   !int(recipe.output?.id)||!int(recipe.output?.qty)||recipe.output.qty<=0||
   recipe.output.qty>maxStack||!Array.isArray(recipe.requires)||!recipe.requires.length)
  return {ok:false,reason:'station-or-recipe'};
 const req=new Map();
 for(const item of recipe.requires){
  if(!int(item?.id)||item.id<0||!int(item?.qty)||item.qty<=0)return {ok:false,reason:'invalid-ingredient'};
  req.set(item.id,(req.get(item.id)||0)+item.qty);
 }
 const present=new Map();
 for(const slot of inventory)if(slot)present.set(slot.id,(present.get(slot.id)||0)+slot.qty);
 for(const [id,qty] of req)if((present.get(id)||0)<qty)return {ok:false,reason:'missing-materials'};
 const next=inventory.map(s=>s?{...s}:null);
 for(const [id,n] of req){
  let left=n;for(let i=0;i<next.length&&left;i++){
   if(next[i]?.id!==id)continue;
   const take=Math.min(next[i].qty,left);next[i].qty-=take;left-=take;
   if(!next[i].qty)next[i]=null;
  }
 }
 let output=recipe.output.qty;
 for(let i=0;i<next.length&&output;i++)if(next[i]?.id===recipe.output.id){
  const space=Math.max(0,maxStack-next[i].qty),n=Math.min(space,output);
  next[i].qty+=n;output-=n;
 }
 for(let i=0;i<next.length&&output;i++)if(next[i]===null){
  const n=Math.min(maxStack,output);next[i]={id:recipe.output.id,qty:n};output-=n;
 }
 return output?{ok:false,reason:'inventory-full'}:{ok:true,inventory:next};
}
function guide(player,target){
 if(!player||!target||![player.x,player.z,target.x,target.z].every(finite))return null;
 const yaw=finite(player.yaw)?player.yaw:0;
 const dx=target.x-player.x,dz=target.z-player.z;
 const angle=Math.atan2(Math.sin(Math.atan2(dx,-dz)-yaw),Math.cos(Math.atan2(dx,-dz)-yaw));
 const dy=(Number(target.y)||0)-(Number(player.y)||0);
 const dist=Math.hypot(dx,dz);
 const turn=Math.abs(angle)<Math.PI/9?'Em frente':Math.abs(angle)>Math.PI*5/6?'Atrás':
   angle>0?'Direita':'Esquerda';
 return {distance:Math.round(dist),angle,turn,height:dy>4?'Suba':dy< -4?'Desça':'',
   arrived:dist<=7&&Math.abs(dy)<6,kind:'straight-line-not-pathfinding'};
}
function compassMarks(yaw,view=70){
 const angle=((finite(yaw)?yaw:0)*180/Math.PI%360+360)%360,labels=['N','NE','L','SE','S','SO','O','NO'];
 const marks=[];
 for(let d=0;d<360;d+=5){
  const delta=((d-angle+540)%360)-180;
  if(Math.abs(delta)>view)continue;
  marks.push({deg:d,left:50+delta*50/view,label:d%45===0?labels[d/45]:'',major:d%45===0||d%30===0});
 }
 return marks;
}
function frameMetrics(seconds){
 const valid=(Array.isArray(seconds)?seconds:[]).filter(x=>finite(x)&&x>0&&x<=2).slice(-600);
 if(!valid.length)return {samples:0,averageFPS:0,low1FPS:0,p95Ms:0};
 const ms=valid.map(x=>x*1000).sort((a,b)=>a-b);
 const total=ms.reduce((sum,x)=>sum+x,0);
 const count=Math.max(1,Math.ceil(ms.length*.01));
 const worst=ms.slice(-count).reduce((sum,x)=>sum+x,0)/count;
 return {samples:ms.length,averageFPS:Math.round(1000*ms.length/total),
  low1FPS:Math.round(1000/worst),p95Ms:+ms[Math.ceil(ms.length*.95)-1].toFixed(1)};
}
const api={DEFAULT_CHUNK,DEFAULT_HEIGHT,chunkOf,localBlock,key,hash,heightAt,generateChunk,
 streamRequests,batchEdits,meshJobValid,recipesAtStation,craft,guide,compassMarks,frameMetrics};
root.GameForgeVoxelKit=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
