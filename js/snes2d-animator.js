/* GF-SNES-02 — Sprite Atlas e Animator Controller (inspirados em
 * Snes-engine-Studio/js/engine/animator-controller.js e texture-atlas.js).
 * Factory serializável no game.js. Sem carregamento remoto ou código dinâmico.
 */
(function(root){
 'use strict';
 function gameForgeSNES2DAnimatorFactory(settings={}){
  const roles=['player','enemy'];
  const STATES=['idle','walk','jump','attack','hurt'];
  const frameRect=(raw)=>{
   const r=raw?.frame||raw;
   if(!r||!['x','y','w','h'].every(k=>Number.isInteger(r[k])&&r[k]>=0)||
     r.w<1||r.h<1||r.w>128||r.h>128)return null;
   return {x:r.x,y:r.y,w:r.w,h:r.h};
  };
  function validateAtlas(atlas,width,height){
   if(!atlas||typeof atlas!=='object'||Array.isArray(atlas)||!atlas.frames||!atlas.animations)throw Error('Atlas precisa de frames e animations.');
   if(!Number.isInteger(width)||!Number.isInteger(height)||width<16||height<16||width>512||height>512)throw Error('Dimensões da spritesheet fora do limite 16–512 pixels.');
   const rawFrames=atlas.frames;
   if(!rawFrames||typeof rawFrames!=='object'||Array.isArray(rawFrames)||Object.keys(rawFrames).length>256)throw Error('Atlas: frames ausentes ou demais.');
   const frames={};
   for(const [key,value] of Object.entries(rawFrames)){
    if(!/^[a-z0-9_.:/-]{1,64}$/i.test(key))throw Error('Atlas: nome de frame inválido.');
    const f=frameRect(value);
    if(!f||f.x+f.w>width||f.y+f.h>height)throw Error('Atlas: frame fora da spritesheet: '+key);
    frames[key]=f;
   }
   const states={};
   for(const state of STATES){
    const raw=atlas.animations[state];
    if(raw==null)continue;
    const entries=Array.isArray(raw)?raw:raw.frames;
    if(!Array.isArray(entries)||!entries.length||entries.length>24)throw Error('Atlas: animação '+state+' precisa de 1–24 frames.');
    const fps=Array.isArray(raw)?8:Number(raw.fps??8);
    if(!Number.isFinite(fps)||fps<1||fps>30)throw Error('Atlas: fps inválido em '+state);
    const sframes=entries.map(id=>{
      if(typeof id==='string'){
       if(!frames[id])throw Error('Atlas: frame desconhecido '+id);
       return {...frames[id]};
      }
      const f=frameRect(id);
      if(!f||f.x+f.w>width||f.y+f.h>height)throw Error('Atlas: frame de animação inválido');
      return f;
    });
    const boxes=Array.isArray(raw?.hitboxes)?raw.hitboxes:[];
    if(boxes.length>48)throw Error('Atlas: hitboxes demais.');
    const hitboxes=boxes.map(h=>{
     if(!h||!Number.isInteger(h.frame)||h.frame<0||h.frame>=sframes.length||
      !['x','y','w','h'].every(k=>Number.isInteger(h[k]))||
      h.x<0||h.y<0||h.w<1||h.h<1||h.w>128||h.h>128||
      h.x+h.w>128||h.y+h.h>128)throw Error('Atlas: hitbox inválida em '+state);
     return {frame:h.frame,x:h.x,y:h.y,w:h.w,h:h.h};
    });
    const activeBoxes=boxes.length?hitboxes:state==='attack'?[
      {frame:Math.min(1,sframes.length-1),x:12,y:3,w:6,h:11}
     ]:[];
    states[state]={fps,
     loop:Array.isArray(raw)?state!=='attack'&&state!=='hurt':
      raw.loop===undefined?(state!=='attack'&&state!=='hurt'):raw.loop!==false,
     frames:sframes,hitboxes:activeBoxes};
   }
   if(!states.idle)throw Error('Atlas: animação idle obrigatória.');
   for(const state of STATES)if(!states[state])states[state]=states.idle;
   return states;
  }
  function gridAtlas(width,height){
   if(width%4||height%4||width/4<8||height/4<8||width/4>128||height/4>128)
    throw Error('Sem atlas JSON, a imagem deve possuir grade de 4 colunas por 4 linhas (células de 8–128px).');
   const w=width/4,h=height/4,frames={},animations={};
   for(let y=0;y<4;y++)for(let x=0;x<4;x++)frames['f'+y+'_'+x]={x:x*w,y:y*h,w,h};
   ['idle','walk','attack','hurt'].forEach((s,y)=>{
    animations[s]={fps:s==='attack'?12:8,loop:s!=='attack'&&s!=='hurt',
      frames:Array.from({length:4},(_,x)=>'f'+y+'_'+x)};
   });
   animations.jump=animations.idle;
   return {frames,animations};
  }
  function verify(role,definition){
   if(!roles.includes(role))throw Error('Papel de sprite desconhecido.');
   if(!definition||typeof definition!=='object'||Array.isArray(definition))throw Error('Sprite inválida');
   const {image,width,height}=definition;
   if(typeof image!=='string'||image.length<80||image.length>700000||
    !/^data:image\/(?:png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image))
    throw Error('Spritesheet deve ser PNG/WEBP inline até 525 KB base64.');
   const states=validateAtlas({frames:definition.frames||definition.atlas?.frames,
     animations:definition.animations||definition.atlas?.animations},width,height);
   return {image,width,height,states};
  }
  function procedural(role){
   if(typeof document==='undefined')return null;
   const canvas=document.createElement('canvas');canvas.width=16*4;canvas.height=16*4;
   const ctx=canvas.getContext('2d');if(!ctx)return null;
   ctx.imageSmoothingEnabled=false;
   const enemy=role==='enemy';
   for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    const x=col*16,y=row*16,step=row===1?col%2:0;
    ctx.fillStyle=enemy?'#df7d69':'#f8cd9d';ctx.fillRect(x+4,y+1,8,6);
    ctx.fillStyle=enemy?'#87405e':'#34628c';ctx.fillRect(x+3,y+7,10,6);
    ctx.fillStyle='#181b35';ctx.fillRect(x+10,y+3,2,2);
    ctx.fillStyle=enemy?'#3a263c':'#2b354d';
    ctx.fillRect(x+3-step,y+13,4,3);ctx.fillRect(x+9+step,y+13,4,3);
    if(row===2){ctx.fillStyle=enemy?'#ff8e74':'#ffe08a';ctx.fillRect(x+12,y+6,3+col%2,2);}
    if(row===3){ctx.fillStyle='#ffffff88';ctx.fillRect(x+2,y+2,12,1);}
   }
   return canvas;
  }
  const defs={};
  const images={};
  for(const role of roles){
   try{defs[role]=settings?.[role]?verify(role,settings[role]):null;}
   catch(e){throw Error(role+': '+e.message);}
   if(defs[role]){
    if(typeof Image!=='undefined'){
     const img=new Image();img.src=defs[role].image;images[role]=img;
    }
   }else{
    const canvas=procedural(role);
    images[role]=canvas;
    const frames={};const animations={};
    for(let row=0;row<4;row++)for(let col=0;col<4;col++)
     frames['f'+row+'_'+col]={x:col*16,y:row*16,w:16,h:16};
    for(const [i,state] of ['idle','walk','attack','hurt'].entries())
     animations[state]={fps:state==='attack'?12:8,loop:state!=='attack'&&state!=='hurt',
      frames:Array.from({length:4},(_,j)=>'f'+i+'_'+j),
      hitboxes:state==='attack'?[{frame:1,x:12,y:4,w:5,h:9},{frame:2,x:12,y:4,w:5,h:9}]:[]};
    animations.jump=animations.idle;
    defs[role]={states:validateAtlas({frames,animations},64,64),width:64,height:64};
   }
  }
  function create(role){
   if(!roles.includes(role))throw Error('Animator: papel desconhecido');
   return {role,state:'idle',time:0,frame:0,finished:false,
    attackSerial:0,hitSerial:0,activeHitboxes:[],stateChanged:0};
  }
  function transition(ctrl,next){
   if(ctrl.state===next)return false;
   ctrl.state=next;ctrl.time=0;ctrl.frame=0;ctrl.finished=false;
   ctrl.activeHitboxes=[];ctrl.stateChanged++;
   if(next==='attack')ctrl.attackSerial++;
   return true;
  }
  function update(ctrl,dt,inputs={}){
   const def=defs[ctrl.role].states;
   // Ataque/dano são gatilhos, nunca reiniciados enquanto sua animação executa.
   if(inputs.hurt&&ctrl.state!=='hurt')transition(ctrl,'hurt');
   else if(inputs.attack&&ctrl.state!=='attack'&&ctrl.state!=='hurt')transition(ctrl,'attack');
   if((ctrl.state==='attack'||ctrl.state==='hurt')&&ctrl.finished)
    transition(ctrl,inputs.jump?'jump':inputs.move?'walk':'idle');
   if(ctrl.state!=='attack'&&ctrl.state!=='hurt')
    transition(ctrl,inputs.jump?'jump':inputs.move?'walk':'idle');
   const active=def[ctrl.state]||def.idle;
   const oldFrame=ctrl.frame;
   ctrl.time+=Math.max(0,Math.min(.2,Number(dt)||0));
   const step=Math.floor(ctrl.time*active.fps);
   ctrl.frame=active.loop?step%active.frames.length:Math.min(step,active.frames.length-1);
   ctrl.finished=!active.loop&&step>=active.frames.length;
   ctrl.activeHitboxes=(active.hitboxes||[]).filter(h=>h.frame===ctrl.frame);
   if(ctrl.frame!==oldFrame&&ctrl.activeHitboxes.length)ctrl.hitSerial++;
   return ctrl;
  }
  function draw(ctx,ctrl,x,y,dir=1){
   const image=images[ctrl.role];
   if(!image||image.complete===false||('naturalWidth'in image&&!image.naturalWidth))return false;
   const def=defs[ctrl.role].states[ctrl.state]||defs[ctrl.role].states.idle;
   const f=def.frames[ctrl.frame]||def.frames[0];if(!f)return false;
   const dw=Math.min(40,Math.max(16,f.w)),dh=Math.min(40,Math.max(16,f.h));
   ctx.save();ctx.imageSmoothingEnabled=false;
   ctx.translate(Math.floor(x+8),Math.floor(y+16));
   if(dir<0)ctx.scale(-1,1);
   ctx.drawImage(image,f.x,f.y,f.w,f.h,Math.floor(-dw/2),-dh,dw,dh);
   ctx.restore();
   return true;
  }
  function hitboxes(ctrl,entity){
   // Controle de frame não altera a física de colisão: estes retângulos só acertam inimigos.
   if(ctrl.state!=='attack')return [];
   const frame=defs[ctrl.role].states.attack.frames[ctrl.frame];
   const scale=frame?Math.min(40,Math.max(16,frame.w))/frame.w:1;
   return (ctrl.activeHitboxes||[]).map(h=>({
    x:entity.face<0?entity.x-h.x*scale-h.w*scale+16:entity.x+h.x*scale,
    y:entity.y+h.y*scale,w:h.w*scale,h:h.h*scale
   }));
  }
  function snapshot(ctrl){return {role:ctrl.role,state:ctrl.state,frame:ctrl.frame,finished:ctrl.finished,hitSerial:ctrl.hitSerial,
   boxes:ctrl.activeHitboxes.length};}
  return {STATES,verify,validateAtlas,gridAtlas,create,update,draw,hitboxes,snapshot,
   hasCustom:role=>!!settings?.[role]};
 }
 root.gameForgeSNES2DAnimatorFactory=gameForgeSNES2DAnimatorFactory;
 if(typeof module!=='undefined')module.exports=gameForgeSNES2DAnimatorFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
