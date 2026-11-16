/* GameForge: leitor GLB 2.0 local para OBJETOS ESTÁTICOS. Sem fetch nem execução de conteúdo externo. */
(function(root){
'use strict';
function decodeGLB(T, source) {
  const bytes = typeof source==='string' ? Uint8Array.from(atob(source),c=>c.charCodeAt(0)) : source;
  if (!(bytes instanceof Uint8Array) || bytes.byteLength<20 || bytes.byteLength>25*1024*1024) throw Error('GLB ausente ou acima de 25 MB neste motor.');
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(dv.getUint32(0,true)!==0x46546c67 || dv.getUint32(4,true)!==2 || dv.getUint32(8,true)!==bytes.length) throw Error('Cabeçalho GLB inválido.');
  let offset=12, json=null, bin=null;
  while(offset+8<=bytes.length){
    const length=dv.getUint32(offset,true),type=dv.getUint32(offset+4,true);
    offset+=8;
    if(length>bytes.length-offset)throw Error('Bloco GLB fora dos limites.');
    if(type===0x4e4f534a && !json)json=JSON.parse(new TextDecoder().decode(bytes.subarray(offset,offset+length)).trim());
    if(type===0x004e4942 && !bin)bin=bytes.subarray(offset,offset+length);
    offset+=length;
  }
  if(offset!==bytes.length || json?.asset?.version!=='2.0' || !bin)throw Error('GLB 2.0 incompleto.');
  if(json.extensionsRequired?.length)throw Error('Extensões GLB obrigatórias não suportadas: '+json.extensionsRequired.join(', '));
  if((json.buffers||[]).length!==1 || json.buffers[0].uri || json.buffers[0].byteLength>bin.length)throw Error('GLB deve ter um buffer BIN incorporado.');
  const accessors=json.accessors||[],views=json.bufferViews||[],nodes=json.nodes||[],meshes=json.meshes||[],materials=json.materials||[];
  if(nodes.length>400||meshes.length>200||accessors.length>3000||views.length>3000)throw Error('Modelo excede limites estruturais.');
  const types={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
  const components={5120:[1,false],5121:[1,false],5122:[2,true],5123:[2,false],5125:[4,false],5126:[4,true]};
  function attribute(index, semantic){
    const a=accessors[index];
    if(!a||a.sparse||a.bufferView===undefined||!types[a.type]||!components[a.componentType]||!Number.isInteger(a.count)||a.count<1||a.count>400000)throw Error('Accessor GLB inválido: '+semantic);
    const v=views[a.bufferView],c=types[a.type],width=components[a.componentType][0],stride=v?.byteStride||c*width;
    const start=(v?.byteOffset||0)+(a.byteOffset||0);
    if(!v||v.buffer!==0||stride<c*width||start<0||!Number.isSafeInteger(start)||!Number.isSafeInteger(stride)||start+(a.count-1)*stride+c*width>(v.byteOffset||0)+v.byteLength||start+(a.count-1)*stride+c*width>bin.length)throw Error('Buffer GLB fora dos limites: '+semantic);
    // Avoid boxed arrays and repeated Float32 copies of large model attributes.
    const out=semantic==='indices'?(a.componentType===5121?new Uint8Array(a.count):a.componentType===5123?new Uint16Array(a.count):new Uint32Array(a.count)):new Float32Array(a.count*c);
    if(semantic==='indices'&&(![5121,5123,5125].includes(a.componentType)||a.normalized||c!==1))throw Error('Accessor de indices GLB invalido.');
    const d=new DataView(bin.buffer,bin.byteOffset,bin.byteLength);
    for(let i=0;i<a.count;i++)for(let k=0;k<c;k++){
      const p=start+i*stride+k*width;
      let n;
      switch(a.componentType){
        case 5120:n=d.getInt8(p);break;case 5121:n=d.getUint8(p);break;
        case 5122:n=d.getInt16(p,true);break;case 5123:n=d.getUint16(p,true);break;
        case 5125:n=d.getUint32(p,true);break;case 5126:n=d.getFloat32(p,true);break;
      }
      if(a.normalized && a.componentType!==5126){
        if(a.componentType===5120)n=Math.max(-1,n/127);
        else if(a.componentType===5121)n=n/255;
        else if(a.componentType===5122)n=Math.max(-1,n/32767);
        else if(a.componentType===5123)n=n/65535;
        else if(a.componentType===5125)n=n/4294967295;
      }
      if(!Number.isFinite(n))throw Error('Coordenada não finita: '+semantic);
      out[i*c+k]=n;
    }
    return {array:out,itemSize:c,count:a.count,type:a.componentType};
  }
  const materialCache=new Map(),textureCache=new Map();
  let textureLoader=null;
  function material(index){
    if(materialCache.has(index))return materialCache.get(index);
    if(index!==undefined&&(!Number.isInteger(index)||!materials[index]))throw Error('Material GLB inexistente.');
    const src=materials[index]||{},pbr=src.pbrMetallicRoughness||{},f=pbr.baseColorFactor||[1,1,1,1];
    const color=new T.Color().setRGB(f[0]??1,f[1]??1,f[2]??1,T.LinearSRGBColorSpace);
    const m=new T.MeshStandardMaterial({color,metalness:pbr.metallicFactor??0,roughness:pbr.roughnessFactor??1,transparent:src.alphaMode==='BLEND',opacity:f[3]??1,side:src.doubleSided?T.DoubleSide:T.FrontSide});
    const ti=pbr.baseColorTexture?.index;
    if(ti!==undefined&&!textureCache.has(ti)){
      const tex=json.textures?.[ti],img=json.images?.[tex?.source];
      if(!img)throw Error('Textura referenciada não encontrada.');
      let uri=img.uri;
      if(img.bufferView!==undefined){
        const bv=views[img.bufferView],mime=img.mimeType;
        if(!bv||bv.buffer!==0||!['image/png','image/jpeg','image/webp'].includes(mime)||bv.byteOffset+bv.byteLength>bin.length)throw Error('Imagem embutida inválida.');
        const imageBytes=bin.subarray(bv.byteOffset||0,(bv.byteOffset||0)+bv.byteLength);
        const chunks=[];
        for(let off=0;off<imageBytes.length;off+=24576){
          const segment=imageBytes.subarray(off,off+24576);
          let binary='';for(let n=0;n<segment.length;n++)binary+=String.fromCharCode(segment[n]);
          chunks.push(btoa(binary));
        }
        uri='data:'+mime+';base64,'+chunks.join('');
      }
      if(typeof uri!=='string'||!/^data:image\/(png|jpeg|webp);base64,/i.test(uri))throw Error('Textura externa não permitida no GLB offline.');
      if(typeof T.TextureLoader==='function'){
        if(!textureLoader)textureLoader=new T.TextureLoader();
        m.map=textureLoader.load(uri);
        textureCache.set(ti,m.map);
        m.map.colorSpace=T.SRGBColorSpace;
        m.map.flipY=false;
      }
    }
    if(ti!==undefined&&textureCache.has(ti))m.map=textureCache.get(ti);
    materialCache.set(index,m);
    return m;
  }
  // Reject malformed hierarchies before Three.js recursively traverses them.
  const parents=new Array(nodes.length).fill(-1),visits=new Uint8Array(nodes.length);
  for(let i=0;i<nodes.length;i++){
    const node=nodes[i];
    if(!node||typeof node!=='object'||Array.isArray(node)||(node.children!==undefined&&!Array.isArray(node.children)))throw Error('Hierarquia GLB inválida.');
    for(const child of node.children||[]){
      if(!Number.isInteger(child)||child<0||child>=nodes.length||child===i||parents[child]!==-1)throw Error('Hierarquia GLB inválida: nós ou pais repetidos.');
      parents[child]=i;
    }
    if(node.mesh!==undefined&&(!Number.isInteger(node.mesh)||node.mesh<0||node.mesh>=meshes.length))throw Error('Nó refere malha inexistente.');
    const finite=(values,length)=>Array.isArray(values)&&values.length===length&&values.every(v=>typeof v==='number'&&Number.isFinite(v));
    if(node.matrix!==undefined&&!finite(node.matrix,16))throw Error('Transformação GLB inválida: matrix.');
    for(const [key,n] of [['translation',3],['rotation',4],['scale',3]])if(node[key]!==undefined&&!finite(node[key],n))throw Error('Transformação GLB inválida: '+key);
    if(node.rotation!==undefined&&Math.hypot(...node.rotation)<1e-8)throw Error('Rotação GLB inválida.');
  }
  function checkNode(i){
    if(visits[i]===1)throw Error('Hierarquia GLB cíclica.');
    if(visits[i]===2)return;
    visits[i]=1;
    for(const id of nodes[i].children||[])checkNode(id);
    visits[i]=2;
  }
  for(let i=0;i<nodes.length;i++)checkNode(i);
  const sceneRoots=json.scenes?.[json.scene??0]?.nodes??nodes.map((_,i)=>i).filter(i=>parents[i]===-1);
  if(!Array.isArray(sceneRoots)||!sceneRoots.length||new Set(sceneRoots).size!==sceneRoots.length||sceneRoots.some(i=>!Number.isInteger(i)||i<0||i>=nodes.length||parents[i]!==-1))throw Error('Raiz de cena GLB inválida.');
  // Preflight: validates GLB without Three.js, keeping previous assets if invalid.
  if(!T){
    let primitives=0;
    for(const mesh of meshes){
      if(!mesh||!Array.isArray(mesh.primitives))throw Error('Malha GLB inválida.');
      for(const prim of mesh.primitives){
        if(!prim||(prim.mode??4)!==4||prim.attributes?.POSITION===undefined)throw Error('Malha GLB não triangular ou sem POSITION.');
        const pos=attribute(prim.attributes.POSITION,'POSITION');
        if(pos.itemSize!==3)throw Error('POSITION GLB inválida.');
        for(const [field,dim] of [['NORMAL',3],['TEXCOORD_0',2]])if(prim.attributes[field]!==undefined){
          const a=attribute(prim.attributes[field],field);
          if(a.itemSize!==dim||a.count!==pos.count)throw Error('Atributo GLB incompatível: '+field);
        }
        if(prim.indices!==undefined){
          const idx=attribute(prim.indices,'indices');
          if(![5121,5123,5125].includes(idx.type)||idx.itemSize!==1||idx.count%3!==0||idx.array.some(i=>!Number.isInteger(i)||i<0||i>=pos.count))throw Error('Índices GLB inválidos.');
        }else if(pos.count%3!==0)throw Error('Malha GLB sem triângulos completos.');
        const index=materials[prim.material]?.pbrMetallicRoughness?.baseColorTexture?.index;
        if(index!==undefined){
          const img=json.images?.[json.textures?.[index]?.source];
          if(!img)throw Error('Textura GLB inexistente.');
          if(img.bufferView!==undefined){
            const v=views[img.bufferView];
            if(!v||v.buffer!==0||!['image/png','image/jpeg','image/webp'].includes(img.mimeType)||!Number.isInteger(v.byteLength)||(v.byteOffset||0)+v.byteLength>bin.length)throw Error('Textura GLB inválida.');
          }else if(typeof img.uri!=='string'||!/^data:image\/(png|jpeg|webp);base64,/i.test(img.uri))throw Error('Textura GLB externa não suportada.');
        }
        if(++primitives>500)throw Error('GLB com malhas demais.');
      }
    }
    if(!primitives)throw Error('GLB sem malha triangular utilizável.');
    return {primitives,nodes:nodes.length};
  }
  let primitiveCount=0;
  const meshGroups=meshes.map(src=>{
    const group=new T.Group();
    for(const prim of src.primitives||[]){
      if((prim.mode??4)!==4)throw Error('Somente malhas triangulares são suportadas.');
      if(prim.attributes?.POSITION===undefined)throw Error('Malha sem POSITION.');
      const pos=attribute(prim.attributes.POSITION,'POSITION');
      if(pos.itemSize!==3)throw Error('POSITION deve ser VEC3.');
      const geo=new T.BufferGeometry();
      geo.setAttribute('position',new T.BufferAttribute(pos.array,3));
      if(prim.attributes.NORMAL!==undefined){const normals=attribute(prim.attributes.NORMAL,'NORMAL');if(normals.itemSize!==3||normals.count!==pos.count)throw Error('NORMAL incompatível.');geo.setAttribute('normal',new T.BufferAttribute(normals.array,3));}
      if(prim.attributes.TEXCOORD_0!==undefined){const uv=attribute(prim.attributes.TEXCOORD_0,'TEXCOORD_0');if(uv.itemSize!==2||uv.count!==pos.count)throw Error('UV incompatível.');geo.setAttribute('uv',new T.BufferAttribute(uv.array,2));}
      if(prim.indices!==undefined){const ind=attribute(prim.indices,'indices');if(![5121,5123,5125].includes(ind.type)||ind.itemSize!==1||ind.count%3!==0||ind.array.some(n=>!Number.isInteger(n)||n<0||n>=pos.count))throw Error('Índices de triângulos inválidos.');geo.setIndex(new T.BufferAttribute(ind.array,1));}
      if(!geo.getAttribute('normal'))geo.computeVertexNormals();
      const obj=new T.Mesh(geo,material(prim.material));obj.castShadow=true;obj.receiveShadow=true;group.add(obj);primitiveCount++;
      if(primitiveCount>500)throw Error('GLB com malhas demais.');
    }
    return group;
  });
  if(!primitiveCount)throw Error('GLB sem malha triangular utilizável.');
  const built=nodes.map(n=>{
    const o=n.mesh===undefined?new T.Group():meshGroups[n.mesh]?.clone(true);
    if(!o)throw Error('Nó refere malha inexistente.');
    if(n.matrix){if(!Array.isArray(n.matrix)||n.matrix.length!==16)throw Error('Matriz GLB inválida.');new T.Matrix4().fromArray(n.matrix).decompose(o.position,o.quaternion,o.scale);}
    else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);}
    return o;
  });
  for(let i=0;i<nodes.length;i++)for(const child of nodes[i].children||[]){if(!built[child]||child===i)throw Error('Hierarquia GLB inválida.');built[i].add(built[child]);}
  const rootModel=new T.Group();
  const selectedScene=json.scenes?.[json.scene||0];
  const roots=selectedScene?.nodes||nodes.map((_,i)=>i).filter(i=>!nodes.some(n=>(n.children||[]).includes(i)));
  if(!roots.length)throw Error('GLB sem nós de cena.');
  for(const id of roots){if(!built[id])throw Error('Raiz de cena GLB inválida.');rootModel.add(built[id]);}
  rootModel.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(rootModel);
  if(bounds.isEmpty())throw Error('Modelo GLB vazio.');
  const dimension=new T.Vector3();bounds.getSize(dimension);
  const largest=Math.max(dimension.x,dimension.y,dimension.z);
  if(!Number.isFinite(largest)||largest<0.00001)throw Error('Dimensões GLB inválidas.');
  rootModel.scale.multiplyScalar(Math.min(100,3.5/largest));
  rootModel.updateMatrixWorld(true);bounds.setFromObject(rootModel);
  const center=new T.Vector3();bounds.getCenter(center);
  rootModel.position.x-=center.x;rootModel.position.z-=center.z;rootModel.position.y-=bounds.min.y;
  rootModel.userData.gameForgeAsset={primitives:primitiveCount,animated:false};
  return rootModel;
}
root.GameForgeGLB={decode:decodeGLB};
if(typeof module!=='undefined')module.exports=root.GameForgeGLB;
})(typeof globalThis!=='undefined'?globalThis:this);
