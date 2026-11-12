/* GameForge v0.15 — standalone advanced TD Canvas2D runtime, offline by design. */
function gameForgeAdvancedTDBoot(){
 'use strict';
 const spec=GAME_SPEC,R=GameForgeTDRules,mode=spec.genre==='lane-defense'?'lane':'blocks';
 const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d',{alpha:false});
 const W=960,H=540,TAU=Math.PI*2;
 canvas.width=W;canvas.height=H;
 const stages=(spec.stages&&spec.stages.length?spec.stages:['Fase 1']).slice(0,mode==='lane'?40:30);
 const tune=spec.tuning||{},cellX=mode==='lane'?88:62,cellY=mode==='lane'?72:49;
 const originX=mode==='lane'?80:106,originY=mode==='lane'?112:91;
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 const configAt=n=>Array.isArray(spec.stageConfig)&&spec.stageConfig[n]&&typeof spec.stageConfig[n]==='object'?spec.stageConfig[n]:{};
 let stage=0,d=R.create(mode,0,tune),state='menu',paused=false,time=0,last=0,frames=0,accumulator=0;
 let cursor={x:mode==='lane'?0:1,y:mode==='lane'?2:0},choice='bolt',selected=null,buildMode=mode==='blocks'?'block':'unit',noteTime=0,telemetry={};
 const names=mode==='lane'?{bolt:'Vigia',income:'Gerador',wall:'Guardião',frost:'Frio'}:{bolt:'Sentinela',frost:'Criogel',cannon:'Canhão',miner:'Extrator'};
 const colors={bolt:'#f9d283',income:'#ffe39f',wall:'#9aaeb0',frost:'#86deed',cannon:'#ed9e76',miner:'#b6e4a4'};
 const options=Object.keys(R.config[mode]);
 const resourceName=mode==='lane'?((spec.defenseOptions&&spec.defenseOptions.resourceLabel)||'Energia'):'Recursos';
 const layer=document.createElement('div');layer.style.cssText='display:flex;flex-wrap:wrap;gap:6px;justify-content:center;padding:9px 4px;border:1px solid #356071;border-radius:10px;background:#0c2433;margin:8px auto 0;max-width:960px';
 const controls={};document.querySelector('.shell').appendChild(layer);
 function button(label,handler){
  const el=document.createElement('button');el.type='button';el.textContent=label;
  el.style.cssText='min-width:91px;padding:9px 8px;background:#234554;color:#e6f8f0;border:1px solid #54717b;border-radius:8px;touch-action:manipulation';
  el.addEventListener('click',handler);layer.appendChild(el);return el;
 }
 const deck=options.map((key,i)=>{const el=button((i+1)+' '+names[key]+' '+R.config[mode][key].cost,()=>choose(key));controls[key]=el;return el;});
 const blockButton=mode==='blocks'?button('B · Empilhar bloco',()=>{buildMode='block';selected=null;note('Clique no terreno livre para construir blocos');}):null;
 const upButton=button('U · Evoluir',()=>evolve());
 const sellButton=button('X · Vender',()=>sell());
 const waveButton=button('N · Iniciar onda',()=>next());
 const perks=document.createElement('div');perks.style.cssText='display:none;gap:8px;flex-wrap:wrap;justify-content:center;padding:12px;margin:6px auto;background:#153b4b;border:1px solid #80cbb8;border-radius:9px;max-width:960px';
 document.querySelector('.shell').appendChild(perks);
 const perkNames={damage:'Dano +22%',range:'Alcance +17%',energy:'Economia +25%',repair:'Reparar base +30'};
 for(const key of Object.keys(perkNames)){const el=document.createElement('button');el.textContent=perkNames[key];el.type='button';el.dataset.perk=key;el.style.cssText='padding:10px;background:#84deb6;color:#113127;border:0;border-radius:7px';el.addEventListener('click',()=>{if(R.selectPerk(d,key)){note('Melhoria ativada: '+perkNames[key]);renderControls();publish();}});perks.appendChild(el);}
 const painter={};
 function note(str){$('message').textContent=String(str);$('message').style.opacity='1';noteTime=2.7;}
 function show(title,text,action){$('overlay-title').textContent=title;$('overlay-sub').textContent=text;$('start').textContent=action;$('overlay').classList.remove('hidden');}
 function hide(){$('overlay').classList.add('hidden');canvas.focus();}
 function choose(key){choice=key;buildMode='unit';note('Selecionado: '+names[key]);renderControls();}
 function renderControls(){
  for(const key of options){const el=controls[key],active=buildMode==='unit'&&choice===key;
   const cd=mode==='lane'?(d.cardCooldowns[key]||0):0;
   el.textContent=(options.indexOf(key)+1)+' '+names[key]+' '+R.config[mode][key].cost+(cd>0?' · '+Math.ceil(cd)+'s':'');
   el.style.background=active?'#438d7c':'#234554';el.style.borderColor=active?'#e4efc5':'#54717b';el.disabled=state!=='play'||paused||cd>0;
  }
  if(blockButton){blockButton.style.background=buildMode==='block'?'#438d7c':'#234554';blockButton.disabled=state!=='play'||paused;}
  upButton.disabled=state!=='play'||paused||!selected||selected.level>=3;
  sellButton.disabled=state!=='play'||paused||!selected;
  waveButton.disabled=state!=='play'||paused||d.active||d.awaitingChoice||d.over;
  perks.style.display=state==='play'&&d.awaitingChoice?'flex':'none';
  for(const el of perks.children)el.style.display=d.perks.includes(el.dataset.perk)?'inline-block':'none';
 }
 function stageStart(){
  d=R.create(mode,stage,tune,{waves:configAt(stage).waves,seed:Math.max(1,Number(spec.worldOptions&&spec.worldOptions.seed)||72317),
    startingGlow:spec.defenseOptions?.startingGlow,wavePlan:spec.defenseOptions?.wavePlan?.[stage]});
  cursor={x:mode==='lane'?0:1,y:mode==='lane'?2:0};selected=null;time=0;accumulator=0;paused=false;state='play';
  $('pause').textContent='Pausar';hide();note(stages[stage]+' · Construa antes da primeira onda');
  renderControls();publish();
 }
 function reset(){stage=0;stageStart();}
 function next(){
  if(state!=='play'||paused)return;
  if(d.awaitingChoice){note('Escolha uma melhoria primeiro');return;}
  if(R.begin(d)){note('ONDA '+d.wave+' / '+d.waves+' · Prepare as defesas');renderControls();}
  else note(d.active?'A onda está em andamento':'Inicie a próxima fase');
 }
 function evolve(){if(!selected||state!=='play'||paused)return;const r=R.upgrade(d,selected);note(r.ok?'Torre evoluída para nível '+selected.level:r.reason);renderControls();}
 function sell(){if(!selected||state!=='play'||paused)return;const r=R.sell(d,selected);if(r.ok){selected=null;note('Recuperados '+r.amount+' recursos');}else note(r.reason);renderControls();}
 function place(gx,gy){
  if(state!=='play'||paused)return;
  gx=Math.floor(gx);gy=Math.floor(gy);
  if(gx<0||gx>=d.cols||gy<0||gy>=d.rows)return;
  cursor={x:gx,y:gy};
  const existing=d.towers.find(t=>t.gx===gx&&t.gy===gy);
  if(existing){selected=existing;note(names[existing.type]+' · Nível '+existing.level+' · U evolui / X vende');renderControls();return;}
  selected=null;
  const result=mode==='blocks'&&buildMode==='block'?R.buildBlock(d,gx,gy):R.place(d,gx,gy,choice);
  if(result.ok){note(mode==='blocks'&&buildMode==='block'?'Terreno elevado: '+result.height+' bloco(s)':names[choice]+' construída');if(result.tower)selected=result.tower;}
  else note(result.reason);
  renderControls();publish();
 }
 function togglePause(){
  if(state!=='play')return;
  paused=!paused;
  if(paused)show('PAUSADO',stages[stage]+' · Defesas preservadas','Continuar');
  else hide();
  $('pause').textContent=paused?'Continuar':'Pausar';renderControls();
 }
 function roundResult(){
  if(!d.over||state!=='play')return;
  if(!d.victory){state='defeat';show('BASE PERDIDA','A estratégia falhou na onda '+d.wave+'/'+d.waves+'. Tente outra combinação.','Tentar novamente');}
  else if(stage===stages.length-1){state='victory';show('CAMPANHA CONCLUÍDA','Todas as '+stages.length+' fases protegidas · '+d.kills+' inimigos vencidos.','Jogar novamente');}
  else{state='intermission';show('FASE CONCLUÍDA',stages[stage]+' · Próxima fase: '+stages[stage+1], 'Continuar campanha');}
  renderControls();
 }
 const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
 function circle(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
 function text(s,x,y,n=14,c='#ecfaec',align='left'){ctx.textAlign=align;ctx.fillStyle=c;ctx.font=(n>=16?'bold ':'')+n+'px system-ui,Arial';ctx.fillText(String(s),x,y);}
 function bar(x,y,w,p,c){rect(x,y,w,5,'#203e44');rect(x,y,w*clamp(p,0,1),5,c);}
 function diamond(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();ctx.fill();}
 function tile(cx,cy,gx,gy){
  const walk=mode==='blocks'&&R.isPath(d,gx,gy),height=mode==='blocks'?d.tiles[gy*d.cols+gx]:0;
  let base=mode==='lane'?(gy%2?'#477865':'#508670'):walk?'#987c56':((gx+gy)%2?'#315d55':'#3a695a');
  rect(cx,cy,cellX-2,cellY-2,base);
  if(mode==='blocks'){
   if(height){
    const rise=Math.min(18,height*6);rect(cx+4,cy+cellY-8,cellX-9,7,'#213d42');
    rect(cx+4,cy+8-rise/3,cellX-9,cellY-18,'#8ba49a');
    rect(cx+6,cy+8-rise/3,cellX-13,cellY-22,'#7eaa8c');
    for(let z=0;z<height;z++)rect(cx+6,cy+cellY-12-z*7,cellX-13,2,'#263b47');
   }else if(walk){rect(cx+4,cy+cellY/2,cellX-9,3,'#ddbe81');}
   else {circle(cx+12+(gx*13+gy*7)%36,cy+17,2,'#8bb397');}
  }else {
   for(let i=0;i<3;i++){rect(cx+7+i*21+(gy%2)*4,cy+13+(i%2)*22,2,8,'#80ab8b');}
   rect(cx+3,cy+cellY-10,cellX-7,2,'#a0ad8299');
  }
  if(cursor.x===gx&&cursor.y===gy){ctx.strokeStyle='#fae6a9';ctx.lineWidth=3;ctx.strokeRect(cx+3,cy+3,cellX-8,cellY-8);}
 }
 function drawUnit(t){
  const x=originX+t.x*cellX,y=originY+t.y*cellY;
  const baseY=y+(mode==='blocks'?10-t.height*6:7),shade=colors[t.type]||'#dbdba2';
  ctx.save();ctx.translate(x,baseY);
  circle(0,14,cellX*.25,'#213d3699');
  if(mode==='lane'){
   if(t.type==='wall'){rect(-21,-25,42,50,'#778f86');rect(-16,-32,33,12,'#b4d4c4');circle(-7,-5,3,'#263e3d');circle(8,-5,3,'#263e3d');}
   else if(t.type==='income'){circle(0,-8,19,'#ffe6a2');for(let i=0;i<7;i++){const a=i/7*TAU;circle(Math.cos(a)*27,Math.sin(a)*27-8,7,'#f1bb6e');}circle(-6,-12,2,'#44422d');circle(6,-12,2,'#44422d');}
   else{rect(-9,-7,18,32,'#2e7860');circle(0,-11,18,shade);circle(13,-13,10,t.type==='frost'?'#bff4ff':'#b6e1a9');circle(19,-12,5,'#244b48');circle(-5,-17,3,'#224d47');}
  }else{
   rect(-17,-14,34,32,'#384e55');rect(-19,-20,38,9,'#aeb8a0');
   if(t.type==='miner'){diamond(0,-33,17,'#b1e3ae');rect(-5,-21,10,8,'#759f89');}
   else {rect(-5,-31,10,25,shade);circle(0,-27,10,shade);if(t.type==='cannon')rect(2,-32,20,12,'#e29d76');}
  }
  for(let i=0;i<t.level;i++)diamond(-11+i*11,27,4,'#f7e6a0');
  bar(-19,35,38,t.hp/t.maxHp,'#a4efc2');
  ctx.restore();
 }
 function drawEnemy(e){
  const x=originX+e.x*cellX,y=originY+e.y*cellY;
  const c=e.boss?'#ab708f':e.kind==='runner'?'#f8b371':e.kind==='armored'?'#9fb2bc':'#c68b7d';
  circle(x+3,y+15,cellX*.25,'#142f3077');
  ctx.save();ctx.translate(x,y);
  const tilt=Math.sin(time*e.speed*8)*3;
  if(mode==='lane'){
   rect(-13,-13,26,31,c);circle(0,-18,17,c);rect(-9,18,8,14+tilt,'#354c51');rect(3,18,8,14-tilt,'#354c51');
   if(e.kind==='armored')rect(-17,-33,34,10,'#d7d2aa');
  }else{
   diamond(0,0,e.boss?26:18,c);circle(0,0,e.boss?12:8,'#e8ca97');
   if(e.kind==='armored')rect(-16,-8,32,5,'#bfd0df');
  }
  circle(-6,-19,2,'#18383c');circle(6,-19,2,'#18383c');
  bar(-21,-38,42,e.hp/e.maxHp,'#ffe09f');
  if(e.slow>0){ctx.strokeStyle='#b9effa';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-5,26,0,TAU);ctx.stroke();}
  ctx.restore();
 }
 function draw(){
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,mode==='lane'?'#2d5e66':'#18364c');sky.addColorStop(1,mode==='lane'?'#5c8265':'#396554');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  // Simple parallax skyline and sky particles, independent of external images or textures.
  for(let i=0;i<20;i++){circle(20+i*57,34+(i*71)%36,3+(i%4),'#a3dec122');}
  rect(originX-11,originY-8,d.cols*cellX+20,d.rows*cellY+18,'#0a2630aa');
  for(let y=0;y<d.rows;y++)for(let x=0;x<d.cols;x++)tile(originX+x*cellX,originY+y*cellY,x,y);
  if(mode==='lane'){
   for(const glow of d.drops){
    const xx=originX+glow.x*cellX,yy=originY+glow.y*cellY;
    ctx.globalAlpha=Math.min(1,glow.life/2);diamond(xx,yy,18,'#ffe29b');circle(xx,yy,6,'#fff8ce');ctx.globalAlpha=1;
   }
   for(let y=0;y<d.rows;y++){
    const yy=originY+(y+.5)*cellY;
    rect(originX-25,yy-26,23,52,d.mowers[y]?'#b4daba':'#4a6058');
    if(d.mowers[y])circle(originX-15,yy,7,'#f6d989');
   }
  }else {
   ctx.strokeStyle='#f3d39f88';ctx.lineWidth=3;ctx.setLineDash([3,8]);ctx.beginPath();
   d.path.forEach((p,i)=>{const xx=originX+(p.x+.5)*cellX,yy=originY+(p.y+.5)*cellY;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);});ctx.stroke();ctx.setLineDash([]);
   const final=d.path[d.path.length-1],fx=originX+(final.x+.5)*cellX,fy=originY+(final.y+.5)*cellY;
   diamond(fx,fy-12,19,'#bffae7');
  }
  for(const t of d.towers)drawUnit(t);
  for(const e of d.enemies)drawEnemy(e);
  for(const f of d.fx){
   ctx.globalAlpha=clamp(f.life/.2,0,1);
   ctx.lineWidth=f.type==='mower'?12:4;
   ctx.strokeStyle=f.type==='frost'?'#a6eaff':f.type==='mower'?'#fbd592':f.type==='cannon'?'#fb9279':'#ffe2a7';
   ctx.beginPath();ctx.moveTo(originX+f.x*cellX,originY+f.y*cellY);
   ctx.lineTo(originX+f.tx*cellX,originY+f.ty*cellY);ctx.stroke();
  }ctx.globalAlpha=1;
  rect(10,8,W-20,65,'#102a3bdd');
  text(stages[stage],24,31,18,'#f3e8c1');
  text('ONDA '+d.wave+'/'+d.waves+'  ·  '+(mode==='lane'?'JARDIM':'FORTALEZA DE BLOCOS')+'  ·  '+d.kills+' vencidos',W-22,30,13,'#cde3d5','right');
  text(resourceName.toUpperCase()+' '+Math.floor(d.money)+'  ·  BASE '+Math.ceil(d.base)+'%  ·  '+(d.awaitingChoice?'ESCOLHA UMA MELHORIA':d.active?'ATAQUE EM ANDAMENTO':mode==='lane'?'PRÓXIMA ONDA EM '+Math.ceil(Math.max(0,d.nextWaveAt-d.time))+'s':'PRONTO PARA NOVA ONDA'),24,55,12,'#aee6ca');
  bar(W-220,49,198,d.base/100,d.base>45?'#86deac':'#f3b27c');
  if(selected&&state==='play')text('Selecionada: '+names[selected.type]+' N'+selected.level+' · '+Math.ceil(selected.hp)+' HP · U evoluir · X vender',28,H-18,12,'#d8ebcf');
  else text(mode==='lane'?'Geradores criam energia · Guardiões bloqueiam inimigos':'Construa blocos [B] e depois torres [1–4] · altura aumenta alcance',28,H-18,12,'#d8ebcf');
 }
 function hud(){
  $('health').textContent=Math.ceil(d.base);$('ammo').textContent=Math.floor(d.money);$('score').textContent=d.score;
  $('level').textContent=stage+1+'/'+stages.length;$('timer').textContent=Math.floor(time)+'s';
  $('mission').textContent=(configAt(stage).objective?configAt(stage).objective+' · ':'')+(mode==='lane'?'Defenda as cinco linhas':'Defenda a rota e eleve suas torres')+' · Onda '+d.wave+'/'+d.waves;
 }
 function publish(){
  const pos={x:cursor.x*cellX+originX+cellX/2,y:cursor.y*cellY+originY+cellY/2};
  telemetry={genre:spec.genre,mode,state:paused&&state==='play'?'paused':state,paused,stage:stage+1,stageCount:stages.length,
   frames,time,base:d.base,health:d.base,score:d.score,enemies:d.enemies.length,resources:Math.floor(d.money),resourceDrops:d.drops.length,
   wave:d.wave,waves:d.waves,towers:d.towers.length,blocks:d.tiles.filter(x=>x>0).length,cardCooldowns:{...d.cardCooldowns},
   awaitingChoice:d.awaitingChoice,active:d.active,player:{...pos,screenX:pos.x,screenY:pos.y},
   objective:mode==='lane'?'five-lanes':'winding-path'};
  window.__gameforgeTelemetry=()=>telemetry;Object.assign(window.__gameforgeTelemetry,telemetry);
 }
 function frame(now){
  const dt=last?clamp((now-last)/1000,0,.05):1/60;last=now;frames++;
  if(state==='play'&&!paused){
   time+=dt;accumulator=Math.min(accumulator+dt,1/6);
   let steps=0;while(accumulator>=1/30&&steps<5&&state==='play'){R.step(d,1/30);accumulator-=1/30;steps++;if(d.over)roundResult();}
  }
  if(noteTime>0){noteTime-=dt;if(noteTime<=0)$('message').style.opacity='0';}
  if(frames%15===0)renderControls();
  draw();hud();publish();requestAnimationFrame(frame);
 }
 $('start').addEventListener('click',()=>{
  if(state==='menu'||state==='victory')reset();
  else if(state==='intermission'){stage++;stageStart();}
  else if(state==='defeat')stageStart();
  else if(state==='play'&&paused)togglePause();
 });
 $('pause').addEventListener('click',togglePause);
 $('restart').addEventListener('click',()=>{if(state==='menu')reset();else stageStart();});
 $('control-help').textContent='Toque/clique: construir · 1–4 unidade · B blocos · N onda · U evoluir · X vender';
 window.addEventListener('keydown',e=>{
  if(e.target&&['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
  const k=e.key.length===1?e.key.toLowerCase():e.key;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(k))e.preventDefault();
  if(k==='p'||k==='Escape'){togglePause();return;}
  if(state!=='play'||paused||e.repeat)return;
  if(k>='1'&&k<='4'&&options[Number(k)-1])choose(options[Number(k)-1]);
  if(k==='b'&&mode==='blocks'){buildMode='block';renderControls();}
  if(k==='n')next();if(k==='u')evolve();if(k==='x')sell();
  if(k==='ArrowUp'||k==='w')cursor.y=clamp(cursor.y-1,0,d.rows-1);
  if(k==='ArrowDown'||k==='s')cursor.y=clamp(cursor.y+1,0,d.rows-1);
  if(k==='ArrowLeft'||k==='a')cursor.x=clamp(cursor.x-1,0,d.cols-1);
  if(k==='ArrowRight'||k==='d')cursor.x=clamp(cursor.x+1,0,d.cols-1);
  if(k===' '||k==='Enter')place(cursor.x,cursor.y);
 });
 window.addEventListener('blur',()=>{if(state==='play'&&!paused)togglePause();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play'&&!paused)togglePause();});
 canvas.addEventListener('pointerdown',e=>{
  if(state!=='play'||paused)return;
  const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/Math.max(1,r.width),y=(e.clientY-r.top)*H/Math.max(1,r.height);
  const gx=(x-originX)/cellX,gy=(y-originY)/cellY;
  if(mode==='lane'){
   const hit=R.collectDrop(d,gx,gy);
   if(hit.ok){note('+'+hit.value+' '+resourceName);publish();canvas.focus();return;}
  }
  place(gx,gy);canvas.focus();
 });
 document.querySelectorAll('[data-control]').forEach(el=>{
  el.addEventListener('pointerdown',e=>{e.preventDefault();if(state!=='play'||paused)return;
   const k=el.getAttribute('data-control'),v={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[k];
   if(k==='fire')place(cursor.x,cursor.y);else if(v){cursor.x=clamp(cursor.x+v[0],0,d.cols-1);cursor.y=clamp(cursor.y+v[1],0,d.rows-1);}
  });
 });
 show(spec.title,mode==='lane'?'Defenda cinco linhas com vigias, geradores, guardiões e congelantes. Inicie cada onda quando estiver preparado.':'Construa torres sobre blocos elevados, proteja a estrada e escolha bônus permanentes entre rodadas.','Jogar agora');
 renderControls();draw();hud();publish();requestAnimationFrame(frame);
}
if(typeof globalThis!=='undefined')globalThis.gameForgeAdvancedTDBoot=gameForgeAdvancedTDBoot;
if(typeof module!=='undefined')module.exports=gameForgeAdvancedTDBoot;
