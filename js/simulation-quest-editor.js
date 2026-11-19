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
   const stock=safe(m.stock??0,0,12),seconds=safe(m.seconds??0,0,60),
    kits=safe(m.kits??0,0,3),boosts=safe(m.boosts??0,0,3);
   const afterFirst=m.afterFirst===true;
   const prereq=m.prerequisites===undefined?[]:m.prerequisites;
   if(stock===null||seconds===null||kits===null||boosts===null)
    throw Error('Estoque, espera ou recompensas fora do limite na missão '+(i+1)+'.');
   if(kits>0&&boosts>0)throw Error('Escolha um tipo de recompensa por missão: kits OU aceleradores.');
   if(!Array.isArray(prereq)||new Set(prereq).size!==prereq.length||
    prereq.some(j=>!integer(j,0,i-1)))throw Error('Dependências da missão '+(i+1)+' devem apontar apenas para missões anteriores.');
   return {objectives,stock,seconds,kits,boosts,afterFirst,prerequisites:[...prereq]};
  });
  return {domain:data.domain,missions,graph:data.graph===true||missions.some(m=>m.boosts>0)};
 }
 function buildPrompt(data){
  const d=normalize(data),domain=domains[d.domain],n=d.missions.length;
  const lines=[domain.intro+'. '+n+(d.graph?' missões paralelas':' missões encadeadas')+' com objetivos simultâneos. Personagem andando livremente com WASD.'];
  for(const [i,m] of d.missions.entries()){
   let line='Missão '+(i+1)+': '+m.objectives.map(o=>domain.actions[o.event]+' '+o.count).join(' e ')+'.';
   if(m.stock>0)line+=' Estoque de '+m.stock+'.';
   if(m.seconds>0)line+=' Esperar '+m.seconds+' segundos.';
   if(m.afterFirst)line+=' Objetivo 2 depois do objetivo 1.';
   if(m.kits>0)line+=' Recompensa de '+m.kits+' kits.';
   if(m.boosts>0)line+=' Recompensa de '+m.boosts+' aceleradores.';
   if(d.graph&&m.prerequisites.length)line+=' Desbloquear após etapas '+m.prerequisites.map(x=>x+1).join(' e ')+'.';
   lines.push(line);
  }
  return lines.join('\n');
 }
 function extractGenerated(files){
  const game=files?.['game.js'];
  if(typeof game!=='string'||!game.startsWith('/* Jogo criado no modo sem IA. Código editável. */')||
   game.length>2000000)throw Error('Abra um jogo de simulação criado pelo motor sem IA.');
  const marker='const GAME_SPEC = ';
  if(game.split(marker).length!==2)throw Error('GAME_SPEC alterado: para proteger seu código, edite manualmente ou recupere um backup.');
  const match=game.match(/const GAME_SPEC = ([^\r\n]+);\r?\n/);
  if(!match)throw Error('Não foi possível localizar a configuração original do jogo.');
  let spec;try{spec=JSON.parse(match[1]);}catch{throw Error('GAME_SPEC não é JSON puro: não será alterado automaticamente.');}
  if(spec?.genre!=='simulation'||!([4,5,6].includes(spec.simulation?.story?.version)))
   throw Error('Editor de projeto pronto disponível somente para missões v4, v5 ou v6 de simulação 2D.');
  return {spec,match,game};
 }
 function fromSpec(files){
  const {spec}=extractGenerated(files),story=spec.simulation.story;
  return {domain:spec.simulation.domain,missions:story.missions.map(m=>({
   objectives:m.objectives.map(o=>({event:o.event,count:o.count})),
   stock:m.requires.find(r=>r.kind==='stock')?.min||0,
   seconds:m.requires.find(r=>r.kind==='time')?.seconds||0,
   kits:typeof m.itemReward==='number'?m.itemReward:m.itemReward?.kind==='kit'?m.itemReward.count:0,
   boosts:m.itemReward?.kind==='boost'?m.itemReward.count:0,
   prerequisites:[...(m.requiresMissions||[])],afterFirst:!!m.objectives[1]?.requiresFirst
  })),graph:story.version===6};
 }
 function editGenerated(files,proposed,options={}){
  const {spec,match,game}=extractGenerated(files),data=normalize(proposed),c=spec.simulation;
  if(data.domain!==c.domain)throw Error('Não é possível trocar o tipo de jogo já criado pelo editor de missões.');
  if(data.missions.some(m=>m.stock>c.slots))throw Error('Estoque exigido maior que a quantidade de espaços do jogo ('+c.slots+').');
  const advanced=data.missions.some(m=>m.afterFirst||m.kits>0);
  if(c.story.version===4&&(advanced||data.graph))
   throw Error('Motor v4 exportado não contém dependências, kits ou recompensas avançadas.');
  if(c.story.version===5&&data.graph)
   throw Error('Motor v5 exportado não contém missões paralelas ou aceleradores. Crie um jogo novo v6.');
  const oldConfig=JSON.parse(JSON.stringify(c));
  if(options.migrateSave===true){
   if(oldConfig.saveMigration!==undefined)
    throw Error('Migração exige uma edição por vez: este projeto já contém migração. Abra o jogo e converta o save antes de editar novamente.');
   if(c.persistence?.enabled!==true)throw Error('Este jogo não possui salvamento para migrar.');
  }
  const previous=c.story.missions;
  c.story.missions=data.missions.map((m,i)=>({
   id:'m'+(i+1),
   label:'Missão '+(i+1)+' · '+m.objectives.map(o=>domains[data.domain].actions[o.event]).join(' + '),
   objectives:m.objectives.map((o,k)=>({
    event:o.event,count:o.count,...(c.story.version>=5?{requiresFirst:k===1&&m.afterFirst}:{})
   })),
   reward:previous[i]?.reward??(3+2*i),
   requires:[...(m.stock?[{kind:'stock',min:m.stock}]:[]),...(m.seconds?[{kind:'time',seconds:m.seconds}]:[])],
   ...(c.story.version===5?{itemReward:m.kits}:c.story.version===6?{
    itemReward:{kind:m.boosts>0?'boost':'kit',count:m.boosts||m.kits},
    requiresMissions:[...m.prerequisites]}:{})
  }));
  const factory=root.gameForgeSimulationEventsFactory||(typeof require==='function'?require('./simulation-events'):null);
  if(typeof factory!=='function'||!factory().validConfig(c.story))
   throw Error('A configuração não passou na validação do motor de missões.');
  delete c.saveMigration;
  if(options.migrateSave===true)c.saveMigration={version:1,previous:oldConfig};
  const code=game.replace(match[0],'const GAME_SPEC = '+JSON.stringify(spec)+';\n');
  if(code===game)throw Error('Nenhuma alteração identificada.');
  return {files:{...files,'game.js':code},spec,oldStoryVersion:c.story.version,
   notice:options.migrateSave===true?'Migração autorizada: apenas saves válidos de missões ainda não iniciadas, na mesma origem, serão importados.':'O jogo exportado mudou sem regenerar scripts. O save antigo não pode continuar após a mudança.'};
 }
 function mount({document:doc,root:host,instruction,onApply,getGenerated,onEdit}){
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
    const afterGroup=el('div'),afterId='qe-after-'+i;
    const after=el('input',{id:afterId,type:'checkbox'});
    field(afterGroup,'Objetivo 2 só depois do objetivo 1',afterId,after);
    const kitsGroup=el('div'),kitsId='qe-kits-'+i;
    field(kitsGroup,'Recompensa em kits (0–3)',kitsId,el('input',{id:kitsId,type:'number',value:'0',min:'0',max:'3',step:'1'}));
    grid.append(afterGroup,kitsGroup);
    fieldset.appendChild(grid);rows.appendChild(fieldset);
   }
   preview.value='';status.textContent='Configure os objetivos e confira o pedido antes de aplicar.';
  }
  function read(){
   const total=Number(totalSelect.value);
   return {domain:domainSelect.value,missions:Array.from({length:total},(_,i)=>({
    objectives:[0,1].map(k=>({event:by('qe-action-'+i+'-'+k)?.value,count:by('qe-count-'+i+'-'+k)?.value})),
    stock:by('qe-stock-'+i)?.value,seconds:by('qe-time-'+i)?.value,
    kits:by('qe-kits-'+i)?.value,afterFirst:by('qe-after-'+i)?.checked===true
   }))};
  }
  function check(){
   try{
    const value=buildPrompt(read());preview.value=value;
    status.textContent=totalSelect.value+' missões com objetivos e eventos verificáveis; confira o texto e clique em Adicionar ao pedido.';
    return value;
   }catch(e){status.textContent=e.message;preview.value='';return null;}
  }
  function populate(data){
   const normalized=normalize(data);
   domainSelect.value=normalized.domain;totalSelect.value=String(normalized.missions.length);render();
   for(const [i,m] of normalized.missions.entries()){
    for(const [k,o] of m.objectives.entries()){
     by('qe-action-'+i+'-'+k).value=o.event;
     by('qe-count-'+i+'-'+k).value=String(o.count);
    }
    by('qe-stock-'+i).value=String(m.stock);
    by('qe-time-'+i).value=String(m.seconds);
    by('qe-kits-'+i).value=String(m.kits);
    by('qe-after-'+i).checked=m.afterFirst;
   }
   check();
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
  const load=by('qe-load'),save=by('qe-save');
  if(load)load.addEventListener('click',()=>{
   try{if(typeof getGenerated!=='function')throw Error('Projeto não disponível.');
    populate(fromSpec(getGenerated()));
    status.textContent='Missões carregadas do jogo criado. Confira e salve as alterações.';
   }catch(e){status.textContent=e.message;}
  });
  if(save)save.addEventListener('click',()=>{
   try{
    if(typeof getGenerated!=='function'||typeof onEdit!=='function')throw Error('Edição indisponível neste projeto.');
    const result=editGenerated(getGenerated(),read());
    onEdit(result);
    status.textContent='Missões aplicadas ao game.js. Teste a prévia; o save anterior fica incompatível.';
   }catch(e){status.textContent=e.message;}
  });
  render();
  return true;
 }
 root.GameForgeQuestEditor={domains,normalize,buildPrompt,extractGenerated,fromSpec,editGenerated,mount};
 if(typeof module!=='undefined')module.exports=root.GameForgeQuestEditor;
})(typeof globalThis!=='undefined'?globalThis:this);
