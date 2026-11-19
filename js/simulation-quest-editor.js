/* GF-TRAIN-16 — editor acessível, sem eval e sem executar texto do usuário. */
(function(root){
 'use strict';
 const domains={
  aquarium:{label:'Aquário',intro:'Quero cuidar de aquário',actions:{start:'comprar',care:'alimentar',finish:'vender'}},
  farm:{label:'Fazenda',intro:'Quero cuidar de fazenda',actions:{start:'plantar',care:'regar',finish:'colher',sell:'vender'}},
  shop:{label:'Loja',intro:'Quero administrar uma loja',actions:{start:'repor',care:'atender',finish:'vender'}}
 };
 const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
 const safe=(value,min,max)=>{const n=Number(value);return integer(n,min,max)?n:null;};
 function normalize(data){
  const d=domains[data?.domain];
  if(!d||!Array.isArray(data.missions)||!integer(data.missions.length,3,4))throw Error('Escolha aquário, fazenda ou loja e de três a quatro missões.');
  const missions=data.missions.map((m,i)=>{
   if(!m||!Array.isArray(m.objectives)||m.objectives.length!==2)throw Error('A missão '+(i+1)+' precisa ter dois objetivos.');
   const objectives=m.objectives.map(o=>{
    if(!Object.hasOwn(d.actions,o?.event)||safe(o?.count,1,5)===null)throw Error('Evento ou quantidade inválida na missão '+(i+1)+'.');
    return {event:o.event,count:Number(o.count)};
   });
   if(objectives[0].event===objectives[1].event)throw Error('Escolha duas ações diferentes na missão '+(i+1)+'.');
   const stock=safe(m.stock??0,0,12),seconds=safe(m.seconds??0,0,60);
   if(stock===null||seconds===null)throw Error('Estoque ou espera fora do limite na missão '+(i+1)+'.');
   return {objectives,stock,seconds};
  });
  return {domain:data.domain,missions};
 }
 function buildPrompt(data){
  const d=normalize(data),domain=domains[d.domain],n=d.missions.length;
  const lines=[domain.intro+'. '+n+' missões encadeadas com objetivos simultâneos. Personagem andando livremente com WASD.'];
  for(const [i,m] of d.missions.entries()){
   let line='Missão '+(i+1)+': '+m.objectives.map(o=>domain.actions[o.event]+' '+o.count).join(' e ')+'.';
   if(m.stock>0)line+=' Estoque de '+m.stock+'.';
   if(m.seconds>0)line+=' Esperar '+m.seconds+' segundos.';
   lines.push(line);
  }
  return lines.join('\n');
 }
 function mount({document:doc,root:host,instruction,onApply}){
  if(!host||!doc||!instruction)return false;
  const by=id=>doc.getElementById(id);
  const domainSelect=by('qe-domain'),totalSelect=by('qe-total'),rows=by('qe-rows'),preview=by('qe-command'),status=by('qe-result');
  if(!domainSelect||!totalSelect||!rows||!preview||!status)return false;
  const el=(tag,attrs={})=>{
   const n=doc.createElement(tag);
   for(const [key,value] of Object.entries(attrs)){
    if(key==='text')n.textContent=value;
    else if(key==='class')n.className=value;
    else if(key==='type'||key==='id'||key==='value'||key==='htmlFor')n[key]=value;
    else n.setAttribute(key,String(value));
   }
   return n;
  };
  function makeSelect(id,options,defaultValue){
   const select=el('select',{id});
   for(const [value,label] of options){
    const option=el('option',{value,text:label});
    select.appendChild(option);
   }
   select.value=defaultValue;
   return select;
  }
  function field(parent,text,id,node){
   const label=el('label',{htmlFor:id,text});
   parent.appendChild(label);parent.appendChild(node);
  }
  function render(){
   rows.replaceChildren();
   const domain=domains[domainSelect.value]||domains.aquarium,total=Number(totalSelect.value);
   const actions=Object.entries(domain.actions);
   for(let i=0;i<total;i++){
    const fieldset=el('fieldset',{class:'visual-composer-features'});
    fieldset.appendChild(el('legend',{text:'Missão '+(i+1)+' · '+(i%2===0?'Guia':'Segundo NPC')}));
    const grid=el('div',{class:'visual-composer-grid'});
    const first=actions[i%actions.length][0],second=actions[(i+1)%actions.length][0];
    for(let k=0;k<2;k++){
     const group=el('div');
     const id='qe-action-'+i+'-'+k,countId='qe-count-'+i+'-'+k;
     field(group,'Objetivo '+(k+1),id,makeSelect(id,actions.map(([event,word])=>[event,word]),k===0?first:second));
     const count=el('input',{id:countId,type:'number',value:'1',min:'1',max:'5',step:'1'});
     field(group,'Quantas vezes?',countId,count);grid.appendChild(group);
    }
    const stockGroup=el('div'),stockId='qe-stock-'+i;
    field(stockGroup,'Estoque mínimo (0 = sem)',stockId,el('input',{id:stockId,type:'number',value:'0',min:'0',max:'12',step:'1'}));
    const timeGroup=el('div'),timeId='qe-time-'+i;
    field(timeGroup,'Esperar segundos (0 = sem)',timeId,el('input',{id:timeId,type:'number',value:'0',min:'0',max:'60',step:'1'}));
    grid.append(stockGroup,timeGroup);
    fieldset.appendChild(grid);rows.appendChild(fieldset);
   }
   preview.value='';status.textContent='Configure os objetivos e confira o pedido antes de aplicar.';
  }
  function read(){
   const total=Number(totalSelect.value);
   return {domain:domainSelect.value,missions:Array.from({length:total},(_,i)=>({
    objectives:[0,1].map(k=>({event:by('qe-action-'+i+'-'+k)?.value,count:by('qe-count-'+i+'-'+k)?.value})),
    stock:by('qe-stock-'+i)?.value,seconds:by('qe-time-'+i)?.value
   }))};
  }
  function check(){
   try{
    const value=buildPrompt(read());preview.value=value;
    status.textContent=totalSelect.value+' missões com objetivos e eventos verificáveis; confira o texto e clique em Adicionar ao pedido.';
    return value;
   }catch(e){status.textContent=e.message;preview.value='';return null;}
  }
  domainSelect.addEventListener('change',render);totalSelect.addEventListener('change',render);
  by('qe-preview').addEventListener('click',check);
  by('qe-apply').addEventListener('click',()=>{
   const value=check();if(!value)return;
   const marker='[MISSÕES DO EDITOR VISUAL]';
   const base=instruction.value.includes(marker)?instruction.value.slice(0,instruction.value.indexOf(marker)).trim():instruction.value.trim();
   instruction.value=[base,marker+'\n'+value].filter(Boolean).join('\n\n');
   instruction.dispatchEvent(new Event('input',{bubbles:true}));
   status.textContent='Missões adicionadas ao pedido. Clique em Criar jogo para gerar e testar.';
   if(typeof onApply==='function')onApply(value);
  });
  render();
  return true;
 }
 root.GameForgeQuestEditor={domains,normalize,buildPrompt,mount};
 if(typeof module!=='undefined')module.exports=root.GameForgeQuestEditor;
})(typeof globalThis!=='undefined'?globalThis:this);
