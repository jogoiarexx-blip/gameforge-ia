/* Auditoria glTF 2.0 local (nao renderiza, nao executa scripts, nao envia o asset). */
(function(root){
 'use strict';
 function inspect(data){
   if(!data||data.asset?.version!=='2.0')throw Error('Arquivo não é glTF 2.0 válido.');
   const a=x=>Array.isArray(data[x])?data[x]:[];
   const nodes=a('nodes'),skins=a('skins'),meshes=a('meshes'),animations=a('animations'),materials=a('materials');
   const bones=new Set(skins.flatMap(s=>Array.isArray(s.joints)?s.joints:[]));
   const warnings=[];
   if(!meshes.length)warnings.push('Nenhuma malha foi encontrada.');
   if(!skins.length)warnings.push('Sem esqueleto/skin exportado: animação esquelética indisponível.');
   if(!animations.length)warnings.push('Sem clipes de animação (pode ser um modelo estático).');
   if(!materials.length)warnings.push('Sem materiais exportados.');
   for(const [i,anim] of animations.entries()){
     if(!anim.channels?.length)warnings.push('Clipe '+(anim.name||i)+' sem canais.');
     for(const chan of anim.channels||[]){
       const n=chan.target?.node;if(Number.isInteger(n)&&(n<0||n>=nodes.length))warnings.push('Clipe aponta para osso/nó inexistente.');
     }
   }
   const clipNames=animations.map((a,i)=>a.name||'Animação '+(i+1));
   const nameSet=new Set(clipNames.map(n=>n.toLowerCase()));
   for(const type of ['idle','walk','run','attack'])if(animations.length&&![...nameSet].some(n=>n.includes(type)))warnings.push('Não encontrado clipe identificado como '+type+'.');
   if(nodes.some(n=>Array.isArray(n.scale)&&n.scale.some(x=>Math.abs(x)<.0001)))warnings.push('Há nó com escala zero/quase zero.');
   return {meshes:meshes.length,skins:skins.length,bones:bones.size,materials:materials.length,animations:clipNames,warnings,
     limitations:'Metadados não revelam se o personagem está andando de ré, em T-pose, deformado ou fora de escala visual.'};
 }
 function readGlb(bytes){
   const view=new DataView(bytes),total=bytes.byteLength;
   if(total<20||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==total)throw Error('Cabeçalho GLB 2.0 inválido.');
   const length=view.getUint32(12,true),type=view.getUint32(16,true);
   if(type!==0x4e4f534a||length>total-20||length>12_000_000)throw Error('Bloco JSON do GLB inválido.');
   const text=new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(bytes,20,length)).replace(/\0+$/,'').trim();
   return JSON.parse(text);
 }
 async function readFile(file){
   if(file.size>35_000_000)throw Error('Modelo maior que 35 MB.');
   const ext=file.name.split('.').pop().toLowerCase();
   if(ext==='glb')return inspect(readGlb(await file.arrayBuffer()));
   if(ext==='gltf')return inspect(JSON.parse(await file.text()));
   throw Error('Use arquivos GLB ou GLTF.');
 }
 root.GameForgeModelInspector={readGlb,inspect,readFile};
 if(typeof module!=='undefined')module.exports=root.GameForgeModelInspector;
})(typeof globalThis!=='undefined'?globalThis:this);
