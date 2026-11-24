/* Motor shoot'em up vertical, independente de CDN e de jogos originais.
   Esta funcao e serializada para game.js pelo GameForge Generator. */
function gameForgeShooterBoot() {
  'use strict';
 const V=typeof GameForgeGraphics==='object'?GameForgeGraphics:null;
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
  const requested=spec.shooterOptions?.theme,theme=['dragon','neon','space'].includes(requested)?requested:'space';
  const profile={dragon:{speed:255,special:'Sopro ancestral',resource:'Fôlego',regen:22,cost:45,patterns:['zigzag','swarm','escort']},space:{speed:345,special:'Míssil teleguiado',resource:'Mísseis',regen:12,cost:50,patterns:['line','v','escort','cross']},neon:{speed:410,special:'Dash elétrico',resource:'Carga',regen:30,cost:35,patterns:['cross','swarm','zigzag']}}[theme];
  let energy=100,overheat=false,specialHeld=false,dash=0,dashX=0,dashY=0,combo=0,comboTime=0,specialUses=0;
  const T=({neon:{bg:'#060619',mid:'#101d43',accent:'#53f9fa',danger:'#ff56bc',far:'#384691'},dragon:{bg:'#071f32',mid:'#12474e',accent:'#ffc46e',danger:'#f27842',far:'#6faba4'},space:{bg:'#050c25',mid:'#182451',accent:'#6ce9ff',danger:'#ff709c',far:'#4f64ab'}})[theme]||{};
  const levels=(spec.stages?.length?spec.stages:['Fase 1','Fase 2','Fase 3']).slice(0,30);
  const configAt=i=>Array.isArray(spec.stageConfig)&&spec.stageConfig[i]&&typeof spec.stageConfig[i]==='object'?spec.stageConfig[i]:{};
  const patterns=profile.patterns;
  const roster={
    dragon:[{id:'wyvern',kind:'tank',hp:5,r:22,speed:.7},{id:'harpy',kind:'weaver',hp:3,r:17,speed:1.12},{id:'eagle',kind:'scout',hp:2,r:15,speed:1.32}],
    space:[{id:'fighter',kind:'scout',hp:2,r:16,speed:1},{id:'interceptor',kind:'weaver',hp:2,r:15,speed:1.3},{id:'gunship',kind:'tank',hp:5,r:23,speed:.65},{id:'frigate',kind:'sniper',hp:4,r:19,speed:.8}],
    neon:[{id:'drone',kind:'weaver',hp:2,r:14,speed:1.25},{id:'sentinel',kind:'sniper',hp:3,r:18,speed:.92},{id:'prism',kind:'tank',hp:4,r:21,speed:.78}]
  }[theme];
  const heroId={dragon:'ember-dragon',space:'starfighter',neon:'pulse-glider'}[theme];
  const waves=levels.map((name,i)=>({name,pattern:patterns[i%patterns.length],pattern2:patterns[(i+2)%patterns.length],
    amount:configAt(i).enemies>0?clamp(configAt(i).enemies,1,80):Math.max(3,Math.round((7+i*3)*tuning.enemyMultiplier*tuning.difficulty)),spawnEvery:clamp(.94-i*.075,.39,.94),bossHp:Math.round((24+i*14)*tuning.bossMultiplier*tuning.difficulty),bossName: spec.enemyNames?.[i] || (theme==='dragon'?'Guardião das nuvens':theme==='neon'?'Sentinela cibernética':'Comandante sideral'),
    scroll:110+i*22,enemySpeed:(82+i*12)*tuning.difficulty,accent:[T.accent,'#b5a4ff','#ffd57b','#84f5aa','#ff7da3'][i%5]}));
  // Particulas, tiros e inimigos possuem limites: gameplay nao depende da qualidade grafica.
  const LIMITS={enemies:32,enemyBullets:140,playerBullets:110,particles:Math.max(30,Math.round(180*tuning.particlesMultiplier)),stars:105};
  let stageIndex=0,state='menu',paused=false,last=0,frames=0,time=0,stageTime=0,stageKills=0,score=0,credits=0;
  const SIM_DT=1/60,MAX_SIM_STEPS=5;
  let simulationAccumulator=0,simulationSteps=0;
  let waveSpawned=0,spawnClock=0,groupStep=0,boss=null,bossSeen=false,health=100,lives=3,weapon=1,shield=0,fireClock=0,invuln=0;
  let player={x:W/2,y:H-92,r:19,afterimages:[]},enemies=[],friendly=[],hostile=[],drops=[],particles=[],enemySerial=0;
  let speedLevel=0,flash=0,shake=0,quality=V?V.quality:'high',qualitySamples=0,fpsEstimate=60;
  const keys=new Set(),touch={up:false,down:false,left:false,right:false,fire:false};
  let mouse={x:W/2,y:H/2,down:false},audio=null;
  const rand=(a,b)=>a+Math.random()*(b-a);
  // Scene choices follow stage titles when possible; fallback cycles are theme-specific.
  const scenery={
    dragon:[['mountains','#132f50','#447e88'],['castle','#242c48','#63758b'],['forest','#102f30','#366f50'],['volcano','#301a30','#733b38'],['ocean','#122a4c','#286a84'],['storm','#171e3a','#46566b']],
    space:[['planets','#080f2b','#1c3258'],['asteroids','#121326','#34314b'],['nebula','#1b1035','#3d2465'],['station','#0c1829','#29465a'],['galaxy','#100b28','#263255']],
    neon:[['megacity','#080b24','#24164a'],['highway','#090d22','#152e46'],['tunnel','#100825','#332047'],['hologram','#071929','#18395b'],['rain','#0b1427','#243c50']]
  }[theme];
  const sceneWords={mountains:/montanh|vale|serra|mountain|valley/,castle:/castel|fortalez|castle|fortress/,forest:/florest|selva|forest|jungle/,volcano:/vulc|lava|ardent|inferno/,ocean:/ocean|marit|ilha|sea|island/,storm:/tempest|storm|trovo/,planets:/planet|lua|moon/,asteroids:/astero|meteoro/,nebula:/nebul/,station:/estacao|orbital|station/,galaxy:/galax|cosmos/,megacity:/cidade|city|metropol/,highway:/rodovia|estrada|highway/,tunnel:/tunel|tunnel|nucleo|core/,hologram:/hologram|digital/,rain:/chuva|rain/};
  const stageScenes=levels.map((name,i)=>{const n=String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return scenery.find(v=>sceneWords[v[0]].test(n))||scenery[i%scenery.length];});
  let sceneCache=null,sceneDraws=0;
  function sceneRandom(seed){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
  function sceneData(){
    if(sceneCache?.stage===stageIndex)return sceneCache;
    const [id,top,bottom]=stageScenes[stageIndex],rng=sceneRandom((stageIndex+1)*8191+id.split('').reduce((a,b)=>a+b.charCodeAt(0),0));
    const gradient=ctx.createLinearGradient(0,0,0,H);gradient.addColorStop(0,top);gradient.addColorStop(1,bottom);
    const layers=[18,12,9].map((count,j)=>Array.from({length:count},(_,i)=>({x:rng()*W,y:rng()*(H+240),s:.45+rng()*.7,variant:Math.floor(rng()*5),phase:rng()*TAU,side:i%2?1:-1})));
    return sceneCache={stage:stageIndex,id,gradient,layers};
  }

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
  function cleanStage(){enemies=[];friendly=[];hostile=[];drops=[];particles=[];boss=null;waveSpawned=0;groupStep=0;bossSeen=false;stageKills=0;stageTime=0;spawnClock=.8;player.x=W/2;player.y=H-92;player.afterimages=[];invuln=1.4;fireClock=0;flash=0;shake=0;energy=100;overheat=false;specialHeld=false;dash=0;combo=0;comboTime=0;}
  function initStage(){cleanStage();simulationAccumulator=0;state='play';paused=false;hideOverlay();note(levels[stageIndex]);sound(350,.15,'triangle',.045);}
  function newGame(){stageIndex=0;score=0;credits=0;health=100;lives=3;weapon=1;shield=0;speedLevel=0;time=0;simulationSteps=0;specialUses=0;initStage();}
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
    health-=34;combo=0;comboTime=0;invuln=1.3;shake=8;flash=.15;sound(120,.25,'sawtooth',.055);
    blast(player.x,player.y,T.danger,20);
    if(health<=0){lives--;health=100;if(lives<=0){state='defeat';overlay('FIM DE JOGO',`Pontuação ${score} · fases concluídas: ${stageIndex}`,'Tentar novamente');}else note((theme==='dragon'?'DRAGÃO FERIDO':'NAVE DANIFICADA')+' · '+lives+' vidas');}
  }
  function blast(x,y,color,count=13){
    const n=Math.min(Math.round(count*tuning.particlesMultiplier),LIMITS.particles-particles.length);
    for(let i=0;i<n;i++){const a=rand(0,TAU),v=rand(35,220),life=rand(.24,.67);
      particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life,max:life,r:rand(1.4,4.8),color});}
  }
  function fire(){
    if(fireClock>0||friendly.length>LIMITS.playerBullets-7)return;
    if(theme==='dragon'){
      if(overheat||energy<6)return;energy-=6;if(energy<6)overheat=true;fireClock=.10/tuning.fireRateMultiplier;
      for(let i=-1;i<=1;i++)friendly.push({x:player.x+i*8,y:player.y-21,vx:i*105,vy:-480,r:11+weapon*2,damage:.75+weapon*.25,ttl:.38+weapon*.04,kind:'flame',dead:false});
      sound(350,.045,'sawtooth',.012);return;
    }
    fireClock=(theme==='neon'?.12:weapon>=3?.105:weapon===2?.155:.19)/tuning.fireRateMultiplier;
    const pattern=weapon>=3?[-.27,0,.27]:weapon===2?[-.12,.12]:[0];
    for(const angle of pattern){friendly.push({x:player.x+Math.sin(angle)*14,y:player.y-21,vx:Math.sin(angle)*155,vy:-700,r:weapon===3?6:5,damage:1,dead:false});}
    sound(theme==='dragon'?350:770,.045,theme==='dragon'?'sawtooth':'square',.012);
  }
  function special(vx,vy){
    if(energy<profile.cost||dash>0||friendly.length>LIMITS.playerBullets-9)return;
    energy-=profile.cost;specialUses++;
    if(theme==='dragon'){
      for(let i=-4;i<=4;i++)friendly.push({x:player.x,y:player.y-24,vx:i*90,vy:-520,r:17,damage:3,ttl:.65,kind:'flame',dead:false});
    }else if(theme==='space'){
      for(const side of [-1,1])friendly.push({x:player.x+side*16,y:player.y-20,vx:side*80,vy:-300,r:8,damage:6,ttl:2.5,kind:'missile',dead:false});
    }else{
      const [dx,dy]=norm(vx,vy||(!vx?-1:0));dashX=dx;dashY=dy;dash=.18;invuln=Math.max(invuln,.22);
      for(let i=-2;i<=2;i++)friendly.push({x:player.x,y:player.y-20,vx:i*100,vy:-760,r:6,damage:2,dead:false});
    }
    note(profile.special);sound(theme==='dragon'?210:560,.16,'triangle',.035);
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
    const unit=roster[idx%roster.length],kind=unit.kind;
    enemies.push({id:++enemySerial,x,y,baseX:x,r:unit.r,hp:unit.hp,max:unit.hp,t:rand(0,2),shot:rand(.8,2.2),kind,model:unit.id,pattern,speed:phase.enemySpeed*unit.speed,dead:false});
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
      bossSeen=true;if(configAt(stageIndex).boss==='no'){progress();return;}boss={x:W/2,y:-110,r:65,hp:phase.bossHp,max:phase.bossHp,t:0,shot:1.1,phase:1,dead:false,entering:true};
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
    if(e.model==='eagle')e.x+=Math.sin(e.t*4)*18;
    if(e.model==='harpy')e.y+=Math.sin(e.t*5)*dt*22;
    if(e.model==='interceptor')e.x+=Math.sin(e.t*5)*28;
    if(e.model==='drone')e.x+=Math.sin(e.t*7)*22;
    e.x=clamp(e.x,28,W-28);
    if(e.shot<0&&e.y>0&&e.y<H-80){
      e.shot=rand(1.5,3.1)-Math.min(stageIndex*.065,.4);
      const ang=Math.atan2(player.y-e.y,player.x-e.x);
      enemyShot(e.x,e.y,e.kind,ang);
      if(e.kind==='tank'){enemyShot(e.x,e.y,e.kind,ang-.26);enemyShot(e.x,e.y,e.kind,ang+.26);}
      if(e.model==='sentinel')enemyShot(e.x,e.y,e.kind,ang+.12);
      if(e.model==='harpy')enemyShot(e.x,e.y,e.kind,ang-.17);
    }
    if(e.y>H+65)e.dead=true;
  }
  function updateBoss(dt){
    if(!boss)return;
    boss.t+=dt;boss.shot-=dt;
    if(boss.entering){boss.y+=(110-boss.y)*Math.min(1,dt*1.8);if(boss.y>102)boss.entering=false;return;}
    boss.x=W/2+Math.sin(boss.t*(theme==='neon'?1.15:theme==='dragon'?.48:.75))*(230+stageIndex*5);
    boss.y=theme==='dragon'?110+Math.max(0,Math.sin(boss.t*.8))*100:theme==='neon'?110+Math.sin(boss.t*1.5)*28:110;
    const ratio=boss.hp/boss.max;
    boss.phase=ratio<.34?3:ratio<.67?2:1;
    if(boss.shot<=0){
      boss.shot=boss.phase===1?1.2:boss.phase===2?.95:.7;
      const aimed=Math.atan2(player.y-boss.y,player.x-boss.x);
      const shots=boss.phase===1?5:boss.phase===2?7:11;
      for(let i=0;i<shots;i++){
        const angle=theme==='neon'?boss.t*.9+i*TAU/shots:theme==='dragon'?aimed+(i-(shots-1)/2)*.12:boss.phase===1?aimed+(i-2)*.20: Math.PI/2 + (i-(shots-1)/2)*(.20+.03*boss.phase)+Math.sin(boss.t)*.12;
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
    e.dead=true;stageKills++;if(theme==='neon'){combo=Math.min(10,combo+1);comboTime=2.5;energy=Math.min(100,energy+8);}score+=(e.kind==='tank'?160:100)*(theme==='neon'?Math.max(1,combo):1);credits+=e.kind==='tank'?25:10;
    blast(e.x,e.y,T.danger,quality==='low'?6:11);
    if(Math.random()<.21)pickup(e.x,e.y);
  }
  function update(dt){
    if(state!=='play'||paused)return;
    time+=dt;stageTime+=dt;fireClock-=dt;invuln-=dt;flash=Math.max(0,flash-dt);shake=Math.max(0,shake-dt*19);
    const vx=(keys.has('ArrowRight')||keys.has('d')||touch.right?1:0)-(keys.has('ArrowLeft')||keys.has('a')||touch.left?1:0);
    const vy=(keys.has('ArrowDown')||keys.has('s')||touch.down?1:0)-(keys.has('ArrowUp')||keys.has('w')||touch.up?1:0);
    const direction=norm(vx,vy),moving=!!(vx||vy),speed=(profile.speed+speedLevel*42)*tuning.playerSpeedMultiplier;
    const firing=keys.has(' ')||keys.has('Enter')||touch.fire||mouse.down||spec.shooterOptions?.autofire;
    energy=Math.min(100,energy+profile.regen*dt*(theme==='dragon'&&firing&&!overheat?.12:1));if(overheat&&energy>=35)overheat=false;
    comboTime=Math.max(0,comboTime-dt);if(!comboTime)combo=0;
    const specialPressed=keys.has('x')||touch.special;if(specialPressed&&!specialHeld)special(vx,vy);specialHeld=!!specialPressed;
    if(dash>0){dash=Math.max(0,dash-dt);player.x=clamp(player.x+dashX*950*dt,36,W-36);player.y=clamp(player.y+dashY*950*dt,theme==='dragon'?105:185,H-32);}
    else if(moving){player.x=clamp(player.x+direction[0]*speed*dt,36,W-36);player.y=clamp(player.y+direction[1]*speed*dt,theme==='dragon'?105:185,H-32);}
    player.afterimages.push({x:player.x,y:player.y,life:.22});
    if(player.afterimages.length>10)player.afterimages.shift();
    for(const a of player.afterimages)a.life-=dt;
    player.afterimages=player.afterimages.filter(a=>a.life>0);
    if(firing)fire();
    spawnWave(dt);
    for(const e of enemies)updateEnemy(e,dt);
    updateBoss(dt);
    for(const b of friendly){if(b.kind==='missile'){let target=null,dist=Infinity;for(const e of enemies){const d=sq(e.x-b.x,e.y-b.y);if(!e.dead&&d<dist){target=e;dist=d;}}if(boss&&!boss.entering)target=boss;if(target){const [dx,dy]=norm(target.x-b.x,target.y-b.y);b.vx+=(dx*430-b.vx)*Math.min(1,dt*7);b.vy+=(dy*430-b.vy)*Math.min(1,dt*7);}}if(b.ttl!==undefined){b.ttl-=dt;if(b.ttl<=0)b.dead=true;}b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.y<-30||b.y>H+30||b.x<0||b.x>W)b.dead=true;}
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
    $('mission').textContent=(configAt(stageIndex).objective?configAt(stageIndex).objective+' · ':'')+levels[stageIndex]+' · '+(boss?'CHEFE':`Ondas ${Math.min(waveSpawned,waves[stageIndex].amount)}/${waves[stageIndex].amount}`);
  }
  function background(){
    const scene=sceneData(),id=scene.id,scroll=stageTime*waves[stageIndex].scroll;
    const low=quality==='low';sceneDraws=0;
    ctx.fillStyle=scene.gradient;ctx.fillRect(0,0,W,H);
    const wrap=(y,speed)=>((y+scroll*speed)%(H+240))-120;
    // Back layer, midground and foreground travel at three different speeds.
    for(let layer=0;layer<3;layer++){
      const list=scene.layers[layer],limit=low?Math.ceil(list.length*.6):list.length;
      const speed=[.12,.42,.85][layer];
      for(let i=0;i<limit;i++){
        const o=list[i],x=o.x,y=wrap(o.y,speed),z=o.s*(.7+layer*.42),side=o.side;
        ctx.save();ctx.translate(x,y);ctx.scale(z,z);ctx.globalAlpha=[.30,.48,.65][layer];sceneDraws++;
        if(theme==='dragon'){
          if(layer===2||id==='storm'){
            const c=id==='storm'?'#a9b6ca':id==='volcano'?'#ce8273':'#d8e8e5';
            oval(-23,3,41,12,c);oval(13,-5,34,16,c);oval(36,6,32,10,c);
            if(id==='storm'&&o.variant===0&&!low&&Math.sin(stageTime*3+o.phase)>.96)line([[0,12],[-8,30],[6,28],[-5,49]],'#e9e6b7',2);
          }else if(id==='castle'){
            ctx.fillStyle=layer?'#35414f':'#64748a';ctx.fillRect(-34,-40,68,72);ctx.fillRect(-46,-65,24,97);ctx.fillRect(22,-65,24,97);
            for(const xx of [-44,-28,24,40])ctx.fillRect(xx,-73,8,8);ctx.fillStyle='#162337';ctx.fillRect(-9,7,18,25);
          }else if(id==='forest'){
            for(let k=-1;k<=1;k++){ctx.fillStyle='#3a493c';ctx.fillRect(k*24-3,0,6,23);polygon([[k*24,-48],[k*24-20,12],[k*24+20,12]],layer?'#234d39':'#54806a');}
          }else if(id==='ocean'){
            line([[-60,0],[-25,-7],[10,2],[45,-3],[68,0]],'#a9d6e6',layer+1);line([[-30,12],[0,7],[34,13]],'#8dc6dd',2);
          }else{
            polygon([[-100,50],[-42,-20],[0,-85],[39,-14],[90,50]],id==='volcano'?'#482c35':'#2c5361');
            polygon([[-22,-51],[0,-85],[24,-48],[3,-57]],id==='volcano'?'#f17c49':'#c3d8df');
            if(id==='volcano')line([[0,-78],[8,-42],[-7,-10],[18,48]],'#ffad55',4);
          }
        }else if(theme==='space'){
          if(layer===0){
            if(id==='nebula'||id==='galaxy'){oval(0,0,85,29,id==='nebula'?'#b65aa1':'#6c8ddc');oval(16,3,51,14,'#b8b4ec');}
            else if(i<4&&id==='planets'){oval(0,0,62,62,'#698bb4');oval(-15,-11,46,39,'#a4bed1');ctx.strokeStyle='#d8c2a5';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,92,21,-.3,0,TAU);ctx.stroke();}
            else {ctx.fillStyle='#d9e5ff';ctx.fillRect(0,0,2,2);}
          }else if(id==='station'&&layer===1){
            ctx.fillStyle='#667d93';ctx.fillRect(-24,-29,48,58);ctx.fillRect(-66,-9,132,18);
            ctx.fillStyle='#263e6d';ctx.fillRect(-66,-19,30,38);ctx.fillRect(36,-19,30,38);oval(0,0,11,11,'#b9e8f1');
          }else if(id==='asteroids'||(layer===1&&o.variant===0)){
            ctx.rotate(o.phase+stageTime*.14);polygon([[-27,-12],[-10,-29],[17,-23],[29,4],[10,26],[-17,18]],'#777385');oval(-7,-5,9,6,'#454659');
          }else {ctx.fillStyle='#d4e4ff';ctx.fillRect(0,0,layer+1,layer*4+2);}
        }else{
          if(id==='highway'||id==='tunnel'){
            ctx.translate(side*(W*.38-x),0);const c=id==='tunnel'?'#bc66e3':'#47d4e3';
            line([[side*24,-85],[side*38,0],[side*24,85]],c,layer+1);
            if(layer===2)line([[side*4,-40],[side*4,36]],'#f9a3f9',3);
          }else if(id==='hologram'||(id==='rain'&&layer===2)){
            if(id==='rain'){line([[0,-28],[-8,20]],'#8dd9ff',1.6);}
            else{ctx.strokeStyle='#57ead9';ctx.lineWidth=2;ctx.strokeRect(-25,-18,50,36);line([[-20,7],[-10,-6],[0,8],[10,-10],[20,4]],'#e493fa',2);}
          }else if(layer<2){
            const h=55+o.variant*12;ctx.fillStyle=layer?'#172845':'#29335d';ctx.fillRect(-22,-h/2,44,h);
            ctx.strokeStyle=o.variant%2?'#e15bc4':'#4dc8e7';ctx.lineWidth=1.5;ctx.strokeRect(-22,-h/2,44,h);
            ctx.fillStyle='#7bb7da';for(let j=0;j<(low?2:4);j++)ctx.fillRect(-14,-h/2+8+j*12,28,3);
          }else{line([[0,-15],[0,15]],'#83c5ff',2);}
        }
        ctx.restore();
      }
    }
  }
  function polygon(points,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fill();}
  function line(points,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.stroke();}
  function oval(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();}
  // Procedural silhouettes: no sprite downloads, no asset allocations per frame.
  function ship(x,y,scale=1,enemy=false,model=heroId,phase=0){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);if(enemy)ctx.rotate(Math.PI);
    const bright=enemy?T.danger:T.accent,dark=theme==='dragon'?'#5b3030':theme==='space'?'#20364c':'#281b52',flap=Math.sin(time*9+phase),pulse=2+Math.sin(time*12+phase);
    ctx.shadowColor=bright;ctx.shadowBlur=quality==='low'?0:7;
    if(model==='ember-dragon'||model==='wyvern'){
      const span=model==='wyvern'?35:30,tip=7+flap*7;
      for(const side of [-1,1]){
        polygon([[side*5,-12],[side*18,-24],[side*span,tip],[side*23,4+flap*4],[side*15,15],[side*7,9]],bright);
        polygon([[side*7,-8],[side*18,-17],[side*29,tip],[side*13,3]],dark);
        line([[side*5,-10],[side*18,-24],[side*span,tip]],'#d69b65',1.5);
      }
      line([[0,9],[Math.sin(time*5+phase)*6,22],[Math.sin(time*5+phase+.8)*9,32]],dark,6);
      polygon([[-7,11],[-9,-12],[-5,-22],[0,-30],[5,-22],[9,-12],[7,11],[0,21]],enemy?'#ab4d36':'#d18b37');
      polygon([[-9,-15],[-12,-28],[-3,-24],[0,-29],[3,-24],[12,-28],[9,-15]],'#ffe1ae');
      oval(0,-16,6,9,bright);oval(-3,-20,1.5,1.5,'#fff8c8');oval(3,-20,1.5,1.5,'#fff8c8');
      if(quality!=='low')for(let i=0;i<3;i++)line([[-5,i*6-6],[5,i*6-6]],dark,1);
    }else if(model==='eagle'){
      for(const side of [-1,1])polygon([[0,-6],[side*13,-17],[side*33,flap*8],[side*27,13],[side*19,8],[side*15,16],[side*7,5]],'#d7ab72');
      oval(0,0,7,17,'#694735');oval(0,-14,6,7,'#f3dbb7');polygon([[-3,-19],[3,-19],[0,-27]],'#fbb446');polygon([[-7,10],[7,10],[10,24],[0,21],[-10,24]],dark);
    }else if(model==='harpy'){
      for(const side of [-1,1]){
        polygon([[side*6,-4],[side*20,-17],[side*32,flap*8],[side*22,15],[side*11,8]],'#9b76ce');
        line([[side*7,-2],[side*20,-14],[side*29,flap*8]],'#e1c3fd',2);
      }
      oval(0,-8,8,12,'#ce9c82');oval(0,-20,7,7,'#f2c8a2');polygon([[-9,2],[9,2],[5,19],[-5,19]],'#5f397c');
      line([[-4,15],[-11,27],[-14,23]],'#ffc87b',3);line([[4,15],[11,27],[14,23]],'#ffc87b',3);
    }else if(model==='pulse-glider'){
      polygon([[0,-33],[12,-10],[31,4],[20,18],[0,9],[-20,18],[-31,4],[-12,-10]],dark);
      line([[0,-33],[12,-10],[31,4],[20,18],[0,9],[-20,18],[-31,4],[-12,-10],[0,-33]],bright,3);
      polygon([[0,-21],[9,-3],[0,9],[-9,-3]],'#d5fbff');
      for(const side of [-1,1]){line([[side*13,-3],[side*25,4],[side*19,12]],'#f165ff',3);line([[side*10,13],[side*10,24+pulse]],bright,3);}
    }else if(model==='drone'){
      polygon([[0,-22],[20,-3],[12,20],[-12,20],[-20,-3]],dark);
      line([[0,-22],[20,-3],[12,20],[-12,20],[-20,-3],[0,-22]],bright,2);oval(0,-2,7,7,'#ffdcff');
      line([[-20,-3],[-29,5],[-24,17]],bright,3);line([[20,-3],[29,5],[24,17]],bright,3);
    }else if(model==='sentinel'){
      polygon([[-21,-22],[-8,-13],[0,-28],[8,-13],[21,-22],[17,17],[0,24],[-17,17]],dark);
      line([[-21,-22],[-8,-13],[0,-28],[8,-13],[21,-22],[17,17],[0,24],[-17,17],[-21,-22]],bright,3);
      ctx.fillStyle='#ffb6fa';ctx.fillRect(-13,-3,26,4);oval(0,8,4+pulse,4+pulse,bright);
    }else if(model==='prism'){
      ctx.rotate(time*.8+phase);polygon([[0,-25],[25,0],[0,25],[-25,0]],dark);line([[0,-25],[25,0],[0,25],[-25,0],[0,-25]],bright,3);
      polygon([[0,-13],[13,0],[0,13],[-13,0]],'#b4eaff');line([[-25,0],[25,0]],bright,2);
    }else{
      const wide=model==='gunship'||model==='frigate',span=wide?29:model==='interceptor'?23:25;
      polygon([[0,-32],[10,-11],[span,-2],[span,18],[11,13],[7,24],[-7,24],[-11,13],[-span,18],[-span,-2],[-10,-11]],wide?'#687785':bright);
      polygon([[-10,-6],[0,-25],[10,-6],[8,20],[-8,20]],dark);polygon([[-5,-9],[0,-19],[5,-9],[0,4]],'#bdeaff');
      for(const side of [-1,1]){
        ctx.fillStyle=wide?'#2e3c48':'#e3e8e6';ctx.fillRect(side*17-4,-5,8,19);
        ctx.fillStyle=bright;ctx.fillRect(side*17-3,-8,6,5);
        ctx.fillStyle='#ffc16a';ctx.fillRect(side*9-3,22,6,6+pulse*2);
        if(wide){ctx.fillStyle='#dce4e7';ctx.fillRect(side*24-3,-17,6,23);}
      }
    }
    ctx.shadowBlur=0;ctx.restore();
  }
  function enemyDraw(e){
    ship(e.x,e.y,e.r/20,true,e.model,e.id*.7);
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
    for(const b of friendly){ctx.fillStyle=b.kind==='flame'?'#ff9c42':b.kind==='missile'?'#f4f8ff':theme==='neon'?'#53f9fa':'#fff8a1';ctx.shadowColor=T.accent;ctx.shadowBlur=quality==='low'?0:10;if(b.kind==='flame'){ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);ctx.fill();}else ctx.fillRect(b.x-3,b.y-12,6,18);}ctx.shadowBlur=0;
    for(const b of hostile){ctx.fillStyle=b.kind==='boss'?'#ff74dc':'#ff9e70';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);ctx.fill();}
    if(!V||V.profile.particles)for(const p of particles){ctx.globalAlpha=p.life/p.max;ctx.fillStyle=p.color;ctx.fillRect(p.x-p.r/2,p.y-p.r/2,p.r,p.r);}
    ctx.globalAlpha=1;
    if(invuln<=0||Math.floor(time*12)%2===0)ship(player.x,player.y);
    if(shield>0){ctx.strokeStyle=T.accent;ctx.lineWidth=2;ctx.beginPath();ctx.arc(player.x,player.y,30+Math.sin(time*4)*2,0,TAU);ctx.stroke();}
    if(flash){ctx.fillStyle=`rgba(255,90,120,${flash*.95})`;ctx.fillRect(0,0,W,H);}
    ctx.restore();
    // HUD visual em Canvas, sem depender de imagens remotas.
    ctx.fillStyle='#050b1caa';ctx.fillRect(18,18,194,96);ctx.fillStyle='#d6f4ff';ctx.font='bold 15px system-ui';ctx.fillText('VIDAS  '+ '♥ '.repeat(lives),30,40);
    ctx.font='13px system-ui';ctx.fillText('ESCUDO  '+shield+'    CRÉDITOS  '+credits,30,61);ctx.fillText('ARMA '+weapon+'   '+(theme==='dragon'?'ASAS':'MOTOR')+' '+(speedLevel+1),30,78);ctx.fillText(profile.resource+' '+Math.floor(energy)+'%'+(theme==='neon'?' · x'+Math.max(1,combo):overheat?' · exausto':''),30,98);
    if(paused&&state==='play'){ctx.fillStyle='#030a22bd';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 54px system-ui';ctx.textAlign='center';ctx.fillText('PAUSADO',W/2,H/2);ctx.textAlign='left';}
  }
  window.__gameforgeTelemetry=()=>({state,paused,frames,clock:time,stage:stageIndex,genre:'shooter',theme,energy,overheat,dash,combo,specialUses,projectileTypes:[...new Set(friendly.map(b=>b.kind||'bolt'))],player:{x:player.x,y:player.y,radius:player.r,screenX:player.x,screenY:player.y},enemies:enemies.length,scenery:{id:stageScenes[stageIndex][0],layers:3,draws:sceneDraws,limit:39,stageScenes:stageScenes.map(s=>s[0])},heroModel:heroId,roster:roster.map(e=>e.id),enemySamples:enemies.slice(0,8).map(e=>({id:e.id,x:e.x,y:e.y,model:e.model,kind:e.kind,hp:e.hp})),bossAlive:!!boss,enemyBullets:hostile.length,playerBullets:friendly.length,bossHp:boss?.hp??null,spawned:waveSpawned,weapon,lives,credits,speedLevel,quality,simulationHz:60,simulationSteps});
  function loop(ms){
    const rawDt=Math.max(0,(ms-last)/1000);last=ms;
    if((!V||V.profile.quality==='auto')&&rawDt>0&&rawDt<.25){fpsEstimate=fpsEstimate*.96+(.04/rawDt);qualitySamples+=rawDt;if(qualitySamples>3){qualitySamples=0;quality=fpsEstimate<38?'low':'high';}}
    if(state==='play'&&!paused){
      simulationAccumulator+=Math.min(rawDt,.25);
      let steps=0;
      while(simulationAccumulator+1e-10>=SIM_DT&&steps<MAX_SIM_STEPS&&state==='play'&&!paused){
        update(SIM_DT);simulationAccumulator=Math.max(0,simulationAccumulator-SIM_DT);
        simulationSteps++;steps++;
      }
      if(steps===MAX_SIM_STEPS&&simulationAccumulator>=SIM_DT)simulationAccumulator=0;
    }else simulationAccumulator=0;
    render();V?.finish(ctx,W,H);frames++;requestAnimationFrame(loop);
  }
  $('start').addEventListener('click',()=>{if(state==='intermission')initStage();else newGame();});
  $('pause').addEventListener('click',()=>{if(state==='play'){paused=!paused;simulationAccumulator=0;}});
  $('restart').addEventListener('click',newGame);
  window.addEventListener('keydown',e=>{
    if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();
    keys.add(e.key.toLowerCase());keys.add(e.key);
    if(e.key==='Escape'&&state==='play'){paused=!paused;simulationAccumulator=0;}
    if(e.key==='r'&&state!=='play')$('start').click();
  });
  window.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());keys.delete(e.key);});
  canvas.addEventListener('pointerdown',()=>{mouse.down=true;});
  window.addEventListener('pointerup',()=>{mouse.down=false;});
  const touchBar=document.querySelector('.touch');if(touchBar){const specialButton=document.createElement('button');specialButton.type='button';specialButton.dataset.control='special';specialButton.textContent=profile.special;touchBar.appendChild(specialButton);}
  document.querySelectorAll('[data-control]').forEach(b=>{
    const k=b.dataset.control;
    b.addEventListener('pointerdown',e=>{e.preventDefault();touch[k]=true;try{b.setPointerCapture(e.pointerId);}catch(_){}});
    ['pointerup','pointercancel','lostpointercapture'].forEach(evt=>b.addEventListener(evt,()=>{touch[k]=false;}));
  });
  $('title').textContent=spec.title||'Novo jogo de nave';
  $('control-help').textContent='WASD / Setas: mover · Espaço: atacar · X: '+profile.special+' · Esc: pausa';
  $('overlay-sub').textContent=(theme==='dragon'?'Dragão: fôlego e fogo de curto alcance':theme==='neon'?'Neon: dash e combos':'Navinha: disparos e mísseis teleguiados')+' · '+levels.length+' fases';
  $('timer-pill').style.display='';
  requestAnimationFrame(loop);
}
if(typeof globalThis!=='undefined')globalThis.gameForgeShooterBoot=gameForgeShooterBoot;
if(typeof module!=='undefined')module.exports=gameForgeShooterBoot;
