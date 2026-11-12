/* A funcao abaixo e serializada como arquivo game.js ao gerar um jogo local.
   Nao depende de bibliotecas ou de conexao de rede. */
function gameForgeBoot() {
  'use strict';
  const spec = GAME_SPEC;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = 960, H = 540;
  const $ = id => document.getElementById(id);
  canvas.width = W; canvas.height = H;
  const color = spec.colors || {bg:'#132235',accent:'#77e4be',ground:'#223247',enemy:'#ff7979'};
  const stages = spec.stages && spec.stages.length ? spec.stages : ['Fase 1'];
  const keys = new Set();
  const touch = {up:false,down:false,left:false,right:false,fire:false};
  const clamp = (n, a, b) => Math.max(a, Math.min(b,n));
  const rand = (a,b) => a + Math.random() * (b - a);
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  let stage = 0, hp = 100, score = 0, ammo = 40, xp = 0, upgrades = 0;
  let state = 'menu', paused = false, clock = 0, stageClock = 0, lastTime = 0, renderedFrames=0;
  let player = {x:W/2,y:H/2,r:17,vx:0,vy:0,angle:0};
  let enemies=[], bullets=[], drops=[], particles=[], platforms=[], obstacles=[];
  let cameraX=0, traveled=0, invulnerable=0, fireDelay=0;
  let mouse={x:W/2,y:H/2,active:false};
  const showMessage = (txt, seconds=3) => { $('message').textContent=txt; $('message').style.opacity='1'; messageTime=seconds; };
  let messageTime = 0;
  function input(name) { return keys.has(name) || !!touch[name]; }
  function resetStage() {
    state='play'; paused=false; stageClock=0; invulnerable=0; fireDelay=0;
    enemies=[];bullets=[];drops=[];particles=[];platforms=[];obstacles=[];
    cameraX=0;traveled=0;
    if (spec.genre === 'platform') {
      player={x:70,y:350,vx:0,vy:0,r:17,angle:0};
      for(let i=0;i<25;i++){
        const x=i*180+15;
        const y=i===0?480:clamp(405+Math.sin(i*2.13)*90,300,470);
        platforms.push({x,y,w:i===0?380:165,h:22});
      }
      for(let i=1;i<14+stage*3;i++) enemies.push({x:320+i*220,y:344,r:18,hp:1,phase:rand(0,6),speed:35});
      for(let i=0;i<13;i++) drops.push({x:200+i*260,y:245+Math.sin(i*1.6)*65,r:11,kind:'coin'});
    } else if(spec.genre==='racing') {
      player={x:W/2,y:H-100,r:19,vx:0,vy:0,angle:0};
      for(let i=0;i<18+stage*5;i++) obstacles.push({x:W/2+[-125,0,125][i%3],y:-i*175,r:23,speed:70+stage*10,kind:i%4===0?'cone':'car'});
    } else {
      player={x:W/2,y:H/2,r:17,vx:0,vy:0,angle:0};
      for(let i=0;i<6+stage*3;i++) addEnemy(i===5+stage*3 && spec.features.bosses);
      for(let i=0;i<5;i++) drops.push({x:rand(70,W-70),y:rand(85,H-65),r:10,kind:i===0?'heal':'coin'});
    }
    showMessage(stages[stage]||`Fase ${stage+1}`,3);
  }
  function addEnemy(boss=false) {
    const edge=Math.floor(rand(0,4));
    const x=edge<2? (edge===0?25:W-25):rand(25,W-25);
    const y=edge>=2? (edge===2?25:H-25):rand(25,H-25);
    enemies.push({x,y,r:boss?31:15,hp:boss?8+stage*2:2+Math.floor(stage/2),boss,speed:boss?34:45+stage*5,phase:rand(0,6)});
  }
  function start() {stage=0;hp=100;score=0;ammo=40;xp=0;upgrades=0;clock=0;resetStage();}
  function nextStage() {
    if(stage+1>=stages.length){state='victory';$('overlay').classList.remove('hidden');$('overlay-title').textContent='Jogo concluído!';$('overlay-sub').textContent=`Pontuação final: ${score}`;$('start').textContent='Recomeçar';return;}
    stage++;hp=clamp(hp+25,0,100);ammo+=25;resetStage();
  }
  function gameOver(){state='defeat';$('overlay').classList.remove('hidden');$('overlay-title').textContent='Fim de jogo';$('overlay-sub').textContent=`Pontuação: ${score} · Tente novamente`; $('start').textContent='Recomeçar';}
  function damage(v){if(invulnerable>0)return;hp=Math.max(0,hp-v);invulnerable=0.7;if(hp<=0)gameOver();}
  const isPressed = k => keys.has(k);
  function stepArena(dt){
    const dx=(input('right')||isPressed('d')||isPressed('ArrowRight')?1:0)-(input('left')||isPressed('a')||isPressed('ArrowLeft')?1:0);
    const dy=(input('down')||isPressed('s')||isPressed('ArrowDown')?1:0)-(input('up')||isPressed('w')||isPressed('ArrowUp')?1:0);
    const mag=Math.max(1,Math.hypot(dx,dy)),speed=210+upgrades*12;
    player.x=clamp(player.x+dx/mag*speed*dt,22,W-22); player.y=clamp(player.y+dy/mag*speed*dt,48,H-26);
    if(mouse.active)player.angle=Math.atan2(mouse.y-player.y,mouse.x-player.x);
    else if(dx||dy)player.angle=Math.atan2(dy,dx);
    const shooting=input('fire')||isPressed(' ')||isPressed('Enter')||mouse.down;
    if(shooting&&fireDelay<=0&&ammo>0){
      ammo--;fireDelay=.18;
      const a=mouse.active?Math.atan2(mouse.y-player.y,mouse.x-player.x):player.angle;
      bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*600,vy:Math.sin(a)*600,r:5});
    }
    for(const b of bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;}
    bullets=bullets.filter(b=>b.x>0&&b.x<W&&b.y>38&&b.y<H);
    for(const e of enemies){
      const a=Math.atan2(player.y-e.y,player.x-e.x);e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt;
      if(dist(e,player)<e.r+player.r)damage(e.boss?18:10);
      for(const b of bullets)if(!b.dead && dist(b,e)<b.r+e.r){b.dead=true;e.hp--;if(e.hp<=0){e.dead=true;score+=e.boss?250:50;xp+=1; if(Math.random()<.24)drops.push({x:e.x,y:e.y,r:10,kind:Math.random()<.25?'heal':'ammo'});for(let i=0;i<9;i++)particles.push({x:e.x,y:e.y,vx:rand(-120,120),vy:rand(-120,120),ttl:.5});}break;}
    }
    bullets=bullets.filter(b=>!b.dead);enemies=enemies.filter(e=>!e.dead);
    if(enemies.length===0)nextStage();
    collectDrops();
  }
  function collectDrops(){for(const d of drops){if(dist(player,d)<player.r+d.r+7){d.dead=true;if(d.kind==='heal')hp=clamp(hp+30,0,100);else if(d.kind==='ammo')ammo+=15;else {score+=20;xp+=1;} }}drops=drops.filter(d=>!d.dead);}
  function stepPlatform(dt){
    const dx=(input('right')||isPressed('d')||isPressed('ArrowRight')?1:0)-(input('left')||isPressed('a')||isPressed('ArrowLeft')?1:0);
    const jump=input('up')||isPressed('w')||isPressed('ArrowUp')||isPressed(' ');
    player.vx=dx*(205+upgrades*15);
    const bottom=player.y+player.r; const oldBottom=bottom;
    if(jump&&player.grounded){player.vy=-480;player.grounded=false;}
    player.vy+=1050*dt;player.x+=player.vx*dt;player.y+=player.vy*dt;
    player.grounded=false;
    for(const p of platforms){if(player.x+player.r>p.x&&player.x-player.r<p.x+p.w&&oldBottom<=p.y+12&&player.y+player.r>=p.y&&player.vy>=0){player.y=p.y-player.r;player.vy=0;player.grounded=true;}}
    if(player.y>H+110)damage(100);
    cameraX=clamp(player.x-220,0,4200);
    for(const e of enemies){e.phase+=dt;e.y=355+Math.sin(e.phase)*35;if(dist(player,e)<player.r+e.r+4){damage(12);e.dead=true;}}
    enemies=enemies.filter(e=>!e.dead);
    collectDrops();
    if(player.x>3900)nextStage();
  }
  function stepRacing(dt){
    const dx=(input('right')||isPressed('d')||isPressed('ArrowRight')?1:0)-(input('left')||isPressed('a')||isPressed('ArrowLeft')?1:0);
    const boost=(input('fire')||isPressed(' '))?1.45:1;
    const speed=(260+stage*33+upgrades*24)*boost;
    player.x=clamp(player.x+dx*270*dt,294,665);
    traveled+=speed*dt;
    for(const o of obstacles){o.y+=(speed-o.speed)*dt; if(Math.hypot(player.x-o.x,player.y-o.y)<player.r+o.r){o.y=H+130;damage(o.kind==='cone'?8:23);}}
    obstacles=obstacles.filter(o=>o.y<H+90);
    if(obstacles.length<11){obstacles.push({x:W/2+[-125,0,125][Math.floor(rand(0,3))],y:-200,r:23,speed:65+stage*8,kind:Math.random()<.25?'cone':'car'});}
    if(traveled>6000+stage*1500)nextStage();
  }
  function update(dt){
    if(state!=='play'||paused)return;
    clock+=dt;stageClock+=dt;fireDelay-=dt;invulnerable-=dt;messageTime-=dt;
    if(messageTime<=0)$('message').style.opacity='0';
    if(spec.genre==='platform')stepPlatform(dt);
    else if(spec.genre==='racing')stepRacing(dt);
    else stepArena(dt);
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.ttl-=dt;}
    particles=particles.filter(p=>p.ttl>0);
    if(spec.features.upgrades&&xp>0&&xp%9===0&&xp!==player.lastUpgradeXp){player.lastUpgradeXp=xp;upgrades++;showMessage('Melhoria desbloqueada! Velocidade +',2);}
    $('health').textContent=Math.ceil(hp);
    $('score').textContent=score;
    $('ammo').textContent=spec.genre==='arena'?ammo:'—';
    $('level').textContent=`${stage+1}/${stages.length}`;
    $('mission').textContent=(stages[stage]||'Fase')+(spec.genre==='racing'?` · ${Math.floor(traveled/10)}m`:spec.genre==='arena'?` · ${enemies.length} inimigos`:'');
    if(spec.features.timer){$('timer').textContent=`${Math.floor(stageClock)}s`;}
  }
  function background(){
    ctx.fillStyle=color.bg;ctx.fillRect(0,0,W,H);
    if(spec.genre==='racing'){
      ctx.fillStyle='#1a3240';ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#343a47';ctx.fillRect(258,0,444,H);
      ctx.fillStyle='#d4a84e';ctx.fillRect(270,0,6,H);ctx.fillRect(687,0,6,H);
      for(let i=0;i<13;i++){let y=(i*66+traveled*1.15)%780-100;ctx.fillStyle='#b4bdc7';ctx.fillRect(406,y,5,35);ctx.fillRect(554,y,5,35);}
      for(let i=0;i<12;i++){ctx.fillStyle=i%2?'#304b5d':'#1e394c';ctx.fillRect(i*85,-5,42,H+20);}
      ctx.fillStyle='#343a47';ctx.fillRect(258,0,444,H);
      ctx.fillStyle='#d4a84e';ctx.fillRect(270,0,6,H);ctx.fillRect(687,0,6,H);
      for(let i=0;i<13;i++){let y=(i*66+traveled*1.15)%780-100;ctx.fillStyle='#c1c4d1';ctx.fillRect(405,y,5,35);ctx.fillRect(555,y,5,35);}
    }else if(spec.genre==='platform'){
      ctx.fillStyle='#24455d';ctx.fillRect(0,390,W,150);
      for(let i=0;i<16;i++){const x=((i*183-cameraX*.25)%1300+1300)%1300-160;ctx.fillStyle=i%3?'#173448':'#28516a';ctx.beginPath();ctx.moveTo(x,420);ctx.lineTo(x+100,155+Math.sin(i)*55);ctx.lineTo(x+230,420);ctx.fill();}
    }else{
      ctx.strokeStyle='#ffffff0e';ctx.lineWidth=1;
      for(let x=0;x<W;x+=46){ctx.beginPath();ctx.moveTo(x,40);ctx.lineTo(x,H);ctx.stroke();}
      for(let y=40;y<H;y+=46){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
      ctx.strokeStyle='#ffffff1b';ctx.strokeRect(22,50,W-44,H-72);
    }
  }
  function drawPlayer(x,y){
    ctx.save();ctx.translate(x,y);
    if(invulnerable>0&&Math.floor(clock*18)%2===0)ctx.globalAlpha=.4;
    if(spec.genre==='racing'){
      ctx.fillStyle='#111822';ctx.fillRect(-17,-38,34,74);
      ctx.fillStyle=color.accent;ctx.fillRect(-15,-27,30,54);
      ctx.fillStyle='#74c2d4';ctx.fillRect(-11,-17,22,13);ctx.fillRect(-11,12,22,9);
      ctx.fillStyle='#080e1b';ctx.fillRect(-21,-27,6,15);ctx.fillRect(15,-27,6,15);ctx.fillRect(-21,13,6,15);ctx.fillRect(15,13,6,15);
    }else{
      if(spec.genre!=='platform')ctx.rotate(player.angle);
      ctx.shadowColor=color.accent;ctx.shadowBlur=14;
      ctx.fillStyle=color.accent;ctx.beginPath();ctx.arc(0,0,17,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle='#071b20';ctx.fillRect(5,-4,19,8);
      ctx.fillStyle='#ddf8f0';ctx.beginPath();ctx.arc(-4,-5,5,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  function render(){
    background();
    ctx.save();if(spec.genre==='platform')ctx.translate(-cameraX,0);
    if(spec.genre==='platform'){
      for(const p of platforms){ctx.fillStyle=color.ground;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle=color.accent;ctx.fillRect(p.x,p.y,p.w,5);}
    }
    for(const d of drops){ctx.fillStyle=d.kind==='heal'?'#ef6e93':d.kind==='ammo'?'#85caff':'#f9c762';ctx.beginPath();ctx.arc(d.x,d.y,d.r+Math.sin(clock*6)*2,0,Math.PI*2);ctx.fill();}
    for(const o of obstacles){ctx.fillStyle=o.kind==='cone'?'#f2aa4b':color.enemy;ctx.fillRect(o.x-20,o.y-32,40,64);ctx.fillStyle='#21293c';ctx.fillRect(o.x-14,o.y-15,28,20);}
    for(const e of enemies){ctx.fillStyle=e.boss?'#ae6edb':color.enemy;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#281625';ctx.fillRect(e.x-7,e.y-5,5,5);ctx.fillRect(e.x+4,e.y-5,5,5);}
    for(const b of bullets){ctx.fillStyle='#f8d580';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();}
    for(const p of particles){ctx.fillStyle=color.enemy;ctx.fillRect(p.x,p.y,4,4);}
    drawPlayer(player.x,player.y);ctx.restore();
    if(state==='play'&&paused){ctx.fillStyle='#0b1024be';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 44px sans-serif';ctx.textAlign='center';ctx.fillText('PAUSADO',W/2,H/2);ctx.textAlign='left';}
  }
  window.__gameforgeTelemetry = () => ({state,paused,frames:renderedFrames,clock,stage,genre:spec.genre,player:{x:player.x,y:player.y,screenX:player.x-(spec.genre==='platform'?cameraX:0),screenY:player.y,radius:player.r},enemies:enemies.length});
  function frame(ms){
    const dt=Math.min(.033, Math.max(0,(ms-lastTime)/1000));lastTime=ms;
    update(dt);render();renderedFrames++;requestAnimationFrame(frame);
  }
  const prevent = new Set([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
  window.addEventListener('keydown',e=>{
    if(prevent.has(e.key))e.preventDefault();
    keys.add(e.key);keys.add(e.key.toLowerCase());
    if(e.key==='Escape'&&state==='play'){paused=!paused;showMessage(paused?'Pausado':'Continuar',1);}
    if(e.key==='r'&&state!=='play'){ $('start').click(); }
  });
  window.addEventListener('keyup',e=>{keys.delete(e.key);keys.delete(e.key.toLowerCase());});
  canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)*W/r.width;mouse.y=(e.clientY-r.top)*H/r.height;mouse.active=true;});
  canvas.addEventListener('pointerdown',()=>{mouse.down=true;});
  window.addEventListener('pointerup',()=>mouse.down=false);
  document.querySelectorAll('[data-control]').forEach(button=>{
    const name=button.dataset.control;
    button.addEventListener('pointerdown',e=>{e.preventDefault();touch[name]=true;button.setPointerCapture(e.pointerId);});
    ['pointerup','pointercancel','lostpointercapture'].forEach(type=>button.addEventListener(type,()=>touch[name]=false));
  });
  $('start').addEventListener('click',()=>{$('overlay').classList.add('hidden');start();canvas.focus();});
  $('pause').addEventListener('click',()=>{if(state==='play')paused=!paused;});
  $('restart').addEventListener('click',()=>{start();$('overlay').classList.add('hidden');});
  $('title').textContent=spec.title||'Meu jogo';
  $('overlay-title').textContent=spec.title||'Meu jogo';
  $('overlay-sub').textContent='Jogo gerado a partir de um GDD. Use WASD / setas e espaço.';
  if(spec.genre==='racing')$('control-help').textContent='Setas / A-D: direção · Espaço: turbo · Esc: pausa';
  else if(spec.genre==='platform')$('control-help').textContent='Setas / A-D: andar · Espaço: pular · Esc: pausa';
  else $('control-help').textContent='WASD: mover · mouse: mirar · clique / espaço: atirar · Esc: pausa';
  if(!spec.features.timer)$('timer-pill').style.display='none';
  requestAnimationFrame(frame);
}
if (typeof globalThis !== 'undefined') globalThis.gameForgeBoot = gameForgeBoot;
if (typeof module !== 'undefined') module.exports = gameForgeBoot;
