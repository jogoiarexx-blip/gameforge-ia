/* GF-VOXEL-10 — local-only atlas editor. All file imports are decoded into pixels. */
(function(root){
'use strict';
function mount({seed,onChange}){
 const $=id=>document.getElementById(id),A=root.gameForgeVoxelAtlasFactory(),X=root.gameForgeVoxelTextureFactory(root.gameForgeVoxelKitFactory());
 const atlas=$('texture-atlas'),tile=$('texture-tile'),tileSelect=$('atlas-material'),ctx=atlas.getContext('2d'),tc=tile.getContext('2d');
 let data=X.generate(seed()).data,custom=false,history=[],painting=false,last=null,importVersion=0;
 for(const [id,label] of Object.entries(A.LABELS)){const o=document.createElement('option');o.value=id;o.textContent=label;tileSelect.append(o);}
 tileSelect.value='1';
 const selected=()=>Number(tileSelect.value);
 const message=t=>$('atlas-status').textContent=t;
 function put(context,bytes,w,h){const img=context.createImageData(w,h);img.data.set(bytes);context.putImageData(img,0,0);}
 function render(){put(ctx,data,A.WIDTH,A.HEIGHT);put(tc,A.extract(data,selected()),A.TILE,A.TILE);$('atlas-undo').disabled=!history.length;}
 function checkpoint(){history.push({data:data.slice(),custom});if(history.length>20)history.shift();}
 function changed(){custom=true;$('textures').checked=true;render();onChange();message('Textura personalizada. Gere novamente a prévia para aplicar.');}
 function color(){const hex=$('atlas-color').value;return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16),255];}
 function point(e){const b=tile.getBoundingClientRect();return [Math.max(0,Math.min(15,Math.floor((e.clientX-b.left)*16/b.width))),Math.max(0,Math.min(15,Math.floor((e.clientY-b.top)*16/b.height)))];}
 function paint(e){
  const p=point(e),c=color(),from=last||p,steps=Math.max(1,Math.abs(p[0]-from[0]),Math.abs(p[1]-from[1]));
  for(let i=0;i<=steps;i++)A.pixel(data,selected(),Math.round(from[0]+(p[0]-from[0])*i/steps),Math.round(from[1]+(p[1]-from[1])*i/steps),c);
  last=p;changed();
 }
 tile.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;e.preventDefault();checkpoint();painting=true;last=null;tile.setPointerCapture(e.pointerId);paint(e);});
 tile.addEventListener('pointermove',e=>{if(painting)paint(e);});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])tile.addEventListener(event,()=>{painting=false;last=null;});
 tileSelect.addEventListener('change',render);
 $('atlas-fill').addEventListener('click',()=>{checkpoint();A.fill(data,selected(),color());changed();});
 $('atlas-undo').addEventListener('click',()=>{const v=history.pop();if(!v)return;data=v.data;custom=v.custom;render();onChange();message('Última edição desfeita.');});
 $('atlas-reset-tile').addEventListener('click',()=>{checkpoint();A.replace(data,selected(),A.extract(X.generate(seed()).data,selected()));changed();});
 $('atlas-reset-all').addEventListener('click',()=>{checkpoint();importVersion++;data=X.generate(seed()).data;custom=false;render();onChange();message('Atlas procedural restaurado.');});
 $('seed').addEventListener('input',()=>{if(!custom){const n=seed();if(Number.isSafeInteger(n)&&n>=0&&n<=2147483647){data=X.generate(n).data;history=[];render();}}});
 async function importImage(input,whole){
  const file=input.files?.[0],t=selected(),version=++importVersion;input.value='';
  if(!file)return;
  if(!['image/png','image/webp'].includes(file.type)||file.size>4*1024*1024){message('Escolha PNG ou WEBP de até 4 MB.');return;}
  let bitmap;
  try{
   bitmap=await createImageBitmap(file);
   if(version!==importVersion)return;
   if(bitmap.width>2048||bitmap.height>2048||bitmap.width<1||bitmap.height<1)throw Error('Dimensões devem estar entre 1 e 2048 pixels.');
   if(whole&&bitmap.width!==A.WIDTH&&bitmap.width/bitmap.height!==2)throw Error('O atlas inteiro deve ter proporção 2:1.');
   if(whole&&bitmap.width!==bitmap.height*2)throw Error('O atlas inteiro deve ter proporção 2:1.');
   const w=whole?A.WIDTH:A.TILE,h=whole?A.HEIGHT:A.TILE,cv=document.createElement('canvas');cv.width=w;cv.height=h;
   const c=cv.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(bitmap,0,0,w,h);
   const bytes=new Uint8Array(c.getImageData(0,0,w,h).data);
   checkpoint();
   if(whole)data=A.composite(data,bytes);else A.replace(data,t,A.composite(A.extract(data,t),bytes));
   changed();message('Imagem importada. Prévia e ZIP usarão a textura personalizada.');
  }catch(e){message('Não foi possível importar: '+e.message);}finally{bitmap?.close();}
 }
 $('atlas-import-tile').addEventListener('change',e=>importImage(e.target,false));
 $('atlas-import-all').addEventListener('change',e=>importImage(e.target,true));
 function download(cv,name){cv.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);},'image/png');}
 $('atlas-download').addEventListener('click',()=>download(atlas,'gameforge-atlas-'+seed()+'.png'));
 $('tile-download').addEventListener('click',()=>download(tile,'gameforge-textura-'+selected()+'.png'));
 render();
 return {encoded:()=>custom?A.encode(data):null};
}
root.GameForgeVoxelAtlasEditor={mount};
})(globalThis);
