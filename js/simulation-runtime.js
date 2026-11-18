(function(root){
function gameForgeSimulationBoot(){
 'use strict';
 const V=typeof GameForgeGraphics==='object'?GameForgeGraphics:null;
 const c=GAME_SPEC.simulation,R=GameForgeSimulationRules,el=id=>document.getElementById(id);
 const canvas=el('game'),ctx=canvas.getContext('2d');canvas.width=960;canvas.height=540;
 let s=R.create(c),state='menu',paused=false,selected=0,frames=0,last=0,noticeUntil=0;
 const aquarium=!!c.aquariumCare?.enabled;
 const save=R.persistence(c,GAME_SPEC.title,()=>window.localStorage);
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
  const ok=save.write(s,selected);saveStatus=ok?'Salvo neste navegador':'Não foi possível salvar neste navegador';
  if(ok){saved=save.read();continueButton.disabled=!saved;}
  saveElapsed=0;if(manual)say(saveStatus);saveLabel.textContent=saveStatus;
 }
 function victory(){state='victory';el('message').style.opacity='0';el('overlay-title').textContent='Meta alcançada!';el('overlay-sub').textContent=s.sales+' vendas realizadas';el('overlay').classList.remove('hidden');}
 continueButton.addEventListener('click',()=>{
  const data=save.read();if(!data){continueButton.disabled=true;say('Progresso indisponível. Comece um novo jogo.');return;}
  s=data.state;selected=data.selected;state='play';paused=false;last=0;el('overlay').classList.add('hidden');
  if(s.complete)victory();else say('Progresso recuperado. O tempo fechado não alterou o jogo.');update();
 });
 saveButton.addEventListener('click',()=>persist(true));
 window.addEventListener('pagehide',()=>persist());
 document.addEventListener('visibilitychange',()=>{if(document.hidden){persist();if(state==='play')paused=true;update();}});
 const panel=document.createElement('div');panel.className='buttons';panel.style.padding='10px';
 (canvas.parentElement||document.body).appendChild(panel);
 const buttons=[];
 if(c.automation?.enabled){
  const toggle=document.createElement('button');toggle.id='simulation-automation';toggle.type='button';panel.appendChild(toggle);
  toggle.addEventListener('click',()=>{if(state==='play'){s.automation.paused=!s.automation.paused;persist();update();}});
 }
 const say=t=>{el('message').textContent=t;el('message').style.opacity='1';noticeUntil=frames+150;};
 function action(kind){
  if(state!=='play'||paused)return;
  if(!R.act(s,c,selected,kind)){say('Selecione um espaço. Produza, cuide e aguarde ficar pronto.');return;}
  if(s.complete)victory();
  persist();update();
 }
 for(const [kind,label] of [['start',c.start],['care',c.care],['finish',c.finish],...(c.domain==='farm'?[['sell','Vender colheita']]:[]),...(c.aquariumCare?.waterEnabled?[['clean','Trocar água']]:[])]){
  const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>action(kind));panel.appendChild(b);buttons.push([b,kind]);
 }
 function begin(){s=R.create(c);selected=0;state='play';paused=false;last=0;persist();el('overlay').classList.add('hidden');say('Comece em um espaço vazio. Meta: vender '+c.target+' moedas.');update();}
 el('start').addEventListener('click',begin);el('restart').addEventListener('click',begin);
 el('pause').addEventListener('click',()=>{if(state==='play'){paused=!paused;persist();update();}});
 el('control-help').textContent=aquarium?'← → selecionar tanque · 1 comprar · 2 alimentar · 3 vender'+(c.aquariumCare.waterEnabled?' · 4 trocar água':''):'← → selecionar · 1 produzir · 2 cuidar · 3 colher/vender · 4 vender colheita';
 el('overlay-sub').textContent=c.label+': '+c.start+' → '+c.care+' → '+c.finish+(c.domain==='farm'?' → Vender':'')+(aquarium?'. O peixe cresce enquanto está alimentado'+(c.aquariumCare.waterEnabled?' e com água limpa':'')+'. O valor aumenta com a idade. Alimentar e trocar água são gratuitos.':'')+(save.enabled?'. Progresso salvo neste navegador. Fechado ou pausado, o tempo não avança. Novo jogo substitui o progresso anterior.':'. Salvamento desativado.');
 if(c.automation?.enabled)el('overlay-sub').textContent=c.label+'. Ciclo automático a cada '+c.automation.intervalSeconds+' s, com custos normais. Você pode desligar a automação e jogar manualmente. Pausar congela o jogo. '+(save.enabled?'Progresso salvo neste navegador. Novo jogo substitui o anterior.':'Salvamento desativado.');
 function input(key){
  if(state!=='play'||paused)return;
  if(key==='ArrowRight')selected=(selected+1)%c.slots;
  if(key==='ArrowLeft')selected=(selected+c.slots-1)%c.slots;
  const k={'1':'start','2':'care','3':'finish','4':aquarium?'clean':'sell'}[key];if(k)action(k);
 }
 document.addEventListener('keydown',e=>{if(['ArrowRight','ArrowLeft','1','2','3','4'].includes(e.key)){e.preventDefault();input(e.key);}});
 canvas.addEventListener('pointerdown',e=>{
  const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*960/rect.width,y=(e.clientY-rect.top)*540/rect.height;
  if(y>=110&&y<450)selected=Math.max(0,Math.min(c.slots-1,Math.floor(x/(960/c.slots))));
 });
 for(const button of document.querySelectorAll('[data-control]')){
  if(button.dataset.control==='fire'){button.textContent=aquarium?'COMPRAR':'PRODUZIR';button.addEventListener('pointerdown',e=>{e.preventDefault();action('start');});}
  else if(['left','right'].includes(button.dataset.control))button.addEventListener('pointerdown',e=>{e.preventDefault();input(button.dataset.control==='left'?'ArrowLeft':'ArrowRight');});
  else button.disabled=true;
 }
 function update(){
  if(c.automation?.enabled){const toggle=el('simulation-automation');toggle.textContent=s.automation.paused?'Ligar automação':'Desligar automação';toggle.disabled=state!=='play';}
  saveButton.disabled=state==='menu';saveLabel.textContent=saveStatus;
  el('health').textContent=s.money+' $';el('score').textContent=s.earned+'/'+c.target;el('ammo').textContent=aquarium?s.slots.filter(Boolean).length+' peixes':s.inventory;el('level').textContent=c.label;
  el('mission').textContent=(paused?'Pausado · ':'')+'Vendas: '+s.sales+' · Espaço '+(selected+1);
  if(aquarium){
   const q=R.status(s,c,selected),item=s.slots[selected];
   el('mission').textContent=(paused?'Pausado · ':'')+'Tanque '+(selected+1)+' · '+q.label+
    (item?' · Crescimento '+Math.floor(q.progress*100)+'% · Valor '+q.value+' moedas'+
     (c.aquariumCare.hungerEnabled?' · Saciedade '+Math.ceil(q.satiety)+'%':'')+
     (c.aquariumCare.waterEnabled?' · Água '+Math.ceil(q.water)+'%':'')+
     (q.blocked.length?' · Precisa: '+q.blocked.join(', '):q.stage==='adult'?' · Pronto para vender':' · Crescendo'):'');
  }
  if(c.automation?.enabled)el('mission').textContent+=' · Automação '+(s.automation.paused?'desligada':'ligada');
  for(const [b,k] of buttons){
   const item=s.slots[selected];
   b.disabled=state!=='play'||paused||(k==='start'?!!item||s.money<c.cost:k==='care'?!R.canCare(s,c,selected):k==='clean'?!R.canClean(s,c,selected):k==='sell'?!s.inventory:!R.canFinish(s,c,selected));
  }
 }
 rootTelemetry();
 function rootTelemetry(){window.__gameforgeTelemetry=()=>({state,paused,frames,player:{x:selected,y:0},simulation:JSON.parse(JSON.stringify(s)),domain:c.domain,persistence:{enabled:save.enabled,key:save.key,status:saveStatus,available:!!saved},selected:aquarium?R.status(s,c,selected):null});}
 function draw(){
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
 }
 function frame(t){if(frames>noticeUntil)el('message').style.opacity='0';const dt=last?Math.min(.1,Math.max(0,(t-last)/1000)):0;last=t;frames++;if(state==='play'&&!paused){R.tick(s,c,dt);if(s.complete){victory();persist();}saveElapsed+=dt;if(saveElapsed>=5)persist();}update();draw();V?.finish(ctx,960,540);requestAnimationFrame(frame);}
 update();requestAnimationFrame(frame);
}
root.gameForgeSimulationBoot=gameForgeSimulationBoot;
if(typeof module!=='undefined')module.exports=gameForgeSimulationBoot;
})(typeof globalThis!=='undefined'?globalThis:this);
