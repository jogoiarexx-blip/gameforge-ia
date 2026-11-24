/* GF-VOXEL-10 — editor de atlas independente de DOM, reutilizável no Studio e no export. */
function gameForgeVoxelAtlasFactory(){
 'use strict';
 const WIDTH=128,HEIGHT=64,TILE=16,BYTES=WIDTH*HEIGHT*4;
 const LABELS={1:'Grama — topo',2:'Terra',3:'Pedra',4:'Bancada',5:'Forno',6:'Tijolo',8:'Tronco — lateral',9:'Folhas',10:'Muda',12:'Baú',15:'Minério de ferro',20:'Carvão',21:'Minério de cobre',24:'Grama — lateral',25:'Tronco — corte',26:'Água',27:'Areia'};
 const valid=a=>a instanceof Uint8Array&&a.length===BYTES;
 const validTile=t=>Number.isInteger(t)&&Object.prototype.hasOwnProperty.call(LABELS,t);
 const index=(t,x,y)=>((Math.floor(t/8)*TILE+y)*WIDTH+(t%8)*TILE+x)*4;
 function encode(data){if(!valid(data))throw Error('Atlas inválido.');let s='';for(const n of data)s+=n.toString(16).padStart(2,'0');return s;}
 function decode(hex){
  if(typeof hex!=='string'||hex.length!==BYTES*2||!/^[0-9a-f]+$/i.test(hex))throw Error('Atlas personalizado inválido.');
  const a=new Uint8Array(BYTES);for(let i=0;i<BYTES;i++)a[i]=parseInt(hex.slice(i*2,i*2+2),16);return a;
 }
 function pixel(a,t,x,y,rgba){
  if(!valid(a)||!validTile(t)||![x,y].every(n=>Number.isInteger(n)&&n>=0&&n<TILE)||!Array.isArray(rgba)||rgba.length!==4||!rgba.every(n=>Number.isInteger(n)&&n>=0&&n<=255))return false;
  a.set(rgba,index(t,x,y));return true;
 }
 function fill(a,t,rgba){if(!validTile(t))return false;for(let y=0;y<TILE;y++)for(let x=0;x<TILE;x++)if(!pixel(a,t,x,y,rgba))return false;return true;}
 function extract(a,t){
  if(!valid(a)||!validTile(t))throw Error('Material inválido.');
  const out=new Uint8Array(TILE*TILE*4);for(let y=0;y<TILE;y++)out.set(a.subarray(index(t,0,y),index(t,0,y)+TILE*4),y*TILE*4);return out;
 }
 function replace(a,t,b){
  if(!valid(a)||!validTile(t)||!(b instanceof Uint8Array)||b.length!==TILE*TILE*4)return false;
  for(let y=0;y<TILE;y++)a.set(b.subarray(y*TILE*4,(y+1)*TILE*4),index(t,0,y));return true;
 }
 // The atlas shader uses an opaque surface. Composite imported transparency over the prior pixels.
 function composite(a,b){
  if(!(a instanceof Uint8Array)||!(b instanceof Uint8Array)||a.length!==b.length||a.length%4)throw Error('Dimensões incompatíveis.');
  const out=new Uint8Array(a.length);for(let i=0;i<a.length;i+=4){const alpha=b[i+3]/255;for(let j=0;j<3;j++)out[i+j]=Math.round(b[i+j]*alpha+a[i+j]*(1-alpha));out[i+3]=255;}return out;
 }
 return {WIDTH,HEIGHT,TILE,BYTES,LABELS,valid,validTile,index,encode,decode,pixel,fill,extract,replace,composite};
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelAtlasFactory=gameForgeVoxelAtlasFactory;
if(typeof module!=='undefined')module.exports=gameForgeVoxelAtlasFactory;
