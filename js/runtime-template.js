/* A funcao abaixo e serializada como arquivo game.js ao gerar um jogo local.
   Nao depende de bibliotecas ou de conexao de rede. */
function gameForgeBoot() {
  'use strict';
 const V=typeof GameForgeGraphics==='object'?GameForgeGraphics:null;
  const spec = GAME_SPEC;
  const tuning={difficulty:1,enemyMultiplier:1,bossMultiplier:1,playerSpeedMultiplier:1,fireRateMultiplier:1,particlesMultiplier:1,...(spec.tuning||{})};
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = 960, H = 540;
  const graphicsSetting=['low','medium','high'].includes(spec.graphicsQuality)?spec.graphicsQuality:'auto';
  let graphicsQuality=graphicsSetting==='auto'?'high':graphicsSetting,graphicsFrameAverage=.016,graphicsSampleCount=0;
  const graphicsDetail=()=>graphicsQuality==='low'?0:graphicsQuality==='medium'?1:2;
  const $ = id => document.getElementById(id);
  canvas.width = W; canvas.height = H;
  const visualPalettes={forest:{bg:'#102f32',accent:'#83e6ac',ground:'#315b4b',enemy:'#ef806b'},neon:{bg:'#10132d',accent:'#54e7f8',ground:'#303364',enemy:'#ff5bb5'},desert:{bg:'#493124',accent:'#f9cf77',ground:'#956a40',enemy:'#db6c51'},ruins:{bg:'#25273a',accent:'#c4a7f5',ground:'#515068',enemy:'#e28a9e'}};
  const color = {...(spec.colors || {bg:'#132235',accent:'#77e4be',ground:'#223247',enemy:'#ff7979'}),...(visualPalettes[spec.visualStyle]||{})};
  const stages = spec.stages && spec.stages.length ? spec.stages : ['Fase 1'];
  const configAt=i=>Array.isArray(spec.stageConfig)&&spec.stageConfig[i]&&typeof spec.stageConfig[i]==='object'?spec.stageConfig[i]:{};
  const keys = new Set();
  const touch = {up:false,down:false,left:false,right:false,fire:false};
  const clamp = (n, a, b) => Math.max(a, Math.min(b,n));
  const rand = (a,b) => a + Math.random() * (b - a);
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  // Núcleo geométrico sem efeitos colaterais, serializado no game.js offline.
  function circlesOverlap(a,b,extra=0){
    if(!a||!b)return false;
    const radius=Math.max(0,a.r)+Math.max(0,b.r)+extra;
    if(!(radius>0))return false;
    const dx=a.x-b.x,dy=a.y-b.y;
    return dx*dx+dy*dy<radius*radius;
  }
  function rectanglesOverlap(a,b){
    return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  }
  // Grade espacial com buffers reutilizados: minimiza lixo temporário a cada frame.
  // A consulta é ordenada pelo índice original, preservando prioridade dos disparos.
  function buildBulletGrid(items,cellSize=64,reuse=null){
    const grid=reuse||{buckets:new Map(),pool:[],queryBuffer:[]};
    if(reuse){
      for(const bucket of grid.buckets.values()){bucket.length=0;grid.pool.push(bucket);}
      grid.buckets.clear();
    }
    grid.cellSize=cellSize;grid.items=items;grid.maxRadius=0;
    for(let i=0;i<items.length;i++){
      const b=items[i],cx=Math.floor(b.x/cellSize),cy=Math.floor(b.y/cellSize);
      const key=cx+','+cy;
      let bucket=grid.buckets.get(key);
      if(!bucket){bucket=grid.pool.pop()||[];grid.buckets.set(key,bucket);}
      bucket.push(i);
      grid.maxRadius=Math.max(grid.maxRadius,Number.isFinite(b.r)?Math.max(0,b.r):0);
    }
    return grid;
  }
  // Buffer temporário: válido até a próxima consulta neste mesmo grid.
  function nearbyBulletIndexes(grid,x,y,hitRadius=grid.cellSize){
    const range=Math.max(0,hitRadius)+grid.maxRadius;
    const minX=Math.floor((x-range)/grid.cellSize),maxX=Math.floor((x+range)/grid.cellSize);
    const minY=Math.floor((y-range)/grid.cellSize),maxY=Math.floor((y+range)/grid.cellSize);
    const indexes=grid.queryBuffer;
    indexes.length=0;
    for(let cx=minX;cx<=maxX;cx++)for(let cy=minY;cy<=maxY;cy++){
      const list=grid.buckets.get(cx+','+cy);
      if(list)for(let i=0;i<list.length;i++)indexes.push(list[i]);
    }
    indexes.sort((a,b)=>a-b);
    return indexes;
  }
  // API de leitura independente para diagnósticos e ferramentas externas.
  function nearbyBullets(grid,x,y,hitRadius=grid.cellSize){
    return nearbyBulletIndexes(grid,x,y,hitRadius).map(i=>grid.items[i]);
  }
  let stage = 0, hp = 100, score = 0, ammo = 40, xp = 0, upgrades = 0;
  let state = 'menu', paused = false, clock = 0, stageClock = 0, lastTime = 0, renderedFrames=0;
  let player = {x:W/2,y:H/2,r:17,vx:0,vy:0,angle:0};
  let enemies=[], bullets=[], drops=[], particles=[], platforms=[], obstacles=[];
  let arenaBulletGrid=null;
  let cameraX=0, traveled=0, invulnerable=0, fireDelay=0, reloadDelay=0;
  let platformCheckpoint={x:70,y:350},platformCheckpointIndex=-1,platformDeaths=0,platformTraps=[],platformSparks=[],platformDefeated=[];
  let racingSpeed=0,racingSteer=0,racingHits=0,racingSpawnDistance=0;
  const racingCurve=(distance,y)=>Math.sin((distance+(H-y)*1.5)/1150)*52+Math.sin((distance+(H-y)*1.5)/2350)*32;
  let mouse={x:W/2,y:H/2,active:false};
  const showMessage = (txt, seconds=3) => { $('message').textContent=txt; $('message').style.opacity='1'; messageTime=seconds; };
  let messageTime = 0;
  function input(name) { return keys.has(name) || !!touch[name]; }
  function resetStage() {
    state='play'; paused=false; stageClock=0; invulnerable=0; fireDelay=0;reloadDelay=0;
    enemies=[];bullets=[];drops=[];particles=[];platforms=[];obstacles=[];
    cameraX=0;traveled=0;racingSpeed=0;racingSteer=0;racingHits=0;racingSpawnDistance=0;platformCoyote=0;platformJumpBuffer=0;platformJumpHeld=false;platformCheckpointIndex=-1;platformCheckpoint={x:70,y:350};platformDeaths=0;platformTraps=[];platformSparks=[];platformDefeated=[];
    if (spec.genre === 'platform') {
      player={x:70,y:350,vx:0,vy:0,r:17,angle:0};
      for(let i=0;i<25;i++){
        const x=i*180+15;
        const y=i===0?480:clamp(405+Math.sin(i*1.15+stage*.7)*42,350,465);
        platforms.push({x,y,w:i===0?380:170,h:22,checkpoint:i>0&&i%6===0});
      }
      const count=Math.min(22,configAt(stage).enemies>0?clamp(configAt(stage).enemies,1,45):Math.round((10+stage*2)*tuning.enemyMultiplier*tuning.difficulty));
      for(let i=0;i<count;i++){
        const p=platforms[2+i];
        enemies.push({x:p.x+p.w*.5,y:p.y-18,r:18,hp:1,phase:rand(0,6),speed:30+(i%3)*12,kind:i%4===0?'armored':i%3===0?'scout':'walker',hitFlash:0,patrolLeft:p.x+20,patrolRight:p.x+p.w-20,dir:i%2?1:-1});
      }
      for(let i=1;i<platforms.length;i+=2){const p=platforms[i];drops.push({x:p.x+p.w*.5,y:p.y-45,r:11,kind:'coin'});}
      for(let i=4;i<platforms.length;i+=5){const p=platforms[i];if(!p.checkpoint)platformTraps.push({x:p.x+p.w*.5-22,y:p.y-13,w:44,h:13});}
    } else if(spec.genre==='racing') {
      player={x:W/2,y:H-100,r:19,vx:0,vy:0,angle:0};
      for(let i=0;i<6;i++) obstacles.push({x:W/2+[-125,0,125][i%3],lane:i%3,phase:i,y:-250-i*220,r:23,speed:80+stage*8,kind:i%4===0?'cone':'car',paint:i%3,laneCooldown:1.5+i*.4,lanePosition:i%3});
    } else {
      player={x:W/2,y:H/2,r:17,vx:0,vy:0,angle:0};
      const encounterSize=configAt(stage).enemies>0?clamp(configAt(stage).enemies,1,48):Math.min(48,Math.round((6+stage*3)*tuning.enemyMultiplier*tuning.difficulty));
      for(let i=0;i<encounterSize;i++)addEnemy(i===encounterSize-1&&(configAt(stage).boss==='yes'||(configAt(stage).boss!=='no'&&spec.features.bosses)));
      for(let i=0;i<5;i++) drops.push({x:rand(70,W-70),y:rand(85,H-65),r:10,kind:i===0?'heal':'coin'});
    }
    showMessage(stages[stage]||`Fase ${stage+1}`,3);
  }
  function addEnemy(boss=false) {
    const edge=Math.floor(rand(0,4));
    const x=edge<2? (edge===0?25:W-25):rand(25,W-25);
    const y=edge>=2? (edge===2?25:H-25):rand(25,H-25);
    enemies.push({x,y,r:boss?31:15,hp:Math.max(1,Math.round((boss?8+stage*2:2+Math.floor(stage/2))*tuning.difficulty*(boss?tuning.bossMultiplier:1))),boss,speed:(boss?34:45+stage*5)*tuning.difficulty,phase:rand(0,6)});
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
    if(ammo<=0){
      if(reloadDelay<=0){reloadDelay=1.2;showMessage('Recarregando munição…',1.2);}
      else{reloadDelay-=dt;if(reloadDelay<=0)ammo=40;}
    }
    const dx=(input('right')||isPressed('d')||isPressed('ArrowRight')?1:0)-(input('left')||isPressed('a')||isPressed('ArrowLeft')?1:0);
    const dy=(input('down')||isPressed('s')||isPressed('ArrowDown')?1:0)-(input('up')||isPressed('w')||isPressed('ArrowUp')?1:0);
    const mag=Math.max(1,Math.hypot(dx,dy)),speed=(210+upgrades*12)*tuning.playerSpeedMultiplier;
    player.x=clamp(player.x+dx/mag*speed*dt,22,W-22); player.y=clamp(player.y+dy/mag*speed*dt,48,H-26);
    if(mouse.active)player.angle=Math.atan2(mouse.y-player.y,mouse.x-player.x);
    else if(dx||dy)player.angle=Math.atan2(dy,dx);
    const shooting=input('fire')||isPressed(' ')||isPressed('Enter')||mouse.down;
    if(shooting&&fireDelay<=0&&ammo>0){
      ammo--;fireDelay=.18/tuning.fireRateMultiplier;
      const a=mouse.active?Math.atan2(mouse.y-player.y,mouse.x-player.x):player.angle;
      bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*600,vy:Math.sin(a)*600,r:5});
    }
    for(const b of bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;}
    bullets=bullets.filter(b=>b.x>0&&b.x<W&&b.y>38&&b.y<H);
    arenaBulletGrid=buildBulletGrid(bullets,64,arenaBulletGrid);
    for(const e of enemies){
      const a=Math.atan2(player.y-e.y,player.x-e.x);e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt;
      if(circlesOverlap(e,player))damage(e.boss?18:10);
      for(const bulletIndex of nearbyBulletIndexes(arenaBulletGrid,e.x,e.y,e.r)){
        const b=bullets[bulletIndex];
        if(!b.dead && circlesOverlap(b,e)){b.dead=true;e.hp--;if(e.hp<=0){e.dead=true;score+=e.boss?250:50;xp+=1; if(Math.random()<.24)drops.push({x:e.x,y:e.y,r:10,kind:Math.random()<.25?'heal':'ammo'});for(let i=0;i<Math.max(2,Math.round(9*tuning.particlesMultiplier))&&particles.length<150;i++)particles.push({x:e.x,y:e.y,vx:rand(-120,120),vy:rand(-120,120),ttl:.5});}break;}
      }
    }
    bullets=bullets.filter(b=>!b.dead);enemies=enemies.filter(e=>!e.dead);
    if(enemies.length===0)nextStage();
    collectDrops();
  }
  function collectDrops(){for(const d of drops){if(circlesOverlap(player,d,7)){d.dead=true;if(d.kind==='heal')hp=clamp(hp+30,0,100);else if(d.kind==='ammo')ammo+=15;else {score+=20;xp+=1;} }}drops=drops.filter(d=>!d.dead);}
  let platformCoyote=0,platformJumpBuffer=0,platformJumpHeld=false;
  function stepPlatform(dt){
    const dx=(input('right')||isPressed('d')||isPressed('ArrowRight')?1:0)-(input('left')||isPressed('a')||isPressed('ArrowLeft')?1:0);
    const jump=input('up')||isPressed('w')||isPressed('ArrowUp')||isPressed(' ');
    if(jump&&!platformJumpHeld)platformJumpBuffer=.13;
    platformJumpHeld=jump;
    platformJumpBuffer=Math.max(0,platformJumpBuffer-dt);
    platformCoyote=player.grounded?.11:Math.max(0,platformCoyote-dt);
    const target=dx*(205+upgrades*15)*tuning.playerSpeedMultiplier;
    const acceleration=player.grounded?1850:1100;
    player.vx+=clamp(target-player.vx,-acceleration*dt,acceleration*dt);
    if(platformJumpBuffer>0&&platformCoyote>0){player.vy=-480;player.grounded=false;platformCoyote=0;platformJumpBuffer=0;}
    if(!jump&&player.vy< -180)player.vy=Math.min(-180,player.vy+1250*dt);
    const oldBottom=player.y+player.r;
    const wasFalling=player.vy>70;
    player.vy=Math.min(850,player.vy+1050*dt);
    player.x=clamp(player.x+player.vx*dt,player.r,4500-player.r);
    player.y+=player.vy*dt;
    player.grounded=false;
    for(const p of platforms){
      if(player.x+player.r>p.x&&player.x-player.r<p.x+p.w&&oldBottom<=p.y+10&&player.y+player.r>=p.y&&player.vy>=0){
        player.y=p.y-player.r;player.vy=0;player.grounded=true;
      }
    }
    if(player.grounded&&platformJumpBuffer>0){player.vy=-480;player.grounded=false;platformJumpBuffer=0;}
    if(player.y>H+110){platformDeaths++;hp=Math.max(0,hp-25);if(hp<=0){gameOver();return;}player.x=platformCheckpoint.x;player.y=platformCheckpoint.y;player.vx=0;player.vy=0;player.grounded=false;platformCoyote=0;platformJumpBuffer=0;invulnerable=1.2;showMessage('Retorno ao checkpoint · -25 vida',2);}
    for(let i=0;i<platforms.length;i++){
      const p=platforms[i];
      if(p.checkpoint&&i>platformCheckpointIndex&&player.grounded&&player.x>=p.x&&player.x<=p.x+p.w){
        platformCheckpointIndex=i;platformCheckpoint={x:p.x+p.w*.5,y:p.y-player.r-5};
        hp=clamp(hp+10,0,100);showMessage('Checkpoint ativado · +10 vida',2);
      }
    }
    cameraX=clamp(player.x-220,0,3540);
    for(const fx of platformSparks){fx.x+=fx.vx*dt;fx.y+=fx.vy*dt;fx.vy+=600*dt;fx.life-=dt;}
    platformSparks=platformSparks.filter(fx=>fx.life>0);
    for(const t of platformTraps){if(player.x+player.r>t.x&&player.x-player.r<t.x+t.w&&player.y+player.r>t.y&&player.y-player.r<t.y+t.h)damage(15);}
    for(const d of platformDefeated)d.ttl-=dt;
    platformDefeated=platformDefeated.filter(d=>d.ttl>0);
    for(const e of enemies){
      e.phase+=dt;e.hitFlash=Math.max(0,(e.hitFlash||0)-dt);
      e.x+=e.dir*e.speed*dt;
      if(e.x<=e.patrolLeft){e.x=e.patrolLeft;e.dir=1;}
      if(e.x>=e.patrolRight){e.x=e.patrolRight;e.dir=-1;}
      const support=platforms.find(p=>e.x>=p.x&&e.x<=p.x+p.w);
      e.y=(support?support.y-e.r:355)+Math.sin(e.phase)*2;
      if(circlesOverlap(player,e,4)){
        if(wasFalling&&oldBottom<=e.y-e.r*.15&&player.y+player.r>=e.y-e.r*.65){if(e.kind==='armored'){e.kind='walker';e.hitFlash=.25;e.speed*=1.2;showMessage('Armadura quebrada!',1);}else{e.dead=true;platformDefeated.push({x:e.x,y:e.y,ttl:.45,kind:e.kind,dir:e.dir});score+=100;xp+=2;}for(let j=0;j<7;j++)platformSparks.push({x:e.x,y:e.y,vx:(j-3)*45,vy:-110-(j%3)*30,life:.4});player.vy=-320;}
        else damage(12);
      }
    }
    enemies=enemies.filter(e=>!e.dead);
    collectDrops();
    if(player.x>3900)nextStage();
  }
  // Interpolacao independente de FPS: a faixa logica e a posicao visual sao separadas.
  function racingAdvanceLane(position,target,dt){
    const delta=target-position;
    return Math.abs(delta)<=dt*1.35?target:position+Math.sign(delta)*dt*1.35;
  }
  function racingLaneClear(car,target){
    const from=car.lanePosition??car.lane;
    return !obstacles.some(other=>{
      if(other===car||other.hit||Math.abs(other.y-car.y)>=155)return false;
      const otherFrom=other.lanePosition??other.lane;
      const otherTo=other.lane;
      // Reservar todo o corredor da troca, inclusive a faixa de origem.
      return Math.max(Math.min(from,target),Math.min(otherFrom,otherTo))-.45<
        Math.min(Math.max(from,target),Math.max(otherFrom,otherTo))+.45;
    });
  }
  function stepRacing(dt){
    const dx=(input('right')||isPressed('d')||isPressed('ArrowRight')?1:0)-(input('left')||isPressed('a')||isPressed('ArrowLeft')?1:0);
    const throttle=input('up')||isPressed('w')||isPressed('ArrowUp');
    const brake=input('down')||isPressed('s')||isPressed('ArrowDown');
    const boost=input('fire')||isPressed(' ');
    const maxSpeed=(370+stage*22+upgrades*20)*tuning.playerSpeedMultiplier;
    const target=brake?75:throttle?maxSpeed:boost?maxSpeed*1.15:maxSpeed*.72;
    racingSpeed=clamp(racingSpeed+(target>racingSpeed?245:-330)*dt,0,boost?maxSpeed*1.15:maxSpeed);
    racingSteer+=clamp(dx-racingSteer,-dt*5,dt*5);
    const roadCenter=W/2+racingCurve(traveled,player.y);
    player.x=clamp(player.x+racingSteer*(170+racingSpeed*.3)*dt,roadCenter-186,roadCenter+186);
    if((player.x<=roadCenter-186&&dx<0)||(player.x>=roadCenter+186&&dx>0))racingSpeed=Math.max(90,racingSpeed-90*dt);
    traveled+=racingSpeed*dt;
    racingSpawnDistance+=racingSpeed*dt;
    for(const o of obstacles){
      o.y+=(racingSpeed-o.speed)*dt;
      if(o.kind==='car'){
        o.laneCooldown=(o.laneCooldown||0)-dt;
        if(o.laneCooldown<=0){
          const nextLane=clamp(o.lane+(Math.sin(o.phase+clock)>0?1:-1),0,2);
          if(nextLane!==o.lane&&Math.abs((o.lanePosition??o.lane)-o.lane)<.01&&racingLaneClear(o,nextLane))o.lane=nextLane;
          o.laneCooldown=2.5+Math.abs(Math.sin(o.phase))*2;
        }
        o.lanePosition=racingAdvanceLane(o.lanePosition??o.lane,o.lane,dt);
        o.laneOffset=clamp((o.laneOffset||0)+Math.sin(clock*.8+o.phase)*dt*12,-18,18);
      }
      o.x=W/2+((o.lanePosition??o.lane)-1)*125+racingCurve(traveled,o.y)+(o.laneOffset||0);
      if(!o.hit&&circlesOverlap(player,o)){
        o.hit=true;o.y=H+130;racingHits++;racingSpeed*=o.kind==='cone'?.78:.48;
        damage(o.kind==='cone'?8:23);
        showMessage(o.kind==='cone'?'Cone atingido!':'Colisão! Reduza a velocidade.',1.2);
      }
    }
    obstacles=obstacles.filter(o=>o.y<H+90);
    const interval=Math.max(150,300-stage*12);
    while(racingSpawnDistance>=interval){
      racingSpawnDistance-=interval;
      const lane=Math.floor(rand(0,3));
      if(!obstacles.some(o=>!o.hit&&o.y<110&&Math.abs((o.lanePosition??o.lane)-lane)<.8)){
        obstacles.push({x:W/2+[-125,0,125][lane],lane,phase:rand(0,6),y:-120,r:23,speed:65+stage*8,kind:Math.random()<.22?'cone':'car',paint:Math.floor(rand(0,4)),laneCooldown:2+rand(0,2),lanePosition:lane,hit:false});
      }
    }
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
    $('mission').textContent=(configAt(stage).objective?configAt(stage).objective+' · ':'')+(stages[stage]||'Fase')+(spec.genre==='racing'?` · ${Math.floor(traveled/10)}m`:spec.genre==='arena'?` · ${enemies.length} inimigos`:'');
    if(spec.features.timer){$('timer').textContent=`${Math.floor(stageClock)}s`;}
  }
  function drawRacingCar(x,y,paint,hero=false){
    ctx.save();ctx.translate(x,y);
    ctx.fillStyle='#09121c66';ctx.beginPath();ctx.ellipse(4,9,27,44,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#101820';for(const side of [-1,1]){ctx.fillRect(side*17-5,-28,9,20);ctx.fillRect(side*17-5,13,9,20);}
    const body=ctx.createLinearGradient(-19,0,19,0);body.addColorStop(0,'#192c39');body.addColorStop(.25,paint);body.addColorStop(.76,paint);body.addColorStop(1,'#172b37');
    ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(-15,-35);ctx.lineTo(15,-35);ctx.lineTo(19,-23);ctx.lineTo(19,27);ctx.lineTo(12,37);ctx.lineTo(-12,37);ctx.lineTo(-19,27);ctx.lineTo(-19,-23);ctx.closePath();ctx.fill();
    ctx.fillStyle='#a4d8e8';ctx.beginPath();ctx.moveTo(-12,-16);ctx.lineTo(12,-16);ctx.lineTo(14,-5);ctx.lineTo(-14,-5);ctx.fill();
    ctx.fillStyle='#52788d';ctx.fillRect(-13,11,26,10);
    ctx.fillStyle='#fff0c4';ctx.fillRect(-13,-34,8,5);ctx.fillRect(5,-34,8,5);
    ctx.fillStyle='#e55d60';ctx.fillRect(-13,30,8,5);ctx.fillRect(5,30,8,5);
    if(hero){ctx.strokeStyle='#ffffff88';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-30);ctx.lineTo(0,30);ctx.stroke();}
    ctx.restore();
  }
  function background(){
    ctx.fillStyle=color.bg;ctx.fillRect(0,0,W,H);
    if(spec.genre==='racing'){
      const terrain=ctx.createLinearGradient(0,0,0,H);terrain.addColorStop(0,'#234e45');terrain.addColorStop(1,'#142d30');ctx.fillStyle=terrain;ctx.fillRect(0,0,W,H);
      for(let i=0;i<(graphicsDetail()===0?8:graphicsDetail()===1?15:24);i++){const y=((i*103+traveled*.5)%(H+150))-75;const x=i%2?140:810;ctx.fillStyle=i%3?'#285d4a':'#347052';ctx.beginPath();ctx.arc(x+Math.sin(i*8)*65,y,20+(i%4)*7,0,Math.PI*2);ctx.fill();}
      for(let y=0;y<H;y+=graphicsDetail()===0?24:graphicsDetail()===1?16:12){
        const center=W/2+racingCurve(traveled,y);
        const asphalt=ctx.createLinearGradient(center-222,0,center+222,0);asphalt.addColorStop(0,'#252d37');asphalt.addColorStop(.5,'#444b55');asphalt.addColorStop(1,'#252d37');ctx.fillStyle=asphalt;ctx.fillRect(center-222,y,444,graphicsDetail()===0?25:graphicsDetail()===1?17:13);
        ctx.fillStyle='#d4a84e';ctx.fillRect(center-210,y,5,graphicsDetail()===0?25:graphicsDetail()===1?17:13);ctx.fillRect(center+205,y,5,graphicsDetail()===0?25:graphicsDetail()===1?17:13);
        if(Math.floor((y+traveled*.75)/65)%2===0){ctx.fillStyle='#c1c4d1';ctx.fillRect(center-75,y,5,graphicsDetail()===0?25:graphicsDetail()===1?17:13);ctx.fillRect(center+72,y,5,graphicsDetail()===0?25:graphicsDetail()===1?17:13);}
      }
    }else if(spec.genre==='platform'){
      const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#10283f');sky.addColorStop(1,'#527b88');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#ffe6ac';ctx.beginPath();ctx.arc(770,100,36,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#24455d';ctx.fillRect(0,390,W,150);
      for(let i=0;i<(graphicsDetail()===0?7:graphicsDetail()===1?11:16);i++){const x=((i*183-cameraX*.25)%1300+1300)%1300-160;ctx.fillStyle=i%3?'#173448':'#28516a';ctx.beginPath();ctx.moveTo(x,420);ctx.lineTo(x+100,155+Math.sin(i)*55);ctx.lineTo(x+230,420);ctx.fill();}
    }else{
      ctx.strokeStyle='#ffffff0e';ctx.lineWidth=1;
      for(let x=0;x<W;x+=46){ctx.beginPath();ctx.moveTo(x,40);ctx.lineTo(x,H);ctx.stroke();}
      for(let y=40;y<H;y+=46){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
      ctx.strokeStyle='#ffffff1b';ctx.strokeRect(22,50,W-44,H-72);
    }
  }
  function drawAnimatedActor(x,y,kind,phase=0,dir=1,flash=0,defeat=0){
    const armored=kind==='armored';
    const scout=kind==='scout';
    const step=Math.sin(phase*8)*(graphicsDetail()===0?2:5);
    ctx.save();ctx.translate(x,y);ctx.scale(dir,1);if(defeat){ctx.globalAlpha=Math.max(0,defeat/.45);ctx.scale(1+(.45-defeat),Math.max(.15,defeat/.45));}if(flash>0)ctx.globalAlpha=.55;
    ctx.fillStyle='#0d2036';ctx.fillRect(-11,8,8,10+step);ctx.fillRect(3,8,8,10-step);
    ctx.fillStyle=armored?'#708e9f':scout?'#e4a35e':'#d15e72';
    ctx.beginPath();ctx.roundRect(-14,-12,28,26,6);ctx.fill();
    ctx.fillStyle=armored?'#c1d6dd':scout?'#f4d5aa':'#f4bb9e';ctx.beginPath();ctx.arc(0,-14,11,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#192736';ctx.fillRect(3,-18,5,4);
    if(scout){ctx.fillStyle='#855d43';ctx.fillRect(-12,-23,24,5);}
    if(armored){ctx.fillStyle='#506d80';ctx.fillRect(-14,-22,28,7);ctx.fillRect(-17,-8,5,16);ctx.fillRect(12,-8,5,16);}
    else{ctx.fillStyle='#f4bb9e';ctx.fillRect(-17,-8,5,14-step);ctx.fillRect(12,-8,5,14+step);}
    ctx.restore();
  }
  function drawPlayer(x,y){
    ctx.save();ctx.translate(x,y);
    if(invulnerable>0&&Math.floor(clock*18)%2===0)ctx.globalAlpha=.4;
    if(spec.genre==='racing'){
      drawRacingCar(0,0,color.accent,true);
    }else if(spec.genre==='platform'){
      const facing=player.vx<-.5?-1:1;
      ctx.scale(facing,1);
      const stride=player.grounded?Math.sin(clock*13)*Math.min(1,Math.abs(player.vx)/150):0;
      const jumpLift=player.grounded?0:Math.sin(clock*9)*2;
      ctx.fillStyle='#183a45';ctx.fillRect(-12,7+jumpLift,9,15+stride*4);ctx.fillRect(3,7+jumpLift,9,15-stride*4);
      ctx.fillStyle=color.accent;ctx.fillRect(-13,-13,26,27);
      ctx.fillStyle='#f5c7a0';ctx.beginPath();ctx.arc(0,-17,12,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#172733';ctx.fillRect(4,-20,5,4);
      V?.unitDetail(ctx,0,-1,17);
      ctx.fillStyle='#f5c7a0';ctx.fillRect(-18,-7,5,16-stride*3);ctx.fillRect(13,-7,5,16+stride*3);
    }else if(V){
      V.actor(ctx,0,0,20,color.accent,clock);
      ctx.rotate(player.angle);ctx.fillStyle='#d7e7d9';ctx.fillRect(8,-4,20,6);
    }else{
      ctx.rotate(player.angle);
      ctx.shadowColor=color.accent;ctx.shadowBlur=14;
      ctx.fillStyle=color.accent;ctx.beginPath();ctx.arc(0,0,17,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle='#071b20';ctx.fillRect(5,-4,19,8);
      ctx.fillStyle='#ddf8f0';ctx.beginPath();ctx.arc(-4,-5,5,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  function render(){
    background();
    if(V&&spec.genre==='arena')V.backdrop(ctx,W,H,clock);
    ctx.save();if(spec.genre==='platform')ctx.translate(-cameraX,0);
    if(spec.genre==='platform'){
      for(const p of platforms){if(V)V.surface(ctx,p.x,p.y,p.w,p.h,'soil');else{ctx.fillStyle=color.ground;ctx.fillRect(p.x,p.y,p.w,p.h);}ctx.fillStyle=color.accent;ctx.fillRect(p.x,p.y,p.w,5);if(p.checkpoint){ctx.fillStyle=platformCheckpointIndex>=platforms.indexOf(p)?'#8cf0ad':'#f7d779';ctx.fillRect(p.x+p.w*.5-3,p.y-48,6,48);ctx.beginPath();ctx.moveTo(p.x+p.w*.5+3,p.y-48);ctx.lineTo(p.x+p.w*.5+30,p.y-38);ctx.lineTo(p.x+p.w*.5+3,p.y-28);ctx.fill();}}
    }
    if(spec.genre==='platform'){for(const t of platformTraps){ctx.fillStyle='#dc6670';for(let x=t.x;x<t.x+t.w;x+=11){ctx.beginPath();ctx.moveTo(x,t.y+t.h);ctx.lineTo(x+5.5,t.y);ctx.lineTo(x+11,t.y+t.h);ctx.fill();}}}
    if(spec.genre==='platform'){for(const fx of platformSparks){ctx.globalAlpha=Math.min(1,fx.life*2.5);ctx.fillStyle='#ffe3a1';ctx.fillRect(fx.x-3,fx.y-3,6,6);}ctx.globalAlpha=1;}
    for(const d of drops){ctx.fillStyle=d.kind==='heal'?'#ef6e93':d.kind==='ammo'?'#85caff':'#f9c762';ctx.beginPath();ctx.arc(d.x,d.y,d.r+Math.sin(clock*6)*2,0,Math.PI*2);ctx.fill();}
    for(const o of obstacles){if(spec.genre==='racing'){if(o.kind==='cone'){ctx.fillStyle='#f2aa4b';ctx.beginPath();ctx.moveTo(o.x,o.y-18);ctx.lineTo(o.x-14,o.y+18);ctx.lineTo(o.x+14,o.y+18);ctx.fill();ctx.fillStyle='#fff1c6';ctx.fillRect(o.x-8,o.y+4,16,5);}else{drawRacingCar(o.x,o.y,['#e97069','#6b9ce3','#f0c26d','#b18ce5'][o.paint||0]);}}else{ctx.fillStyle=o.kind==='cone'?'#f2aa4b':color.enemy;ctx.fillRect(o.x-20,o.y-32,40,64);ctx.fillStyle='#21293c';ctx.fillRect(o.x-14,o.y-15,28,20);}}
    for(const e of enemies){if(spec.genre==='platform'){drawAnimatedActor(e.x,e.y,e.kind,e.phase,e.dir||1,e.hitFlash||0);}else if(V){V.actor(ctx,e.x,e.y,e.r,e.boss?'#ae6edb':color.enemy,clock+e.x,e.boss);}else{ctx.fillStyle=e.boss?'#ae6edb':color.enemy;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#281625';ctx.fillRect(e.x-7,e.y-5,5,5);ctx.fillRect(e.x+4,e.y-5,5,5);}}
    if(spec.genre==='platform')for(const d of platformDefeated)drawAnimatedActor(d.x,d.y,d.kind,0,d.dir||1,0,d.ttl);
    for(const b of bullets){ctx.fillStyle='#f8d580';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();}
    if(!V||V.profile.particles)for(const p of particles){ctx.fillStyle=color.enemy;ctx.fillRect(p.x,p.y,4,4);}
    drawPlayer(player.x,player.y);ctx.restore();
    V?.finish(ctx,W,H);
    if(spec.genre==='racing'){ctx.fillStyle='#07121bd9';ctx.fillRect(18,68,170,70);ctx.fillStyle='#f4f7fa';ctx.font='bold 22px sans-serif';ctx.fillText(Math.round(racingSpeed*.36)+' km/h',30,99);ctx.font='14px sans-serif';ctx.fillText('Percurso '+Math.floor(traveled/100)+' m',30,123);}
    if(state==='play'&&paused){ctx.fillStyle='#0b1024be';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 44px sans-serif';ctx.textAlign='center';ctx.fillText('PAUSADO',W/2,H/2);ctx.textAlign='left';}
  }
  window.__gameforgeTelemetry = () => ({state,paused,frames:renderedFrames,clock,stage,genre:spec.genre,player:{x:player.x,y:player.y,screenX:player.x-(spec.genre==='platform'?cameraX:0),screenY:player.y,radius:player.r},enemies:enemies.length,graphicsQuality,graphicsFrameMs:Math.round(graphicsFrameAverage*1000),racing:spec.genre==='racing'?{speed:Math.round(racingSpeed),distance:Math.round(traveled),hits:racingHits}:null,checkpoint:spec.genre==='platform'?platformCheckpointIndex:null,falls:spec.genre==='platform'?platformDeaths:null,traps:spec.genre==='platform'?platformTraps.length:null});
  // Passo de simulacao fixo: evita fisica dependente do FPS e espiral apos aba suspensa.
  const SIM_STEP=1/60,MAX_SIM_STEPS=5;
  let simulationAccumulator=0;
  function frame(ms){
    const rawDt=Math.max(0,(ms-lastTime)/1000);lastTime=ms;
    if(graphicsSetting==='auto'&&rawDt>0&&rawDt<.25){graphicsFrameAverage=graphicsFrameAverage*.97+rawDt*.03;if(++graphicsSampleCount%180===0){if(graphicsFrameAverage>.029)graphicsQuality='low';else if(graphicsFrameAverage>.021)graphicsQuality='medium';else if(graphicsFrameAverage<.018)graphicsQuality='high';}}
    if(state==='play'&&!paused){
      simulationAccumulator+=Math.min(rawDt,.25);
      let steps=0;
      while(simulationAccumulator>=SIM_STEP&&steps<MAX_SIM_STEPS&&state==='play'&&!paused){
        update(SIM_STEP);simulationAccumulator-=SIM_STEP;steps++;
      }
      if(steps===MAX_SIM_STEPS)simulationAccumulator=0;
    }else simulationAccumulator=0;
    render();renderedFrames++;requestAnimationFrame(frame);
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
  if(spec.genre==='racing')$('control-help').textContent='Setas / A-D: direção · ↑ acelerar · ↓ frear · Espaço: turbo · Esc: pausa';
  else if(spec.genre==='platform')$('control-help').textContent='Setas / A-D: andar · Espaço: pular · Esc: pausa';
  else $('control-help').textContent='WASD: mover · mouse: mirar · clique / espaço: atirar · Esc: pausa';
  if(!spec.features.timer)$('timer-pill').style.display='none';
  requestAnimationFrame(frame);
}
if (typeof globalThis !== 'undefined') globalThis.gameForgeBoot = gameForgeBoot;
if (typeof module !== 'undefined') module.exports = gameForgeBoot;
