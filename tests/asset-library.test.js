const test=require('node:test');
const assert=require('node:assert/strict');
const library=require('../js/asset-library.js');
const ZIP=require('../js/zip.js');
const Generator=require('../js/generator.js');
const Project=require('../js/project-backup.js');
require('../js/glb-runtime.js');

function makeGlbHeader(length=20){
 const b=new Uint8Array(length),d=new DataView(b.buffer);
 d.setUint32(0,0x46546c67,true);d.setUint32(4,2,true);d.setUint32(8,length,true);
 return b;
}
function asset(id,bytes=200){
 return {id,name:id+'.glb',bytes,role:'scene',placement:{x:2,z:3,scale:1}};
}
test('biblioteca valida nomes, duplicatas, limites, tamanho e posicionamento',()=>{
 const a=asset('modelo0001');
 const m=library.append(null,a);
 assert.equal(m.assets.length,1);assert.equal(library.parse(JSON.stringify(m)).assets[0].name,'modelo0001.glb');
 assert.deepEqual(library.update(m,a.id,{x:17,z:-6,scale:1.5}).assets[0].placement,{x:17,z:-6,scale:1.5});
 assert.equal(library.remove(m,a.id).assets.length,0);
 assert.throws(()=>library.parse({version:1,assets:[a,a]}),/repetido/);
 assert.throws(()=>library.append(m,{...a,id:'../escape'}));
 assert.throws(()=>library.append(m,{...a,id:'modelo0002',bytes:library.MAX_BYTES+1}),/25 MB/);
 assert.throws(()=>library.append(m,{...a,id:'modelo0002',placement:{x:999,z:0,scale:1}}),/Posicao/);
 let many=null;
 for(let i=0;i<4;i++)many=library.append(many,asset('modelo0'+(100+i)));
 assert.throws(()=>library.append(many,asset('modelo0105')),/Limite de 4/);
 const sizes=[asset('modelo1000',library.MAX_BYTES),asset('modelo1001',library.MAX_BYTES)];
 assert.equal(library.parse({version:1,assets:sizes}).assets.length,2);
 assert.throws(()=>library.parse({version:1,assets:[...sizes,asset('modelo1002',20)]}),/50 MB/);
});
test('GLB de 25MB tem cabeçalho validado, sem cortar dados na conversao base64',()=>{
 const b=makeGlbHeader(2048);
 for(let i=12;i<b.length;i++)b[i]=(i*13)%256;
 assert.equal(library.validateGLB(b).length,b.length);
 assert.deepEqual(Buffer.from(library.base64(b),'base64'),Buffer.from(b));
 const bad=new Uint8Array(20);assert.throws(()=>library.validateGLB(bad),/invalido/);
});
test('IndexedDB guarda blobs por projeto, recupera e apaga sem usar localStorage',async()=>{
 const previous=globalThis.indexedDB,records=new Map();
 globalThis.indexedDB={open(){
   const request={result:{
     objectStoreNames:{contains:()=>true},
     transaction(){
       const tx={oncomplete:null,onerror:null,onabort:null,objectStore(){
         return {put(value,key){return operation(()=>records.set(key,value));},
                 get(key){return operation(()=>records.get(key));},
                 delete(key){return operation(()=>records.delete(key));}};
         function operation(action){
           const pending={};queueMicrotask(()=>{pending.result=action();pending.onsuccess?.();tx.oncomplete?.();});
           return pending;
         }
       }};
       return tx;
     },close(){}
   }};
   queueMicrotask(()=>request.onsuccess?.());
   return request;
 }};
 try{
   const bytes=makeGlbHeader(128),project='projectABC123',id='assetABC1234';
   await library.put(project,id,bytes);
   const loaded=await library.get(project,id,bytes.length);
   assert.deepEqual(loaded,bytes);
   await library.erase(project,id);
   await assert.rejects(library.get(project,id,bytes.length),/nao encontrado/);
 }finally{globalThis.indexedDB=previous;}
});
test('ZIP preserva bytes de arquivos GLB e verifica CRC antes de restaurar',async()=>{
 const glb=makeGlbHeader(100);glb[35]=213;
 const archive=ZIP.zipFiles({'PROJETO.gameforge.json':'{"ok":true}','assets/assetABC1234.glb':glb});
 const bytes=new Uint8Array(await archive.arrayBuffer()),unpacked=ZIP.unzipFiles(bytes);
 assert.deepEqual(unpacked['assets/assetABC1234.glb'],glb);
 assert.equal(new TextDecoder().decode(unpacked['PROJETO.gameforge.json']),'{"ok":true}');
 const damaged=bytes.slice(),firstNameLength=new DataView(bytes.buffer).getUint16(26,true);damaged[30+firstNameLength]^=7;
 assert.throws(()=>ZIP.unzipFiles(damaged),/Checksum/);
 assert.throws(()=>ZIP.zipFiles({'../evil':'data'}),/inseguro/);
});
test('exportacao integra dois modelos e guarda o manifesto no backup JSON sem binarios',()=>{
 const models={version:1,assets:[asset('modelo0001',100),asset('modelo0002',120)]};
 const binary={'assets/modelo0001.glb':makeGlbHeader(100),'assets/modelo0002.glb':makeGlbHeader(120)};
 const files={...binary,'ASSET_LIBRARY.json':JSON.stringify(models)};
 const html=Generator.shell('Test','body{}','console.log(1)',true,files);
 assert.match(html,/const GF_SCENE_ASSETS=/);
 assert.ok(html.includes('modelo0001')&&html.includes('modelo0002'));
 assert.ok(!html.includes('const GF_SCENE_GLB_BASE64='));
 assert.match(html,/gameForgeDecodeGLB/);
 assert.throws(()=>Generator.shell('Test','','',true,{'ASSET_LIBRARY.json':files['ASSET_LIBRARY.json']}),/GLB binario ausente/);
 const project=Project.decode(Project.encode({name:'Test',gdd:'# Test',instruction:'',assetProjectId:'projectABC123',history:[],files:{'game.js':'abc','style.css':'body{}','ASSET_LIBRARY.json':files['ASSET_LIBRARY.json']}}));
 assert.equal(project.assetProjectId,'projectABC123');
 assert.equal(project.files['ASSET_LIBRARY.json'],files['ASSET_LIBRARY.json']);
 assert.ok(!Object.keys(project.files).some(x=>x.startsWith('assets/')));
});

