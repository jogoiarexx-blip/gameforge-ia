/* GF-SNES-01 — mundo em tiles do GameForge, adaptado dos contratos
 * SNESTileMap, SNESCollision, SNESCamera e SNESRenderCache do SNES Engine Studio.
 * Fonte da arquitetura: jogoiarexx-blip/Snes-engine-Studio (licença do projeto de origem).
 * Não é emulador de console nem conversor de ROM.
 */
(function(root){
 'use strict';
 function gameForgeSNES2DWorldFactory(spec={}){
  const TILE=16,COLS=32,ROWS=18,LAYERS=['background','ground','decoration','foreground','collision'];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const positive=n=>Number.isFinite(n)?n:0;
  const floor=(n)=>Math.floor(n);
  const genre=spec.genre==='rpg'?'rpg':'platform';
  const config=spec.snes2d||{};
  const maxX=genre==='platform'?COLS*TILE*4:COLS*TILE*3;
  const maxY=genre==='platform'?ROWS*TILE:ROWS*TILE*2;
  const chunks=new Map();
  let painted=0,cacheHits=0,dirtyDraws=0;
  const palette={
   forest:{sky:'#173d53',far:'#2a5960',ground:'#557c53',edge:'#b4b67a',wall:'#283c44',highlight:'#83b792'},
   ruins:{sky:'#1c233d',far:'#3b4663',ground:'#626778',edge:'#b2b5b7',wall:'#303443',highlight:'#8885bb'},
   desert:{sky:'#70475a',far:'#ba7b64',ground:'#ae8b56',edge:'#f7d18d',wall:'#6b5945',highlight:'#d0af7a'},
   neon:{sky:'#171434',far:'#30336e',ground:'#365f73',edge:'#4ff0d2',wall:'#292446',highlight:'#856aff'}
  }[config.theme]||{sky:'#173d53',far:'#2a5960',ground:'#557c53',edge:'#b4b67a',wall:'#283c44',highlight:'#83b792'};
  const dims={tileSize:TILE,chunkCols:COLS,chunkRows:ROWS,width:maxX,height:maxY};
  const get=(cx,cy,create=false)=>{
   const id=cx+','+cy;
   if(!chunks.has(id)&&create){
    const layers={};
    for(const name of LAYERS)layers[name]=new Uint8Array(COLS*ROWS);
    chunks.set(id,{cx,cy,layers,dirty:new Set(LAYERS),cache:Object.create(null)});
   }
   return chunks.get(id)||null;
  };
  function coords(x,y){
   const tx=floor(x/TILE),ty=floor(y/TILE),cx=floor(tx/COLS),cy=floor(ty/ROWS);
   return {cx,cy,tx:((tx%COLS)+COLS)%COLS,ty:((ty%ROWS)+ROWS)%ROWS};
  }
  function tileAt(layer,x,y){
   if(!LAYERS.includes(layer))return 0;
   if(x<0||y<0||x>=maxX||y>=maxY)return layer==='collision'?1:0;
   const p=coords(x,y),c=get(p.cx,p.cy);
   return c?.layers[layer][p.ty*COLS+p.tx]||0;
  }
  function setTile(layer,x,y,id){
   if(!LAYERS.includes(layer)||!Number.isInteger(id)||id<0||id>15||
    !Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=maxX||y>=maxY)return false;
   const p=coords(x,y),c=get(p.cx,p.cy,true),i=p.ty*COLS+p.tx;
   if(c.layers[layer][i]===id)return false;
   c.layers[layer][i]=id;c.dirty.add(layer);
   return true;
  }
  function fillRect(layer,x,y,w,h,id){
   for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++)
    setTile(layer,col*TILE,row*TILE,id);
  }
  function autotileMask(x,y,layer='ground'){
   if(!tileAt(layer,x,y))return 0;
   return (tileAt(layer,x,y-TILE)?1:0)|(tileAt(layer,x+TILE,y)?2:0)|
    (tileAt(layer,x,y+TILE)?4:0)|(tileAt(layer,x-TILE,y)?8:0);
  }
  function build(stage=0){
   chunks.clear();painted=cacheHits=dirtyDraws=0;
   const variant=((stage|0)%4+4)%4;
   for(let cy=0;cy<maxY/(ROWS*TILE);cy++)for(let cx=0;cx<maxX/(COLS*TILE);cx++)get(cx,cy,true);
   const tw=maxX/TILE,th=maxY/TILE;
   for(let y=0;y<th;y++)for(let x=0;x<tw;x++){
    if((x+y*7+variant*3)%13===0)setTile('background',x*TILE,y*TILE,3);
    if((x*3+y*11+variant)%29===0)setTile('decoration',x*TILE,y*TILE,4);
   }
   if(genre==='platform'){
    // Níveis de plataforma, chão contínuo e espaços para saltos seguros.
    for(let x=0;x<tw;x++){
     const pit=x>12&&x<tw-8&&(x+variant*7)%36>=30&&(x+variant*7)%36<=33;
     if(pit)continue;
     for(let y=14;y<th;y++){setTile('ground',x*TILE,y*TILE,y===14?2:1);setTile('collision',x*TILE,y*TILE,1);}
    }
    for(let x=13;x<tw-6;x+=14){
     const offset=variant%2,py=x%3===0?9+offset:10+offset;
     for(let dx=0;dx<5;dx++){setTile('ground',(x+dx)*TILE,py*TILE,2);setTile('collision',(x+dx)*TILE,py*TILE,1);}
    }
   }else{
    // Mundo topdown com blocos de pedra, trilhas e áreas livres com rota garantida.
    for(let y=0;y<th;y++)for(let x=0;x<tw;x++){
     setTile('ground',x*TILE,y*TILE,1);
     if(x===0||y===0||x===tw-1||y===th-1){
      setTile('foreground',x*TILE,y*TILE,5);setTile('collision',x*TILE,y*TILE,1);
     }else if(x>9&&x<tw-7&&y>7&&y<th-7&&x%21>=12&&x%21<=14&&y%16>=7&&y%16<=12){
      setTile('foreground',x*TILE,y*TILE,5);setTile('collision',x*TILE,y*TILE,1);
     }
    }
   }
   return info();
  }
  function solid(x,y){return tileAt('collision',x,y)!==0;}
  function blocked(x,y,w,h){
   if(x<0||y<0||x+w>maxX||y+h>maxY)return true;
   const e=0.03;
   for(let cy=floor(y/TILE);cy<=floor((y+h-e)/TILE);cy++)
    for(let cx=floor(x/TILE);cx<=floor((x+w-e)/TILE);cx++)
     if(solid(cx*TILE,cy*TILE))return true;
   return false;
  }
  // Subpassos independentes por eixo: impedem atravessar plataformas com dt irregular.
  function move(body,dx,dy){
   const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/4));
   let hitX=false,hitY=false;
   for(let i=0;i<steps;i++){
    if(dx){
     const x=body.x+dx/steps;
     if(!blocked(x,body.y,body.w,body.h))body.x=x;else hitX=true;
    }
    if(dy){
     const y=body.y+dy/steps;
     if(!blocked(body.x,y,body.w,body.h))body.y=y;else hitY=true;
    }
   }
   return {hitX,hitY};
  }
  function createCamera(){
   return {x:0,y:0,viewW:512,viewH:288,deadX:68,deadY:44,lookAhead:30,
    zoom:1,shake:0};
  }
  function updateCamera(cam,body,dt,dir=1){
   const desiredX=body.x+body.w/2-cam.viewW/2+dir*cam.lookAhead;
   const desiredY=body.y+body.h/2-cam.viewH/2;
   const follow=clamp(dt*7,0,1);
   cam.x=clamp(cam.x+(desiredX-cam.x)*follow,0,Math.max(0,maxX-cam.viewW));
   cam.y=clamp(cam.y+(desiredY-cam.y)*follow,0,Math.max(0,maxY-cam.viewH));
   return cam;
  }
  function visibleChunks(camera){
   const x0=floor(camera.x/(COLS*TILE)),y0=floor(camera.y/(ROWS*TILE));
   const x1=floor((camera.x+camera.viewW)/(COLS*TILE)),y1=floor((camera.y+camera.viewH)/(ROWS*TILE));
   const out=[];for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const c=get(x,y);if(c)out.push(c);}return out;
  }
  // Atlas pixel-art de 16px; determinístico e sem imagens externas.
  let atlas=null;
  function getAtlas(){
   if(atlas||typeof document==='undefined')return atlas;
   const cv=document.createElement('canvas');cv.width=TILE*8;cv.height=TILE;
   const ctx=cv.getContext('2d');if(!ctx)return null;
   ctx.imageSmoothingEnabled=false;
   const tones=['transparent',palette.ground,palette.edge,palette.far,palette.highlight,palette.wall,palette.sky,palette.edge];
   for(let i=1;i<8;i++){
    const x=i*TILE;
    ctx.fillStyle=tones[i];ctx.fillRect(x,0,TILE,TILE);
    ctx.fillStyle=i===5?'#151d2c77':'#ffffff22';
    for(let k=0;k<4;k++)ctx.fillRect(x+(k*5+i*2)%16,(k*3+i*4)%16,2,2);
    ctx.fillStyle='#121b2477';ctx.fillRect(x,15,16,1);
   }
   atlas=cv;return atlas;
  }
  function renderLayer(ctx,ch,name){
   if(name==='collision')return;
   const canvas=getAtlas(),w=COLS*TILE,h=ROWS*TILE;
   let buffer=ch.cache[name];
   if(!buffer&&typeof document!=='undefined'){
    const c=document.createElement('canvas');c.width=w;c.height=h;
    buffer=c;ch.cache[name]=buffer;ch.dirty.add(name);
   }
   if(!buffer)return;
   if(ch.dirty.has(name)){
    const gc=buffer.getContext('2d');if(!gc)return;
    gc.imageSmoothingEnabled=false;gc.clearRect(0,0,w,h);
    const pixels=ch.layers[name];
    for(let i=0;i<pixels.length;i++){
     const t=pixels[i];if(!t)continue;
     const x=(i%COLS)*TILE,y=floor(i/COLS)*TILE;
     if(canvas)gc.drawImage(canvas,t*TILE,0,TILE,TILE,x,y,TILE,TILE);
     else{gc.fillStyle=palette.ground;gc.fillRect(x,y,TILE,TILE);}
    }
    ch.dirty.delete(name);dirtyDraws++;
   }else cacheHits++;
   ctx.drawImage(buffer,ch.cx*w,ch.cy*h);
   painted++;
  }
  function render(ctx,camera,foreground=false){
   ctx.save();ctx.imageSmoothingEnabled=false;
   if(!foreground){
    ctx.fillStyle=palette.sky;ctx.fillRect(0,0,camera.viewW,camera.viewH);
    ctx.fillStyle=palette.far;
    for(let i=0;i<10;i++){
     const x=(i*83-floor(camera.x*.28)%830)-30;
     const y=76+(i*17)%64;ctx.fillRect(x,y,64,140);
    }
   }
   ctx.translate(-floor(camera.x),-floor(camera.y));
   const show=foreground?['foreground']:['background','ground','decoration'];
   for(const name of show)for(const ch of visibleChunks(camera))renderLayer(ctx,ch,name);
   ctx.restore();
  }
  function info(){return {...dims,chunks:chunks.size,genre,theme:config.theme||'forest'};}
  function telemetry(){return {...info(),cacheHits,dirtyDraws,drawCalls:painted};}
  build(0);
  return {TILE,COLS,ROWS,LAYERS,build,info,telemetry,coords,tileAt,setTile,fillRect,
   autotileMask,solid,blocked,move,createCamera,updateCamera,visibleChunks,render};
 }
 root.gameForgeSNES2DWorldFactory=gameForgeSNES2DWorldFactory;
 if(typeof module!=='undefined')module.exports=gameForgeSNES2DWorldFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
