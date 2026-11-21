/* GF-SNES-02 — editor visual de tiles e spritesheets do Studio.
 * Não interpreta código recebido: somente JSON/schema e imagens PNG/WEBP.
 */
(function(root){
'use strict';
const LAYERS=['background','ground','decoration','foreground','collision'];
const ROLES=['player','enemy'];
const SIZE=16;
function checkInt(n,min,max){return Number.isInteger(n)&&n>=min&&n<=max;}
function limits(genre){return genre==='rpg'?{width:1536,height:576}:{width:2048,height:288};}
function normalizeMaps(input,genre,stageCount){
 const count=Math.min(30,Math.max(1,stageCount|0)),bounds=limits(genre);
 if(input==null)return {version:1,stages:Array.from({length:count},()=>[])};
 if(!input||input.version!==1||!Array.isArray(input.stages)||input.stages.length>count)
  throw Error('Mapa: formato v1 inválido ou número de fases acima do projeto.');
 const stages=Array.from({length:count},(_,i)=>{
  const changes=input.stages[i]||[];
  if(!Array.isArray(changes)||changes.length>1024)throw Error('Mapa: máximo de 1024 edições por fase.');
  const seen=new Map();
  for(const edit of changes){
   if(!edit||!LAYERS.includes(edit.layer)||!checkInt(edit.x,0,bounds.width-1)||
    !checkInt(edit.y,0,bounds.height-1)||edit.x%SIZE||edit.y%SIZE||
    !checkInt(edit.id,0,15))throw Error('Mapa: layer, coordenada ou tile inválido.');
   seen.set(edit.layer+':'+edit.x+':'+edit.y,{layer:edit.layer,x:edit.x,y:edit.y,id:edit.id});
  }
  return [...seen.values()];
 });
 return {version:1,stages};
}
function extractGenerated(files){
 const code=String(files?.['game.js']||'');
 const match=/^const GAME_SPEC = (\{[^\r\n]+\});$/m.exec(code);
 if(!match)throw Error('Gere um jogo SNES 2D pelo GameForge antes de editar mapas ou sprites.');
 let spec;
 try{spec=JSON.parse(match[1]);}catch{throw Error('GAME_SPEC exportado inválido.');}
 if(spec.engineMode!=='snes2d'||!['platform','rpg'].includes(spec.genre)||spec.snes2d?.version!==1)
  throw Error('Editor disponível apenas para jogo SNES 2D Plataforma/RPG gerado.');
 if(!code.includes('const GameForgeSNES2DAnimator = '))
  throw Error('Este jogo foi criado no GF-SNES-01. Gere-o novamente com GF-SNES-02 para importar sprites.');
 return {spec,code,match};
}
function spriteInfo(spec){
 return {version:1,roles:Object.fromEntries(ROLES.filter(r=>spec.snes2d.sprites?.[r]).map(role=>{
  const s=spec.snes2d.sprites[role];
  return [role,{width:s.width,height:s.height,frames:s.frames,animations:s.animations,embeddedInGameJs:true}];
 }))};
}
function editGenerated(files,changes){
 const data=extractGenerated(files),spec=structuredClone?structuredClone(data.spec):JSON.parse(JSON.stringify(data.spec));
 if(changes?.maps!==undefined)spec.snes2d.maps=normalizeMaps(changes.maps,spec.genre,spec.stages.length);
 else spec.snes2d.maps=normalizeMaps(spec.snes2d.maps,spec.genre,spec.stages.length);
 if(changes?.sprites!==undefined){
  if(!changes.sprites||typeof changes.sprites!=='object'||Array.isArray(changes.sprites)||
   Object.keys(changes.sprites).some(r=>!ROLES.includes(r)))throw Error('Pacote de sprites inválido.');
  const next={...(spec.snes2d.sprites||{})};
  const animator=root.gameForgeSNES2DAnimatorFactory;
  if(typeof animator!=='function')throw Error('Leitor de atlas não instalado.');
  const api=animator({});
  for(const role of ROLES)if(changes.sprites[role]!==undefined){
   api.verify(role,changes.sprites[role]);next[role]=changes.sprites[role];
  }
  spec.snes2d.sprites=next;
 }
 const capabilities=root.GameForgeCapabilities;
 if(capabilities){const errors=capabilities.check(spec);if(errors.length)throw Error(errors.join(' · '));}
 const newCode=data.code.replace(data.match[0],'const GAME_SPEC = '+JSON.stringify(spec).replace(/<\//g,'<\\/')+';');
 if(newCode.length>2000000)throw Error('Spritesheets grandes demais para o editor do navegador (2 MB de código).');
 const out={...files,'game.js':newCode,
  'SNES2D_MAPAS.json':JSON.stringify(spec.snes2d.maps,null,2),
  'SNES2D_ATLAS.json':JSON.stringify(spriteInfo(spec),null,2),
  'SNES2D_CONTRATO.json':JSON.stringify({version:1,engine:'snes2d',genre:spec.genre,
    config:{...spec.snes2d,sprites:undefined},stages:spec.stages},null,2)};
 return {files:out,spec};
}
function mount(options){
 const doc=options.document,host=options.root,World=root.gameForgeSNES2DWorldFactory;
 if(!host||typeof World!=='function')return null;
 const $=id=>host.querySelector('#'+id),canvas=$('sn2-canvas'),ctx=canvas.getContext('2d');
 canvas.width=512;canvas.height=288;ctx.imageSmoothingEnabled=false;
 let config=null,maps=null,world=null,sprites={};
 let stage=0,chunkX=0,chunkY=0,undo=[],redo=[],dragging=false;
 const status=s=>{$('sn2-result').textContent=s;};
 function snapshot(){return {version:1,stages:maps.stages.map(s=>s.map(e=>({...e})))};}
 function ensure(){if(!world)throw Error('Carregue primeiro um jogo SNES 2D gerado.');}
 function paintPreview(){
  if(!world)return;
  const cam={x:chunkX*512,y:chunkY*288,viewW:512,viewH:288};
  ctx.imageSmoothingEnabled=false;world.render(ctx,cam,false);world.render(ctx,cam,true);
  if($('sn2-layer').value==='collision'){
   ctx.fillStyle='#f2646755';
   for(let y=0;y<18;y++)for(let x=0;x<32;x++)
    if(world.tileAt('collision',cam.x+x*16,cam.y+y*16))ctx.fillRect(x*16,y*16,16,16);
  }
  ctx.strokeStyle='#ffffff22';ctx.lineWidth=.6;
  for(let x=0;x<=512;x+=16){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,288);ctx.stroke();}
  for(let y=0;y<=288;y+=16){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();}
 }
 function viewWorld(){
  ensure();world=World({...config,snes2d:{...config.snes2d,maps}});
  world.build(stage);
  paintPreview();
  $('sn2-metrics').textContent='Fase '+(stage+1)+' · chunk '+(chunkX+1)+','+(chunkY+1)+
   ' · '+maps.stages[stage].length+' modificações · 16 px/tile';
 }
 function selectValues(){
  ensure();
  $('sn2-stage').replaceChildren(...config.stages.map((s,i)=>new Option((i+1)+' · '+s.slice(0,45),String(i))));
  $('sn2-stage').value=String(stage);
  const maxX=config.genre==='rpg'?2:3,maxY=config.genre==='rpg'?1:0;
  $('sn2-chunk-x').replaceChildren(...Array.from({length:maxX+1},(_,i)=>new Option('Coluna '+(i+1),String(i))));
  $('sn2-chunk-y').replaceChildren(...Array.from({length:maxY+1},(_,i)=>new Option('Linha '+(i+1),String(i))));
  chunkX=Math.min(chunkX,maxX);chunkY=Math.min(chunkY,maxY);
  $('sn2-chunk-x').value=String(chunkX);$('sn2-chunk-y').value=String(chunkY);
 }
 function load(){
  const generated=extractGenerated(options.getGenerated());
  config=generated.spec;
  maps=normalizeMaps(config.snes2d.maps,config.genre,config.stages.length);
  sprites={};stage=0;chunkX=0;chunkY=0;undo=[];redo=[];
  world=World({...config,snes2d:{...config.snes2d,maps}});
  selectValues();viewWorld();
  status('Mapa aberto. Edite tiles, use Desfazer/Refazer e clique em Aplicar ao jogo para salvar no game.js.');
 }
 function mutate(layer,x,y,id,record=true){
  ensure();
  const bounds=limits(config.genre);if(x<0||y<0||x>=bounds.width||y>=bounds.height)return;
  const list=maps.stages[stage],key=e=>e.layer===layer&&e.x===x&&e.y===y;
  const previous=list.find(key)||null;
  if((previous?.id??null)===id||(!previous&&world.tileAt(layer,x,y)===id))return;
  const before=world.tileAt(layer,x,y);
  if(previous)list.splice(list.indexOf(previous),1);
  if(list.length>=1024)throw Error('Limite de 1024 edições por fase.');
  list.push({layer,x,y,id});
  if(record){
   undo.push({stage,layer,x,y,before,previous:previous?{...previous}:null,next:id});
   if(undo.length>300)undo.shift();redo=[];
  }
  world.setTile(layer,x,y,id);paintPreview();
  $('sn2-metrics').textContent='Fase '+(stage+1)+' · '+list.length+' modificações · edição ainda não aplicada ao game.js';
 }
 function restoreAction(item,toPrevious){
  stage=item.stage;$('sn2-stage').value=String(stage);
  const list=maps.stages[stage],idx=list.findIndex(e=>e.layer===item.layer&&e.x===item.x&&e.y===item.y);
  if(idx>=0)list.splice(idx,1);
  if(toPrevious&&item.previous)list.push({...item.previous});
  if(!toPrevious)list.push({layer:item.layer,x:item.x,y:item.y,id:item.next});
  viewWorld();
 }
 function eraseOrPaint(event){
  if(!world||!dragging)return;
  const bounds=canvas.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
  const x=Math.floor((event.clientX-bounds.left)*512/bounds.width/16)*16+chunkX*512;
  const y=Math.floor((event.clientY-bounds.top)*288/bounds.height/16)*16+chunkY*288;
  const layer=$('sn2-layer').value;
  const id=$('sn2-brush').value==='erase'?0:Number($('sn2-tile').value);
  try{mutate(layer,x,y,id);}catch(e){status(e.message);}
 }
 canvas.addEventListener('pointerdown',event=>{
  if(!world)return;
  event.preventDefault();dragging=true;
  if(canvas.setPointerCapture&&event.pointerId!=null)try{canvas.setPointerCapture(event.pointerId)}catch(_){}
  eraseOrPaint(event);
 });
 canvas.addEventListener('pointermove',eraseOrPaint);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>dragging=false);
 $('sn2-load').addEventListener('click',()=>{try{load();}catch(e){status(e.message);}});
 $('sn2-stage').addEventListener('change',()=>{if(!world)return;stage=Number($('sn2-stage').value);viewWorld();});
 $('sn2-chunk-x').addEventListener('change',()=>{chunkX=Number($('sn2-chunk-x').value);if(world)paintPreview();});
 $('sn2-chunk-y').addEventListener('change',()=>{chunkY=Number($('sn2-chunk-y').value);if(world)paintPreview();});
 $('sn2-layer').addEventListener('change',paintPreview);
 $('sn2-undo').addEventListener('click',()=>{const action=undo.pop();if(action){restoreAction(action,true);redo.push(action);}});
 $('sn2-redo').addEventListener('click',()=>{const action=redo.pop();if(action){restoreAction(action,false);undo.push(action);}});
 $('sn2-apply').addEventListener('click',()=>{
  try{
   ensure();
   const result=editGenerated(options.getGenerated(),{maps:snapshot(),sprites});
   options.onEdit(result);
   config=result.spec;sprites={};undo=[];redo=[];
   status('Mapa e sprites atualizados no game.js, exportados no projeto e preservados no backup.');
  }catch(e){status('Falha ao aplicar: '+e.message);}
 });
 $('sn2-export').addEventListener('click',()=>{
  try{
   ensure();const b=new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'});
   const url=URL.createObjectURL(b),anchor=doc.createElement('a');
   anchor.href=url;anchor.download='SNES2D_MAPAS.json';anchor.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);status('Arquivo SNES2D_MAPAS.json pronto.');
  }catch(e){status(e.message);}
 });
 $('sn2-import').addEventListener('click',()=>$('sn2-map-file').click());
 $('sn2-map-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
   ensure();if(file.size>400000)throw Error('Mapa excede 400 KB.');
   maps=normalizeMaps(JSON.parse(await file.text()),config.genre,config.stages.length);
   undo=[];redo=[];viewWorld();status('Mapa importado. Clique em Aplicar ao jogo para salvar.');
  }catch(e){status('Importação rejeitada: '+e.message);}
  event.target.value='';
 });
 function readUrl(file){
  return new Promise((resolve,reject)=>{
   const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Falha lendo imagem.'));r.readAsDataURL(file);
  });
 }
 function imageSize(data){
  return new Promise((resolve,reject)=>{
   const im=new Image();im.onload=()=>resolve({width:im.naturalWidth,height:im.naturalHeight});
   im.onerror=()=>reject(Error('PNG/WEBP não decodificado no navegador.'));im.src=data;
  });
 }
 $('sn2-sprite-import').addEventListener('click',async()=>{
  try{
   ensure();const factory=root.gameForgeSNES2DAnimatorFactory;
   if(typeof factory!=='function')throw Error('Animator Controller não carregado.');
   for(const role of ROLES){
    const img=$('sn2-'+role+'-image').files?.[0],atlasFile=$('sn2-'+role+'-atlas').files?.[0];
    if(!img&&!atlasFile)continue;
    const current=sprites[role]||config.snes2d.sprites?.[role];
    let definition;
    if(img){
     if(img.size>480000||!/\.(png|webp)$/i.test(img.name)||
      !['image/png','image/webp',''].includes(img.type))throw Error(role+': imagem PNG/WEBP até 480 KB.');
     const data=await readUrl(img),dimensions=await imageSize(data);
     definition={image:data,width:dimensions.width,height:dimensions.height};
    }else{
     if(!current)throw Error('Selecione também a imagem do '+role+'.');
     definition={...current};
    }
    if(atlasFile){
     if(atlasFile.size>64000||!atlasFile.name.toLowerCase().endsWith('.json'))throw Error('Atlas JSON até 64 KB.');
     const raw=JSON.parse(await atlasFile.text());
     definition.frames=raw.frames;definition.animations=raw.animations;
    }else if(img){
     const atlas=factory({}).gridAtlas(definition.width,definition.height);
     definition.frames=atlas.frames;definition.animations=atlas.animations;
    }
    factory({}).verify(role,definition);
    sprites[role]=definition;
   }
   status('Spritesheets importadas: '+Object.keys(sprites).join(', ')+'. Clique em Aplicar ao jogo.');
  }catch(e){status('Spritesheet rejeitada: '+e.message);}
 });
 status('Gere um jogo SNES 2D e clique em Carregar jogo.');
 return {load,snapshot,mutate,editGenerated};
}
const api={normalizeMaps,extractGenerated,editGenerated,mount};
root.GameForgeSNES2DEditor=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
