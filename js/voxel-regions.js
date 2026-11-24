/* GF-VOXEL-13: regional, atomic IndexedDB checkpoints plus emergency snapshot. */
function gameForgeVoxelRegionFactory(){
 'use strict';
 const SIZE=128,DB='gameforge-voxel-regions-v1',STORE='records',LIMIT=32768;
 const region=(x,z)=>Math.floor(x/SIZE)+','+Math.floor(z/SIZE);
 function split(record){
  if(!record||!Array.isArray(record.edits)||record.edits.length>16384||!Number.isSafeInteger(record.regionRevision)||record.regionRevision<0)throw Error('Registro regional inválido');
  const {edits,trees,...meta}=record,parts=new Map();
  function part(x,z){const k=region(x,z);if(!parts.has(k))parts.set(k,{id:k,edits:[],trees:[]});return parts.get(k);}
  for(const e of edits){if(!Array.isArray(e)||e.length!==4||!e.every(Number.isSafeInteger))throw Error('Edição inválida');part(e[0],e[2]).edits.push(e);}
  if(trees!==undefined){if(!Array.isArray(trees)||trees.length>4096)throw Error('Floresta inválida');for(const t of trees){if(!t||!Number.isSafeInteger(t.x)||!Number.isSafeInteger(t.z))throw Error('Árvore inválida');part(t.x,t.z).trees.push(t);}}
  return {manifest:{...meta,hasTrees:trees!==undefined,regions:[...parts.keys()].sort()},parts:[...parts.values()]};
 }
 function join(manifest,parts){
  if(!manifest||!Array.isArray(manifest.regions)||manifest.regions.length>LIMIT||new Set(manifest.regions).size!==manifest.regions.length||!Array.isArray(parts)||parts.length!==manifest.regions.length)throw Error('Manifesto regional incompleto');
  const {regions,hasTrees,...record}=manifest,byId=new Map(parts.map(p=>[p.id,p]));record.edits=[];if(hasTrees)record.trees=[];
  for(const id of regions){const p=byId.get(id);if(!p||!Array.isArray(p.edits)||!Array.isArray(p.trees)||(!hasTrees&&p.trees.length))throw Error('Região ausente');
   for(const e of p.edits){if(!Array.isArray(e)||e.length!==4||!e.every(Number.isSafeInteger)||region(e[0],e[2])!==id)throw Error('Edição fora de região');record.edits.push(e);}
   for(const t of p.trees){if(!t||region(t.x,t.z)!==id)throw Error('Árvore fora de região');record.trees.push(t);}
  }
  if(record.edits.length>16384||(record.trees?.length||0)>4096)throw Error('Limite regional excedido');
  return record;
 }
 function create(world,api){
  let dbPromise=null,pending=null,running=false,lastError='',committed=0,regionCount=0,waiters=[];
  function open(){
   if(dbPromise)return dbPromise;
   dbPromise=new Promise((resolve,reject)=>{
    if(!api)return reject(Error('IndexedDB indisponível'));
    const q=api.open(DB,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))q.result.createObjectStore(STORE,{keyPath:['world','id']});};
    q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);q.onblocked=()=>reject(Error('IndexedDB bloqueado'));
   });return dbPromise;
  }
  async function read(){
   const db=await open();return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE),q=store.get([world,'@manifest']);let result=null;
    q.onsuccess=()=>{const row=q.result;if(!row)return;const m=row.data;if(!Array.isArray(m?.regions)||m.regions.length>LIMIT){tx.abort();return;}
     const parts=[];if(!m.regions.length){try{result=join(m,parts);}catch{tx.abort();}return;}
     for(const id of m.regions){const r=store.get([world,id]);r.onsuccess=()=>{parts.push(r.result?.data);if(parts.length===m.regions.length){try{result=join(m,parts);}catch{tx.abort();}}};}
    };
    tx.oncomplete=()=>{if(result){committed=result.regionRevision;regionCount=q.result.data.regions.length;}resolve(result);};tx.onabort=tx.onerror=()=>reject(tx.error||Error('Checkpoint regional inválido'));
   });
  }
  async function write(record){
   const {manifest,parts}=split(record),db=await open();
   return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),q=store.get([world,'@manifest']);let applied=false;
    q.onsuccess=()=>{const old=q.result?.data;
     if(old&&old.regionRevision>=manifest.regionRevision)return;
     const keep=new Set(manifest.regions);for(const id of old?.regions||[])if(!keep.has(id))store.delete([world,id]);
     for(const part of parts)store.put({world,id:part.id,data:part});
     store.put({world,id:'@manifest',data:manifest});applied=true;
    };
    tx.oncomplete=()=>{if(applied){committed=manifest.regionRevision;regionCount=parts.length;}resolve(applied);};tx.onabort=tx.onerror=()=>reject(tx.error||Error('Falha no checkpoint'));
   });
  }
  async function drain(){
   if(running)return;running=true;
   while(pending){const record=pending;pending=null;try{await write(record);lastError='';}catch(e){lastError=String(e.message||e);}}
   running=false;for(const resolve of waiters.splice(0))resolve(!lastError);
  }
  function enqueue(record){if(!pending||record.regionRevision>pending.regionRevision)pending=JSON.parse(JSON.stringify(record));void drain();}
  function flush(){return running||pending?new Promise(resolve=>waiters.push(resolve)):Promise.resolve(!lastError);}
  return {read,enqueue,flush,status:()=>({running,pending:!!pending,committed,regions:regionCount,error:lastError})};
 }
 return {SIZE,region,split,join,create};
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelRegionFactory=gameForgeVoxelRegionFactory;
if(typeof module!=='undefined')module.exports=gameForgeVoxelRegionFactory;
