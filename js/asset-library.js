/* GameForge Asset Library: metadados pequenos + blobs no IndexedDB.
   Arquivos binarios nao entram em localStorage nem no backup JSON. */
(function(root){
 'use strict';
 const MAX_ASSETS=4, MAX_BYTES=25*1024*1024, MAX_TOTAL=50*1024*1024;
 const ID=/^[a-z0-9][a-z0-9_-]{7,63}$/i;
 const PROJECT=/^[a-z0-9][a-z0-9_-]{7,99}$/i;
 const validNumber=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
 function parse(source){
   if(source===undefined||source===null||source==='')return {version:1,assets:[]};
   let doc;
   try{doc=typeof source==='string'?JSON.parse(source):source;}catch{throw Error('Manifesto de assets nao e JSON valido.');}
   if(!doc||doc.version!==1||!Array.isArray(doc.assets)||doc.assets.length>MAX_ASSETS)throw Error('Manifesto de assets invalido ou lotado.');
   const seen=new Set();let total=0;
   const assets=doc.assets.map(item=>{
     if(!item||typeof item!=='object'||!ID.test(item.id)||seen.has(item.id))throw Error('ID de asset invalido ou repetido.');
     seen.add(item.id);
     if(typeof item.name!=='string'||!item.name.toLowerCase().endsWith('.glb')||item.name.length>140||/[\\/\x00-\x1f]/.test(item.name))throw Error('Nome GLB invalido.');
     if(!Number.isSafeInteger(item.bytes)||item.bytes<20||item.bytes>MAX_BYTES)throw Error('Tamanho GLB fora do limite de 25 MB.');
     if(!['scene','player','enemy'].includes(item.role))throw Error('Papel de asset invalido: escolha cenario, jogador ou inimigo.');
     const p=item.placement;
     if(!p||!validNumber(p.x,-35,35)||!validNumber(p.z,-35,35)||!validNumber(p.scale,.2,4))throw Error('Posicao do asset invalida.');
     // Manifestos antigos sem hash continuam válidos; novos GLBs têm integridade SHA-256.
     if(item.sha256!==undefined && (typeof item.sha256!=='string'||!/^[a-f0-9]{64}$/i.test(item.sha256)))
       throw Error('Checksum SHA-256 de asset inválido.');
     total+=item.bytes;
     return {id:item.id,name:item.name,bytes:item.bytes,role:item.role,
       ...(item.sha256?{sha256:item.sha256.toLowerCase()}:{}),
       placement:{x:p.x,z:p.z,scale:p.scale}};
   });
   if(total>MAX_TOTAL)throw Error('Biblioteca excede 50 MB.');
   return {version:1,assets};
 }
 function append(source,entry){
   const list=parse(source),one=parse({version:1,assets:[entry]}).assets[0];
   if(list.assets.length>=MAX_ASSETS)throw Error('Limite de '+MAX_ASSETS+' assets por projeto.');
   return parse({version:1,assets:[...list.assets,one]});
 }
 function update(source,id,patch){
   const list=parse(source),idx=list.assets.findIndex(a=>a.id===id);
   if(idx<0)throw Error('Asset nao encontrado.');
   const old=list.assets[idx];
   list.assets[idx]={...old,role:patch.role||old.role,placement:{...old.placement,...patch}};
   return parse(list);
 }
 function remove(source,id){
   const list=parse(source);
   return parse({version:1,assets:list.assets.filter(a=>a.id!==id)});
 }
 function newId(){
   if(root.crypto?.randomUUID)return 'gf'+root.crypto.randomUUID().replace(/-/g,'');
   const a=new Uint8Array(16);
   if(!root.crypto?.getRandomValues)throw Error('Criptografia segura indisponivel para criar identificadores.');
   root.crypto.getRandomValues(a);
   return 'gf'+Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');
 }
 function validateGLB(bytes){
   if(!(bytes instanceof Uint8Array)||bytes.length<20||bytes.length>MAX_BYTES)throw Error('GLB deve ter ate 25 MB.');
   const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
   if(d.getUint32(0,true)!==0x46546c67||d.getUint32(4,true)!==2||d.getUint32(8,true)!==bytes.length)throw Error('Arquivo GLB 2.0 invalido.');
   return bytes;
 }
 async function sha256(bytes){
   validateGLB(bytes);
   if(!root.crypto?.subtle?.digest)throw Error('SHA-256 indisponível. Para importar GLB, abra o GameForge por HTTPS ou localhost.');
   const digest=await root.crypto.subtle.digest('SHA-256',bytes);
   return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 }
 async function verify(bytes,expectedSha){
   validateGLB(bytes);
   if(expectedSha!==undefined && expectedSha!==null && expectedSha!==''){
     if(typeof expectedSha!=='string'||!/^[a-f0-9]{64}$/i.test(expectedSha))
       throw Error('Checksum de GLB inválido.');
     if(await sha256(bytes)!==expectedSha.toLowerCase())throw Error('Integridade do GLB comprometida: SHA-256 diferente do manifesto.');
   }
   return bytes;
 }
 function openDB(){
   if(!root.indexedDB)throw Error('IndexedDB indisponivel. Use navegador atualizado e armazenamento habilitado.');
   return new Promise((resolve,reject)=>{
     const request=root.indexedDB.open('gameforge-asset-library',1);
     request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('glb'))request.result.createObjectStore('glb');};
     request.onerror=()=>reject(request.error||Error('IndexedDB nao iniciou.'));
     request.onsuccess=()=>resolve(request.result);
   });
 }
 async function record(project,id,mode,value){
   if(!PROJECT.test(project)||!ID.test(id))throw Error('Identificador de asset invalido.');
   const db=await openDB();
   try{
     return await new Promise((resolve,reject)=>{
       const tx=db.transaction('glb',mode==='get'?'readonly':'readwrite');
       const store=tx.objectStore('glb'),key=project+':'+id;
       const req=mode==='put'?store.put(value,key):mode==='delete'?store.delete(key):store.get(key);
       let result;
       req.onsuccess=()=>{result=req.result;};
       tx.oncomplete=()=>resolve(result);
       tx.onerror=()=>reject(tx.error||Error('Falha ao acessar arquivo GLB.'));
       tx.onabort=()=>reject(tx.error||Error('Gravacao de asset interrompida.'));
     });
   }finally{db.close();}
 }
 async function put(project,id,bytes){
   validateGLB(bytes);
   await record(project,id,'put',new Blob([bytes],{type:'model/gltf-binary'}));
 }
 async function get(project,id,expectedBytes,expectedSha){
   const blob=await record(project,id,'get');
   if(!blob)throw Error('Arquivo binario nao encontrado no navegador: '+id+'. Importe o backup ZIP completo.');
   if(blob.size!==expectedBytes)throw Error('Asset armazenado apresenta tamanho diferente do manifesto.');
   return verify(new Uint8Array(await blob.arrayBuffer()),expectedSha);
 }
 async function erase(project,id){await record(project,id,'delete');}
 async function materialize(project,source){
   const manifest=parse(source),result={};
   for(const a of manifest.assets)result['assets/'+a.id+'.glb']=await get(project,a.id,a.bytes,a.sha256);
   return result;
 }
 function base64(bytes){
   validateGLB(bytes);
   if(typeof root.btoa!=='function')throw Error('Base64 nao disponivel neste ambiente.');
   let value='';
   // 24 KiB e multiplo de tres: cada trecho pode ser concatenado sem padding intermediario.
   for(let i=0;i<bytes.length;i+=24576){
     const part=bytes.subarray(i,i+24576);let binary='';
     for(let k=0;k<part.length;k++)binary+=String.fromCharCode(part[k]);
     value+=root.btoa(binary);
   }
   return value;
 }
 root.GameForgeAssetLibrary={MAX_ASSETS,MAX_BYTES,MAX_TOTAL,parse,append,update,remove,newId,validateGLB,sha256,verify,put,get,erase,materialize,base64};
 if(typeof module!=='undefined')module.exports=root.GameForgeAssetLibrary;
})(typeof globalThis!=='undefined'?globalThis:this);
