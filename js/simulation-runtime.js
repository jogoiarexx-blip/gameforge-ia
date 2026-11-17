(function(root){
function gameForgeSimulationBoot(){
 'use strict';
 const V=typeof GameForgeGraphics==='object'?GameForgeGraphics:null;
 const c=GAME_SPEC.simulation,R=GameForgeSimulationRules,el=id=>document.getElementById(id);
 const canvas=el('game'),ctx=canvas.getContext('2d');canvas.width=960;canvas.height=540;
 let s=R.create(c),state='menu',paused=false,selected=0,frames=0,last=0;
 const panel=document.createElement('div');panel.className='buttons';panel.style.padding='10px';
 (canvas.parentElement||document.body).appendChild(panel);
 const buttons=[];
 const say=t=>{el('message').textContent=t;};
 function action(kind){
  if(state!=='play'||paused)return;
  if(!R.act(s,c,selected,kind)){say('Selecione um espaço. Produza, cuide e aguarde ficar pronto.');return;}
  if(s.complete){state='victory';el('overlay-title').textContent='Meta alcançada!';el('overlay-sub').textContent=s.sales+' vendas realizadas';el('overlay').classList.remove('hidden');}
  update();
 }
 for(const [kind,label] of [['start',c.start],['care',c.care],['finish',c.finish],...(c.domain==='farm'?[['sell','Vender colheita']]:[])]){
  const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>action(kind));panel.appendChild(b);buttons.push([b,kind]);
 }
 function begin(){s=R.create(c);selected=0;state='play';paused=false;el('overlay').classList.add('hidden');say('Comece em um espaço vazio. Meta: vender '+c.target+' moedas.');update();}
 el('start').addEventListener('click',begin);el('restart').addEventListener('click',begin);
 el('pause').addEventListener('click',()=>{if(state==='play'){paused=!paused;update();}});
 el('control-help').textContent='← → selecionar · 1 produzir · 2 cuidar · 3 colher/vender · 4 vender colheita';
 el('overlay-sub').textContent=c.label+': '+c.start+' → '+c.care+' → '+c.finish+(c.domain==='farm'?' → Vender':'')+'. Protótipo 2D sem salvamento.';
 function input(key){
  if(state!=='play'||paused)return;
  if(key==='ArrowRight')selected=(selected+1)%c.slots;
  if(key==='ArrowLeft')selected=(selected+c.slots-1)%c.slots;
  const k={'1':'start','2':'care','3':'finish','4':'sell'}[key];if(k)action(k);
 }
 document.addEventListener('keydown',e=>{if(['ArrowRight','ArrowLeft','1','2','3','4'].includes(e.key)){e.preventDefault();input(e.key);}});
 canvas.addEventListener('pointerdown',e=>{
  const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*960/rect.width,y=(e.clientY-rect.top)*540/rect.height;
  if(y>=110&&y<450)selected=Math.max(0,Math.min(c.slots-1,Math.floor(x/(960/c.slots))));
 });
 for(const button of document.querySelectorAll('[data-control]')){
  if(button.dataset.control==='fire'){button.textContent='PRODUZIR';button.addEventListener('pointerdown',e=>{e.preventDefault();action('start');});}
  else if(['left','right'].includes(button.dataset.control))button.addEventListener('pointerdown',e=>{e.preventDefault();input(button.dataset.control==='left'?'ArrowLeft':'ArrowRight');});
  else button.disabled=true;
 }
 function update(){
  el('health').textContent=s.money+' $';el('score').textContent=s.earned+'/'+c.target;el('ammo').textContent=s.inventory;el('level').textContent=c.label;
  el('mission').textContent=(paused?'Pausado · ':'')+'Vendas: '+s.sales+' · Espaço '+(selected+1);
  for(const [b,k] of buttons){const item=s.slots[selected];b.disabled=state!=='play'||paused||(k==='start'?!!item||s.money<c.cost:k==='care'?!item||item.cared:k==='sell'?!s.inventory:!item||item.age<c.seconds);}
 }
 rootTelemetry();
 function rootTelemetry(){window.__gameforgeTelemetry=()=>({state,paused,frames,player:{x:selected,y:0},simulation:JSON.parse(JSON.stringify(s)),domain:c.domain});}
 function draw(){
  ctx.fillStyle=c.domain==='aquarium'?'#103d57':c.domain==='farm'?'#153d2a':'#243046';ctx.fillRect(0,0,960,540);V?.backdrop(ctx,960,540,frames/60);
  ctx.font='22px sans-serif';ctx.fillStyle='#fff';ctx.fillText(c.label+' · '+c.cost+' $ para iniciar · Venda '+c.price+' $',22,48);
  const w=960/c.slots;
  for(let i=0;i<c.slots;i++){
   const item=s.slots[i],x=i*w+8;
   ctx.fillStyle=i===selected?'#367567':'#253b48';ctx.fillRect(x,110,w-16,340);V?.habitat(ctx,x,110,w-16,340,c.domain,frames/60);if(i===selected){ctx.strokeStyle='#f8d68d';ctx.lineWidth=3;ctx.strokeRect(x+2,112,w-20,336);}
   ctx.fillStyle='#fff';ctx.font='16px sans-serif';ctx.fillText('#'+(i+1),x+8,140);
   if(item){
    const progress=item.age/c.seconds;
    ctx.fillStyle=c.domain==='aquarium'?'#ffc568':c.domain==='farm'?'#8be26c':'#e2ad79';
    if(V)V.product(ctx,x+w/2-8,280,progress,c.domain,frames/60);
    else if(c.domain==='aquarium'){ctx.beginPath();ctx.ellipse(x+w/2-8,250,15+progress*20,10+progress*10,0,0,Math.PI*2);ctx.fill();}
    else ctx.fillRect(x+w/2-22,300-progress*90,28,30+progress*90);
    ctx.fillStyle='#fff';ctx.fillText(!item.cared?c.care:progress>=1?'Pronto!':Math.ceil(c.seconds-item.age)+' s',x+8,390);
   }else ctx.fillText('Vazio',x+8,250);
  }
 }
 function frame(t){const dt=Math.min(.1,Math.max(0,(t-last)/1000));last=t;frames++;if(state==='play'&&!paused)R.tick(s,c,dt);update();draw();V?.finish(ctx,960,540);requestAnimationFrame(frame);}
 requestAnimationFrame(frame);
}
root.gameForgeSimulationBoot=gameForgeSimulationBoot;
if(typeof module!=='undefined')module.exports=gameForgeSimulationBoot;
})(typeof globalThis!=='undefined'?globalThis:this);
