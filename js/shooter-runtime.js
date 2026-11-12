/* Motor shoot'em up vertical, independente de CDN e de jogos originais.
   Esta funcao e serializada para game.js pelo GameForge Generator. */
function gameForgeShooterBoot() {
  'use strict';
  const spec = GAME_SPEC;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', {alpha:false});
  const W=960, H=540, TAU=Math.PI*2;
  canvas.width=W;canvas.height=H;
  const $=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return [x/d,y/d];};
  const sq=(x,y)=>x*x+y*y;
  const hit=(a,b)=>sq(a.x-b.x,a.y-b.y)<(a.r+b.r)*(a.r+b.r);
  const tuning={difficulty:1,enemyMultiplier:1,bossMultiplier:1,playerSpeedMultiplier:1,fireRateMultiplier:1,particlesMultiplier:1,...(spec.tuning||{})};
  const theme=spec.shooterOptions?.theme||'space';
  const T=({neon:{bg:'#060619',mid:'#101d43',accent:'#53f9fa',danger:'#ff56bc',far:'#384691'},dragon:{bg:'#071f32',mid:'#12474e',accent:'#ffc46e',danger:'#f27842',far:'#6faba4'},space:{bg:'#050c25',mid:'#182451',accent:'#6ce9ff',danger:'#ff709c',far:'#4f64ab'}})[theme]||{};
  const levels=(spec.stages?.length?spec.stages:['Fase 1','Fase 2','Fase 3']).slice(0,10);
  const patterns=['line','v','zigzag','escort','cross','swarm'];
  const waves=levels.map((name,i)=>({name,pattern:patterns[i%patterns.length],pattern2:patterns[(i+2)%patterns.length],
    amount:Math.max(3,Math.round((7+i*3)*tuning.enemyMultiplier*tuning.difficulty)),spawnEvery:clamp(.94-i*.075,.39,.94),bossHp:Math.round((24+i*14)*tuning.bossMultiplier*tuning.difficulty),bossName: spec.enemyNames?.[i] || (theme==='dragon'?'Guardião das nuvens':theme==='neon'?'Sentinela cibernética':'Comandante sideral'),
    scroll:110+i*22,enemySpeed:(82+i*12)*tuning.difficulty,accent:[T.accent,'#b5a4ff','#ffd57b','#84f5aa','#ff7da3'][i%5]}));
  // Particulas, tiros e inimigos possuem limites: gameplay nao depende da qualidade grafica.
  const LIMITS={enemies:32,enemyBullets:140,playerBullets:110,particles:Math.max(30,Math.round(180*tuning.particlesMultiplier)),stars:105};
  let stageIndex=0,state='menu',paused=false,last=0,frames=0,time=0,stageTime=0,stageKills=0,score=0,credits=0;
  let waveSpawned=0,spawnClock=0,groupStep=0,boss=null,bossSeen=false,health=100,lives=3,weapon=1,shield=0,fireClock=0,invuln=0;
  let player={x:W/2,y:H-92,r:19,afterimages:[]},enemies=[],friendly=[],hostile=[],drops=[],particles=[];
  let speedLevel=0,flash=0,shake=0,quality='high',qualitySamples=0,fpsEstimate=60;
  const keys=new Set(),touch={up:false,down:false,left:false,right:false,fire:false};
  let mouse={x:W/2,y:H/2,down:false},audio=null;
  const rand=(a,b)=>a+Math.random()*(b-a);
  const stars=Array.from({length:LIMITS.stars},(_,i)=>({x:Math.random()*W,y:Math.random()*H,s:.7+(i%4)*.45,v:17+(i%3)*34,phase:Math.random()*TAU}));
  function sound(hz=470,duration=.05,type='sine',volume=.026){
    try{
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      audio=audio||new AC();if(audio.state==='suspended')audio.resume();
      const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;
      o.type=type;o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(Math.max(70,hz*.6),t+duration);
      g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);
      o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+duration+.01);
    }catch(_){/* audio opcional; nenhum erro de gameplay */}
  }
  function note(s){$('message').textContent=s;$('message').style.opacity='1';setTimeout(()=>{if($('message').textContent===s)$('message').style.opacity='0';},1700);}
  const store=document.createElement('div');store.setAttribute('aria-label','Loja de melhorias entre fases');
  store.style.cssText='display:none;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:12px';
  document.querySelector('.dialog').appendChild(store);
  function shop(){
    store.textContent='';store.style.display=state==='intermission'?'flex':'none';
    if(state!=='intermission')return;
    const goods=[{name:'Arma +1',price:150,allowed:()=>weapon<3,apply:()=>weapon++},
                 {name:'Escudo +1',price:100,allowed:()=>shield<2,apply:()=>shield++},
                 {name:'Motor +1',price:160,allowed:()=>speedLevel<3,apply:()=>speedLevel++}];
    for(const item of goods){
      const b=document.createElement('button');b.type='button';
      b.textContent=item.name+' · '+item.price+' créditos';b.disabled=credits<item.price||!item.allowed();
      b.style.cssText='padding:8px;font-size:11px';b.addEventListener('click',()=>{
        if(state!=='intermission'||credits<item.price||!item.allowed())return;
        credits-=item.price;item.apply();sound(900,.13);shop();
        $('overlay-sub').textContent='Melhoria instalada · '+credits+' créditos disponíveis';
      });store.appendChild(b);
    }
  }
  function overlay(title,sub,action){$('overlay-title').textContent=title;$('overlay-sub').textContent=sub;$('start').textContent=action;$('overlay').classList.remove('hidden');shop();}
  function hideOverlay(){$('overlay').classList.add('hidden');store.style.display='none';canvas.focus();}
  function cleanStage(){enemies=[];friendly=[];hostile=[];drops=[];particles=[];boss=null;waveSpawned=0;groupStep=0;bossSeen=false;stageKills=0;stageTime=0;spawnClock=.8;player.x=W/2;player.y=H-92;player.afterimages=[];invuln=1.4;fireClock=0;flash=0;shake=0;}
  function initStage(){cleanStage();state='play';paused=false;hideOverlay();note(levels[stageIndex]);sound(350,.15,'triangle',.045);}
  function newGame(){stageIndex=0;score=0;credits=0;health=100;lives=3;weapon=1;shield=0;speedLevel=0;time=0;initStage();}
  function progress(){
    const name=levels[stageIndex];
    if(stageIndex+1>=levels.length){state='victory';overlay('MISSÃO CONCLUÍDA',`Pontuação ${score} · ${credits} créditos · ${levels.length} fases vencidas`,'Nova missão');sound(820,.2);return;}
    const done=stageIndex+1;stageIndex++;
    health=Math.min(100,health+22);lives=Math.min(5,lives+ (done%2===0?1:0));
    state='intermission';
    overlay('FASE CONCLUÍDA',`${name} · +22 energia · Próxima: ${levels[stageIndex]}`,'Continuar');
  }
  function loseLife(){
    if(invuln>0||state!=='play')return;
    if(shield>0){shield--;invuln=.8;flash=.15;sound(280,.13,'triangle');return;}
    health-=34;invuln=1.3;shake=8;flash=.15;sound(120,.25,'sawtooth',.055);
    blast(player.x,player.y,T.danger,20);
    if(health<=0){lives--;health=100;if(lives<=0){state='defeat';overlay('FIM DE JOGO',`Pontuação ${score} · fases concluídas: ${stageIndex}`,'Tentar novamente');}else note('NAVE DANIFICADA · '+lives+' vidas');}
  }
  function blast(x,y,color,count=13){
    const n=Math.min(Math.round(count*tuning.particlesMultiplier),LIMITS.particles-particles.length);
    for(let i=0;i<n;i++){const a=rand(0,TAU),v=rand(35,220),life=rand(.24,.67);
      particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life,max:life,r:rand(1.4,4.8),color});}
  }
  function fire(){
    if(fireClock>0||friendly.length>LIMITS.playerBullets-7)return;
    fireClock=(weapon>=3?.105:weapon===2?.155:.19)/tuning.fireRateMultiplier;
    const pattern=weapon>=3?[-.27,0,.27]:weapon===2?[-.12,.12]:[0];
    for(const angle of pattern){friendly.push({x:player.x+Math.sin(angle)*14,y:player.y-21,vx:Math.sin(angle)*155,vy:-700,r:weapon===3?6:5,damage:1,dead:false});}
    sound(theme==='dragon'?350:770,.045,theme==='dragon'?'sawtooth':'square',.012);
  }
  function spawnEnemy(pattern,offset,groupSize){
    if(enemies.length>=LIMITS.enemies)return;
    const phase=waves[stageIndex],idx=groupStep++,n=Math.max(2,groupSize);
    const central=W/2;
    let x=rand(65,W-65),y=-45-(idx%n)*10;
    if(pattern==='line')x=central+(offset-(n-1)/2)*95;
    if(pattern==='v'){x=central+(offset-(n-1)/2)*91;y=-55-Math.abs(offset-(n-1)/2)*25;}
    if(pattern==='escort'){x=central+(offset-(n-1)/2)*100;y=-38-(offset%2)*40;}
    if(pattern==='cross')x=offset%2===0?85:W-85;
    if(pattern==='swarm')x=central+Math.sin(offset*2.1)*280;
    const kind=idx%7===5?'sniper':idx%9===7?'tank':idx%4===0?'weaver':'scout';
    enemies.push({x,y,baseX:x,r:kind==='tank'?22:kind==='sniper'?18:16,hp:kind==='tank'?4:kind==='sniper'?3:2,
      max:kind==='tank'?4:kind==='sniper'?3:2,t:rand(0,2),shot:rand(.8,2.2),kind,pattern,speed:phase.enemySpeed*(kind==='tank'?.65:1),dead:false});
  }
  function spawnWave(dt){
    const phase=waves[stageIndex];if(bossSeen)return;
    if(waveSpawned<phase.amount){
      spawnClock-=dt;
      if(spawnClock<=0){
        const count=Math.min(4,phase.amount-waveSpawned),pattern=(waveSpawned<phase.amount/2)?phase.pattern:phase.pattern2;
        for(let i=0;i<count;i++)spawnEnemy(pattern,i,count);
        waveSpawned+=count;spawnClock=phase.spawnEvery*(count>1?1.9:1);
      }
    }else if(!enemies.length && !boss){
      bossSeen=true;boss={x:W/2,y:-110,r:65,hp:phase.bossHp,max:phase.bossHp,t:0,shot:1.1,phase:1,dead:false,entering:true};
      note('ALERTA: '+phase.bossName.toUpperCase());sound(185,.36,'sawtooth',.055);
    }
  }
  function enemyShot(x,y,kind,angle){
    if(hostile.length>=LIMITS.enemyBullets)return;
    const speed=kind==='sniper'?270:kind==='boss'?190+stageIndex*12:170+stageIndex*11;
    hostile.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:kind==='boss'?8:6,dead:false,kind});
  }
  function updateEnemy(e,dt){
    e.t+=dt;e.shot-=dt;e.y+=e.speed*dt;
    const a=e.t*2.3;
    if(e.pattern==='zigzag'||e.kind==='weaver')e.x=e.baseX+Math.sin(a)*85;
    else if(e.pattern==='v')e.x=e.baseX+Math.sin(a*.65)*24;
    else if(e.pattern==='cross')e.x+=(e.baseX<W/2?1:-1)*76*dt;
    else if(e.pattern==='swarm')e.x=e.baseX+Math.sin(a*1.75)*125;
    else if(e.pattern==='escort')e.x=e.baseX+Math.cos(a)*31;
    e.x=clamp(e.x,28,W-28);
    if(e.shot<0&&e.y>0&&e.y<H-80){
      e.shot=rand(1.5,3.1)-Math.min(stageIndex*.065,.4);
      const ang=Math.atan2(player.y-e.y,player.x-e.x);
      enemyShot(e.x,e.y,e.kind,ang);
      if(e.kind==='tank'){enemyShot(e.x,e.y,e.kind,ang-.26);enemyShot(e.x,e.y,e.kind,ang+.26);}
    }
    if(e.y>H+65)e.dead=true;
  }
  function updateBoss(dt){
    if(!boss)return;
    boss.t+=dt;boss.shot-=dt;
    if(boss.entering){boss.y+=(110-boss.y)*Math.min(1,dt*1.8);if(boss.y>102)boss.entering=false;return;}
    boss.x=W/2+Math.sin(boss.t*.75)*(230+stageIndex*5);
    const ratio=boss.hp/boss.max;
    boss.phase=ratio<.34?3:ratio<.67?2:1;
    if(boss.shot<=0){
      boss.shot=boss.phase===1?1.2:boss.phase===2?.95:.7;
      const aimed=Math.atan2(player.y-boss.y,player.x-boss.x);
      const shots=boss.phase===1?5:boss.phase===2?7:11;
      for(let i=0;i<shots;i++){
        const angle=boss.phase===1?aimed+(i-2)*.20: Math.PI/2 + (i-(shots-1)/2)*(.20+.03*boss.phase)+Math.sin(boss.t)*.12;
        enemyShot(boss.x,boss.y+25,'boss',angle);
      }
      sound(200,.1,'triangle',.023);
    }
  }
  function pickup(x,y){
    if(drops.length>15)return;
    const type=health<55&&Math.random()<.3?'health':Math.random()<.45?'weapon':Math.random()<.33?'shield':'credit';
    drops.push({x,y,r:14,type,vy:75});
  }
  function killEnemy(e){
    if(e.dead)return;
    e.dead=true;stageKills++;score+=e.kind==='tank'?160:100;credits+=e.kind==='tank'?25:10;
    blast(e.x,e.y,T.danger,quality==='low'?6:11);
    if(Math.random()<.21)pickup(e.x,e.y);
  }
  function update(dt){
    if(state!=='play'||paused)return;
    time+=dt;stageTime+=dt;fireClock-=dt;invuln-=dt;flash=Math.max(0,flash-dt);shake=Math.max(0,shake-dt*19);
    const vx=(keys.has('ArrowRight')||keys.has('d')||touch.right?1:0)-(keys.has('ArrowLeft')||keys.has('a')||touch.left?1:0);
    const vy=(keys.has('ArrowDown')||keys.has('s')||touch.down?1:0)-(keys.has('ArrowUp')||keys.has('w')||touch.up?1:0);
    const direction=norm(vx,vy),moving=!!(vx||vy),speed=(345+speedLevel*42)*tuning.playerSpeedMultiplier;
    if(moving){player.x=clamp(player.x+direction[0]*speed*dt,36,W-36);player.y=clamp(player.y+direction[1]*speed*dt,185,H-32);}
    player.afterimages.push({x:player.x,y:player.y,life:.22});
    if(player.afterimages.length>10)player.afterimages.shift();
    for(const a of player.afterimages)a.life-=dt;
    player.afterimages=player.afterimages.filter(a=>a.life>0);
    if(keys.has(' ')||keys.has('Enter')||touch.fire||mouse.down||spec.shooterOptions?.autofire)fire();
    spawnWave(dt);
    for(const e of enemies)updateEnemy(e,dt);
    updateBoss(dt);
    for(const b of friendly){b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.y<-30||b.x<0||b.x>W)b.dead=true;}
    for(const b of hostile){b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.y>H+30||b.y<-40||b.x<-40||b.x>W+40)b.dead=true;}
    for(const e of enemies){if(e.dead)continue;
      if(hit(player,e)){loseLife();e.dead=true;blast(e.x,e.y,T.danger,8);}
      for(const b of friendly){if(!b.dead&&hit(b,e)){b.dead=true;e.hp-=b.damage;if(e.hp<=0){killEnemy(e);break;}}}
    }
    if(boss&&!boss.dead){
      if(!boss.entering&&hit(boss,player))loseLife();
      for(const b of friendly){if(!b.dead&&!boss.entering&&hit(b,boss)){b.dead=true;boss.hp-=b.damage;shake=Math.max(shake,1.3);
        if(boss.hp<=0){boss.dead=true;score+=1800+stageIndex*350;credits+=280;blast(boss.x,boss.y,T.accent,55);sound(450,.2);break;}}}
    }
    for(const b of hostile){if(!b.dead&&hit(player,b)){b.dead=true;loseLife();}}
    for(const d of drops){d.y+=d.vy*dt;if(hit(player,d)){d.dead=true;credits+=d.type==='credit'?70:0;
      if(d.type==='health')health=Math.min(100,health+30);
      if(d.type==='weapon')weapon=Math.min(3,weapon+1);
      if(d.type==='shield')shield=Math.min(2,shield+1);
      sound(990,.12);note(({health:'ENERGIA +30',weapon:'ARMA EVOLUÍDA',shield:'ESCUDO ATIVADO',credit:'CRÉDITOS +70'})[d.type]);}
      if(d.y>H+25)d.dead=true;
    }
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
    enemies=enemies.filter(x=>!x.dead);friendly=friendly.filter(x=>!x.dead);hostile=hostile.filter(x=>!x.dead);
    drops=drops.filter(x=>!x.dead);particles=particles.filter(x=>x.life>0);
    if(boss?.dead){boss=null;progress();}
    $('health').textContent=health+'%';$('score').textContent=score;$('ammo').textContent='NÍV '+weapon;
    $('level').textContent=(stageIndex+1)+'/'+levels.length;$('timer').textContent=Math.floor(stageTime)+'s';
    $('mission').textContent=levels[stageIndex]+' · '+(boss?'CHEFE':`Ondas ${Math.min(waveSpawned,waves[stageIndex].amount)}/${waves[stageIndex].amount}`);
  }
  function background(){
    ctx.fillStyle=T.bg;ctx.fillRect(0,0,W,H);
    const offset=time*waves[stageIndex].scroll;
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,T.bg);g.addColorStop(1,T.mid);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.globalAlpha=.22;ctx.strokeStyle=T.far;ctx.lineWidth=2;
    if(theme==='neon'){
      for(let i=0;i<12;i++){const x=i*83+8,h=120+(i*61)%150;
        ctx.fillStyle=i%2?'#172947':'#182c63';ctx.fillRect(x,H-h+((offset*.08)%33),65,h);
        ctx.strokeStyle=T.accent;ctx.strokeRect(x,H-h+((offset*.08)%33),65,h);
      }
    }else if(theme==='dragon'){
      for(let i=0;i<10;i++){const x=i*118-110,h=120+(i*77)%180,y=420+offset*.09%110;
        ctx.fillStyle='#1c5d60';ctx.beginPath();ctx.ellipse(x,y,150,h,0,0,TAU);ctx.fill();
      }
    }else{
      for(let i=0;i<6;i++){ctx.strokeStyle='#8492e766';ctx.beginPath();ctx.arc(W/2+Math.sin(i)*340,H/2+Math.cos(i)*220,70+i*24,0,TAU);ctx.stroke();}
    }
    ctx.globalAlpha=1;
    for(const s of stars){const y=(s.y+offset*(s.v/60))%(H+24)-12,twinkle=.65+.25*Math.sin(time*2+s.phase);
      ctx.globalAlpha=twinkle;ctx.fillStyle=s.s>1.9?T.accent:'#c4d8ff';ctx.fillRect(s.x,y,s.s,s.s*2.2);
    }ctx.globalAlpha=1;
    ctx.fillStyle='#ffffff12';ctx.fillRect(0,0,W,5);
  }
  function polygon(points,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fill();}
  function ship(x,y,scale=1,enemy=false){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    if(enemy)ctx.rotate(Math.PI);
    ctx.shadowColor=enemy?T.danger:T.accent;ctx.shadowBlur=quality==='low'?0:14;
    if(theme==='dragon'){
      const flap=Math.sin(time*11+(enemy?x:0))*.3;
      polygon([[0,-29],[-12,-12],[-33+flap*13,10],[-12,7],[0,22]],enemy?T.danger:T.accent);
      polygon([[0,-29],[12,-12],[33-flap*13,10],[12,7],[0,22]],enemy?T.danger:T.accent);
      polygon([[-7,11],[0,-25],[7,11],[0,28]],enemy?'#ffb16a':'#ffc982');
      ctx.fillStyle='#fff';ctx.fillRect(-6,-13,4,3);ctx.fillRect(3,-13,4,3);
    }else{
      polygon([[0,-32],[11,-8],[31,14],[9,10],[0,19],[-9,10],[-31,14],[-11,-8]],enemy?T.danger:T.accent);
      polygon([[-11,-4],[0,-26],[11,-4],[7,21],[-7,21]],enemy?'#592943':'#123c68');
      polygon([[-5,-5],[0,-18],[5,-5],[0,5]],'#d2faff');
      if(!enemy){ctx.fillStyle='#ffa465';ctx.fillRect(-13,18,7,8+Math.sin(time*23)*6);ctx.fillRect(6,18,7,8+Math.cos(time*21)*6);}
    }
    ctx.shadowBlur=0;ctx.restore();
  }
  function enemyDraw(e){
    ctx.save();ctx.translate(e.x,e.y);ctx.scale(e.r/20,e.r/20);
    ship(0,0,1,true);
    ctx.restore();
    if(e.hp<e.max){ctx.fillStyle='#1b213a';ctx.fillRect(e.x-16,e.y-27,32,3);ctx.fillStyle=T.accent;ctx.fillRect(e.x-16,e.y-27,32*e.hp/e.max,3);}
  }
  function bossDraw(){
    if(!boss)return;
    const b=boss;
    ctx.save();ctx.translate(b.x,b.y);
    ctx.shadowColor=T.danger;ctx.shadowBlur=quality==='low'?0:26;
    ctx.fillStyle='#35163f';ctx.beginPath();ctx.ellipse(0,5,70,49,0,0,TAU);ctx.fill();
    polygon([[0,53],[-28,15],[-70,33],[-54,-29],[-30,-12],[0,-57],[30,-12],[54,-29],[70,33],[28,15]],T.danger);
    polygon([[0,39],[-22,5],[0,-41],[22,5]],'#211b4e');
    ctx.fillStyle=T.accent;ctx.beginPath();ctx.arc(0,7,19+Math.sin(time*5)*3,0,TAU);ctx.fill();
    ctx.restore();
    ctx.fillStyle='#0a1833cc';ctx.fillRect(240,42,480,17);
    ctx.fillStyle=T.danger;ctx.fillRect(244,46,472*clamp(b.hp/b.max,0,1),9);
    ctx.fillStyle='#fff';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillText(waves[stageIndex].bossName.toUpperCase()+` · FASE ${b.phase}`,W/2,34);ctx.textAlign='left';
  }
  function render(){
    ctx.save();if(shake)ctx.translate(rand(-shake,shake),rand(-shake,shake));
    background();
    for(const a of player.afterimages){ctx.globalAlpha=a.life*.6;ship(a.x,a.y,.85);}
    ctx.globalAlpha=1;
    for(const d of drops){ctx.save();ctx.translate(d.x,d.y);ctx.rotate(time*2);ctx.shadowBlur=10;ctx.shadowColor=T.accent;
      ctx.fillStyle=d.type==='health'?'#79e3a6':d.type==='weapon'?'#ffc76b':d.type==='shield'?'#78caff':'#c3a0ff';
      ctx.fillRect(-11,-11,22,22);ctx.shadowBlur=0;ctx.fillStyle='#142136';ctx.fillRect(-4,-6,8,12);ctx.restore();}
    for(const e of enemies)enemyDraw(e);
    bossDraw();
    ctx.fillStyle='#fff8a1';for(const b of friendly){ctx.shadowColor=T.accent;ctx.shadowBlur=quality==='low'?0:10;ctx.fillRect(b.x-3,b.y-12,6,18);}ctx.shadowBlur=0;
    for(const b of hostile){ctx.fillStyle=b.kind==='boss'?'#ff74dc':'#ff9e70';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);ctx.fill();}
    for(const p of particles){ctx.globalAlpha=p.life/p.max;ctx.fillStyle=p.color;ctx.fillRect(p.x-p.r/2,p.y-p.r/2,p.r,p.r);}
    ctx.globalAlpha=1;
    if(invuln<=0||Math.floor(time*12)%2===0)ship(player.x,player.y);
    if(shield>0){ctx.strokeStyle=T.accent;ctx.lineWidth=2;ctx.beginPath();ctx.arc(player.x,player.y,30+Math.sin(time*4)*2,0,TAU);ctx.stroke();}
    if(flash){ctx.fillStyle=`rgba(255,90,120,${flash*.95})`;ctx.fillRect(0,0,W,H);}
    ctx.restore();
    // HUD visual em Canvas, sem depender de imagens remotas.
    ctx.fillStyle='#050b1caa';ctx.fillRect(18,18,194,73);ctx.fillStyle='#d6f4ff';ctx.font='bold 15px system-ui';ctx.fillText('VIDAS  '+ '♥ '.repeat(lives),30,40);
    ctx.font='13px system-ui';ctx.fillText('ESCUDO  '+shield+'    CRÉDITOS  '+credits,30,61);ctx.fillText('ARMA '+weapon+'   MOTOR '+(speedLevel+1),30,78);
    if(paused&&state==='play'){ctx.fillStyle='#030a22bd';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 54px system-ui';ctx.textAlign='center';ctx.fillText('PAUSADO',W/2,H/2);ctx.textAlign='left';}
  }
  window.__gameforgeTelemetry=()=>({state,paused,frames,clock:time,stage:stageIndex,genre:'shooter',player:{x:player.x,y:player.y,radius:player.r,screenX:player.x,screenY:player.y},enemies:enemies.length,enemyBullets:hostile.length,playerBullets:friendly.length,bossHp:boss?.hp??null,spawned:waveSpawned,weapon,lives,credits,speedLevel,quality});
  function loop(ms){
    const dt=Math.min(.035,Math.max(0,(ms-last)/1000));last=ms;
    if(dt){fpsEstimate=fpsEstimate*.96+(.04/dt);qualitySamples+=dt;if(qualitySamples>3){qualitySamples=0;quality=fpsEstimate<38?'low':'high';}}
    update(dt);render();frames++;requestAnimationFrame(loop);
  }
  $('start').addEventListener('click',()=>{if(state==='intermission')initStage();else newGame();});
  $('pause').addEventListener('click',()=>{if(state==='play')paused=!paused;});
  $('restart').addEventListener('click',newGame);
  window.addEventListener('keydown',e=>{
    if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();
    keys.add(e.key.toLowerCase());keys.add(e.key);
    if(e.key==='Escape'&&state==='play')paused=!paused;
    if(e.key==='r'&&state!=='play')$('start').click();
  });
  window.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());keys.delete(e.key);});
  canvas.addEventListener('pointerdown',()=>{mouse.down=true;});
  window.addEventListener('pointerup',()=>{mouse.down=false;});
  document.querySelectorAll('[data-control]').forEach(b=>{
    const k=b.dataset.control;
    b.addEventListener('pointerdown',e=>{e.preventDefault();touch[k]=true;try{b.setPointerCapture(e.pointerId);}catch(_){}});
    ['pointerup','pointercancel','lostpointercapture'].forEach(evt=>b.addEventListener(evt,()=>{touch[k]=false;}));
  });
  $('title').textContent=spec.title||'Novo jogo de nave';
  $('control-help').textContent='WASD / Setas: pilotar · Espaço: atirar · Esc: pausa';
  $('overlay-sub').textContent='Shoot’em up vertical · '+levels.length+' fases · ondas, melhorias e chefes';
  $('timer-pill').style.display='';
  requestAnimationFrame(loop);
}
if(typeof globalThis!=='undefined')globalThis.gameForgeShooterBoot=gameForgeShooterBoot;
if(typeof module!=='undefined')module.exports=gameForgeShooterBoot;
