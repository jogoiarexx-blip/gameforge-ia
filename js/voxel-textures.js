/* GF-VOXEL-09: deterministic pixel atlas, with per-face repeatable tiles. */
function gameForgeVoxelTextureFactory(K){
 'use strict';
 const TILE=16,COLS=8,ROWS=4,W=TILE*COLS,H=TILE*ROWS;
 const palette={1:[91,153,55],2:[134,88,52],3:[127,132,137],4:[151,105,51],5:[77,82,92],6:[163,65,44],8:[109,71,36],9:[49,112,39],10:[91,171,54],12:[165,111,46],15:[124,130,135],20:[113,118,121],21:[124,130,135],24:[134,88,52],25:[168,119,65],26:[48,120,177],27:[166,157,128]};
 function tile(id,dy){return id===1?(dy>0?1:dy<0?2:24):id===8?(dy?25:8):id===28?26:id===29?27:id;}
 function generate(seed=0){
  const data=new Uint8Array(W*H*4);
  for(let t=0;t<COLS*ROWS;t++)for(let y=0;y<TILE;y++)for(let x=0;x<TILE;x++){
   let base=palette[t]||[220,50,180],noise=(K.hash(seed^Math.imul(t,1274126177),x,y)-.5)*30;
   if(t===24&&y>=12)base=palette[1];
   if(t===8)noise+=((x%5===0)?-25:12);
   if(t===25)noise+=Math.floor(Math.hypot(x-7.5,y-7.5))%3===0?-30:6;
   if(t===6){const row=Math.floor(y/5);if(y%5===0||(x+(row%2)*4)%8===0)base=[100,98,91];}
   if(t===4||t===12){if(x===0||y===0||x===15||y===15)base=[81,53,26];if(y%5===0)noise-=20;if(t===12&&x>=7&&x<=9&&y>=6&&y<=9)base=[213,185,86];}
   if(t===5&&x>=4&&x<=11&&y>=3&&y<=9)base=[34,31,30];
   if([15,20,21].includes(t)&&K.hash(seed+t,Math.floor(x/2),Math.floor(y/2))>.74)base=t===15?[178,116,78]:t===20?[33,36,39]:[195,115,63];
   if(t===9)noise*=1.7;if(t===26)noise+=Math.sin(x*1.2+y*.8)*9;
   const i=((Math.floor(t/COLS)*TILE+y)*W+(t%COLS)*TILE+x)*4;
   for(let c=0;c<3;c++)data[i+c]=Math.max(0,Math.min(255,Math.round(base[c]+noise)));data[i+3]=255;
  }
  return {data,width:W,height:H,tileSize:TILE,columns:COLS,rows:ROWS};
 }
 function material(T,seed,custom){
  const a=generate(seed);if(custom){const F=typeof gameForgeVoxelAtlasFactory==='function'?gameForgeVoxelAtlasFactory:typeof require==='function'?require('./voxel-atlas.js'):null;a.data=F().decode(custom);}
  const map=new T.DataTexture(a.data,a.width,a.height,T.RGBAFormat);
  map.colorSpace=T.SRGBColorSpace;map.magFilter=T.NearestFilter;map.minFilter=T.NearestFilter;map.generateMipmaps=false;map.needsUpdate=true;
  const m=new T.MeshBasicMaterial({map,vertexColors:true});
  m.onBeforeCompile=shader=>{
   shader.vertexShader='attribute float voxelTile; varying float vVoxelTile;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n vVoxelTile=voxelTile;');
   shader.fragmentShader='varying float vVoxelTile;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',[
    'vec2 tileIndex=vec2(mod(vVoxelTile,8.0),floor(vVoxelTile/8.0));',
    'vec2 atlasUV=(tileIndex*16.0+vec2(0.5)+fract(vMapUv)*15.0)/vec2(128.0,64.0);',
    'diffuseColor *= texture2D(map,atlasUV);'
   ].join('\n'));
  };
  m.customProgramCacheKey=()=> 'gf-voxel-atlas-v1';
  return m;
 }
 return {generate,tile,material};
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelTextureFactory=gameForgeVoxelTextureFactory;
if(typeof module!=='undefined')module.exports=gameForgeVoxelTextureFactory;
