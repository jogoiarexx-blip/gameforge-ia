/* GF-SNES-01 — motor original GameForge com mundo em chunks inspirado no SNES Engine.
 * Este boot é serializado no game.js; sem bibliotecas, downloads ou ROM de console.
 */
(function(root){
 'use strict';
 function gameForgeSNES2DBoot(){
  'use strict';
  const spec=GAME_SPEC,world=GameForgeSNES2D,animator=typeof GameForgeSNES2DAnimator!=='undefined'?GameForgeSNES2DAnimator:null;
  if(!world||spec.engineMode!=='snes2d'||!['platform','rpg'].includes(spec.genre))
   throw Error('Configuração SNES 2D inválida.');
  const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
  const $=id=>document.getElementById(id);
  const W=512,H=288,platform=spec.genre==='platform';
  canvas.width=W;canvas.height=H;ctx.imageSmoothingEnabled=false;
  const stages=Array.isArray(spec.stages)&&spec.stages.length?spec.stages:['Primeira fase'];
  const keys=new Set(),touch={left:false,right:false,up:false,down:false,fire:false};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const stateId='gameforge-snes2d-v1-'+String(spec.title).slice(0,60);
  if(!animator||typeof animator.create!=='function')throw Error('GF-SNES-02 exige Animator Controller no game.js; regenere o jogo no Studio.');
  let state='menu',paused=false,frames=0,last=0,ticks=0,stage=0,health=3,score=0;
  let edit=false,gamepadLast=false,jumpLast=false,lastAttack=false,damageCooldown=0,elapsed=0,toastUntil=0;
  let player={x:32,y:platform?195:62,w:13,h:16,vx:0,vy:0,onGround:false,face:1};
  let enemies=[],crystals=[],required=0,collected=0,exit={x:0,y:0};
  let camera=world.createCamera(),lastMove=0,lastJump=0;
  const text=id=>$(id);
  const show=(message,seconds=2)=>{
   text('message').textContent=message;text('message').style.opacity='1';toastUntil=elapsed+seconds;
  };
  const curtain=(title,subtitle,action)=>{
   text('overlay-title').textContent=title;text('overlay-sub').textContent=subtitle;
   text('start').textContent=action;text('overlay').classList.remove('hidden');
  };
  function loadLevel(index){
   stage=clamp(index,0,stages.length-1);
   world.build(stage);camera=world.createCamera();edit=false;damageCooldown=0;
   const bounds=world.info();
   player={x:32,y:platform?176:62,w:13,h:16,vx:0,vy:0,onGround:false,face:1,
    animator:animator.create('player')};
   if(platform){player.y=14*16-player.h;player.onGround=true;}
   enemies=[];crystals=[];
   const yStart=platform?204:100,qty=3+Math.min(stage,5);
   const spacing=platform?Math.floor((bounds.width-180)/(qty+1)):Math.floor((bounds.width-180)/(qty+1));
   for(let i=0;i<qty;i++){
    let x=110+(i+1)*spacing;
    let y=yStart;
    if(!platform){y=96+(i%3)*88;}
    crystals.push({x,y,taken:false});
   }
   required=crystals.length;collected=0;
   exit={x:bounds.width-44,y:platform?176:bounds.height-60};
   for(let i=0;i<Math.min(2+stage,7);i++){
    const x=platform?280+i*240:200+i*170,y=platform?208:80+(i%3)*90;
    if(world.blocked(x,y,13,14))continue;
    enemies.push({x,y,w:13,h:14,home:x,phase:i*0.7,dir:i%2?1:-1,alive:true,
     face:i%2?1:-1,animator:animator.create('enemy')});
   }
   updateHud();
  }
  function updateHud(){
   text('health').textContent=health+' ♥';
   text('score').textContent=score;
   text('ammo').textContent=collected+'/'+required+' cristais';
   text('level').textContent=(stage+1)+'/'+stages.length;
   text('timer').textContent=Math.floor(elapsed)+'s';
   text('mission').textContent=(stages[stage]||'Fase')+' · '+(collected===required?'Saída liberada':'Colete os cristais');
   text('control-help').textContent=platform?
    'A/D/setas: mover · espaço: pular · X: atacar · T: mapa · P: pausa':
    'WASD/setas: explorar · espaço: ataque · T: editar tiles · P: pausa';
   text('pause').textContent=paused?'Continuar':'Pausar';
  }
  function begin(){
   keys.clear();Object.keys(touch).forEach(k=>touch[k]=false);
   stage=0;health=3;score=0;elapsed=0;frames=0;last=0;ticks=0;lastAttack=false;jumpLast=false;
   loadLevel(0);state='play';paused=false;edit=false;
   text('overlay').classList.add('hidden');show('Mundo em tiles pronto!');updateHud();
  }
  function nextLevel(){
   if(stage+1>=stages.length){
    state='won';paused=false;curtain('Campanha concluída!','Você percorreu '+stages.length+' fase(s) e coletou '+score+' pontos.','Jogar novamente');return;
   }
   loadLevel(stage+1);show('Fase '+(stage+1)+': '+stages[stage]);
  }
  function injure(){
   if(damageCooldown>0||state!=='play')return;
   damageCooldown=1.3;health--;show('Cuidado! -1 vida');
   if(health<=0){state='lost';curtain('Fim de jogo','Você pode tentar novamente e conhecer os outros mapas.','Tentar de novo');}
   else{player.x=32;player.y=platform?14*16-player.h:62;player.vy=0;camera=world.createCamera();}
  }
  const motion=(name,aliases)=>{
   if(touch[name])return true;
   return aliases.some(k=>keys.has(k));
  };
  function update(dt){
   if(paused||state!=='play'||edit)return;
   elapsed+=dt;damageCooldown=Math.max(0,damageCooldown-dt);
   let left=motion('left',['ArrowLeft','a','A']),right=motion('right',['ArrowRight','d','D']);
   let up=motion('up',['ArrowUp','w','W']),down=motion('down',['ArrowDown','s','S']);
   let jump=motion('fire',[' ','Space','z','Z']);
   const pad=typeof navigator!=='undefined'?navigator.getGamepads?.()?.find(p=>p&&p.connected):null;
   if(pad){
    left=left||(pad.axes?.[0]||0)<-.3;right=right||(pad.axes?.[0]||0)>.3;
    up=up||(pad.axes?.[1]||0)<-.3;down=down||(pad.axes?.[1]||0)>.3;
    jump=jump||!!(pad.buttons?.[0]?.pressed);
   }
   const axis=Number(right)-Number(left),v=axis*135*(spec.tuning?.playerSpeedMultiplier||1);
   const attack=platform?(keys.has('x')||keys.has('X')):jump;
   const attackEdge=attack&&!lastAttack;
   lastAttack=attack;
   if(axis)player.face=axis;
   if(platform){
    if(jump&&!jumpLast&&player.onGround){player.vy=-292;player.onGround=false;show('Pulo!',.5);}
    player.vy=clamp(player.vy+680*dt,-330,420);
    const hit=world.move(player,v*dt,player.vy*dt);
    if(hit.hitY){if(player.vy>0)player.onGround=true;player.vy=0;}
    else player.onGround=false;
    if(player.y>=world.info().height-player.h-1)injure();
   }else{
    const vx=axis,vy=Number(down)-Number(up),mag=Math.max(1,Math.hypot(vx,vy));
    world.move(player,vx/mag*128*dt,vy/mag*128*dt);
   }
   jumpLast=jump;
   animator.update(player.animator,dt,{move:!!axis||(!platform&&(up||down)),
    jump:platform&&!player.onGround,attack:attackEdge,hurt:damageCooldown>1.1});
   // Hitboxes saem do quadro real de ataque e não do simples botão pressionado.
   for(const hit of animator.hitboxes(player.animator,player)){
    for(const enemy of enemies){
     if(!enemy.alive||enemy.lastHitSerial===player.animator.attackSerial)continue;
     if(hit.x<enemy.x+enemy.w&&hit.x+hit.w>enemy.x&&
      hit.y<enemy.y+enemy.h&&hit.y+hit.h>enemy.y){
      enemy.alive=false;enemy.lastHitSerial=player.animator.attackSerial;
      score+=25;show('Golpe certeiro! +25');break;
     }
    }
   }
   for(const enemy of enemies){
    if(!enemy.alive)continue;
    enemy.phase+=dt;
    const delta=enemy.dir*(platform?27:16)*dt;
    const nextX=enemy.x+delta;
    if(Math.abs(nextX-enemy.home)>32||world.blocked(nextX,enemy.y,enemy.w,enemy.h))enemy.dir*=-1;
    else enemy.x=nextX;
    enemy.face=enemy.dir;
    animator.update(enemy.animator,dt,{move:true});
    if(Math.abs(enemy.x-player.x)<13&&Math.abs(enemy.y-player.y)<16)injure();
   }
   for(const crystal of crystals)if(!crystal.taken&&Math.abs(crystal.x-player.x)<16&&Math.abs(crystal.y-player.y)<24){
    crystal.taken=true;collected++;score+=10;show('Cristal coletado! +10');
   }
   if(collected>=required&&Math.abs(player.x-exit.x)<24&&Math.abs(player.y-exit.y)<36)nextLevel();
   world.updateCamera(camera,player,dt,player.face);
   updateHud();
  }
  function sprite(x,y,mode,frame=0,entity=null){
   if(entity?.animator&&animator.draw(ctx,entity.animator,x-camera.x,y-camera.y,entity.face??1))return;
   ctx.save();
   ctx.translate(Math.floor(x-camera.x),Math.floor(y-camera.y));
   if(mode==='player'){
    ctx.fillStyle=damageCooldown>0&&frames%6<3?'#ffe3d3':'#f6caa3';ctx.fillRect(3,0,8,6);
    ctx.fillStyle='#263d60';ctx.fillRect(2,6,10,7);
    ctx.fillStyle='#e9cd5b';ctx.fillRect(0,8,3,4);
    ctx.fillStyle='#253044';ctx.fillRect(3,13,3,3);ctx.fillRect(8+frame%2,13,3,3);
    ctx.fillStyle='#191f36';ctx.fillRect(player.face===1?9:5,2,2,2);
   }else{
    ctx.fillStyle='#c85865';ctx.fillRect(2,1,10,11);
    ctx.fillStyle='#ffcab5';ctx.fillRect(3,3,8,5);
    ctx.fillStyle='#20182a';ctx.fillRect(5+frame%2,4,2,2);ctx.fillRect(9,4,2,2);
    ctx.fillStyle='#7b2d46';ctx.fillRect(2,12,3,2);ctx.fillRect(9,12,3,2);
   }
   ctx.restore();
  }
  function render(){
   ctx.imageSmoothingEnabled=false;
   world.render(ctx,camera,false);
   for(const crystal of crystals){
    if(crystal.taken)continue;
    const x=crystal.x-camera.x,y=crystal.y-camera.y+Math.sin(elapsed*4+crystal.x)*2;
    ctx.fillStyle='#4eccc7';ctx.beginPath();ctx.moveTo(x,y-9);ctx.lineTo(x+7,y);ctx.lineTo(x,y+9);ctx.lineTo(x-7,y);ctx.closePath();ctx.fill();
    ctx.fillStyle='#d6fff7';ctx.fillRect(x-1,y-5,2,9);
   }
   if(collected>=required){
    const x=exit.x-camera.x,y=exit.y-camera.y;
    ctx.fillStyle='#102e30';ctx.fillRect(x-5,y-16,17,39);
    ctx.fillStyle='#72edd1';ctx.fillRect(x-2,y-13,12,34);
    ctx.fillStyle='#d9fff1';ctx.fillRect(x+3,y-10,3,27);
   }else{
    const x=exit.x-camera.x,y=exit.y-camera.y;
    ctx.fillStyle='#242c3a';ctx.fillRect(x-6,y-17,18,40);
    ctx.fillStyle='#dcbd76';ctx.fillRect(x+1,y,5,6);
   }
   for(const enemy of enemies)if(enemy.alive)sprite(enemy.x,enemy.y,'enemy',Math.floor(enemy.phase*6),enemy);
   sprite(player.x,player.y,'player',Math.floor(elapsed*10),player);
   world.render(ctx,camera,true);
   if(edit){
    ctx.strokeStyle='#ffdc65';ctx.lineWidth=1;
    for(let x=-Math.floor(camera.x%16);x<W;x+=16){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=-Math.floor(camera.y%16);y<H;y+=16){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.fillStyle='#081827da';ctx.fillRect(0,0,W,22);
    ctx.fillStyle='#fff5a6';ctx.font='10px monospace';
    ctx.fillText('EDITOR DE TILES · toque: alternar colisão | T: jogar',7,15);
   }
   if(paused&&state==='play'){
    ctx.fillStyle='#08172b99';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='white';ctx.font='bold 24px sans-serif';ctx.fillText('PAUSADO',200,140);
   }
   if(elapsed>toastUntil)text('message').style.opacity='0';
  }
  function loop(timestamp){
   const dt=Math.min(.033,last?(timestamp-last)/1000:1/60);
   last=timestamp;if(state==='play'){frames++;ticks+=dt;if(!paused)update(dt);render();}
   requestAnimationFrame(loop);
  }
  function togglePause(){if(state!=='play')return;paused=!paused;updateHud();}
  function toggleEditor(){if(state!=='play')return;edit=!edit;paused=false;show(edit?'Editor de tiles: toque para alterar obstáculos.':'Editor fechado.');updateHud();}
  document.addEventListener('keydown',e=>{
   if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Space'].includes(e.key))e.preventDefault();
   keys.add(e.key);
   if((e.key==='p'||e.key==='P'||e.key==='Escape')&&!e.repeat)togglePause();
   if((e.key==='t'||e.key==='T')&&!e.repeat)toggleEditor();
  });
  document.addEventListener('keyup',e=>keys.delete(e.key));
  window.addEventListener('blur',()=>{keys.clear();Object.keys(touch).forEach(k=>touch[k]=false);});
  text('start').addEventListener('click',begin);
  text('restart').addEventListener('click',begin);
  text('pause').addEventListener('click',togglePause);
  for(const button of document.querySelectorAll('[data-control]')){
   const control=button.dataset.control,flag=control==='fire'?'fire':control;
   const on=e=>{e.preventDefault();touch[flag]=true;if(button.setPointerCapture&&e.pointerId!=null)try{button.setPointerCapture(e.pointerId)}catch(_){};};
   const off=e=>{e.preventDefault();touch[flag]=false;};
   button.addEventListener('pointerdown',on);
   for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,off);
  }
  canvas.addEventListener('pointerdown',e=>{
   if(!edit||state!=='play')return;
   const rect=canvas.getBoundingClientRect();
   if(!rect.width||!rect.height)return;
   const x=Math.floor((e.clientX-rect.left)*W/rect.width+camera.x)/16*16;
   const y=Math.floor((e.clientY-rect.top)*H/rect.height+camera.y)/16*16;
   const tx=Math.floor(x/16)*16,ty=Math.floor(y/16)*16;
   if(tx<0||ty<0||tx>=world.info().width||ty>=world.info().height)return;
   const previously=world.tileAt('collision',tx,ty);
   // Não alteramos o tile sob o jogador; previne ficar preso em parede editada.
   if(player.x<tx+16&&player.x+player.w>tx&&player.y<ty+16&&player.y+player.h>ty)return;
   world.setTile('collision',tx,ty,previously?0:1);
   world.setTile('foreground',tx,ty,previously?0:5);
   show(previously?'Obstáculo removido':'Obstáculo criado',1);
  });
  window.__gameforgeSNES2D={
   info:()=>world.info(),
   world,
   setTile:(layer,x,y,id)=>world.setTile(layer,x,y,id),
   getTile:(layer,x,y)=>world.tileAt(layer,x,y)
  };
  window.__gameforgeTelemetry=()=>({
   state:paused&&state==='play'?'paused':state,paused,frames,stage,
   stageCount:stages.length,genre:spec.genre,engine:'snes2d',edited:edit,
   player:{x:player.x,y:player.y,vx:player.vx,vy:player.vy,grounded:player.onGround},
   health,score,collected,required,camera:{x:camera.x,y:camera.y},map:world.telemetry(),
   enemies:enemies.filter(x=>x.alive).length,goalUnlocked:collected>=required,
   animation:animator.snapshot(player.animator),customSprites:{player:animator.hasCustom('player'),
    enemy:animator.hasCustom('enemy')}
  });
  loadLevel(0);
  curtain(spec.title,'Motor SNES 2D · tiles e chunks · '+(platform?'Plataforma':'Exploração superior')+' · offline','Jogar agora');
  text('message').style.opacity='0';
  requestAnimationFrame(loop);
 }
 root.gameForgeSNES2DBoot=gameForgeSNES2DBoot;
 if(typeof module!=='undefined')module.exports=gameForgeSNES2DBoot;
})(typeof globalThis!=='undefined'?globalThis:this);
