/* GF-OPEN-02 — contrato de objetos de cena 3D, sem executar scripts de usuario. */
(function(root){
 'use strict';
 const KINDS=Object.freeze(['crate','pillar','wall','tree','lamp','glb']);
 const MAX_STAGES=30,MAX_OBJECTS=24,MAX_LIGHTS=2,MAX_BYTES=90000;
 const validNumber=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
 const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const validId=v=>typeof v==='string'&&/^[a-z][a-z0-9_-]{0,30}$/i.test(v);
 const validAsset=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9_-]{7,63}$/i.test(v);
 function normalize(value,{maxStages=MAX_STAGES}={}){
  if(typeof value==='string'){
   if(new TextEncoder().encode(value).length>MAX_BYTES)throw Error('Cena 3D excede 90 KB.');
   try{value=JSON.parse(value);}catch{throw Error('JSON da cena 3D invalido.');}
  }
  if(!obj(value)||value.version!==1||!Array.isArray(value.stages)||value.stages.length<1||
   value.stages.length>MAX_STAGES||value.stages.length>maxStages)throw Error('Quantidade de fases/cabecalho da cena 3D invalida.');
  const stages=value.stages.map((stage,index)=>{
   if(!obj(stage)||!Array.isArray(stage.objects)||stage.objects.length>MAX_OBJECTS)
    throw Error('Fase '+(index+1)+': maximo '+MAX_OBJECTS+' objetos.');
   let lamps=0;const ids=new Set();
   const objects=stage.objects.map((item,i)=>{
    if(!obj(item)||!validId(item.id)||ids.has(item.id))throw Error('Fase '+(index+1)+': ID de objeto invalido/repetido.');
    ids.add(item.id);
    if(!KINDS.includes(item.kind))throw Error('Fase '+(index+1)+': tipo de objeto nao suportado.');
    if(!validNumber(item.x,-16,16)||!validNumber(item.z,-16,16)||
       !validNumber(item.yaw,-180,180)||!validNumber(item.scale,.4,3))
     throw Error('Fase '+(index+1)+': coordenadas, rotacao ou escala fora dos limites.');
    if(typeof item.color!=='string'||!/^#[a-f0-9]{6}$/i.test(item.color))
     throw Error('Fase '+(index+1)+': cor do objeto invalida.');
    if(typeof item.name!=='string'||item.name.trim().length<1||item.name.length>40)
     throw Error('Fase '+(index+1)+': nome de objeto invalido.');
    if(typeof item.collidable!=='boolean')throw Error('Fase '+(index+1)+': colisao invalida.');
    if(item.kind==='lamp')lamps++;
    if(item.kind==='glb'&&!validAsset(item.assetId))
     throw Error('Fase '+(index+1)+': modelo GLB sem ID valido da biblioteca.');
    return {id:item.id,kind:item.kind,name:item.name.trim(),x:item.x,z:item.z,
     yaw:item.yaw,scale:item.scale,color:item.color.toLowerCase(),
     collidable:item.kind==='lamp'?false:item.collidable,
     ...(item.kind==='glb'?{assetId:item.assetId}:{})};
   });
   if(lamps>MAX_LIGHTS)throw Error('Fase '+(index+1)+': maximo '+MAX_LIGHTS+' pontos de luz.');
   return {objects};
  });
  return {version:1,stages};
 }
 function references(raw){
  const normalized=normalize(raw);
  return [...new Set(normalized.stages.flatMap(stage=>stage.objects.filter(e=>e.kind==='glb').map(e=>e.assetId)))];
 }
 function validateAssets(raw,manifest){
  const ids=references(raw);
  if(!ids.length)return ids;
  if(!obj(manifest)||!Array.isArray(manifest.assets))
   throw Error('A cena referencia GLB, mas a biblioteca do projeto nao esta disponivel.');
  const assets=new Map(manifest.assets.filter(a=>obj(a)&&validAsset(a.id)).map(a=>[a.id,a]));
  for(const id of ids){
   const asset=assets.get(id);
   if(!asset)throw Error('Modelo GLB ausente da biblioteca: '+id+'. Importe o backup ZIP completo.');
   if(asset.role!=='scene')throw Error('O GLB '+asset.name+' precisa ter uso Cenario para entrar no editor.');
  }
  return ids;
 }
 function apply(spec,raw,manifest){
  if(!obj(spec)||spec.dimension!=='3d'||!['arena','fps','rpg'].includes(spec.genre))
   throw Error('Editor disponivel somente em Arena 3D, FPS 3D e RPG 3D.');
  const maxStages=Array.isArray(spec.stages)?spec.stages.length:0;
  if(!maxStages)throw Error('GDD precisa conter uma fase.');
  const layout=normalize(raw,{maxStages});
  validateAssets(layout,manifest);
  const next={...spec,stageConfig:Array.isArray(spec.stageConfig)?spec.stageConfig.map(v=>obj(v)?{...v}:{}):[]};
  for(let i=0;i<maxStages;i++)next.stageConfig[i]={...(next.stageConfig[i]||{}),
    sceneObjects:layout.stages[i]?.objects||[]};
  return next;
 }
 function extract(spec){
  const n=Array.isArray(spec?.stages)?spec.stages.length:1;
  return {version:1,stages:Array.from({length:Math.max(1,Math.min(MAX_STAGES,n))},(_,i)=>({
   objects:Array.isArray(spec.stageConfig?.[i]?.sceneObjects)?spec.stageConfig[i].sceneObjects:[]
  }))};
 }
 root.GameForgeScene3DLayout={KINDS,MAX_STAGES,MAX_OBJECTS,MAX_LIGHTS,MAX_BYTES,normalize,apply,extract,references,validateAssets};
 if(typeof module!=='undefined')module.exports=root.GameForgeScene3DLayout;
})(typeof globalThis!=='undefined'?globalThis:this);