test('GF-005: GLB com SHA-256 mantém integridade mesmo quando ZIP é recriado com CRC válido',async()=>{
 const crypto=require('node:crypto');
 if(!globalThis.crypto?.subtle)Object.defineProperty(globalThis,'crypto',{value:crypto.webcrypto,configurable:true});
 const original=makeGlbHeader(256);for(let i=12;i<original.length;i++)original[i]=(i*7)%256;
 const hash=await library.sha256(original);
 assert.equal(hash,crypto.createHash('sha256').update(original).digest('hex'));
 const manifest=library.append(null,{...asset('sha256asset01',original.length),sha256:hash});
 assert.equal(manifest.assets[0].sha256,hash);
 assert.deepEqual(await library.verify(original,hash.toUpperCase()),original);
 const tampered=original.slice();tampered[45]^=3;
 assert.throws(()=>library.parse({version:1,assets:[{...manifest.assets[0],sha256:'!'.repeat(64)}]}),/SHA-256/);
 await assert.rejects(library.verify(tampered,hash),/Integridade/);
 // O checksum CRC32 do ZIP protege a transferência, mas não comprova a identidade
 // do modelo esperado. O manifesto SHA-256 detecta até substituição bem-formada.
 const rebuilt=ZIP.unzipFiles(new Uint8Array(await ZIP.zipFiles({'assets/sha256asset01.glb':tampered}).arrayBuffer()));
 await assert.rejects(library.verify(rebuilt['assets/sha256asset01.glb'],hash),/Integridade/);
 const legacy=library.parse({version:1,assets:[asset('legacyasset01',128)]});
 assert.equal(legacy.assets[0].sha256,undefined,'backup legado precisa continuar válido');
});
