(function(root){
function gameForgeSimulationBoot(){
 'use strict';
 const V=typeof GameForgeGraphics==='object'?GameForgeGraphics:null;
 const c=GAME_SPEC.simulation,R=GameForgeSimulationRules,el=id=>document.getElementById(id);
 const canvas=el('game'),ctx=canvas.getContext('2d');canvas.width=960;canvas.height=540;
 let s=R.create(c),state='menu',paused=false,selected=0,frames=0,last=0,noticeUntil=0;
 const aquarium=!!c.aquariumCare?.enabled;
 const E=c.story?.enabled?GameForgeSimulationEvents:null;
 const exploring=c.exploration?.enabled===true;
 const free=exploring&&c.exploration?.mode==='free';
 const F=free?GameForgeExploration2D:null;
 const room=free?F.layout(c.slots,c.domain,c.exploration.guide,c.story?.version>=3):null;
 const center=index=>960*(index+.5)/c.slots;
 let playerX=center(0),targetX=playerX,actionsOpen=false;
 let avatar=free?F.spawn(room):null,walkTo=null,npcTalks=0;
 const held=new Set();
 const near=()=>free?F.inRange(avatar,room.stations[selected],c.exploration.reach):Math.abs(playerX-center(selected))<=(c.exploration?.reach||44);
 const guideText=()=>c.domain==='aquarium'?'Cuide da fome e da água: peixes adultos valem mais.':c.domain==='farm'?'Regue a plantação, colha quando crescer e venda o estoque.':'Reponha os produtos, atenda clientes e acompanhe o saldo.';
 function moveTarget(index){selected=Math.max(0,Math.min(c.slots-1,index));targetX=center(selected);actionsOpen=false;}
 const save=R.persistence(c,GAME_SPEC.title,()=>window.localStorage);
 const patrol=free&&c.exploration.patrol?.enabled===true;
 if(save.enabled){el('start').textContent='Novo jogo';el('restart').textContent='Novo jogo';}
 let saved=save.read(),saveStatus=save.enabled?(saved?'Progresso disponível neste navegador':'Ainda não salvo'):'Desativado',saveElapsed=0;
 const continueButton=document.createElement('button');continueButton.id='simulation-continue';continueButton.type='button';continueButton.textContent='Continuar';continueButton.disabled=!saved;
 (el('start').parentElement||el('overlay')).appendChild(continueButton);
 if(!save.enabled)continueButton.style.display='none';
 const saveButton=document.createElement('button');saveButton.id='simulation-save';saveButton.type='button';saveButton.textContent='Salvar progresso';
 (el('restart').parentElement||document.body).appendChild(saveButton);if(!save.enabled)saveButton.style.display='none';
 const saveLabel=document.createElement('span');saveLabel.id='simulation-save-status';saveLabel.setAttribute('role','status');
 (el('restart').parentElement||document.body).appendChild(saveLabel);
 function persist(manual=false){
  if(!save.enabled||state==='menu')return;
  const ok=save.write(s,selected,free?{x:avatar.x,y:avatar.y,...(patrol?{guideX:room.guide.x,guideDir:room.guide.dir===1?1:-1}:{})}:undefined);saveStatus=ok?'Salvo neste navegador':'Não foi possível salvar neste navegador';
  if(ok){saved=save.read();continueButton.disabled=!saved;}
  saveElapsed=0;if(manual)say(saveStatus);saveLabel.textContent=saveStatus;
 }
 function victory(){state='victory';el('message').style.opacity='0';el('overlay-title').textContent=E?'Meta e missão concluídas!':'Meta alcançada!';el('overlay-sub').textContent=s.sales+' vendas realizadas';el('overlay').classList.remove('hidden');}
 continueButton.addEventListener('click',()=>{
  const data=save.read();if(!data){continueButton.disabled=true;say('Progresso indisponível. Comece um novo jogo.');return;}
  s=data.state;selected=data.selected;playerX=center(selected);targetX=playerX;actionsOpen=false;
  held.clear();walkTo=null;if(free){avatar=data.position&&F.walkable(room,data.position.x,data.position.y)?{x:data.position.x,y:data.position.y}:F.spawn(room);if(patrol){room.guide.x=data.position.guideX;room.guide.dir=data.position.guideDir;}}
  state='play';paused=false;last=0;el('overlay').classList.add('hidden');
  if(s.complete)victory();else say('Progresso recuperado. O tempo fechado não alterou o jogo.');update();
 });
 saveButton.addEventListener('click',()=>persist(true));
 window.addEventListener('pagehide',()=>persist());
 document.addEventListener('visibilitychange',()=>{if(document.hidden){persist();if(state==='play')paused=true;update();}});
 const panel=document.createElement('div');panel.className='buttons';panel.style.padding='10px';
 // O painel contextual deve ficar fora da área recortada do canvas, inclusive em celulares.
 (canvas.parentElement?.parentElement||document.body).appendChild(panel);
 const buttons=[];
 const choiceBar=document.createElement('div');choiceBar.id='simulation-choices';choiceBar.className='buttons';
 (canvas.parentElement?.parentElement||document.body).appendChild(choiceBar);
 const choiceButtons=[];
 if(E&&c.story.version===2)for(let index=0;index<2;index++){
  const button=document.createElement('button');button.id='simulation-choice-'+(index+1);button.type='button';
  button.textContent=(index===0?'5 · ':'6 · ')+c.story.mission.branches[index].label;
  button.addEventListener('click',()=>chooseChoice(index));
  choiceBar.appendChild(button);choiceButtons.push(button);
 }
 if(c.automation?.enabled){
  const toggle=document.createElement('button');toggle.id='simulation-automation';toggle.type='button';panel.appendChild(toggle);
  toggle.addEventListener('click',()=>{if(state==='play'){s.automation.paused=!s.automation.paused;persist();update();}});
 }
 const say=t=>{el('message').textContent=t;el('message').style.opacity='1';noticeUntil=frames+150;};
 function action(kind){
  if(state!=='play'||paused)return;
  if(exploring&&(!near()||!actionsOpen)){say('Aproxime-se da estação e pressione E para interagir.');return;}
  if(!R.act(s,c,selected,kind)){say('Selecione um espaço. Produza, cuide e aguarde ficar pronto.');return;}
  if(s.complete)victory();
  if(E&&s.story?.completed)say('Missão concluída! Recompensa recebida uma vez.');
  persist();update();
 }
 for(const [kind,label] of [['start',c.start],['care',c.care],['finish',c.finish],...(c.domain==='farm'?[['sell','Vender colheita']]:[]),...(c.aquariumCare?.waterEnabled?[['clean','Trocar água']]:[])]){
  const b=document.createElement('button');b.type='button';b.id='simulation-action-'+kind;b.textContent=label;b.addEventListener('click',()=>action(kind));panel.appendChild(b);buttons.push([b,kind]);
 }
 function begin(){s=R.create(c);selected=0;playerX=center(0);targetX=playerX;actionsOpen=false;held.clear();walkTo=null;npcTalks=0;if(free){avatar=F.spawn(room);if(patrol){room.guide.x=860;room.guide.dir=-1;}}state='play';paused=false;last=0;persist();el('overlay').classList.add('hidden');say('Comece em um espaço vazio. Meta: vender '+c.target+' moedas.');update();}
 el('start').addEventListener('click',begin);el('restart').addEventListener('click',begin);
 el('pause').addEventListener('click',()=>{if(state==='play'){paused=!paused;persist();update();}});
 el('control-help').textContent=free?'WASD/setas mover · E falar/interagir · 1–4 agir perto de uma estação · toque para caminhar':exploring?'← → caminhar entre estações · E interagir · 1 iniciar · 2 cuidar · 3 vender/colher · 4 limpar/vender · toque para aproximar':aquarium?'← → selecionar tanque · 1 comprar · 2 alimentar · 3 vender'+(c.aquariumCare.waterEnabled?' · 4 trocar água':''):'← → selecionar · 1 produzir · 2 cuidar · 3 colher/vender · 4 vender colheita';
 el('overlay-sub').textContent=c.label+': '+c.start+' → '+c.care+' → '+c.finish+(c.domain==='farm'?' → Vender':'')+(aquarium?'. O peixe cresce enquanto está alimentado'+(c.aquariumCare.waterEnabled?' e com água limpa':'')+'. O valor aumenta com a idade. Alimentar e trocar água são gratuitos.':'')+(save.enabled?'. Progresso salvo neste navegador. Fechado ou pausado, o tempo não avança. Novo jogo substitui o progresso anterior.':'. Salvamento desativado.');
 if(E)el('overlay-sub').textContent+=' '+(c.story.version===4?'Campanha com '+c.story.missions.length+' missões. Converse com os dois NPCs alternadamente. Cada missão possui até dois objetivos que podem avançar ao mesmo tempo.':c.story.version===3?
   'Duas missões em sequência: fale com '+c.story.npc.name+', conclua a primeira, depois procure '+c.story.npc2.name+'. Recompensas de 3 e 7 moedas.':
   'Missão: fale com o '+c.story.npc.name+' e conclua as ações. '+(c.story.version===2?'Escolha entre duas tarefas com 5 ou 6. Recompensas: 5 ou 8 moedas.':'Recompensa única de '+c.story.mission.reward+' moedas.'));
 if(c.automation?.enabled)el('overlay-sub').textContent=c.label+'. Ciclo automático a cada '+c.automation.intervalSeconds+' s, com custos normais. Você pode desligar a automação e jogar manualmente. Pausar congela o jogo. '+(save.enabled?'Progresso salvo neste navegador. Novo jogo substitui o anterior.':'Salvamento desativado.');
 function chooseChoice(index){
  if(!E||c.story.version!==2||state!=='play'||paused||!free||
    !room.guide||!F.inRange(avatar,room.guide,c.exploration.reach)){
   say('Aproxime-se do NPC para escolher sua tarefa.');return;
  }
  if(!R.choose(s,c,index)){say('Fale com o NPC e escolha apenas uma tarefa.');return;}
  say('Tarefa escolhida: '+c.story.mission.branches[index].label);
  persist();update();
 }
 function activate(target){
  if(!target){actionsOpen=false;say('Chegue perto de um aquário, canteiro, prateleira ou NPC.');update();return;}
  if(target.type==='npc'){
   actionsOpen=false;npcTalks++;
   if(E){const line=R.talk(s,c,target.id==='guide-2'?1:0);say(line||target.label+': '+guideText());if(s.complete)victory();persist();}
   else say(target.label+': '+guideText());
   update();return;
  }
  const same=selected===target.index&&actionsOpen;
  selected=target.index;actionsOpen=!same;
  say(actionsOpen?'Estação '+(selected+1)+': escolha uma ação.':'Interação fechada.');
  update();
 }
 function input(key){
  if(state!=='play'||paused)return;
  if(free){
   if(key==='5'||key==='6'){chooseChoice(key==='5'?0:1);return;}
   if(key==='e'||key==='E'||key===' '){activate(F.nearest(avatar,room,c.exploration.reach));return;}
   const actKey={'1':'start','2':'care','3':'finish','4':aquarium?'clean':'sell'}[key];
   if(actKey)action(actKey);
   return;
  }
  if(exploring){
   if(key==='ArrowRight'||key==='d'||key==='D'){moveTarget(selected+1);update();return;}
   if(key==='ArrowLeft'||key==='a'||key==='A'){moveTarget(selected-1);update();return;}
   if(key==='e'||key==='E'||key===' '){
    if(near()){actionsOpen=!actionsOpen;say(actionsOpen?'Escolha uma ação nesta estação.':'Interação fechada.');}
    else say('Aguarde o personagem chegar à estação.');
    update();return;
   }
  }else{
   if(key==='ArrowRight')selected=(selected+1)%c.slots;
   if(key==='ArrowLeft')selected=(selected+c.slots-1)%c.slots;
  }
  const k={'1':'start','2':'care','3':'finish','4':aquarium?'clean':'sell'}[key];if(k)action(k);
 }
 const directions=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'];
 document.addEventListener('keydown',e=>{
  if(free&&directions.includes(e.key)){
   e.preventDefault();if(state==='play'&&!paused){held.add(e.key);walkTo=null;}return;
  }
  const keys=exploring?['ArrowRight','ArrowLeft','a','A','d','D','e','E',' ','1','2','3','4','5','6']:['ArrowRight','ArrowLeft','1','2','3','4'];
  if(keys.includes(e.key)){e.preventDefault();if(!e.repeat)input(e.key);}
 });
 document.addEventListener('keyup',e=>{if(free)held.delete(e.key);});
 window.addEventListener('blur',()=>held.clear());
 canvas.addEventListener('pointerdown',e=>{
  const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*960/rect.width,y=(e.clientY-rect.top)*540/rect.height;
  if(free){
   if(state!=='play'||paused)return;
   const target=F.hitAt(room,x,y);
   if(target&&F.inRange(avatar,target,c.exploration.reach)){activate(target);return;}
   const destination=target?F.approachPoint(target):{x,y};
   if(F.walkable(room,destination.x,destination.y)){walkTo=destination;actionsOpen=false;update();}
   else say('Esse local está ocupado. Caminhe ao redor do obstáculo.');
   return;
  }
  if(y>=110&&y<450){
   const chosen=Math.max(0,Math.min(c.slots-1,Math.floor(x/(960/c.slots))));
   if(exploring){
    if(chosen===selected&&near())actionsOpen=!actionsOpen;
    else moveTarget(chosen);
   }else selected=chosen;
   update();
  }
 });
 for(const button of document.querySelectorAll('[data-control]')){
  if(button.dataset.control==='fire'){button.textContent=exploring?'INTERAGIR':aquarium?'COMPRAR':'PRODUZIR';button.addEventListener('pointerdown',e=>{e.preventDefault();if(exploring)input('e');else action('start');});}
  else if(free&&['up','down','left','right'].includes(button.dataset.control)){
   const key={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[button.dataset.control];
   button.addEventListener('pointerdown',e=>{e.preventDefault();held.add(key);walkTo=null;});
   for(const event of ['pointerup','pointercancel','pointerleave'])button.addEventListener(event,()=>held.delete(key));
  }
  else if(['left','right'].includes(button.dataset.control))button.addEventListener('pointerdown',e=>{e.preventDefault();input(button.dataset.control==='left'?'ArrowLeft':'ArrowRight');});
  else button.disabled=true;
 }
 function update(){
  if(exploring)panel.style.display=actionsOpen&&near()?'flex':'none';
  const choices=E&&c.story.version===2?E.options(s.story,c.story):[];
  const choiceReady=!!(choices.length&&state==='play'&&!paused&&free&&room.guide&&
   F.inRange(avatar,room.guide,c.exploration.reach));
  choiceBar.style.display=choiceReady?'flex':'none';
  for(const [index,b] of choiceButtons.entries()){
   b.disabled=!choiceReady;
   b.textContent=(index===0?'5 · ':'6 · ')+(choices[index]?.label||c.story.mission.branches[index].label);
  }
  if(c.automation?.enabled){const toggle=el('simulation-automation');toggle.textContent=s.automation.paused?'Ligar automação':'Desligar automação';toggle.disabled=state!=='play';}
  saveButton.disabled=state==='menu';saveLabel.textContent=saveStatus;
  el('health').textContent=s.money+' $';el('score').textContent=s.earned+'/'+c.target;el('ammo').textContent=aquarium?s.slots.filter(Boolean).length+' peixes':s.inventory;el('level').textContent=c.label;
  el('mission').textContent=(paused?'Pausado · ':'')+'Vendas: '+s.sales+' · Espaço '+(selected+1)+(exploring?' · '+(near()?(actionsOpen?'Interagindo':'E para interagir'):'Caminhando até estação'):'');
  if(aquarium){
   const q=R.status(s,c,selected),item=s.slots[selected];
   el('mission').textContent=(paused?'Pausado · ':'')+'Tanque '+(selected+1)+' · '+q.label+
    (item?' · Crescimento '+Math.floor(q.progress*100)+'% · Valor '+q.value+' moedas'+
     (c.aquariumCare.hungerEnabled?' · Saciedade '+Math.ceil(q.satiety)+'%':'')+
     (c.aquariumCare.waterEnabled?' · Água '+Math.ceil(q.water)+'%':'')+
     (q.blocked.length?' · Precisa: '+q.blocked.join(', '):q.stage==='adult'?' · Pronto para vender':' · Crescendo'):'');
  }
  if(exploring)el('mission').textContent+=' · '+(free?(actionsOpen?'Interação aberta':F.nearest(avatar,room,c.exploration.reach)?.type==='npc'?'E para falar com o guia':'Explore com WASD; E interage perto de objetos'):(near()?(actionsOpen?'Interação aberta':'Aperte E para interagir'):'Caminhando...'));
  if(E)el('mission').textContent+=' · '+E.status(s.story,c.story).text;
  if(c.automation?.enabled)el('mission').textContent+=' · Automação '+(s.automation.paused?'desligada':'ligada');
  for(const [b,k] of buttons){
   const item=s.slots[selected];
   b.disabled=state!=='play'||paused||(exploring&&(!near()||!actionsOpen))||(k==='start'?!!item||s.money<c.cost:k==='care'?!R.canCare(s,c,selected):k==='clean'?!R.canClean(s,c,selected):k==='sell'?!s.inventory:!R.canFinish(s,c,selected));
  }
 }
 rootTelemetry();
 function rootTelemetry(){window.__gameforgeTelemetry=()=>({state,paused,frames,player:{x:free?avatar.x:exploring?playerX:selected,y:free?avatar.y:exploring?480:0},exploration:{enabled:exploring,mode:free?'free':exploring?'stations':'classic',x:free?avatar.x:playerX,y:free?avatar.y:480,target:free?walkTo:targetX,near:exploring?near():false,actionsOpen,npcTalks,nearby:free?F.nearest(avatar,room,c.exploration.reach)?.id||null:null,guide:free&&room.guide?{x:room.guide.x,y:room.guide.y,dir:room.guide.dir||-1}:null,guide2:free&&room.guide2?{x:room.guide2.x,y:room.guide2.y}:null},simulation:JSON.parse(JSON.stringify(s)),story:E?E.status(s.story,c.story):null,domain:c.domain,persistence:{enabled:save.enabled,key:save.key,status:saveStatus,available:!!saved},selected:aquarium?R.status(s,c,selected):null});}
 function drawRoom(){
  ctx.fillStyle=c.domain==='aquarium'?'#173c49':c.domain==='farm'?'#2b4935':'#293b50';
  ctx.fillRect(0,0,960,540);
  ctx.fillStyle='#112431';ctx.fillRect(0,0,960,85);
  ctx.fillStyle='#68818a';ctx.fillRect(17,78,926,9);ctx.fillRect(17,78,9,445);ctx.fillRect(934,78,9,445);
  ctx.fillStyle='#ffffff09';for(let y=102;y<520;y+=43)for(let x=35;x<931;x+=43)ctx.fillRect(x,y,39,1);
  ctx.fillStyle='#e8f6fa';ctx.font='bold 19px sans-serif';ctx.fillText(c.label+' · sala explorável',28,33);
  ctx.font='13px sans-serif';ctx.fillText('Moedas: '+s.money+' · Vendas: '+s.sales+' · WASD / setas / E',28,60);
  for(const obstacle of room.furniture){
   ctx.fillStyle='#132b31';ctx.fillRect(obstacle.x+5,obstacle.y+5,obstacle.w,obstacle.h);
   ctx.fillStyle='#987757';ctx.fillRect(obstacle.x,obstacle.y,obstacle.w,obstacle.h);
  }
  for(const station of room.stations){
   const item=s.slots[station.index],progress=item?Math.max(0,Math.min(1,item.age/c.seconds)):0;
   ctx.fillStyle='#0d2630';ctx.fillRect(station.x+4,station.y+4,station.w,station.h);
   ctx.fillStyle=aquarium?'#286c88':c.domain==='farm'?'#6c6438':'#846949';
   ctx.fillRect(station.x,station.y,station.w,station.h);
   if(aquarium){
    ctx.fillStyle='#419cba';ctx.fillRect(station.x+8,station.y+7,station.w-16,station.h-15);
   }else if(c.domain==='farm'){
    ctx.fillStyle='#6b4833';ctx.fillRect(station.x+8,station.y+7,station.w-16,station.h-15);
   }else{
    ctx.fillStyle='#dbb57b';for(let n=0;n<3;n++)ctx.fillRect(station.x+8,station.y+10+n*14,station.w-16,5);
   }
   if(item){
    ctx.fillStyle=aquarium?'#ffcf75':c.domain==='farm'?'#95d96d':'#f7e1a5';
    ctx.beginPath();ctx.arc(station.x+station.w/2,station.y+31,7+progress*10,0,Math.PI*2);ctx.fill();
   }
   ctx.strokeStyle=actionsOpen&&selected===station.index?'#ffe196':'#a0b5b6';
   ctx.lineWidth=actionsOpen&&selected===station.index?4:1;
   ctx.strokeRect(station.x,station.y,station.w,station.h);
   ctx.fillStyle='#fff';ctx.font='bold 12px sans-serif';
   ctx.fillText((aquarium?'Tanque ':c.domain==='farm'?'Canteiro ':'Prateleira ')+(station.index+1),station.x+3,station.y-7);
   ctx.fillText(item?(aquarium?R.status(s,c,station.index).label:'Em produção'):'Vazio',station.x+3,station.y+station.h+14);
  }
  for(const guide of [room.guide,room.guide2].filter(Boolean)){
   ctx.fillStyle='#1a3544';ctx.beginPath();ctx.arc(guide.x,guide.y+5,18,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#e8bd8d';ctx.beginPath();ctx.arc(guide.x,guide.y-8,11,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#f5eac4';ctx.font='bold 12px sans-serif';ctx.fillText(guide.label,guide.x-31,guide.y-27);
  }
  ctx.fillStyle='#102d39';ctx.beginPath();ctx.ellipse(avatar.x,avatar.y+12,14,5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f6cb9b';ctx.beginPath();ctx.arc(avatar.x,avatar.y-5,11,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#45a2ad';ctx.fillRect(avatar.x-11,avatar.y+5,22,21);
  ctx.fillStyle='#254050';ctx.fillRect(avatar.x-10,avatar.y+23,8,7);ctx.fillRect(avatar.x+2,avatar.y+23,8,7);
  const obj=F.nearest(avatar,room,c.exploration.reach);
  if(obj){
   ctx.fillStyle='#ffdea6';ctx.font='bold 14px sans-serif';
   ctx.fillText(obj.type==='npc'?'E: falar com '+obj.label:'E: abrir ações da estação '+(obj.index+1),30,511);
  }
 }
 function draw(){
  if(free){drawRoom();return;}
  ctx.fillStyle=c.domain==='aquarium'?'#103d57':c.domain==='farm'?'#153d2a':'#243046';ctx.fillRect(0,0,960,540);V?.backdrop(ctx,960,540,frames/60);
  ctx.font='22px sans-serif';ctx.fillStyle='#fff';ctx.fillText(c.label+' · '+c.cost+' $ para iniciar · '+(aquarium?'Adulto até ':'Venda ')+c.price+' $',22,48);
  const w=960/c.slots;
  for(let i=0;i<c.slots;i++){
   const item=s.slots[i],x=i*w+8;
   ctx.fillStyle=i===selected?'#367567':'#253b48';ctx.fillRect(x,110,w-16,340);V?.habitat(ctx,x,110,w-16,340,c.domain,frames/60);if(i===selected){ctx.strokeStyle='#f8d68d';ctx.lineWidth=3;ctx.strokeRect(x+2,112,w-20,336);}
   ctx.fillStyle='#fff';ctx.font='16px sans-serif';ctx.fillText('#'+(i+1),x+8,140);
   if(item){
    const progress=item.age/c.seconds;
    ctx.fillStyle=c.domain==='aquarium'?'#ffc568':c.domain==='farm'?'#8be26c':'#e2ad79';
    if(V){ctx.save();ctx.translate(x+w/2-8+(aquarium?Math.sin(frames*.025+i)*Math.min(12,w*.1):0),280);const scale=aquarium?Math.min(1,(w-24)/90):1;ctx.scale(scale,scale);V.product(ctx,0,0,progress,c.domain,frames/60);ctx.restore();}
    else if(c.domain==='aquarium'){ctx.beginPath();ctx.ellipse(x+w/2-8,250,15+progress*20,10+progress*10,0,0,Math.PI*2);ctx.fill();}
    else ctx.fillRect(x+w/2-22,300-progress*90,28,30+progress*90);
    ctx.fillStyle='#fff';
    if(aquarium){
     const q=R.status(s,c,i);ctx.fillText(q.label+' · '+q.value+' $',x+8,365,Math.max(20,w-24));
     ctx.fillText(q.blocked.length?'Cuidar':q.stage==='adult'?'Pronto!':Math.ceil(q.remainingSeconds)+' s',x+8,390);
     let yy=405;
     for(const [value,color] of [[q.progress*100,'#8bd4a8'],...(c.aquariumCare.hungerEnabled?[[q.satiety,'#f1bf74']]:[]),...(c.aquariumCare.waterEnabled?[[q.water,'#79c4e1']]:[])]){
      ctx.fillStyle='#17303f';ctx.fillRect(x+8,yy,w-32,6);ctx.fillStyle=value>0?color:'#e47f83';ctx.fillRect(x+8,yy,(w-32)*value/100,6);yy+=11;
     }
    }else ctx.fillText(!item.cared?c.care:progress>=1?'Pronto!':Math.ceil(c.seconds-item.age)+' s',x+8,390);
   }else ctx.fillText('Vazio',x+8,250);
  }
  if(exploring){
   ctx.fillStyle='#17343f';ctx.fillRect(0,454,960,86);
   ctx.fillStyle='#315a60';for(let i=0;i<960;i+=80)ctx.fillRect(i+3,533,72,3);
   ctx.fillStyle='#061922';ctx.beginPath();ctx.ellipse(playerX,514,19,5,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#4c95b8';ctx.fillRect(playerX-11,470,22,33);
   ctx.fillStyle='#efc99c';ctx.beginPath();ctx.arc(playerX,460,12,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#2e2630';ctx.fillRect(playerX-10,448,20,6);
   ctx.fillStyle='#233448';ctx.fillRect(playerX-10,501,8,12);ctx.fillRect(playerX+2,501,8,12);
   ctx.fillStyle='#f0dfa0';ctx.font='14px sans-serif';ctx.fillText(near()?'E ou INTERAGIR para abrir ações':'Caminhando...',12,525);
  }
 }
 function frame(t){
  if(frames>noticeUntil)el('message').style.opacity='0';
  const dt=last?Math.min(.1,Math.max(0,(t-last)/1000)):0;
  last=t;frames++;
  if(state==='play'&&!paused){
   if(free){
    if(patrol)F.patrolGuide(room,dt,c.exploration.patrol);
    let dx=Number(held.has('ArrowRight')||held.has('d')||held.has('D'))-Number(held.has('ArrowLeft')||held.has('a')||held.has('A'));
    let dy=Number(held.has('ArrowDown')||held.has('s')||held.has('S'))-Number(held.has('ArrowUp')||held.has('w')||held.has('W'));
    if(dx||dy)walkTo=null;
    else if(walkTo){
     const vx=walkTo.x-avatar.x,vy=walkTo.y-avatar.y;
     if(Math.hypot(vx,vy)<=8)walkTo=null;else{dx=vx;dy=vy;}
    }
    if(dx||dy)avatar=F.move(avatar,dx,dy,dt,room,c.exploration.speed);
    if(actionsOpen&&!near())actionsOpen=false;
   }else if(exploring){
    const distance=targetX-playerX,step=c.exploration.speed*dt;
    playerX+=Math.sign(distance)*Math.min(Math.abs(distance),step);
    if(!near())actionsOpen=false;
   }
   R.tick(s,c,dt);
   if(s.complete){victory();persist();}
   saveElapsed+=dt;if(saveElapsed>=5)persist();
  }
  update();draw();V?.finish(ctx,960,540);requestAnimationFrame(frame);
 }
 update();requestAnimationFrame(frame);
}
root.gameForgeSimulationBoot=gameForgeSimulationBoot;
if(typeof module!=='undefined')module.exports=gameForgeSimulationBoot;
})(typeof globalThis!=='undefined'?globalThis:this);
