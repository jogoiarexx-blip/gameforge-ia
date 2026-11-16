/* GameForge Visual Composer: escolhas simples -> pedido verificável.
 * UI inspirada na ergonomia de construtores low-code, sem dependência da Microsoft.
 * Não confunde especificação com funcionalidade realmente executada.
 */
(function(root){
'use strict';
const MODES=Object.freeze({
 '2d:platform':{label:'Plataforma 2D',genre:'platform',dimension:'2d',phrase:'plataforma 2D'},
 '2d:rpg':{label:'RPG 2D',genre:'rpg',dimension:'2d',phrase:'RPG 2D'},
 '2d:shooter':{label:'Navinha 2D',genre:'shooter',dimension:'2d',phrase:'navinha espacial 2D'},
 '2d:tower-defense':{label:'Defesa de torres 2D',genre:'tower-defense',dimension:'2d',phrase:'defesa de torres 2D'},
 '3d:rpg':{label:'RPG 3D',genre:'rpg',dimension:'3d',phrase:'RPG de aventura 3D'},
 '3d:fps':{label:'Tiro em primeira pessoa 3D',genre:'fps',dimension:'3d',phrase:'FPS 3D'},
 '3d:racing':{label:'Corrida 3D',genre:'racing',dimension:'3d',phrase:'corrida de carros 3D'},
 '3d:urban-action':{label:'Cidade em terceira pessoa 3D (em desenvolvimento)',genre:'urban-action',dimension:'3d',phrase:'ação urbana 3D em terceira pessoa'}
});
const FEATURE_MAP=Object.freeze({
 boss:{phrase:'Adicionar um chefe na última fase.',caveat:''},
 waves:{phrase:'Criar ondas de inimigos com dificuldade crescente em cada fase.',caveat:'As ondas variam conforme o motor escolhido.'},
 checkpoints:{phrase:'Adicionar checkpoints nas fases e salvar o progresso.',caveat:'Checkpoint e salvamento precisam ser conferidos no jogo exportado.'},
 mobile:{phrase:'Oferecer controles touch para celular e pausa.',caveat:'Controles touch dependem do motor e requerem teste em aparelho real.'},
 store:{phrase:'Adicionar loja para comprar munição e kits médicos.',caveat:'A loja de combate possui contrato limitado ao FPS 3D.'},
 skills:{phrase:'Criar uma árvore de habilidades permanentes com pontos de habilidade.',caveat:'Árvore de habilidades completa ainda exige programação própria.'},
 interiors:{phrase:'Criar interiores acessíveis para prédios e lojas.',caveat:'Interiores acessíveis ainda não têm runtime completo.'},
 glb:{phrase:'Usar personagens GLB animados para andar, correr, atacar e morrer.',caveat:'GLB exige modelos compatíveis, importação e verificação das animações.'}
});
const normalize = v=>String(v||'').trim();
function compose(config={}){
 const mode=MODES[config.mode];
 if(!mode)throw Error('Escolha um tipo de jogo válido.');
 const phases=Number(config.phases);
 if(!Number.isInteger(phases)||phases<1||phases>30)throw Error('Escolha de 1 a 30 fases.');
 const difficulty=normalize(config.difficulty||'normal');
 if(!['facil','normal','dificil'].includes(difficulty))throw Error('Dificuldade inválida.');
 const features=Array.isArray(config.features)?[...new Set(config.features)]:[];
 if(features.some(f=>!FEATURE_MAP[f]))throw Error('Sistema de jogo desconhecido.');
 const chunks=['Crie um jogo de '+mode.phrase+'.','O jogo deve ter '+phases+' fases.',difficulty==='normal'?'Usar dificuldade normal.':'Deixar o jogo '+(difficulty==='facil'?'fácil':'difícil')+'.'];
 for(const feature of features)chunks.push(FEATURE_MAP[feature].phrase);
 return {text:chunks.join('\n'),dimension:mode.dimension,genre:mode.genre,mode:config.mode,phases,features,difficulty};
}
function assess(config,gdd='',existing='',parser=root.GameForgeParser){
 const request=compose(config);
 if(!parser||typeof parser.parseGdd!=='function')throw Error('O analisador de jogos ainda não está disponível.');
 const instruction=[normalize(existing),request.text].filter(Boolean).join('\n\n');
 const spec=parser.parseGdd(String(gdd||''),instruction,{dimension:request.dimension,genre:request.genre});
 const audit=spec.implementation?.audit||{};
 const counts={implementada:0,configurada:0,pendente:0,incompativel:0,...audit.counts};
 const cautions=request.features.map(key=>FEATURE_MAP[key].caveat).filter(Boolean);
 if(spec.engineAvailability?.status==='planned'||spec.engineAvailability?.status==='blocked')
   cautions.unshift(spec.engineAvailability.reason||'O motor selecionado ainda não permite gerar um jogo completo.');
 if(spec.designIR?.blocked?.length)cautions.unshift('Existe uma restrição incompatível com o motor escolhido.');
 return {request,spec,counts,items:(audit.items||[]).slice(0,10),cautions:[...new Set(cautions)],warnings:spec.implementation?.warnings||[]};
}
function mount(doc=root.document){
 if(!doc)return false;
 const byId=id=>doc.getElementById(id),panel=byId('visual-composer');
 if(!panel||panel.dataset.ready==='yes')return false;
 const mode=byId('vc-mode'),phases=byId('vc-phases'),difficulty=byId('vc-difficulty');
 const report=byId('vc-result'),output=byId('vc-command'),instruction=byId('instruction'),gdd=byId('gdd');
 if(!mode||!phases||!difficulty||!report||!output||!instruction||!gdd)return false;
 mode.replaceChildren(...Object.entries(MODES).map(([key,v])=>new Option(v.label,key)));
 mode.value='2d:platform';
 panel.dataset.ready='yes';
 const settings=()=>({mode:mode.value,phases:Number(phases.value),difficulty:difficulty.value,
   features:[...panel.querySelectorAll('input[data-vc-feature]:checked')].map(el=>el.value)});
 function show(){
  report.replaceChildren();
  try{
   const r=assess(settings(),gdd.value,instruction.value);
   output.value=r.request.text;
   const p=doc.createElement('p');
   p.textContent='Prévia da interpretação: '+r.counts.implementada+' implementadas · '+r.counts.configurada+' configurações · '+r.counts.pendente+' pendências · '+r.counts.incompativel+' incompatibilidades.';
   report.append(p);
   const warnings=[...r.cautions,...r.warnings];
   if(gdd.value.trim())warnings.unshift('O GDD já escrito continuará no projeto. As escolhas serão acrescentadas ao pedido, não substituirão a história.');
   if(r.spec.designIR?.blocked?.length)warnings.push('O jogo não poderá ser gerado até resolver as restrições incompatíveis.');
   if(warnings.length){
    const ul=doc.createElement('ul');
    for(const message of warnings.slice(0,8)){const li=doc.createElement('li');li.textContent=message;ul.append(li);}
    report.append(ul);
   }
   if(r.items.length){
    const ul=doc.createElement('ul');
    for(const item of r.items.slice(0,7)){
     const li=doc.createElement('li');
     li.textContent=(item.status||'pendente').toUpperCase()+' — '+(item.description||item.id||'Requisito');
     ul.append(li);
    }
    report.append(ul);
   }
   const small=doc.createElement('p');small.textContent='Esta é uma simulação da interpretação do pedido, não um teste do jogo. Execute a prévia e o QA antes de validar sistemas.';report.append(small);
  }catch(error){output.value='';report.textContent='Não foi possível conferir: '+error.message;}
 }
 byId('vc-check').addEventListener('click',show);
 byId('vc-apply').addEventListener('click',()=>{
  try{
   const req=compose(settings());
   const combined=[normalize(instruction.value),req.text].filter(Boolean).join('\n\n');
   if(combined.length>12000)throw Error('O pedido ficou maior que 12.000 caracteres. Resuma a instrução anterior.');
   const dim=byId('game-dimension'),genre=byId('game-style');
   if(!dim||!genre)throw Error('O seletor de motor não foi encontrado.');
   dim.value=req.dimension;
   dim.dispatchEvent(new Event('change',{bubbles:true}));
   if(![...genre.options].some(option=>option.value===req.genre))
    throw Error('Este tipo de jogo não está disponível para o motor escolhido.');
   genre.value=req.genre;
   instruction.value=combined;
   instruction.dispatchEvent(new Event('input',{bubbles:true}));
   genre.dispatchEvent(new Event('change',{bubbles:true}));
   show();
   const p=doc.createElement('p');
   p.textContent='Pedido adicionado. Clique em “Criar jogo” para executar o motor. O GDD existente foi preservado.';
   report.prepend(p);
  }catch(error){report.textContent='Pedido não aplicado: '+error.message;}
 });
 panel.querySelectorAll('input,select').forEach(el=>el.addEventListener('change',()=>{output.value='';report.textContent='Opções alteradas. Clique em “Conferir compatibilidade” para atualizar a leitura.';}));
 return true;
}
root.GameForgeVisualComposer={MODES,FEATURE_MAP,compose,assess,mount};
if(typeof module!=='undefined')module.exports=root.GameForgeVisualComposer;
if(root.document){
 if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>mount());
 else mount();
}
})(typeof globalThis!=='undefined'?globalThis:this);
