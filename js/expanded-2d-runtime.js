/* Canvas2D RPG + tower defense. Serialized together with strategy-rules.js. */
function gameForgeExpanded2DBoot() {
  'use strict';
  const spec=GAME_SPEC,R=GameForgeStrategyRules,td=spec.genre==='tower-defense';
  const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d',{alpha:false});
  const W=960,H=540,TAU=Math.PI*2,world={width:2400,height:1600};canvas.width=W;canvas.height=H;
  const tuning={difficulty:1,enemyMultiplier:1,bossMultiplier:1,playerSpeedMultiplier:1,fireRateMultiplier:1,particlesMultiplier:1,...spec.tuning};
  for(const k of Object.keys(tuning))tuning[k]=Math.max(.3,Math.min(3,Number(tuning[k])||1));
  const stages=(spec.stages?.length?spec.stages:['Bosque das ruínas','A cidadela perdida','Portal ancestral']).slice(0,30);
  const configAt=i=>Array.isArray(spec.stageConfig)&&spec.stageConfig[i]&&typeof spec.stageConfig[i]==='object'?spec.stageConfig[i]:{};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  let seed=579;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  let telemetry={};window.__gameforgeTelemetry=()=>telemetry;
  let state='menu',paused=false,stage=0,time=0,stageTime=0,last=0,frames=0,noteUntil=0;
  let camera={x:0,y:0},player,checkpoint=null,enemies=[],bullets=[],particles=[],crystals=[],obstacles=[],trees=[],terrain=null;
  let d=null,cursor={x:2,y:1},selected=null,towerType='bolt',collected=0,bossDead=false,attackClock=0,attackFlash=0;
  const keys=new Set(),touch={up:false,down:false,left:false,right:false,fire:false};
  let facing={x:1,y:0},moving=false,walk=0;
  const portal={x:2220,y:800,r:46};
  const extra=document.createElement('div');extra.style.cssText='display:none;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:14px';
  document.querySelector('.dialog').appendChild(extra);
  function button(label,fn,parent=extra){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);parent.appendChild(b);return b;}
  const toolbar=document.querySelector('.buttons');
  const aux=button(td?'Próxima onda [N]':'Inventário [I]',()=>td?nextWave():inventory(),toolbar);
  const aux2=button(td?'Torre: raio · 60':'Poção [E]',()=>{if(td){towerType=towerType==='bolt'?'frost':'bolt';aux2.textContent=towerType==='bolt'?'Torre: raio · 60':'Torre: gelo · 75';}else usePotion();},toolbar);
  $('control-help').textContent=td?'Clique/toque: construir · Espaço: construir/melhorar · N: onda':'WASD/setas: mover · Espaço: atacar · E: poção · I: inventário';
  function note(text){$('message').textContent=text;$('message').style.opacity='1';noteUntil=time+2.8;}
  function show(title,sub,action){$('overlay-title').textContent=title;$('overlay-sub').textContent=sub;$('start').textContent=action;$('overlay').classList.remove('hidden');}
  function hide(){$('overlay').classList.add('hidden');extra.style.display='none';canvas.focus();}
  function clearInput(){keys.clear();for(const k in touch)touch[k]=false;}
  function initialPlayer(){return {x:210,y:800,r:15,hp:100,maxHp:100,attack:16,level:1,xp:0,coins:0,potions:3,armor:0,upgrades:0,invulnerable:1.4};}
  function reset(){
    stage=0;time=0;player=initialPlayer();checkpoint=R.checkpoint(player);startStage();
  }
  function startStage(){
    state='play';paused=false;clearInput();stageTime=0;attackClock=0;attackFlash=0;particles=[];bullets=[];collected=0;bossDead=false;
    if(td){d=R.createDefense(stage,tuning);if(configAt(stage).waves>0)d.waves=clamp(configAt(stage).waves,1,12);selected=null;cursor={x:2,y:1};}
    else{
      if(checkpoint)R.restore(player,checkpoint);player.x=210;player.y=800;facing={x:1,y:0};camera={x:0,y:clamp(player.y-H/2,0,world.height-H)};
      buildMap();spawnRPG();
      crystals=[{x:640,y:500},{x:1150,y:1030},{x:1740,y:630}].map(p=>({...p,r:18,taken:false}));
    }
    hide();note(stages[stage]);publish();
  }
  function advance(){
    if(stage+1>=stages.length){state='victory';show('JORNADA CONCLUÍDA',td?'Todas as rotas protegidas. '+stages.length+' fases concluídas.':'O portal foi restaurado. Nível '+player.level+' · '+stages.length+' fases concluídas.','Jogar novamente');return;}
    state='intermission';show('FASE CONCLUÍDA',stages[stage]+' · Próxima: '+stages[stage+1], 'Continuar');
  }
  function continueStage(){stage++;if(!td){player.hp=player.maxHp;player.potions=Math.min(6,player.potions+1);checkpoint=R.checkpoint(player);}startStage();}
  function defeat(){state='defeat';clearInput();show(td?'A BASE CAIU':'VOCÊ FOI DERROTADO',td?'Reconstrua as defesas e distribua torres ao longo das curvas.':'Seu progresso anterior à fase foi preservado. Use poções e ataque à distância.','Tentar esta fase');}
  function togglePause(){
    if(state==='inventory'){state='play';paused=false;hide();return;}
    if(state!=='play')return;
    paused=!paused;clearInput();$('pause').textContent=paused?'Continuar':'Pausar';
    if(paused)show('PAUSADO',stages[stage],'Continuar');else hide();publish();
  }
  function inventory(){
    if(td||!['play','inventory'].includes(state))return;
    if(state==='inventory'){state='play';paused=false;hide();return;}
    state='inventory';paused=true;clearInput();extra.textContent='';extra.style.display='flex';
    show('INVENTÁRIO',`Nível ${player.level} · XP ${player.xp}/${player.level*30+30} · ${player.coins} ouro · ${player.potions} poções`,'Voltar ao jogo');
    const add=(label,cost,apply)=>{const b=button(label+' · '+cost+' ouro',()=>{if(player.coins<cost)return;player.coins-=cost;apply();state='play';paused=false;inventory();});b.disabled=player.coins<cost;};
    add('Lâmina +5',65+player.upgrades*20,()=>{player.attack+=5;player.upgrades++;});
    add('Armadura +2',70+player.armor*10,()=>{player.armor=Math.min(12,player.armor+2);});
    add('Poção +1',35,()=>{player.potions=Math.min(9,player.potions+1);});
    publish();
  }
  function usePotion(){if(td||state!=='play'||paused)return;if(R.potion(player)){burst(player.x,player.y,'#89f7bb',16);note('Poção: +55 vida');}else note(player.potions?'Sua vida já está completa':'Sem poções · procure baús');}
  function nextWave(){if(td&&state==='play'&&!paused){if(R.startWave(d))note('ONDA '+d.wave+' · Defenda o cristal');else if(d.active)note('Elimine a onda atual primeiro');}}
  function buildAt(x,y){
    if(!td||state!=='play'||paused)return;cursor={x:clamp(x,0,15),y:clamp(y,0,7)};
    const tower=d.towers.find(t=>t.gx===cursor.x&&t.gy===cursor.y);
    if(tower){selected=tower;note('Torre nível '+tower.level+' · Espaço ou Melhorar para evoluir');}
    else{const result=R.placeTower(d,cursor.x,cursor.y,towerType);if(result.ok){selected=result.tower;note('Torre construída · N inicia a onda');}else note(result.reason);}
    publish();
  }
  function actionDefense(){
    const t=d.towers.find(t=>t.gx===cursor.x&&t.gy===cursor.y);
    if(t){selected=t;const r=R.upgradeTower(d,t);note(r.ok?'Torre melhorada para nível '+t.level:r.reason);}else buildAt(cursor.x,cursor.y);publish();
  }
  if(td)button('Melhorar [U]',()=>{if(state==='play'&&!paused){if(selected){const r=R.upgradeTower(d,selected);note(r.ok?'Torre melhorada':r.reason);}else note('Selecione uma torre');}},toolbar);
  function buildMap(){
    seed=579+stage*7919;obstacles=[];trees=[];
    // Open roads join the village, relic shrines, and the distant portal.
    for(let i=0;i<150;i++){
      const x=70+random()*2260,y=90+random()*1420;
      if(Math.abs(y-800)<95||Math.abs(x-640)<75||Math.abs(x-1150)<80||Math.abs(x-1740)<75||x<380&&y>570&&y<1000||x>2000&&y>600&&y<1000)continue;
      const size=25+random()*22;trees.push({x,y,size,shade:random()});obstacles.push({x:x-12,y:y-9,w:24,h:21,kind:'tree'});
    }
    for(const h of [{x:90,y:565,w:145,h:110},{x:310,y:535,w:125,h:100},{x:100,y:960,w:155,h:110},{x:380,y:1010,w:130,h:95}])obstacles.push({...h,kind:'house'});
    for(const r of [{x:870,y:635,w:90,h:65},{x:1350,y:925,w:100,h:55},{x:1930,y:450,w:75,h:65},{x:1540,y:1160,w:90,h:80}])obstacles.push({...r,kind:'rock'});
    terrain=document.createElement('canvas');terrain.width=world.width;terrain.height=world.height;const c=terrain.getContext('2d');
    c.fillStyle=['#20463c','#263f43','#333f44'][stage%3];c.fillRect(0,0,world.width,world.height);
    for(let i=0;i<2600;i++){const x=random()*world.width,y=random()*world.height;c.fillStyle=['#31584a','#345743','#315a4c','#263e37'][i%4];c.fillRect(x,y,5+random()*35,2+random()*12);}
    // Broad paths have dark margins, dappled stones and ruts.
    c.lineCap='round';c.lineJoin='round';
    const roads=[[[60,800],[420,800],[950,790],[1530,810],[2240,800]],[[640,800],[640,500]],[[1150,800],[1150,1050]],[[1740,800],[1740,630]]];
    for(const road of roads){for(const [width,color] of [[95,'#233d30'],[76,'#776c49'],[57,'#8b7e54']]){c.strokeStyle=color;c.lineWidth=width;c.beginPath();road.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();}}
    for(let i=0;i<310;i++){const x=60+random()*2200,y=768+random()*65;c.fillStyle=i%2?'#a09262':'#655d40';c.fillRect(x,y,3+random()*8,2+random()*3);}
    // Pond and reed banks to the north, separate from navigable roads.
    const pond=c.createRadialGradient(1290,340,30,1290,340,220);pond.addColorStop(0,'#467f84');pond.addColorStop(1,'#24494b');
    c.fillStyle=pond;c.beginPath();c.ellipse(1290,340,210,110,-.15,0,TAU);c.fill();
    c.strokeStyle='#6b9f8c';c.lineWidth=5;c.stroke();obstacles.push({x:1105,y:263,w:370,h:150,kind:'water'});
    c.strokeStyle='#83b9aa55';c.lineWidth=2;for(let i=0;i<16;i++){c.beginPath();c.ellipse(1140+random()*280,290+random()*95,12+random()*30,3,0,0,Math.PI);c.stroke();}
    for(let i=0;i<90;i++){const x=random()*world.width,y=random()*world.height;if(Math.abs(y-800)<60)continue;c.fillStyle=i%3?'#76a267':'#e7c783';c.fillRect(x,y,2,3);}
  }
  function spawnRPG(){
    enemies=[];const amount=configAt(stage).enemies>0?clamp(configAt(stage).enemies,1,36):Math.min(36,Math.round((10+stage*2)*tuning.enemyMultiplier));
    const presets=[{x:520,y:825},{x:680,y:640},{x:925,y:805},{x:1140,y:1090},{x:1570,y:810},{x:1770,y:600}];
    for(let i=0;i<amount;i++){
      const p=presets[i%presets.length],kind=i%4===2?'archer':i%4===3?'brute':'slime';
      const hp=(kind==='brute'?85:kind==='archer'?43:38)*(1+stage*.14)*tuning.difficulty;
      enemies.push({x:p.x+Math.floor(i/6)*47,y:p.y+Math.sin(i*2)*90,r:kind==='brute'?23:17,hp,maxHp:hp,kind,shot:1.2+i*.17,t:i,dead:false});
    }
    const hp=(235+stage*40)*tuning.bossMultiplier*tuning.difficulty;
    if(configAt(stage).boss!=='no')enemies.push({x:2090,y:800,r:37,hp,maxHp:hp,kind:'boss',shot:2,t:0,dead:false});
    else bossDead=true;
  }
  function burst(x,y,color,n){const limit=Math.round(160*tuning.particlesMultiplier);n=Math.min(n,limit-particles.length);for(let i=0;i<n;i++){const a=random()*TAU,s=30+random()*130;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.3+random()*.35,color,r:2+random()*3});}}
  function attack(){
    if(attackClock>0||bullets.length>=100)return;attackClock=.34/tuning.fireRateMultiplier;attackFlash=.16;
    const target=enemies.filter(e=>!e.dead&&dist(player,e)<540).sort((a,b)=>dist(player,a)-dist(player,b))[0];
    const angle=target?Math.atan2(target.y-player.y,target.x-player.x):Math.atan2(facing.y,facing.x);
    facing={x:Math.cos(angle),y:Math.sin(angle)};
    bullets.push({x:player.x+facing.x*23,y:player.y+facing.y*23,vx:facing.x*560,vy:facing.y*560,r:7,life:.95,friendly:true,damage:player.attack});
    for(const e of enemies)if(!e.dead&&dist(player,e)<77){e.hp-=player.attack*.7;if(e.hp<=0)kill(e);}
  }
  function kill(e){
    if(e.dead)return;e.dead=true;const boss=e.kind==='boss';player.coins+=boss?90:18;
    const levels=R.gainXP(player,boss?90:23);if(levels)note('NÍVEL '+player.level+' · vida e ataque aumentaram');
    if(boss){bossDead=true;note('Guardião vencido · reúna as 3 relíquias');}
    if(player.potions<6&&random()<.16)player.potions++;
    burst(e.x,e.y,boss?'#ffd884':'#93debd',boss?32:14);
  }
  function hurt(amount){if(R.damage(player,amount)){burst(player.x,player.y,'#ff8e85',12);if(player.hp<=0)defeat();}}
  function updateRPG(dt){
    player.invulnerable=Math.max(0,player.invulnerable-dt);attackClock-=dt;attackFlash=Math.max(0,attackFlash-dt);
    const vx=(keys.has('d')||keys.has('ArrowRight')||touch.right?1:0)-(keys.has('a')||keys.has('ArrowLeft')||touch.left?1:0);
    const vy=(keys.has('s')||keys.has('ArrowDown')||touch.down?1:0)-(keys.has('w')||keys.has('ArrowUp')||touch.up?1:0);
    moving=!!(vx||vy);if(moving){const n=Math.hypot(vx,vy);facing={x:vx/n,y:vy/n};walk+=dt*11;R.moveActor(player,vx,vy,230*tuning.playerSpeedMultiplier,dt,world,obstacles);}
    if(keys.has(' ')||keys.has('Enter')||touch.fire)attack();
    for(const e of enemies){
      if(e.dead)continue;e.t+=dt;e.shot-=dt;const distance=dist(e,player),boss=e.kind==='boss';
      if(distance<(boss?550:410)){
        let dx=player.x-e.x,dy=player.y-e.y;
        if(e.kind==='archer'&&distance<170){dx=-dx;dy=-dy;}
        if(e.kind!=='archer'||distance>240||distance<170)R.moveActor(e,dx,dy,(boss?57:e.kind==='brute'?61:e.kind==='archer'?78:96)*Math.min(1.5,tuning.difficulty),dt,world,obstacles);
        if((e.kind==='archer'||boss)&&e.shot<=0&&distance<530&&bullets.length<96){
          e.shot=boss?1.65:2.15;const a=Math.atan2(player.y-e.y,player.x-e.x),count=boss?5:1;
          for(let i=0;i<count;i++){const angle=a+(i-(count-1)/2)*.22;bullets.push({x:e.x,y:e.y,vx:Math.cos(angle)*(boss?175:205),vy:Math.sin(angle)*(boss?175:205),r:boss?8:6,life:3,friendly:false,damage:boss?21:12});}
        }
        if(distance<e.r+player.r)hurt(boss?25:e.kind==='brute'?20:12);
      }
    }
    for(const b of bullets){
      b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      if(b.friendly){for(const e of enemies)if(!e.dead&&dist(b,e)<b.r+e.r){e.hp-=b.damage;b.life=0;burst(b.x,b.y,'#f3e6ac',4);if(e.hp<=0)kill(e);break;}}
      else if(dist(b,player)<b.r+player.r){hurt(b.damage);b.life=0;}
      if(b.x<0||b.y<0||b.x>world.width||b.y>world.height)b.life=0;
    }
    bullets=bullets.filter(b=>b.life>0);enemies=enemies.filter(e=>!e.dead);
    for(const c of crystals)if(!c.taken&&dist(player,c)<38){c.taken=true;collected++;player.coins+=35;R.gainXP(player,15);burst(c.x,c.y,'#89f7ed',25);note('Relíquia '+collected+'/3 · '+(bossDead?'Procure o portal':'Derrote o guardião do portal'));}
    if(state==='play'&&R.portalReady(collected,bossDead)&&dist(player,portal)<65)advance();
    camera.x+=(clamp(player.x-W/2,0,world.width-W)-camera.x)*Math.min(1,dt*8);
    camera.y+=(clamp(player.y-H/2,0,world.height-H)-camera.y)*Math.min(1,dt*8);
  }
  function update(dt){
    if(state!=='play'||paused)return;time+=dt;stageTime+=dt;
    if(td){R.stepDefense(d,dt);if(d.over){if(d.victory)advance();else defeat();}}
    else updateRPG(dt);
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0);
    if(time>noteUntil)$('message').style.opacity='0';
  }
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
  function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
  function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();}
  function text(s,x,y,size=14,color='#e8f6ee',align='left'){ctx.fillStyle=color;ctx.font=`${size>=16?'700 ':''}${size}px system-ui,sans-serif`;ctx.textAlign=align;ctx.fillText(String(s),x,y);}
  function bar(x,y,w,ratio,color,bg='#15262e'){rect(x,y,w,6,bg);rect(x,y,w*clamp(ratio,0,1),6,color);}
  function diamond(x,y,s,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y-s);ctx.lineTo(x+s*.65,y);ctx.lineTo(x,y+s);ctx.lineTo(x-s*.65,y);ctx.closePath();ctx.fill();}
  function drawHouse(o){
    ellipse(o.x+o.w*.6,o.y+o.h+12,o.w*.65,22,'#10291e80');
    rect(o.x,o.y,o.w,o.h,'#b29362');rect(o.x+7,o.y+10,o.w-14,o.h-10,'#a88f68');
    rect(o.x+o.w*.42,o.y+o.h-54,28,54,'#463c32');rect(o.x+16,o.y+43,23,25,'#e4ca7b');rect(o.x+o.w-39,o.y+43,23,25,'#e4ca7b');
    ctx.fillStyle='#623f42';ctx.beginPath();ctx.moveTo(o.x-15,o.y+24);ctx.lineTo(o.x+o.w/2,o.y-51);ctx.lineTo(o.x+o.w+15,o.y+24);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#98645a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(o.x-10,o.y+23);ctx.lineTo(o.x+o.w/2,o.y-44);ctx.lineTo(o.x+o.w+10,o.y+23);ctx.stroke();
    rect(o.x+o.w-36,o.y-37,17,35,'#897665');
  }
  function drawTree(t){
    ellipse(t.x+12,t.y+10,t.size*.9,t.size*.35,'#102a2380');rect(t.x-5,t.y-25,10,34,'#72583d');
    circle(t.x,t.y-34,t.size,'#153c32');circle(t.x-12,t.y-42,t.size*.7,'#235943');circle(t.x+11,t.y-54,t.size*.63,'#31694a');circle(t.x-6,t.y-65,t.size*.43,'#46835b');
  }
  function drawActor(a,hero=false){
    const boss=a.kind==='boss',archer=a.kind==='archer',brute=a.kind==='brute',r=a.r;
    ellipse(a.x+5,a.y+11,r*.93,r*.42,'#0b211b88');
    if(hero){
      if(a.invulnerable>0&&Math.floor(time*15)%2)return;
      const leg=moving?Math.sin(walk)*5:0;
      rect(a.x-10,a.y+6+leg,7,13,'#25394e');rect(a.x+3,a.y+6-leg,7,13,'#25394e');
      ctx.fillStyle='#143a57';ctx.beginPath();ctx.moveTo(a.x-11,a.y-7);ctx.lineTo(a.x+11,a.y-7);ctx.lineTo(a.x+16,a.y+14);ctx.lineTo(a.x-16,a.y+14);ctx.closePath();ctx.fill();
      rect(a.x-10,a.y-11,20,21,'#5ab4ba');rect(a.x-10,a.y+5,20,4,'#d8bc79');circle(a.x,a.y-17,10,'#efc795');
      ellipse(a.x,a.y-23,12,7,'#34495e');rect(a.x-13,a.y-23,26,4,'#7eafba');
      circle(a.x+facing.x*5,a.y-17+facing.y*3,2,'#263545');
      const handX=a.x+facing.x*20,handY=a.y+facing.y*15;circle(handX,handY,5,'#f0c28d');
      ctx.strokeStyle='#d8f0e4';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(handX,handY);ctx.lineTo(handX+facing.x*22,handY+facing.y*22);ctx.stroke();
      if(attackFlash>0){ctx.strokeStyle='#d0ffe8';ctx.lineWidth=6;ctx.beginPath();const angle=Math.atan2(facing.y,facing.x);ctx.arc(a.x,a.y,48,angle-.7,angle+.7);ctx.stroke();}
    }else if(a.kind==='slime'){
      const squash=Math.sin(a.t*5)*2;ellipse(a.x,a.y-3,r+2,r-2+squash,'#83b951');ellipse(a.x-5,a.y-9,r*.65,r*.35,'#b9d879');circle(a.x-6,a.y-6,3,'#263b30');circle(a.x+6,a.y-6,3,'#263b30');
    }else{
      rect(a.x-r*.55,a.y+5,r*.4,r*.7,'#342f38');rect(a.x+r*.15,a.y+5,r*.4,r*.7,'#342f38');
      ellipse(a.x,a.y-4,r*.85,r,boss?'#70566f':brute?'#9a7162':'#6d5d85');circle(a.x,a.y-r*.82,r*.58,boss?'#c1a9a8':'#b7b29a');
      if(boss){ctx.strokeStyle='#e3c886';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(a.x-20,a.y-35);ctx.lineTo(a.x-28,a.y-57);ctx.moveTo(a.x+20,a.y-35);ctx.lineTo(a.x+28,a.y-57);ctx.stroke();}
      circle(a.x-5,a.y-r*.85,3,'#fbb77c');circle(a.x+5,a.y-r*.85,3,'#fbb77c');
      if(archer){ctx.strokeStyle='#ddb476';ctx.lineWidth=3;ctx.beginPath();ctx.arc(a.x+20,a.y-4,17,-1.3,1.3);ctx.stroke();}else rect(a.x+r*.8,a.y-r*.25,boss?10:7,r*1.1,'#b5b7a1');
    }
    if(!hero&&a.hp<a.maxHp)bar(a.x-r,a.y-r-17,r*2,a.hp/a.maxHp,boss?'#f2ba6b':'#f39b83');
  }
  function drawRPG(){
    if(!terrain)return;ctx.save();ctx.translate(-Math.round(camera.x),-Math.round(camera.y));ctx.drawImage(terrain,0,0);
    for(const o of obstacles){if(o.x<camera.x-180||o.x>camera.x+W+180||o.y<camera.y-150||o.y>camera.y+H+150)continue;
      if(o.kind==='house')drawHouse(o);
      else if(o.kind==='rock'){ellipse(o.x+o.w*.6,o.y+o.h*.8,o.w*.7,o.h*.4,'#122a2480');ellipse(o.x+o.w*.5,o.y+o.h*.45,o.w*.5,o.h*.5,'#687773');ellipse(o.x+o.w*.4,o.y+o.h*.3,o.w*.3,o.h*.2,'#89958a');}
    }
    // Relic shrines, portal, and a well form visible landmarks.
    for(const c of crystals){ellipse(c.x,c.y+13,32,14,'#213934');ellipse(c.x,c.y+8,25,12,'#738a7b');rect(c.x-16,c.y-1,32,9,'#9caa88');if(!c.taken){circle(c.x,c.y-10,32,'#8bf7dc18');diamond(c.x,c.y-19+Math.sin(time*3)*4,19,'#8ff9dd');diamond(c.x-3,c.y-23+Math.sin(time*3)*4,9,'#e1fff1');}else circle(c.x,c.y-7,7,'#3c6657');}
    ellipse(310,860,24,14,'#112f2580');ellipse(300,852,23,14,'#99a593');ellipse(300,848,16,8,'#1c505b');
    const unlocked=R.portalReady(collected,bossDead),glow=ctx.createRadialGradient(portal.x,portal.y,10,portal.x,portal.y,100);glow.addColorStop(0,unlocked?'#9cffed80':'#b6a2d02b');glow.addColorStop(1,'#0c302500');ctx.fillStyle=glow;ctx.fillRect(portal.x-100,portal.y-100,200,200);
    ellipse(portal.x,portal.y+35,65,22,'#122c2780');ctx.strokeStyle='#91a793';ctx.lineWidth=16;ctx.beginPath();ctx.ellipse(portal.x,portal.y-5,43,61,0,0,TAU);ctx.stroke();
    ctx.strokeStyle=unlocked?'#a1ffe7':'#796d9a';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(portal.x,portal.y-5,31,49,0,time*.7,time*.7+Math.PI*1.8);ctx.stroke();text(unlocked?'PORTAL ABERTO':'PORTAL SELADO',portal.x,portal.y-85,12,unlocked?'#9dfbdd':'#c0afd0','center');
    const actors=[...enemies.map(a=>({a,hero:false})),{a:player,hero:true},...trees.filter(t=>t.x>camera.x-80&&t.x<camera.x+W+80&&t.y>camera.y-30&&t.y<camera.y+H+100).map(t=>({a:t,tree:true}))].sort((a,b)=>a.a.y-b.a.y);
    for(const item of actors){if(item.tree)drawTree(item.a);else if(item.a.x>camera.x-80&&item.a.x<camera.x+W+80&&item.a.y>camera.y-80&&item.a.y<camera.y+H+80)drawActor(item.a,item.hero);}
    for(const b of bullets){circle(b.x,b.y,b.r+4,b.friendly?'#a8ffdc30':'#efc37a30');circle(b.x,b.y,b.r,b.friendly?'#baffdf':'#f1b580');}
    for(const p of particles){ctx.globalAlpha=clamp(p.life*2,0,1);circle(p.x,p.y,p.r,p.color);}ctx.globalAlpha=1;ctx.restore();
    // A stationary vignette and slowly shifting canopy light give depth without assets.
    const light=ctx.createRadialGradient(350,190,80,450,250,620);light.addColorStop(0,'#fff6be09');light.addColorStop(.65,'#061d1400');light.addColorStop(1,'#061a218c');ctx.fillStyle=light;ctx.fillRect(0,0,W,H);
    for(let i=0;i<10;i++){const x=(i*149+Math.sin(time*.12+i)*35-camera.x*.06+W)%W,y=(i*79-camera.y*.05+H)%H;circle(x,y,2,'#f8eabb55');}
    drawRPGHUD();
  }
  function drawRPGHUD(){
    rect(14,14,425,52,'#102923dc');text(stages[stage],28,36,16,'#f0e1b9');text(`Relíquias ${collected}/3 · Guardião ${bossDead?'vencido':'ativo'} · Alcance o portal →`,28,55,12,'#b4d2bd');
    rect(14,H-71,290,55,'#102923e8');text('NÍVEL '+player.level+'   '+player.coins+' ouro   '+player.potions+' poções',26,H-48,13);bar(26,H-36,260,player.xp/(player.level*30+30),'#edc36f');
    const mx=W-171,my=H-122,mw=154,mh=103;rect(mx-5,my-5,mw+10,mh+10,'#102823e8');rect(mx,my,mw,mh,'#3c5948');
    ctx.strokeStyle='#a18c61';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(mx+4,my+mh*.5);ctx.lineTo(mx+mw-7,my+mh*.5);ctx.stroke();
    for(const c of crystals)if(!c.taken)diamond(mx+c.x/world.width*mw,my+c.y/world.height*mh,4,'#9cffe0');
    for(const e of enemies)if(e.kind==='boss')circle(mx+e.x/world.width*mw,my+e.y/world.height*mh,4,'#edb0aa');
    circle(mx+portal.x/world.width*mw,my+portal.y/world.height*mh,5,R.portalReady(collected,bossDead)?'#e8f0bc':'#ae9bc6');
    circle(mx+player.x/world.width*mw,my+player.y/world.height*mh,4,'#fff1b7');
    ctx.strokeStyle='#e6f2d755';ctx.lineWidth=1;ctx.strokeRect(mx+camera.x/world.width*mw,my+camera.y/world.height*mh,W/world.width*mw,H/world.height*mh);
    if(!bossDead){const boss=enemies.find(e=>e.kind==='boss');if(boss&&dist(player,boss)<600){rect(W/2-170,77,340,33,'#212a2cdd');text(spec.enemyNames?.[stage]||'GUARDIÃO ANCESTRAL',W/2,91,11,'#f8d4b2','center');bar(W/2-157,98,314,boss.hp/boss.maxHp,'#d9978e');}}
  }
  function drawDefense(){
    const ox=48,oy=80,s=d?.cell||54;rect(0,0,W,H,'#132c33');
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#142a3e');sky.addColorStop(1,'#305449');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    // Distant silhouettes and border shrubbery frame the tactical board.
    for(let i=0;i<19;i++){const x=i*58;ctx.fillStyle='#23443d';ctx.beginPath();ctx.moveTo(x-50,74);ctx.lineTo(x,12+(i%4)*9);ctx.lineTo(x+65,74);ctx.closePath();ctx.fill();}
    rect(ox-9,oy-9,880,448,'#0c2129aa');rect(ox-4,oy-4,872,440,'#627764');
    if(!d)return;
    for(let y=0;y<8;y++)for(let x=0;x<16;x++){
      const px=ox+x*s,py=oy+y*s,onPath=d.path.some(p=>p.x===x&&p.y===y);rect(px,py,s,s,onPath?((x+y)%2?'#a2936b':'#aa9b72'):((x+y)%2?'#376051':'#3a6555'));
      if(!onPath){rect(px+7+(x*13+y*7)%32,py+12+(y*11)%26,3,7,'#5c815f');rect(px+13,py+33,2,3,'#83a371');}
      else{rect(px+12,py+13,9,3,'#c5b48a');rect(px+34,py+35,7,3,'#807d59');}
      ctx.strokeStyle='#1d423744';ctx.lineWidth=1;ctx.strokeRect(px+.5,py+.5,s,s);
    }
    ctx.strokeStyle='#ead6a84d';ctx.lineWidth=2;ctx.setLineDash([4,10]);ctx.beginPath();d.path.forEach((p,i)=>i?ctx.lineTo(ox+p.x*s+s/2,oy+p.y*s+s/2):ctx.moveTo(ox+p.x*s+s/2,oy+p.y*s+s/2));ctx.stroke();ctx.setLineDash([]);
    const end=d.path[d.path.length-1],bx=ox+end.x*s+s/2,by=oy+end.y*s+s/2;
    ellipse(bx,by+10,25,13,'#344c3e');rect(bx-19,by-10,38,29,'#c2bc9b');rect(bx-23,by-17,46,10,'#8e9f93');diamond(bx,by-27,23,'#a0f2d6');diamond(bx-4,by-31,11,'#d4ffee');
    for(const t of d.towers){
      const x=ox+t.x,y=oy+t.y;ellipse(x+5,y+14,23,11,'#163e31a0');circle(x,y+6,22,'#6c8274');circle(x,y+2,18,'#a8b49b');
      rect(x-12,y-23,24,26,t.type==='frost'?'#8fbed0':'#b79d75');rect(x-17,y-28,34,9,t.type==='frost'?'#b2dde2':'#d6c598');
      ctx.save();ctx.translate(x,y-12);ctx.rotate(t.angle);rect(0,-5,28+t.level*3,10,'#3a565a');circle(0,0,10,t.type==='frost'?'#a3f4ff':'#e6c577');ctx.restore();
      for(let i=0;i<t.level;i++)diamond(x-8+i*8,y+18,3,'#f6dc95');
    }
    for(const e of d.enemies){const x=ox+e.x,y=oy+e.y,boss=e.kind==='boss';ellipse(x+2,y+9,e.r,e.r*.43,'#14352b99');
      circle(x,y-3,e.r,boss?'#916a92':e.kind==='runner'?'#dfaa72':e.kind==='armored'?'#9da5ad':'#b17c75');
      if(e.kind==='armored'){rect(x-10,y-12,20,9,'#c0c6c1');}if(boss){diamond(x,y-21,10,'#efc18b');}
      circle(x-4,y-6,2,'#273b36');circle(x+4,y-6,2,'#273b36');bar(x-e.r,y-e.r-13,e.r*2,e.hp/e.maxHp,'#eb9a89');
      if(e.slow>0){ctx.strokeStyle='#a7f7ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,e.r+4,0,TAU);ctx.stroke();}
    }
    for(const shot of d.shots){ctx.globalAlpha=shot.life/.14;ctx.strokeStyle=shot.type==='frost'?'#9be6ff':'#ffe6a2';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(ox+shot.x,oy+shot.y-12);ctx.lineTo(ox+shot.tx,oy+shot.ty);ctx.stroke();circle(ox+shot.tx,oy+shot.ty,7,shot.type==='frost'?'#b8ffff':'#fff4be');}ctx.globalAlpha=1;
    const cx=ox+cursor.x*s,cy=oy+cursor.y*s;
    if(selected){ctx.fillStyle='#d6eeb31b';ctx.strokeStyle='#d6eeb35c';ctx.lineWidth=1;ctx.beginPath();ctx.arc(ox+selected.x,oy+selected.y,selected.range,0,TAU);ctx.fill();ctx.stroke();}
    ctx.strokeStyle='#fff0b9';ctx.lineWidth=3;ctx.strokeRect(cx+3,cy+3,s-6,s-6);
    rect(15,13,930,47,'#0d2433e8');text(stages[stage],29,34,16,'#eee3bb');text(`ONDA ${d.wave}/${d.waves}   ·   BASE ${d.base}%   ·   OURO ${d.coins}   ·   ${d.kills} eliminados`,W-28,34,14,'#c1e2cc','right');
    text(d.active?'Defenda a rota · Construa e melhore durante a onda':'Prepare as torres e pressione N ou Próxima onda',29,51,11,'#a9c5bb');
    const hint=selected?`${selected.type==='frost'?'GELO':'RAIO'} NÍVEL ${selected.level} · Dano ${selected.damage} · ${selected.level<3?'Melhorar: '+selected.level*65+' ouro':'Nível máximo'}`:`${towerType==='frost'?'GELO: 75 ouro · desacelera inimigos':'RAIO: 60 ouro · disparo rápido'} · Clique num espaço livre`;
    rect(51,H-24,858,21,'#0c2631eb');text(hint,62,H-9,12,'#e5e6c9');
  }
  function hud(){
    if(td&&d){$('health').textContent=d.base;$('score').textContent=d.kills;$('ammo').textContent=d.coins;$('mission').textContent=(configAt(stage).objective?configAt(stage).objective+' · ':'')+'Proteja a base · '+d.wave+'/'+d.waves+' ondas';aux.disabled=state!=='play'||paused||d.active;}
    else if(player){$('health').textContent=Math.ceil(player.hp);$('score').textContent=player.coins;$('ammo').textContent=player.potions;$('mission').textContent=(configAt(stage).objective?configAt(stage).objective+' · ':'')+(configAt(stage).boss==='no'?'3 relíquias → portal':'3 relíquias + guardião → portal');}
    $('level').textContent=(stage+1)+'/'+stages.length;$('timer').textContent=Math.floor(stageTime)+'s';
  }
  function publish(){
    const p=td?{x:cursor.x*54+27,y:cursor.y*54+27,screenX:48+cursor.x*54+27,screenY:80+cursor.y*54+27}:player?{x:player.x,y:player.y,screenX:player.x-camera.x,screenY:player.y-camera.y}: {x:210,y:800,screenX:210,screenY:270};
    telemetry={genre:spec.genre,runtime:'expanded-2d',state:paused&&state==='play'?'paused':state,paused,frames,stage:stage+1,stageCount:stages.length,time,stageTime,player:p,camera:{...camera},health:td?d?.base||0:player?.hp||0,enemies:td?d?.enemies.length||0:enemies.length,bullets:bullets.length,particles:particles.length,score:td?d?.kills||0:player?.coins||0,resources:td?d?.coins||0:player?.coins||0,towers:d?.towers.length||0,wave:d?.wave||0,collectibles:collected,bossDefeated:bossDead,level:player?.level||1,objective:td?'protect-base':'relics-boss-portal'};
    Object.assign(window.__gameforgeTelemetry,telemetry);
  }
  function frame(now){const dt=last?Math.min(.05,Math.max(0,(now-last)/1000)):1/60;last=now;frames++;update(dt);ctx.clearRect(0,0,W,H);if(td)drawDefense();else drawRPG();hud();publish();requestAnimationFrame(frame);}
  $('start').addEventListener('click',()=>{
    if(state==='menu'||state==='victory')reset();else if(state==='defeat')startStage();else if(state==='intermission')continueStage();else if(state==='inventory'){state='play';paused=false;hide();}else if(paused)togglePause();
  });
  $('pause').addEventListener('click',togglePause);
  $('restart').addEventListener('click',()=>{if(state==='menu')reset();else startStage();$('pause').textContent='Pausar';});
  function keyDown(e){
    if(e.target&&['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
    const k=e.key.length===1?e.key.toLowerCase():e.key;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter'].includes(k))e.preventDefault();
    if(e.repeat){if(!td)keys.add(k);return;}
    if(k==='Escape'||k==='p'){togglePause();return;}
    if(k==='i'&&!td){inventory();return;}
    if(k==='e'&&!td){usePotion();return;}
    if(td&&state==='play'&&!paused){
      if(k==='ArrowRight'||k==='d')cursor.x=clamp(cursor.x+1,0,15);
      if(k==='ArrowLeft'||k==='a')cursor.x=clamp(cursor.x-1,0,15);
      if(k==='ArrowUp'||k==='w')cursor.y=clamp(cursor.y-1,0,7);
      if(k==='ArrowDown'||k==='s')cursor.y=clamp(cursor.y+1,0,7);
      if(k===' '||k==='Enter')actionDefense();if(k==='n')nextWave();
      if(k==='u'&&selected){const r=R.upgradeTower(d,selected);note(r.ok?'Torre melhorada':r.reason);}
      publish();
    }else keys.add(k);
  }
  window.addEventListener('keydown',keyDown);window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
  window.addEventListener('blur',()=>{clearInput();if(state==='play'&&!paused)togglePause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(state==='play'&&!paused)togglePause();}});
  canvas.addEventListener('pointerdown',e=>{if(state!=='play'||paused)return;canvas.focus();if(td){const r=canvas.getBoundingClientRect();buildAt(Math.floor(((e.clientX-r.left)*W/r.width-48)/54),Math.floor(((e.clientY-r.top)*H/r.height-80)/54));}else attack();});
  for(const control of document.querySelectorAll('[data-control]')){
    const name=control.getAttribute('data-control');
    control.addEventListener('pointerdown',e=>{e.preventDefault();if(control.setPointerCapture)control.setPointerCapture(e.pointerId);if(td){if(state!=='play'||paused)return;if(name==='fire')actionDefense();else{const delta={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[name];if(delta){cursor.x=clamp(cursor.x+delta[0],0,15);cursor.y=clamp(cursor.y+delta[1],0,7);}}}else touch[name]=true;});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])control.addEventListener(event,()=>{touch[name]=false;});
  }
  player=initialPlayer();if(td)d=R.createDefense(0,tuning);else{buildMap();spawnRPG();crystals=[{x:640,y:500},{x:1150,y:1030},{x:1740,y:630}];camera.y=530;}
  show(spec.title,td?'Construa torres em espaços livres, proteja a rota e vença todas as ondas. Raio causa dano; gelo desacelera.':'Explore o bosque e a vila, reúna 3 relíquias e vença o guardião para abrir o portal. Espaço dispara magia e golpeia de perto.','Jogar agora');
  $('message').style.opacity='0';hud();publish();requestAnimationFrame(frame);
}
if(typeof globalThis!=='undefined')globalThis.gameForgeExpanded2DBoot=gameForgeExpanded2DBoot;
if(typeof module!=='undefined')module.exports=gameForgeExpanded2DBoot;
