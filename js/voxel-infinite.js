/* GF-VOXEL-18: experimental expanding terrain and independent regional window. */
function gameForgeVoxelInfiniteFactory(K,L,F){
 'use strict';
 const BOUND=2**20,S=16,H=160,R=128;
 const inside=(x,y,z)=>[x,y,z].every(Number.isSafeInteger)&&x>=-BOUND&&x<BOUND&&z>=-BOUND&&z<BOUND&&y>=0&&y<H;
 function create({seed,adapter,maxResident=16,forest=true,details=true,biomes=true}){
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647||!Number.isInteger(maxResident)||maxResident<9)throw Error('Configuração inválida');
  const land=L(K),cols=new Map(),LIMIT=4096;
  function column(x,z){const key=K.key(x,z);if(cols.has(key)){const c=cols.get(key);cols.delete(key);cols.set(key,c);return c;}const c=land.column(seed,x,z,details,biomes);cols.set(key,c);if(cols.size>LIMIT)cols.delete(cols.keys().next().value);return c;}
  function base(x,y,z){
   if(y<0)return 3;if(!inside(x,y,z))return 0;
   const c=column(x,z),id=land.block(seed,x,y,z,c,true,true);
   if(id||!forest||y<48||y>125)return id;
   // Grid roots are separated by 8 cells; foliage can cross chunk boundaries.
   const tx=Math.floor((x+4)/8)*8,tz=Math.floor((z+4)/8)*8,dx=x-tx,dz=z-tz;
   if(Math.abs(dx)>2||Math.abs(dz)>2||!inside(tx,1,tz)||K.hash(seed^913,tx,tz)<.58)return 0;
   const t=column(tx,tz);if(t.site||t.wall||t.river||t.waterLevel||t.cactus||!['forest','mountain','snow','swamp'].includes(t.biome))return 0;
   const tall=t.biome==='snow'?5:3,dy=y-t.h;
   if(dx===0&&dz===0&&dy>=1&&dy<=tall)return 8;
   if(dy===tall+1&&Math.abs(dx)<=1&&Math.abs(dz)<=1)return 9;
   if(dy===tall&&Math.abs(dx)<=2&&Math.abs(dz)<=2&&Math.abs(dx)+Math.abs(dz)<=3)return 9;
   return 0;
  }
  const store=F.streaming({base,adapter,maxResident}),ready=new Set();let busy=0,tail=Promise.resolve(),windowTag='',lastError='';
  function serial(fn){busy++;const p=tail.then(fn);tail=p.catch(()=>{});return p.finally(()=>busy--);}
  function validPosition(x,z){return Number.isFinite(x)&&Number.isFinite(z)&&Math.floor(x)>=-BOUND&&Math.floor(x)<BOUND&&Math.floor(z)>=-BOUND&&Math.floor(z)<BOUND;}
  function windowFor(x,z,radius=4){if(!validPosition(x,z)||!Number.isInteger(radius)||radius<1||radius>4)throw Error('Janela inválida');
   const {cx,cz}=K.chunkOf(x,z),pad=8,loX=Math.max(-BOUND,cx*S-radius*S-pad),hiX=Math.min(BOUND-1,(cx+radius+1)*S+pad-1),loZ=Math.max(-BOUND,cz*S-radius*S-pad),hiZ=Math.min(BOUND-1,(cz+radius+1)*S+pad-1),list=[];
   for(let rx=Math.floor(loX/R);rx<=Math.floor(hiX/R);rx++)for(let rz=Math.floor(loZ/R);rz<=Math.floor(hiZ/R);rz++)list.push({rx,rz,id:K.key(rx,rz),d:(rx*R+R/2-x)**2+(rz*R+R/2-z)**2});
   return list.sort((a,b)=>a.d-b.d||a.rx-b.rx||a.rz-b.rz);
  }
  function prepare(x,z,radius=4){const list=windowFor(x,z,radius),tag=list.map(v=>v.id).sort().join(';');return serial(async()=>{
   if(tag===windowTag&&list.every(v=>ready.has(v.id)))return stats();
   windowTag='';const wanted=new Set(list.map(v=>v.id));
   try{
    // Save before dropping distant records; do not publish readiness until all requested records load.
    for(const k of [...ready])if(!wanted.has(k)){const [rx,rz]=k.split(',').map(Number);await store.unload(rx*R,rz*R);ready.delete(k);}
    for(const v of list){await store.load(v.rx*R,v.rz*R);ready.add(v.id);}
    windowTag=tag;lastError='';return stats();
   }catch(e){lastError=String(e.message||e);throw e;}
  });}
  function canEnter(x,z,radius=1){if(busy||!validPosition(x,z)||!windowTag)return false;return windowFor(x,z,radius).every(v=>ready.has(v.id));}
  function get(x,y,z){if(y<0)return 3;if(!inside(x,y,z))return 0;if(busy||!ready.has(F.region(x,z)))throw Error('Região não disponível');return store.get(x,y,z);}
  function edit(x,y,z,id){if(!inside(x,y,z)||y===0||!Number.isInteger(id)||![0,1,2,3,4,5,6,8,9,12,15,20,21,28,29,30,31,32,33].includes(id))throw Error('Edição inválida');
   return serial(async()=>{if(!ready.has(F.region(x,z)))throw Error('Região não disponível');await store.edit(x,y,z,id);const p=K.localBlock(x,y,z),dirty=[];for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)dirty.push(K.key(p.cx+dx,p.cz+dz));return dirty;});
  }
  function snapshot(cx,cz,pad=1){if(!Number.isSafeInteger(cx)||!Number.isSafeInteger(cz)||![1,8].includes(pad)||!canEnter(cx*S+8,cz*S+8))throw Error('Chunk não disponível');
   const P=S+2*pad,a=new Uint8Array(P*P*H);for(let z=-pad;z<S+pad;z++)for(let x=-pad;x<S+pad;x++)for(let y=0;y<H;y++)a[(y*P+z+pad)*P+x+pad]=get(cx*S+x,y,cz*S+z);return a;
  }
  function stats(){return {...store.stats(),ready:ready.size,columns:cols.size,columnLimit:LIMIT,busy:busy>0,error:lastError,bound:BOUND};}
  return {prepare,canEnter,get,edit,snapshot,base,stats,flush:()=>serial(()=>store.flush()),windowFor};
 }
 // Validate legacy creative block edits before any IO. No implicit migration of resource/actor saves.
 function legacyPlan(record){
  if(!record||record.version!==1||record.mode==='resources'||record.trees||record.storage||record.survival||record.tools||record.advanced||!Number.isSafeInteger(record.seed)||!Array.isArray(record.edits)||record.edits.length>16384)throw Error('Save legado incompatível');
  const parts=new Map(),seen=new Set();
  for(const e of record.edits){if(!Array.isArray(e)||e.length!==4||!inside(...e.slice(0,3))||e[1]===0||![0,1,2,3,4,5,6,8,12,15,20,21,29,30,31,32,33].includes(e[3]))throw Error('Edição legada inválida');const k=e.slice(0,3).join(',');if(seen.has(k))throw Error('Edição duplicada');seen.add(k);const id=F.region(e[0],e[2]);if(!parts.has(id))parts.set(id,{version:1,id,edits:[]});parts.get(id).edits.push(e.slice());}
  return {seed:record.seed,parts:[...parts.values()],edits:seen.size};
 }
 return {create,legacyPlan,BOUND};
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelInfiniteFactory=gameForgeVoxelInfiniteFactory;
if(typeof module!=='undefined')module.exports=gameForgeVoxelInfiniteFactory;
