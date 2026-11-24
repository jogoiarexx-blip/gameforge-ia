/* GF-VOXEL-15: bounded water/light and independent regional persistence. */
function gameForgeVoxelStreamingFactory(){
 'use strict';
 const SIZE=128,HEIGHT=160,D=[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0],[0,-1,0]],key=(...p)=>p.join(','),region=(x,z)=>key(Math.floor(x/SIZE),Math.floor(z/SIZE));
 const valid=(x,y,z)=>[x,y,z].every(Number.isSafeInteger)&&Math.abs(x)<2**40&&Math.abs(z)<2**40&&y>=0&&y<HEIGHT;
 const add=(p,d)=>p.map((n,i)=>n+d[i]);
 function propagate({sources,blocked,active=()=>true,budget,flow}){
  if(!Number.isInteger(budget)||budget<1||budget>65536)throw Error('Orçamento inválido');
  const cells=new Map(),queue=[];let cursor=0,truncated=false;
  function offer(p,level,falling=false){
   if(!valid(...p)||!active(...p)||blocked(...p)||level<1)return;
   const k=key(...p);if((cells.get(k)?.level||0)>=level)return;
   if(!cells.has(k)&&cells.size>=budget){truncated=true;return;}
   const v={p,level,falling};cells.set(k,v);queue.push(v);
  }
  for(const s of sources){if(!Array.isArray(s)||s.length!==4||!Number.isInteger(s[3])||s[3]<1||s[3]>15||!valid(...s.slice(0,3)))throw Error('Fonte inválida');offer(s.slice(0,3),s[3]);}
  while(cursor<queue.length){
   const v=queue[cursor++],{p,level}=v;if(cells.get(key(...p))!==v)continue;
   if(flow){const below=add(p,D[5]);if(valid(...below)&&!blocked(...below)){offer(below,level,true);continue;}}
   if(level>1)for(const d of (flow?D.slice(0,4):D))offer(add(p,d),level-1);
  }
  return {cells,truncated,at:(...p)=>cells.get(key(...p))?.level||0};
 }
 function water({sources,solid,active,budget=8192,spread=7}){if(!Number.isInteger(spread)||spread<0||spread>14)throw Error('Alcance inválido');return propagate({sources:sources.map(p=>{if(!Array.isArray(p)||p.length!==3)throw Error('Fonte inválida');return [...p,spread+1];}),blocked:solid,active,budget,flow:true});}
 function light({sources,opaque,active,budget=16384}){return propagate({sources,blocked:opaque,active,budget,flow:false});}
 function ambient(a,b,c){return a&&b?.4:1-.18*(Number(!!a)+Number(!!b)+Number(!!c));}
 function indexedDBAdapter(api,world){
  if(!api||typeof world!=='string'||!world)throw Error('Armazenamento inválido');
  let opening;
  function open(){if(!opening)opening=new Promise((resolve,reject)=>{
   const q=api.open('gameforge-voxel-stream-v1',1);
   q.onupgradeneeded=()=>q.result.createObjectStore('regions',{keyPath:['world','id']});
   q.onsuccess=()=>{q.result.onversionchange=()=>{q.result.close();opening=null;};resolve(q.result);};
   q.onerror=()=>reject(q.error);q.onblocked=()=>reject(Error('IndexedDB bloqueado'));
  }).catch(e=>{opening=null;throw e;});return opening;}
  async function run(mode,operation){const db=await open();return new Promise((resolve,reject)=>{
   const tx=db.transaction('regions',mode),q=operation(tx.objectStore('regions'));tx.oncomplete=()=>resolve(q.result);tx.onabort=tx.onerror=()=>reject(tx.error||Error('Transação abortada'));
  });}
  return {async read(k){return (await run('readonly',s=>s.get([world,k])))?.data??null;},async write(k,data){await run('readwrite',s=>s.put({world,id:k,data}));}};
 }
 function streaming({base,adapter,maxResident=16,maxEdits=16384}){
  if(typeof base!=='function'||!adapter||!Number.isInteger(maxResident)||maxResident<1||!Number.isInteger(maxEdits)||maxEdits<1)throw Error('Streaming inválido');
  const regions=new Map();let tail=Promise.resolve();
  function serial(fn){const task=tail.then(fn);tail=task.catch(()=>{});return task;}
  function validate(k,record){
   if(record==null)return new Map();
   if(record.version!==1||record.id!==k||!Array.isArray(record.edits)||record.edits.length>maxEdits)throw Error('Região corrompida');
   const m=new Map();for(const e of record.edits){
    if(!Array.isArray(e)||e.length!==4||!valid(...e.slice(0,3))||region(e[0],e[2])!==k||!Number.isInteger(e[3])||e[3]<0||e[3]>255||m.has(key(...e.slice(0,3))))throw Error('Edição inválida');
    m.set(key(...e.slice(0,3)),e.slice());
   }return m;
  }
  async function save(k,r){if(r.dirty){await adapter.write(k,{version:1,id:k,edits:[...r.edits.values()].map(e=>e.slice())});r.dirty=false;}}
  async function ensure(k){
   if(regions.has(k)){const r=regions.get(k);regions.delete(k);regions.set(k,r);return r;}
   if(regions.size>=maxResident){const [old,r]=regions.entries().next().value;await save(old,r);regions.delete(old);}
   const r={edits:validate(k,await adapter.read(k)),dirty:false};regions.set(k,r);return r;
  }
  function check(x,y,z){if(!valid(x,y,z))throw Error('Coordenada inválida');}
  return {
   load(x,z){check(x,0,z);return serial(async()=>{await ensure(region(x,z));return region(x,z);});},
   get(x,y,z){check(x,y,z);const r=regions.get(region(x,z));if(!r)throw Error('Região não carregada');return r.edits.get(key(x,y,z))?.[3]??base(x,y,z);},
   edit(x,y,z,b){check(x,y,z);if(!Number.isInteger(b)||b<0||b>255)throw Error('Bloco inválido');return serial(async()=>{
    const r=await ensure(region(x,z)),k=key(x,y,z);if(b===base(x,y,z)){if(r.edits.delete(k))r.dirty=true;return;}
    if(!r.edits.has(k)&&r.edits.size>=maxEdits)throw Error('Limite de edições da região');r.edits.set(k,[x,y,z,b]);r.dirty=true;
   });},
   unload(x,z){check(x,0,z);return serial(async()=>{const k=region(x,z),r=regions.get(k);if(r){await save(k,r);regions.delete(k);}});},
   flush(){return serial(async()=>{for(const [k,r] of regions)await save(k,r);});},
   stats:()=>({resident:regions.size,maxResident,dirty:[...regions.values()].filter(r=>r.dirty).length,regions:[...regions.keys()]})
  };
 }
 return {SIZE,HEIGHT,region,water,light,ambient,streaming,indexedDBAdapter};
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelStreamingFactory=gameForgeVoxelStreamingFactory;
if(typeof module!=='undefined')module.exports=gameForgeVoxelStreamingFactory;
