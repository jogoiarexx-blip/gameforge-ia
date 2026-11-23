/* GameForge Studio: funciona como site estático, sem dependências externas. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const state={files:{},spec:null,selected:null,mode:'offline',generation:0};
  const allowed=GameForgeProject.allowedFiles;
  let pendingProject=null,saveTimer=null,projectOperations=0,unrestoredProject=false;
  let assetProjectId=GameForgeAssetLibrary.newId(),previewAssetSequence=0;
  const devHistory=[];let lastPlan=null;
  let roadmapTasks=[],selectedTaskId=null,preparedTaskId=null,roadmapCount=60,roadmapSource=null;
  const example=$('gdd').value;
  function creationOptions(){return {engineMode:$('game-engine-mode').value,dimension:$('game-dimension').value,genre:$('game-style').value,theme:$('game-theme').value,size:Number($('game-world-size').value),quality:$('game-quality').value,graphicsQuality:$('game-graphics-2d').value,visualStyle:$('game-visual-style').value};}
  function renderStyles(){
    const prior=$('game-style').value,dimension=$('game-dimension').value;
    const genres=GameForgeParser.styles[dimension]||Object.keys(GameForgeParser.labels);
    $('game-style').replaceChildren(new Option('Detectar pelo GDD','auto'),...genres.map(g=>new Option(GameForgeParser.labels[g],g)));
    $('game-style').value=genres.includes(prior)?prior:'auto';
  }
  function enableAutoDetection(){
    $('game-dimension').value='auto';
    $('game-style').value='auto';
    $('game-engine-mode').value='auto';
    renderStyles();
  }
  function restoreCreationOptions(options){
    const o=options||{};$('game-dimension').value=['2d','3d'].includes(o.dimension)?o.dimension:'auto';renderStyles();
    $('game-engine-mode').value=['default','snes2d'].includes(o.engineMode)?o.engineMode:'auto';
    if([...$('game-style').options].some(x=>x.value===o.genre))$('game-style').value=o.genre;
    $('game-graphics-2d').value=['low','medium','high'].includes(o.graphicsQuality)?o.graphicsQuality:'auto';$('game-visual-style').value=['forest','neon','desert','ruins'].includes(o.visualStyle)?o.visualStyle:'auto';
    $('game-theme').value=['forest','desert','neon','ruins'].includes(o.theme)?o.theme:'auto';$('game-world-size').value=o.size===72?'72':'48';$('game-quality').value=['low','high'].includes(o.quality)?o.quality:'auto';
  }
  const shooterExamples={"navinha":"# ARMADA DO ECLIPSE\n\n## Visão geral\nJogo de navinha espacial shoot em up vertical com chefes e armas evolutivas.\n\n## Mecânicas\n- Controlar nave com WASD/setas e atirar com espaço\n- Três níveis de arma, escudo, cura, créditos e power-ups\n- Ondas de inimigos com formações lineares, V e zigzag\n- Padrões de tiros inimigos e chefe de várias fases\n- Controles touch para celular, pausa e HUD\n\n## Fase 1 — Patrulha Estelar\nInimigos scouts em linha e formação V; chefe Sentinela Zero.\n\n## Fase 2 — Cinturão de Meteoros\nOndas zigzag e escolta com invasores resistentes.\n\n## Fase 3 — Núcleo Escarlate\nEnfrentar chefe final com três padrões de ataques.\n","neon":"# NEON SKY: O ÚLTIMO PILOTO\n\n## Visão geral\nShoot em up de nave cyberpunk com cidade neon, disparos luminosos e ondas de inimigos.\n\n## Mecânicas\n- Piloto da nave pode mover-se em quatro direções, atirar e usar escudo\n- Inimigos em linha, V, zigzag, cruzamento e enxame\n- Chefes com múltiplas etapas e dificuldade crescente\n- Melhorias de armas e power-ups\n- Qualidade gráfica adaptativa, partículas limitadas, áudio e controles touch\n\n## Fase 1 — Cidade Neon\nCombates sobre os prédios luminosos contra patrulhas.\n\n## Fase 2 — Estação Orbital\nOndas de escolta e franco-atiradores mecânicos.\n\n## Fase 3 — Núcleo Neon\nDerrote APEX OMEGA após o último enxame.\n","dragao":"# DRAGÕES DO CREPÚSCULO\n\n## Visão geral\nJogo de dragão voador no estilo Dragon Fury, shoot em up vertical, com magia e chefes.\n\n## Mecânicas\n- Dragão ataca com rajadas de fogo evolutivas\n- Ondas de águias, harpias e dragões inimigos\n- Inimigos com movimento zigzag, onda, escolta e tiros direcionados\n- Power-ups de energia, escudo e fogo\n- Chefes com etapas de batalha, pausa e controles touch\n\n## Fase 1 — Céu Sereno\nEnfrentar águias e caçadores do vale.\n\n## Fase 2 — Tempestade Iminente\nHarpias e dragões elementais cercam o herói.\n\n## Fase 3 — Fúria Ardente\nO Guardião Ancestral aparece com três fases de ataque.\n"};
  const repoKnowledge=globalThis.GameForgeRepoKnowledge;
  let pinnedReferences=[];
  function references(){
    return repoKnowledge.rank($('instruction').value+'\n'+$('gdd').value,5,pinnedReferences);
  }
  function renderReferences(){
    if(!repoKnowledge)return;
    const selected=repoKnowledge.rank($('instruction').value+'\n'+$('gdd').value,7,pinnedReferences);
    $('knowledge-count').textContent=repoKnowledge.entries.length+' padrões de '+new Set(repoKnowledge.entries.map(x=>x.repository)).size+' repositórios · '+pinnedReferences.length+' fixados';
    $('knowledge-results').innerHTML=selected.map(item=>`<article class="repo-reference"><div class="repo-reference-top"><div><strong>${esc(item.title)}</strong><span class="repo-type">${esc(item.category)} · ${esc(item.repository)}</span></div><label><input type="checkbox" data-repo-ref="${esc(item.id)}" ${pinnedReferences.includes(item.id)?'checked':''}> Fixar</label></div><p>${esc(item.summary)}</p>${item.evidenceType?`<p class="muted tiny">${item.evidenceType==='document'?'Documento de projeto':'Arquivo de código estudado'} · ${esc(item.application)}</p>`:''}<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Ver arquivo no GitHub</a></article>`).join('')||'<span class="muted tiny">Não há padrões relevantes para essa descrição.</span>';
    $('knowledge-results').querySelectorAll('input[data-repo-ref]').forEach(input=>input.addEventListener('change',()=>{
      const id=input.dataset.repoRef;
      if(input.checked){if(!pinnedReferences.includes(id))pinnedReferences.push(id);}
      else pinnedReferences=pinnedReferences.filter(x=>x!==id);
      pinnedReferences=pinnedReferences.slice(0,5);
      renderReferences();saveState();
    }));
  }

  const pad=n=>String(n).padStart(2,'0');
  const log=msg=>{$('log').textContent+='\n'+msg; $('log').scrollTop=$('log').scrollHeight;};
  const status=(message,error=false)=>{$('status').textContent=message;$('status').classList.toggle('bad',error);};
  const feedback=(msg,error=false)=>{$('feedback').textContent=msg;$('feedback').style.color=error?'#ffb2b8':'#91a6ba';};
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // O roteiro é derivado do GDD integral, não de resumos da IA.
  function roadmapSaveFiles(){
    if(!state.files['game.js'])return;
    state.files['PLANO_TAREFAS_GDD.md']=GameForgeRoadmap.report(roadmapTasks,$('gdd').value);
    state.files['TAREFAS_GDD.json']=JSON.stringify({version:1,project:projectName(),tasks:roadmapTasks.map(({id,title,path,line,kind,status,checks,notes,revision})=>({id,title,path,line,kind,status,checks,notes,revision}))},null,2);
  }
  function roadmapSync(force=false){
    const md=$('gdd').value;
    if(!force&&md===roadmapSource)return;
    roadmapTasks=GameForgeRoadmap.build(md,roadmapTasks).map(t=>t.status==='aguardando revisão'?{...t,status:'em andamento',notes:'GDD alterado; executar novo QA antes de validar.'}:t);
    if(roadmapSource!==null&&md!==roadmapSource){qaState.last=null;qaState.baseline=null;}
    roadmapSource=md;
    if(!roadmapTasks.some(t=>t.id===selectedTaskId))selectedTaskId=null;
    if(!roadmapTasks.some(t=>t.id===preparedTaskId))preparedTaskId=null;
    roadmapCount=60;
    roadmapRender();roadmapSaveFiles();
  }
  function selectedRoadmap(){return roadmapTasks.find(t=>t.id===selectedTaskId)||null;}
  function roadmapRender(){
    const s=GameForgeRoadmap.summary(roadmapTasks);
    $('roadmap-stats').textContent=`${s.total} tarefas · ${s.pending} pendentes · ${s.doing} em andamento · ${s.review} em revisão · ${s.validated} validadas · ${s.blocked} bloqueadas`;
    const query=$('roadmap-search').value.trim().toLowerCase();const filter=$('roadmap-filter').value;
    const items=roadmapTasks.filter(t=>(filter==='all'||filter===t.status)&&(!query||(t.title+' '+t.kind+' '+t.path).toLowerCase().includes(query)));
    const list=$('roadmap-list');list.replaceChildren();
    for(const t of items.slice(0,roadmapCount)){
      const button=document.createElement('button');button.className='roadmap-task'+(t.id===selectedTaskId?' selected':'');button.type='button';button.dataset.taskId=t.id;button.setAttribute('role','listitem');
      const l=document.createElement('span');const title=document.createElement('span');title.className='roadmap-task-title';title.textContent=t.title;
      const small=document.createElement('span');small.className='roadmap-task-info';small.textContent=t.kind+' · linha '+t.line;
      l.append(title,document.createElement('br'),small);
      const badge=document.createElement('span');badge.className='roadmap-task-state';badge.textContent=t.status;
      button.append(l,badge);button.addEventListener('click',()=>{selectedTaskId=t.id;roadmapRender();saveState();});list.appendChild(button);
    }
    $('roadmap-more').classList.toggle('hidden',items.length<=roadmapCount);
    const task=selectedRoadmap();
    $('roadmap-selected').textContent=task?`${task.title}
${task.kind} · linha ${task.line} · ${task.status}

Critérios para verificar:
${task.checks.map(c=>'• '+c).join('\n')}

${$('gdd').value.slice(task.start,task.end).slice(0,1400)}${task.notes?'\n\nNotas: '+task.notes:''}`:'Selecione uma tarefa para preparar seu comando e acompanhar os testes.';
    $('roadmap-prepare').disabled=!task;
    $('roadmap-done').disabled=!task||task.status!=='aguardando revisão'||!qaState.last||!!qaState.candidate;
    $('roadmap-reopen').disabled=!task||task.status==='pendente';
    $('roadmap-block').disabled=!task||task.status==='bloqueada';
  }
  function roadmapMark(status,notes){
    const task=selectedRoadmap();if(!task)return;
    roadmapTasks=GameForgeRoadmap.changeStatus(roadmapTasks,task.id,status,notes);
    roadmapSaveFiles();roadmapRender();if(state.files['game.js'])listFiles();saveState();
  }
  function roadmapPrepare(){
    roadmapSync();const task=selectedRoadmap();if(!task)return;
    preparedTaskId=task.id;
    $('instruction').value=GameForgeRoadmap.context(task,$('gdd').value).slice(0,9200);
    renderReferences();$('instruction').focus();
    feedback('Pedido preparado a partir da linha '+task.line+'. Clique em Planejar alteração ou Aplicar melhoria.');saveState();
  }
  function roadmapValidate(){
    if(selectedRoadmap()?.status!=='aguardando revisão'){feedback('A tarefa precisa ter uma alteração aplicada e testada antes da validação.',true);return;}
    if(!qaState.last){feedback('Execute o QA antes de validar uma tarefa.',true);return;}
    if(qaState.candidate){feedback('Primeiro aceite ou descarte a correção candidata.',true);return;}
    roadmapMark('validada',`Revisão manual confirmada após QA em ${new Date().toISOString().slice(0,10)}; alertas automáticos: ${qaState.last.issues.length}. A inspeção funcional é responsabilidade de quem validou.`);
    feedback('Tarefa marcada como validada por você. O restante do GDD permanece pendente.');
  }
  $('roadmap-rebuild').addEventListener('click',()=>{roadmapSync(true);feedback('Roteiro sincronizado com os capítulos do documento completo.');saveState();});
  $('roadmap-search').addEventListener('input',()=>{roadmapCount=60;roadmapRender();});
  $('roadmap-filter').addEventListener('change',()=>{roadmapCount=60;roadmapRender();});
  $('roadmap-more').addEventListener('click',()=>{roadmapCount+=60;roadmapRender();});
  $('roadmap-prepare').addEventListener('click',roadmapPrepare);
  $('roadmap-done').addEventListener('click',roadmapValidate);
  $('roadmap-reopen').addEventListener('click',()=>roadmapMark('pendente','Reaberta para nova implementação e testes.'));
  $('roadmap-block').addEventListener('click',()=>roadmapMark('bloqueada','Bloqueada manualmente; informar dependência no GDD.'));
  function readingReport(md, spec){
    const headings=md.split(/\r?\n/).filter(x=>/^#{1,6}\s+\S/.test(x));
    return '# Leitura do GDD\n\n- Tamanho: '+new Blob([md]).size+' bytes / '+md.length+' caracteres' +
      '\n- Cabeçalhos percorridos: '+headings.length+'\n- Arquivo GDD_original.md exportado integralmente.\n' +
      '- Fases usadas pelo protótipo: '+spec.stages.length+' (limite do motor).\n' +
      '- Ler todo o documento não significa implementar todas as mecânicas.\n\n## Capítulos\n\n' +
      headings.slice(0,500).map((h,i)=>'- '+(i+1)+': '+h.trim()).join('\n') +
      (headings.length>500?'\n- Outros '+(headings.length-500)+' cabeçalhos não exibidos no relatório.':'')+'\n';
  }
  function analyze(){
    const md=$('gdd').value.trim(),command=$('instruction').value.trim();
    if(!md&&!command){feedback('Escreva uma ideia no campo de comando ou importe um GDD para começar.',true);return null;}
    if(new Blob([md]).size>1_000_000){feedback('O GDD ultrapassa 1 MB; divida anexos externos.',true);return null;}
    if(command.length>12000){feedback('O comando ultrapassa 12.000 caracteres. Para documentação extensa, utilize o GDD.',true);return null;}
    roadmapSync();
    let spec;try{spec=GameForgeParser.parseGdd(md,$('instruction').value,creationOptions());}catch(e){feedback(e.message,true);return null;}
    const layoutText=$('rpg-layout-json')?.value.trim();
    if(layoutText){
      if(spec.genre!=='rpg'||spec.dimension!=='2d'){feedback('O JSON do editor de fases é exclusivo do RPG 2D. Escolha esse motor ou limpe o campo.',true);return null;}
      try{
        const layout=JSON.parse(layoutText);
        const validPoint=p=>p&&typeof p==='object'&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=100&&p.x<=2250&&p.y>=100&&p.y<=1450;
        const layouts=Array.isArray(layout?.stages)?layout.stages:[layout];
        if(!layouts.length||layouts.length>spec.stages.length)throw Error('Quantidade de fases inválida.');
        const normalized=layouts.map((entry,i)=>{
          if(!entry||typeof entry!=='object'||Array.isArray(entry))throw Error('Fase '+(i+1)+' inválida.');
          const puzzle=entry.puzzle;
          if(!puzzle||!['key','lever','gate'].every(k=>validPoint(puzzle[k])))throw Error('Fase '+(i+1)+': chave, alavanca e portão exigem coordenadas válidas.');
          if(!Array.isArray(entry.chests)||entry.chests.length>8||entry.chests.some(c=>!validPoint(c)||!Number.isInteger(c.coins)||c.coins<0||c.coins>250))throw Error('Fase '+(i+1)+': baús inválidos.');
          return {puzzle:{key:{x:puzzle.key.x,y:puzzle.key.y},lever:{x:puzzle.lever.x,y:puzzle.lever.y},gate:{x:puzzle.gate.x,y:puzzle.gate.y}},chests:entry.chests.map(c=>({x:c.x,y:c.y,coins:c.coins}))};
        });
        spec.stageConfig=Array.isArray(spec.stageConfig)?spec.stageConfig:[];
        normalized.forEach((entry,i)=>{spec.stageConfig[i]={...(spec.stageConfig[i]||{}),...entry};});
        spec.mechanics=spec.mechanics||{requested:[],available:[],pending:[]};
        for(const k of ['requested','available']){if(!Array.isArray(spec.mechanics[k]))spec.mechanics[k]=[];if(!spec.mechanics[k].includes('puzzles'))spec.mechanics[k].push('puzzles');}
      }catch(e){feedback('JSON do editor inválido: '+e.message,true);return null;}
    }
    // Um GDD recém-importado não deve herdar o GAME_SPEC de outro jogo salvo.
    const generatedGdd=typeof state.files['GDD_original.md']==='string'?state.files['GDD_original.md'].trim():null;
    state.spec=generatedGdd===md?GameForgeProject.activeSpec(state.files,spec):spec;
    const sceneText=$('scene3d-json')?.value.trim();
    if(sceneText){
      try{
        const manifest=currentAssetManifest();
        spec=GameForgeScene3DLayout.apply(spec,sceneText,manifest);
        state.spec=GameForgeScene3DLayout.apply(state.spec,sceneText,manifest);
      }catch(e){feedback('Cena 3D inválida: '+e.message,true);return null;}
    }
    const urbanOnly=spec.genre==='urban-action';
    $('download-urban-plan').classList.toggle('hidden',!urbanOnly);
    $('generate').disabled=(urbanOnly&&['planned','blocked'].includes(spec.engineAvailability?.status))||!!spec.designIR?.blocked?.length;
    renderReferences();
    const tags=spec.detected.slice(0,13).map(x=>`<span class="tag">${esc(x)}</span>`).join('');
    const plan=spec.implementation||{applied:[],pending:[],warnings:[]};
    const section=(items,limit)=>items.slice(0,limit).map(x=>'<li>'+esc(x.description)+' <small>('+esc(x.where)+')</small></li>').join('');
    const audit=plan.audit||{counts:{implementada:0,configurada:0,pendente:0,incompativel:0},items:[]};
    const auditNames={implementada:'Implementada',configurada:'Configurada',pendente:'Pendente',incompativel:'Incompatível'};
    const auditRows=audit.items.slice(0,35).map(item=>{
      const source=item.origin?.document||'Não localizada';
      const line=item.origin?.line?':'+item.origin.line:'';
      const technical=item.contract?' · '+item.contract:'';
      return '<li><b>'+esc(auditNames[item.status]||item.status)+'</b> — '+esc(item.description)+
        '<small> · '+esc(source+line+technical)+'</small></li>';
    }).join('');
    const auditSummary=Object.entries(auditNames).map(([key,name])=>name+': '+(audit.counts[key]||0)).join(' · ');
    const ir=spec.designIR||{requirements:[],constraints:[],blocked:[],counts:{}};
    const irRows=ir.requirements.slice(0,25).map(item=>
      '<li><b>'+esc(item.status)+'</b> — '+esc(item.label)+' <small>('+esc(item.origin?.document||'')+' linha '+esc(item.origin?.line||'?')+')</small></li>').join('');
    const constraintRows=ir.constraints.slice(0,12).map(item=>
      '<li><b>'+esc(item.status)+'</b> — '+esc(item.label)+' <small>('+esc(item.reason||'')+')</small></li>').join('');
    const flow=spec.actionModel||{missions:[],issues:[],relations:[]};
    const actionNames={eliminate:'Derrotar',collect:'Coletar',deliver:'Entregar',capture:'Capturar'};
    const actionRows=flow.missions.slice(0,5).map(m=>
      '<li><b>'+esc(m.title)+'</b> · fase '+esc(m.phase)+'<ul>'+
      m.actions.slice(0,12).map(a=>'<li>'+esc(a.status==='supported'?'Executável':'Pendente')+
        ' — '+esc(actionNames[a.action]||a.action)+' '+esc(a.quantity)+' × '+esc(a.target)+
        (a.objectQuantity?' (itens: '+esc(a.objectQuantity)+')':'')+
        (a.preconditions.length?' · requer '+esc(a.preconditions.join(', ')):'')+
        (a.conditions?.length?' · condição: '+esc(a.conditions.join('; ')):'')+
        ' <small>('+esc(a.source.document)+' linha '+esc(a.source.line)+')</small></li>').join('')+
      '</ul></li>').join('');
    const issuesRows=flow.issues.slice(0,12).map(x=>'<li>'+esc(x.reason)+
      ' <small>('+esc(x.source?.document||'GDD')+' linha '+esc(x.source?.line||'?')+')</small></li>').join('');
    const studiedRows=(Array.isArray(spec.learningPlan?.references)?spec.learningPlan.references:[]).filter(x=>x&&typeof x==='object').slice(0,4).map(r=>'<li><b>'+esc(r.title)+'</b> · '+esc(r.repository)+'<br><small>'+esc(r.application)+'</small></li>').join('');
    const sourceLabel=md?'Documento: '+spec.sourceLength.toLocaleString('pt-BR')+' caracteres e '+spec.sectionCount+' títulos':'Comando direto, sem GDD obrigatório';
    $('analysis').innerHTML=`<strong>${esc(spec.title)}</strong><div class="tags">${tags}</div><div class="muted">Fases: ${spec.stages.map(esc).join(' • ')}</div><p class="muted">${esc(sourceLabel)}. ${plan.applied.length} configurações compiladas; ${plan.pending.length} requisitos adicionais pendentes.</p>`+
      `<details><summary>Entendimento do pedido: ${plan.applied.length} aplicado(s) / ${plan.pending.length} pendente(s)</summary><p>Configurações adicionadas ao código:</p><ul>${section(plan.applied,25)||'<li>Motor padrão do gênero selecionado.</li>'}</ul><p>O que ainda não foi programado:</p><ul>${section(plan.pending,15)||'<li>Nenhum pedido adicional reconhecido como pendente.</li>'}</ul></details>`+
      `<details><summary>Contrato de capacidades — ${esc(auditSummary)}</summary><ul>${auditRows||'<li>Nenhuma regra adicional reconhecida.</li>'}</ul><p>Configurações usam o motor existente. Mecânicas novas continuam pendentes até haver código e testes.</p></details>`+
      `<details><summary>Como o jogo funciona — ${flow.missions.length} fase(s) interpretada(s), ${flow.relations.length} relação(ões)</summary><p>Ações, alvos, quantidades e condições identificadas no GDD:</p><ul>${actionRows||'<li>Não foram descritas ações concretas suficientes para criar missões diferentes.</li>'}</ul><p>Pedidos que ainda exigem motor próprio:</p><ul>${issuesRows||'<li>Nenhum conflito adicional nas missões interpretadas.</li>'}</ul><p>Objetivos são executáveis somente quando classificados como suportados para este motor.</p></details>`+
      `<details><summary>Requisitos detalhados do pedido — ${ir.requirements.length} mecânica(s), ${ir.constraints.length} restrição(ões)</summary><p>Solicitações reconhecidas com origem:</p><ul>${irRows||'<li>Nenhuma mecânica especial extraída.</li>'}</ul><p>Restrições e proibições:</p><ul>${constraintRows||'<li>Nenhuma restrição explícita.</li>'}</ul></details>`+
      `<details><summary>Técnicas selecionadas para este pedido</summary><ul>${studiedRows||'<li>Nenhuma referência específica selecionada.</li>'}</ul><p>As fontes orientam o plano. Consulte FONTES_ESTUDADAS.md na exportação para ver técnicas e testes; a seleção não implementa novas mecânicas automaticamente.</p></details>`+
      `<p class="muted">Modo Sem IA: somente configurações e mecânicas suportadas são executadas. Regras inéditas requerem desenvolvimento específico.</p>`;
    for(const message of [spec.sourceConflict,spec.genreOverrideWarning,spec.engineAvailability?.reason].filter(Boolean)){
      const warning=document.createElement('p');
      warning.setAttribute('role','status');
      warning.textContent='⚠ '+message;
      $('analysis').appendChild(warning);
    }
    if(spec.referenceGame){
      const reference=document.createElement('p');
      reference.className='muted tiny';
      const prefix=document.createTextNode('Exemplo técnico reconhecido: '+spec.referenceGame.repository+' · ');
      const link=document.createElement('a');
      link.textContent='Ver fonte no GitHub';
      link.href=spec.referenceGame.url;link.target='_blank';link.rel='noopener noreferrer';
      reference.append(prefix,link,document.createTextNode(' — referência de arquitetura; o código e os assets não foram copiados automaticamente.'));
      $('analysis').appendChild(reference);
    }
    if(ir.blocked?.length){
      const warning=document.createElement('p');
      warning.setAttribute('role','alert');
      warning.textContent='⚠ Não é possível gerar este jogo como solicitado: '+ir.blocked.map(x=>x.label).join(', ')+
        '. O motor atual entraria em conflito com uma proibição do seu pedido. Modifique a instrução ou escolha outro motor.';
      $('analysis').appendChild(warning);
    }
    if(spec.genreInference?.ambiguous){
      const warning=document.createElement('p');
      warning.setAttribute('role','status');
      warning.textContent='⚠ O texto mistura gêneros com sinais próximos. Confira gênero e dimensão antes de gerar; a seleção manual continua disponível.';
      $('analysis').appendChild(warning);
    }
    if(spec.genreInference){
      const explanation=document.createElement('p');
      explanation.className='muted tiny';
      explanation.textContent='Identificação pelo GDD: '+(GameForgeParser.labels[spec.genreInference.genre]||spec.genreInference.genre)
        +' · confiança '+spec.genreInference.confidence
        +(spec.genreInference.signals.length?' · '+spec.genreInference.signals.join(', '):'');
      $('analysis').appendChild(explanation);
    }
    return spec;
  }
  function projectName(){return ($('project-name').value.trim()||'gameforge-jogo').replace(/[\\/:*?"<>|]+/g,'-').slice(0,70);}

  /* v0.13 — edição determinística por fase, versionada no game.js e no backup. */
  let stageEditorIndex=0;
  const stageFields=['stage-title','stage-enemies','stage-boss','stage-waves','stage-laps','stage-theme','stage-mission','stage-seconds','stage-objective'];
  function stageEditorRead(){
    const spec=GameForgeCampaign.inspect(state.files);
    if(!spec)return;
    const index=stageEditorIndex;const o=GameForgeCampaign.option(spec,index);
    $('stage-title').value=spec.stages[index]||'';
    $('stage-enemies').value=o.enemies;$('stage-boss').value=o.boss;
    $('stage-waves').value=o.waves;$('stage-laps').value=o.laps;
    $('stage-theme').value=o.theme;$('stage-mission').value=o.mission;$('stage-seconds').value=o.seconds;$('stage-objective').value=o.objective;
    const available=GameForgeCampaign.maxEnemies(spec),genre=spec.genre,three=spec.dimension==='3d';
    $('stage-enemies').max=String(available);$('stage-enemies').disabled=!available;
    $('stage-boss').disabled=!['arena','fps','shooter','rpg'].includes(genre);
    $('stage-waves').disabled=!['tower-defense','lane-defense','block-td'].includes(genre);
    $('stage-laps').disabled=!(three&&genre==='racing');
    $('stage-theme').disabled=!three;
    const missionAvailable=GameForgeCampaign.combatMission(spec)&&GameForgeCampaign.hasMissionRuntime(state.files);
    $('stage-mission').disabled=!missionAvailable;
    $('stage-seconds').disabled=!missionAvailable||o.mission!=='survive';
    $('stage-hint').textContent='Fase '+(index+1)+'/'+spec.stages.length+' · '+(available?'Até '+available+' inimigos; 0 usa a quantidade automática.':'Quantidade de inimigos não editável neste motor.')+' Modos programados disponíveis: '+(missionAvailable?'eliminar, coletar e sobreviver.':'somente em jogos 3D de ação/FPS criados com runtime v0.14.')+' As alterações passam a valer após reiniciar a prévia.';
  }
  function stageEditorRender(){
    const spec=GameForgeCampaign.inspect(state.files);
    const control=$('stage-select'),ready=!!spec;
    control.disabled=!ready;$('stage-title').disabled=!ready;$('stage-objective').disabled=!ready;
    $('stage-save').disabled=!ready;$('stage-reset').disabled=!ready;
    if(!ready){control.replaceChildren(new Option('Primeiro gere um jogo',''));for(const id of stageFields)$(id).disabled=true;$('stage-hint').textContent='Disponível para jogos com GAME_SPEC gerado pelo motor local.';return;}
    stageEditorIndex=Math.max(0,Math.min(stageEditorIndex,spec.stages.length-1));
    control.replaceChildren(...spec.stages.map((s,i)=>new Option((i+1)+' · '+s,i)));
    control.value=String(stageEditorIndex);stageEditorRead();
  }
  function stageEditorSave(reset=false){
    if(qaState.candidate){feedback('Aceite ou descarte a correção candidata antes de alterar uma fase.',true);return;}
    try{
      const old=GameForgeCampaign.inspect(state.files);if(!old)throw Error('Este jogo não possui configuração de campanha editável.');
      const input=reset?{name:old.stages[stageEditorIndex],enemies:0,boss:'auto',waves:0,laps:0,theme:'auto',mission:'default',seconds:45,objective:''}:
        {name:$('stage-title').value,enemies:$('stage-enemies').value,boss:$('stage-boss').value,
         waves:$('stage-waves').value,laps:$('stage-laps').value,theme:$('stage-theme').value,mission:$('stage-mission').value,seconds:$('stage-seconds').value,objective:$('stage-objective').value};
      const updated=GameForgeCampaign.edit(state.files,stageEditorIndex,input);
      if(!updated.changed){feedback('Esta fase já possui essas configurações.');return;}
      pushHistory('Editar fase '+(stageEditorIndex+1)+' — '+old.stages[stageEditorIndex]);
      state.files=updated.files;state.spec=updated.spec;qaState.last=null;qaState.baseline=null;qaState.vision=null;
      $('qa-report').textContent='Configuração de fase modificada. Execute novo QA e teste a missão.';
      roadmapTasks=roadmapTasks.map(t=>t.status==='validada'?t:{...t,status:t.status==='aguardando revisão'?'em andamento':t.status});
      roadmapSaveFiles();listFiles();selectFile('game.js');runPreview();qaButtons();saveState();
      feedback('Fase '+(stageEditorIndex+1)+' salva no game.js. Use Desfazer para voltar; jogue e execute QA para validar.');
      log('[Campanha] '+updated.spec.stages[stageEditorIndex]+' — parâmetros atualizados.');
    }catch(e){feedback('Não foi possível editar a fase: '+e.message,true);}
  }
  $('stage-select').addEventListener('change',()=>{stageEditorIndex=Number($('stage-select').value)||0;stageEditorRead();});
  $('stage-mission').addEventListener('change',()=>{$('stage-seconds').disabled=$('stage-mission').disabled||$('stage-mission').value!=='survive';});
  $('stage-save').addEventListener('click',()=>stageEditorSave(false));
  $('stage-reset').addEventListener('click',()=>stageEditorSave(true));
  function ensureEvidenceFresh(){
    if(!state.files['game.js'])return;
    let current=null;
    try{current=JSON.parse(state.files['MATRIZ_REQUISITOS_GF14.json']||'null');}catch{}
    const revision=GameForgeRequirementEvidence.fingerprint(state.files);
    const requestRev=GameForgeRequirementEvidence.requestFingerprint({
      instruction:$('instruction').value,gdd:$('gdd').value,spec:state.spec
    });
    const hadAdvanced=!!state.files['RESULTADOS_AVANCADOS_GF16.json'];
    const advanced=advancedSuiteForCurrent();
    const hadRestore=!!state.files['RESULTADOS_RESTAURACAO_GF17.json'];
    const restored=saveResumeSuiteForCurrent();
    if(!current||current.projectFingerprint!==revision||current.requestFingerprint!==requestRev||
       (hadAdvanced&&!advanced)||(hadRestore&&!restored))refreshEvidence();
  }
  function projectSnapshot(){
    ensureEvidenceFresh();
    roadmapSync();
    return {gdd:$('gdd').value,name:$('project-name').value,instruction:$('instruction').value,assetProjectId,files:state.files,selected:state.selected,pinnedReferences,history:devHistory.slice(-4),deepPlan:$('deep-plan').checked,creationOptions:creationOptions(),rpgLayoutJson:$('rpg-layout-json').value,scene3dJson:$('scene3d-json').value,roadmapRecords:roadmapTasks.map(({id,status,notes,revision})=>({id,status,notes,revision})),selectedTaskId};
  }
  function storageMessage(result){
    $('project-storage-status').textContent=result.message;
    $('project-storage-status').classList.toggle('storage-warning',!result.ok);
    $('storage-tag').textContent=result.ok?'Salvo no navegador':'Baixe um backup';
  }
  function saveState(){
    clearTimeout(saveTimer);
    if(qaState.candidate)return;
    if(unrestoredProject)return;
    try{
      const snapshot={...projectSnapshot(),model:$('model').value,apiUrl:$('api-url').value,liveSources:$('repo-live-sources').checked};
      storageMessage(GameForgeProject.save(localStorage,'gameforge-studio-v03',snapshot));
    }catch{storageMessage({ok:false,message:'Não salvo no navegador. Baixe um backup para preservar o projeto.'});}
  }
  function scheduleSave(){unrestoredProject=false;clearTimeout(saveTimer);saveTimer=setTimeout(saveState,600);}
  function loadProject(snap){
    // Restauração de projetos sem GDD: GAME_SPEC é suficiente e evita o
    // parser disparado inadvertidamente com string vazia.
    const storedSpec=GameForgeProject.activeSpec(snap.files,null);
    const sourceText=snap.gdd?.trim()?snap.gdd:(snap.instruction?.trim()?GameForgeIntent.briefFromCommand(snap.instruction):'# Novo Jogo');
    const baseSpec=storedSpec||GameForgeParser.parseGdd(sourceText,'',{
      genre:snap.creationOptions?.genre||'auto',dimension:snap.creationOptions?.dimension||'auto'
    });
    unrestoredProject=false;
    clearTimeout(saveTimer);
    $('gdd').value=snap.gdd;$('project-name').value=snap.name;$('instruction').value=snap.instruction;
    $('rpg-layout-json').value=typeof snap.rpgLayoutJson==='string'?snap.rpgLayoutJson:'';
    $('scene3d-json').value=typeof snap.scene3dJson==='string'?snap.scene3dJson:'';
    pinnedReferences=snap.pinnedReferences.filter(x=>repoKnowledge.entries.some(r=>r.id===x));
    devHistory.length=0;devHistory.push(...snap.history);
    $('deep-plan').checked=snap.deepPlan;
    previewAssetSequence++;
    assetProjectId=snap.assetProjectId||GameForgeAssetLibrary.newId();
    state.files=snap.files;state.selected=null;preparedTaskId=null;lastPlan=null;state.generation++;
    restoreSceneAssetControls();
    state.spec=baseSpec;
    restoreCreationOptions(snap.creationOptions||{dimension:state.spec.dimension,genre:state.spec.genre,...state.spec.worldOptions});
    roadmapTasks=GameForgeRoadmap.build(snap.gdd,snap.roadmapRecords);roadmapSource=snap.gdd;roadmapCount=60;
    selectedTaskId=roadmapTasks.some(t=>t.id===snap.selectedTaskId)?snap.selectedTaskId:null;
    $('roadmap-search').value='';$('roadmap-filter').value='all';
    qaState.last=null;qaState.baseline=null;qaState.vision=null;qaState.candidate=null;qaState.baseCode=null;
    for(const id of ['qa-before','qa-after','qa-shot'])$(id).removeAttribute('src');
    $('qa-report').textContent='Nenhuma inspeção realizada.';$('qa-candidate').classList.add('hidden');
    $('development-plan').textContent='Projeto restaurado. Planeje a próxima melhoria.';
    $('file-editor').value='';$('file-editor').disabled=true;$('apply-edit').disabled=true;$('editor-label').textContent='Editor de código';
    $('preview').removeAttribute('srcdoc');$('preview-empty').classList.remove('hide');$('live-indicator').classList.remove('active');
    $('file-indicator').textContent='GDD completo restaurado · '+new Blob([snap.gdd]).size+' bytes';
    roadmapSaveFiles();listFiles();renderHistory();roadmapRender();renderReferences();qaButtons();analyze();
    if(state.files['game.js']){selectFile(state.files[snap.selected]?snap.selected:'game.js');runPreview();}
    else status('Projeto restaurado — pronto para criar');
    qaStatus('Projeto restaurado. Execute novo QA antes de validar tarefas.');
  }
  function restoreState(){
    try{
      const raw=localStorage.getItem('gameforge-studio-v03'); if(!raw)return;
      const snap=JSON.parse(raw);const project=GameForgeProject.restoreStored(raw);
      if(typeof snap.model==='string')$('model').value=snap.model;
      if(typeof snap.apiUrl==='string')$('api-url').value=snap.apiUrl;
      if(typeof snap.liveSources==='boolean')$('repo-live-sources').checked=snap.liveSources;
      loadProject(project);storageMessage({ok:true,message:'Último projeto restaurado deste navegador.'});
    }catch{unrestoredProject=true;storageMessage({ok:false,message:'Não foi possível restaurar o projeto salvo. Abra um backup; o registro anterior foi preservado.'});}
  }
  function listFiles(){
    const keys=Object.keys(state.files).filter(k=>allowed.includes(k)&&!k.endsWith('.b64')&&k!=='ASSET_LIBRARY.json');
    $('file-list').innerHTML=keys.length?'':'<div class="muted tiny">Nenhum arquivo gerado.</div>';
    for(const k of keys){
      const btn=document.createElement('button');btn.type='button';btn.className='file-item'+(state.selected===k?' active':'');
      const ico=k.endsWith('.js')?'JS':k.endsWith('.md')?'MD':k.endsWith('.css')?'CSS':'HTML';
      btn.innerHTML=`<span style="color:#82d7c3">${ico}</span><span>${esc(k)}</span><span class="size">${(new Blob([state.files[k]]).size/1024).toFixed(1)} KB</span>`;
      btn.addEventListener('click',()=>selectFile(k));$('file-list').appendChild(btn);
    }
    const ready=keys.length>0;
    stageEditorRender();
    if(roadmapTasks.length)roadmapRender();
    $('improve').disabled=!Boolean(state.files['game.js']);$('undo-improvement').disabled=devHistory.length===0;
    $('export').disabled=!ready;$('export-top').disabled=!ready;$('html-export').disabled=!ready;$('rerun').disabled=!ready;$('open-game').disabled=!ready;
  }
  function selectFile(name){
    if(!state.files[name])return;
    state.selected=name;$('file-editor').value=state.files[name];$('file-editor').disabled=false;$('apply-edit').disabled=false;
    $('editor-label').textContent=name;
    document.querySelectorAll('.file-item').forEach(b=>b.classList.toggle('active',b.textContent.includes(name)));
  }
  function applyEdit(){
    if(!state.selected)return;
    const src=$('file-editor').value;
    if(src.length>2000000){feedback('Arquivo muito grande para edição no navegador.',true);return;}
    state.files[state.selected]=src;
    if(['game.js','style.css','index.html'].includes(state.selected)){
      qaState.last=null;qaState.baseline=null;
      refreshEvidence();
    }
    listFiles();selectFile(state.selected);if(!qaState.candidate)saveState();
    if(['game.js','style.css','index.html'].includes(state.selected))runPreview();
    feedback('Alteração aplicada ao arquivo '+state.selected+'.');
  }
  function currentAssetManifest(){
    return GameForgeAssetLibrary.parse(state.files['ASSET_LIBRARY.json']);
  }
  function runPreview(){
    if(!state.files['game.js']||!state.files['style.css'])return Promise.resolve();
    const stamp=++previewAssetSequence,project=assetProjectId,manifest=currentAssetManifest();
    const render=files=>{
      if(stamp!==previewAssetSequence)return;
      const spec=state.spec||GameForgeParser.parseGdd($('gdd').value);
      const doc=GameForgeGenerator.shell(spec.title,files['style.css'],files['game.js'],true,files);
      $('preview').srcdoc=doc;
      $('qa-run').disabled=false;
      $('live-indicator').classList.add('active');status('Prévia carregada');
    };
    if(!manifest.assets.length){
      $('preview-empty').classList.add('hide');
      try{render(state.files);return Promise.resolve(true);}
      catch(err){feedback('Prévia indisponível: '+err.message,true);return Promise.resolve(false);}
    }
    $('preview-empty').classList.add('hide');$('qa-run').disabled=true;status('Lendo modelos do projeto...');
    return GameForgeAssetLibrary.materialize(project,manifest).then(binary=>{
      if(stamp!==previewAssetSequence)return;
      render({...state.files,...binary});
      return true;
    }).catch(err=>{
      if(stamp!==previewAssetSequence)return;
      $('qa-run').disabled=true;$('live-indicator').classList.remove('active');
      status('Modelo GLB indisponível',true);
      feedback('Prévia não carregada: '+err.message,true);
      return false;
    });
  }
  function fileBlob(blob,filename){
    const url=URL.createObjectURL(blob);const a=document.createElement('a');
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),15000);
  }
  function screenshotBytes(dataUrl){
    if(typeof dataUrl!=='string'||!dataUrl.startsWith('data:image/png;base64,'))throw Error('Screenshot inválida');
    const raw=atob(dataUrl.split(',')[1]);
    if(raw.length>1_500_000)throw Error('Captura muito grande para o ZIP');
    return Uint8Array.from(raw,ch=>ch.charCodeAt(0));
  }
  async function assetBinaryFiles(){
    return GameForgeAssetLibrary.materialize(assetProjectId,currentAssetManifest());
  }
  async function getExportFiles(){
    ensureEvidenceFresh();
    roadmapSaveFiles();
    const files={...state.files,...await assetBinaryFiles()};
    files['PROJETO.gameforge.json']=GameForgeProject.encode(projectSnapshot());
    if(files['ASSET_CENARIO.b64'])files['assets/cenario.glb']=Uint8Array.from(atob(files['ASSET_CENARIO.b64']),c=>c.charCodeAt(0));
    if(qaState.last){
      files['QA_inicio.png']=screenshotBytes(qaState.last.before.image);
      files['QA_movimento.png']=screenshotBytes(qaState.last.after.image);
      if(qaState.last.shot?.image)files['QA_disparo.png']=screenshotBytes(qaState.last.shot.image);
    }
    if(qaState.baseline)files['QA_referencia.png']=screenshotBytes(qaState.baseline.after.image);
    if(state.spec)files['index.html']=GameForgeGenerator.shell(state.spec.title,files['style.css'],files['game.js'],false,files);
    return files;
  }
  async function downloadZip(){
    if(!state.files['game.js'])return;
    if(qaState.candidate){feedback('Aceite ou descarte a correção antes de exportar.',true);return;}
    try{
      status('Preparando ZIP com modelos...');
      const blob=GameForgeZip.zipFiles(await getExportFiles());
      fileBlob(blob,projectName().replace(/\\s+/g,'-')+'-gameforge.zip');
      feedback('ZIP exportado, com modelos GLB originais, código, HTML jogável e backup.');
    }catch(e){feedback('Erro ao empacotar: '+e.message,true);}
    finally{status('Pronto');}
  }
  async function downloadHtml(){
    if(!state.files['game.js'])return;
    if(qaState.candidate){feedback('Aceite ou descarte a correção antes de exportar.',true);return;}
    try{
      const spec=state.spec||GameForgeParser.parseGdd($('gdd').value);
      const files={...state.files,...await assetBinaryFiles()};
      const html=GameForgeGenerator.shell(spec.title,files['style.css'],files['game.js'],true,files);
      fileBlob(new Blob([html],{type:'text/html;charset=utf-8'}),projectName().replace(/\\s+/g,'-')+'.html');
      feedback('HTML autônomo gerado, incluindo modelos GLB. Para guardar fontes e modelos separados, prefira ZIP.');
    }catch(e){feedback('HTML não exportado: '+e.message,true);}
  }
  async function projectOperation(action){
    if(projectOperations){feedback('Aguarde a operação atual antes de continuar.',true);return;}
    projectOperations++;
    try{return await action();}finally{projectOperations--;}
  }
  function projectAvailable(){
    if(projectOperations||qaState.candidate||stagedImprovement){feedback('Conclua o teste ou descarte a proposta pendente antes de abrir ou baixar um backup.',true);return false;}
    return true;
  }
  async function downloadProject(){
    if(!projectAvailable())return;
    projectOperations++;
    try{
      const encoded=GameForgeProject.encode(projectSnapshot());
      const assets=currentAssetManifest();
      if(assets.assets.length){
        const binary=await assetBinaryFiles();
        const zip=GameForgeZip.zipFiles({'PROJETO.gameforge.json':encoded,...binary});
        fileBlob(zip,projectName().replace(/\\s+/g,'-')+'.gameforge.zip');
        feedback('Backup ZIP completo salvo, com os modelos GLB originais. Reabra o ZIP em outro computador.');
      }else{
        fileBlob(new Blob([encoded],{type:'application/json'}),projectName().replace(/\\s+/g,'-')+'.gameforge.json');
        feedback('Backup JSON salvo. Use Abrir backup para continuar seu projeto.');
      }
    }catch(e){feedback('Backup não gerado: '+e.message,true);}
    finally{projectOperations--;}
  }
  $('project-backup').addEventListener('click',downloadProject);
  $('project-open').addEventListener('click',()=>{if(projectAvailable())$('project-file').click();});
  $('project-file').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{
      if(!projectAvailable())return;
      let project,assetFiles=null;
      if(file.name.toLowerCase().endsWith('.zip')){
        if(file.size>190_000_000)throw Error('ZIP acima de 190 MB.');
        const entries=GameForgeZip.unzipFiles(new Uint8Array(await file.arrayBuffer()));
        const meta=entries['PROJETO.gameforge.json'];
        if(!meta)throw Error('ZIP sem PROJETO.gameforge.json. Escolha um ZIP exportado pelo GameForge.');
        project=GameForgeProject.decode(new TextDecoder('utf-8',{fatal:true}).decode(meta));
        const manifest=GameForgeAssetLibrary.parse(project.files['ASSET_LIBRARY.json']);
        assetFiles={};
        for(const a of manifest.assets){
          const key='assets/'+a.id+'.glb',binary=entries[key];
          if(!binary||binary.length!==a.bytes)throw Error('ZIP não contém o modelo original '+a.name+'.');
          assetFiles[a.id]=await GameForgeAssetLibrary.verify(binary,a.sha256);
        }
      }else{
        if(file.size>20_000_000)throw Error('Backup JSON acima de 20 MB.');
        project=GameForgeProject.decode(await file.text());
        if(GameForgeAssetLibrary.parse(project.files['ASSET_LIBRARY.json']).assets.length)
          throw Error('Backup JSON contém referências de GLB, mas não os arquivos. Use o backup .gameforge.zip.');
      }
      if(!projectAvailable())return;
      pendingProject={project,assetFiles};
      $('project-restore-summary').textContent=`${project.name||'Sem nome'} · ${Object.keys(project.files).length} arquivos · ${new Blob([project.gdd]).size.toLocaleString('pt-BR')} bytes de GDD · ${GameForgeAssetLibrary.parse(project.files['ASSET_LIBRARY.json']).assets.length} assets GLB · ${project.history.length} versões para desfazer.`;
      $('project-restore-dialog').showModal();
    }catch(e){pendingProject=null;feedback('O projeto atual foi preservado. '+e.message,true);}
    finally{event.target.value='';}
  });
  $('project-restore-cancel').addEventListener('click',()=>{$('project-restore-dialog').close();});
  $('project-restore-dialog').addEventListener('close',()=>{pendingProject=null;});
  $('project-restore-confirm').addEventListener('click',async()=>{
    if(!pendingProject||!projectAvailable())return;
    const candidate=pendingProject;projectOperations++;
    const stored=[];
    let nextId=null;
    try{
      let project=candidate.project;
      if(candidate.assetFiles&&Object.keys(candidate.assetFiles).length){
        nextId=GameForgeAssetLibrary.newId();
        const manifest=GameForgeAssetLibrary.parse(project.files['ASSET_LIBRARY.json']);
        for(const a of manifest.assets){
          await GameForgeAssetLibrary.put(nextId,a.id,candidate.assetFiles[a.id]);
          stored.push(a.id);
        }
        project={...project,assetProjectId:nextId};
      }
      pendingProject=null;loadProject(project);$('project-restore-dialog').close();saveState();
      feedback('Projeto restaurado com código, histórico e modelos GLB. Confirme na prévia.');
    }catch(e){
      if(nextId)for(const id of stored)try{await GameForgeAssetLibrary.erase(nextId,id);}catch{}
      pendingProject=null;
      $('project-restore-dialog').close();
      feedback('Restauração cancelada; projeto anterior preservado. '+e.message,true);
    }finally{projectOperations--;}
  });
  async function generate(){
    if(stagedImprovement){feedback('Descarte a proposta pendente antes de gerar outro jogo.',true);return;}
    if(qaState.candidate){feedback('Aceite ou descarte a correção candidata antes de gerar outro jogo.',true);return;}
    const spec=analyze();if(!spec)return;
    if(spec.designIR?.blocked?.length){
      feedback('Não é possível criar este jogo sem violar o pedido: '+spec.designIR.blocked.map(x=>x.label).join(', ')+'. Escolha um motor compatível ou ajuste a ideia.',true);
      return;
    }
    if(spec.engineAvailability?.status==='planned'){
      feedback('Este motor ainda não foi implementado; baixe o contrato urbano.',true);
      return;
    }
    const mode=state.mode;
    const retainedAsset=spec.dimension==='3d'?Object.fromEntries(['ASSET_CENARIO.b64','ASSET_CENARIO.json','ASSET_LIBRARY.json'].filter(k=>state.files[k]).map(k=>[k,state.files[k]])):{};
    $('generate').disabled=true;
    status('Gerando...');$('log').textContent=`[Studio] Interpretando GDD de ${spec.sourceLength} caracteres...`;
    try{
      if(mode==='offline'){
        lastPlan=GameForgeDevelopment.plan($('instruction').value,spec,{});
        state.files=GameForgeGenerator.generate(spec,$('gdd').value);
        if(typeof GameForgeStudioOrchestrator!=='undefined'){
          const plan=GameForgeStudioOrchestrator.plan({instruction:$('instruction').value,spec,files:state.files});
          state.files['PLANO_AGENTES_STUDIO.md']=GameForgeStudioOrchestrator.report(plan);
        }
        if(rootGameForgeStudio()){
          const studio=GameForgeStudioIntelligence.review({instruction:$('instruction').value,spec,files:state.files,changedFiles:['game.js']});
          state.files['BRIEF_E_CHECKLIST_STUDIO.md']=GameForgeStudioIntelligence.report(studio);
          state.files['MAPA_DEPENDENCIAS.json']=JSON.stringify(studio.graph,null,2);
        }
        state.files['RELATORIO_LEITURA_GDD.md']=$('gdd').value.trim()?readingReport($('gdd').value,spec):'# Criação por comando direto\\n\\nNenhum GDD foi fornecido. O código foi gerado a partir da instrução em COMANDO_ORIGINAL.md.\\n';
        state.files['PLANO_INTERPRETACAO.md']=GameForgeIntent.report(spec);
        if($('instruction').value.trim())state.files['COMANDO_ORIGINAL.md']='# Comando original\\n\\n'+$('instruction').value;
        $('development-plan').textContent=GameForgeIntent.report(spec);
        state.files['RELATORIO_REFERENCIAS.md']=repoKnowledge.report(references())+'\nModo sem IA: estas recomendações não foram automaticamente aplicadas ao motor do jogo.\n';
        refreshEvidence();
        log(`[Sem IA] Tipo ${spec.genre}, ${spec.stages.length} fase(s), código gerado no navegador.`);
        log('[Sem IA] '+spec.implementation.applied.length+' instruções transformadas em configurações do jogo; '+spec.implementation.pending.length+' pendências.');
        feedback('Jogo gerado: '+spec.implementation.applied.length+' configurações aplicadas, '+spec.implementation.pending.length+' requisito(s) ainda não implementado(s). Confira a prévia.');
      }else{
        if(spec.dimension==='3d')throw Error('Para criar um jogo 3D com o motor local, selecione Sem IA. O backend atual gera os modelos 2D; o painel 3D do backend continua separado.');
        const server=$('api-url').value.trim() || (!/github\.io$/i.test(location.hostname) && /^https?:$/.test(location.protocol)?location.origin:'');
        if(!server)throw new Error('Informe uma API HTTPS em “Servidor de IA”. O GitHub Pages não executa o backend.');
        if(!/^https?:\/\//.test(server))throw new Error('URL inválida do servidor (http:// ou https://).');
        if(location.protocol==='https:'&&server.startsWith('http://')&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(server))throw new Error('Use HTTPS para conectar um site HTTPS à API.');
        const payload={model:$('model').value.trim(),gdd:$('gdd').value.trim()||GameForgeIntent.briefFromCommand($('instruction').value),instruction:GameForgeParser.creationInstruction(spec,$('instruction').value),current_files:{},reference_ids:references().map(x=>x.id),read_sources:$('repo-live-sources').checked,deep_plan:$('deep-plan').checked,mode:'create'};
        log('[Com IA] Solicitando código ao servidor: '+server);
        if(new Blob([$('gdd').value]).size>35000)log('[GDD extenso] O backend vai ler todas as partes com IA antes de planejar. Isso pode exigir várias chamadas e gerar custos da API.');
        const headers={'Content-Type':'application/json'};if($('api-token').value)headers['X-GameForge-Token']=$('api-token').value;
        const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),900000);
        let res;
        try{res=await fetch(server.replace(/\/$/,'')+'/api/studio/develop',{method:'POST',headers,body:JSON.stringify(payload),signal:ctrl.signal});}
        finally{clearTimeout(timeout);}
        const data=await res.json().catch(()=>({detail:`Erro HTTP ${res.status}`}));
        if(!res.ok)throw new Error(typeof data.detail==='string'?data.detail:JSON.stringify(data.detail||data).slice(0,300));
        if(!data.files||!data.files['game.js']||!data.files['style.css'])throw new Error('Resposta da IA incompleta: game.js e style.css são obrigatórios.');
        state.files={...GameForgeGenerator.generate(spec,$('gdd').value),...data.files};
        state.files['PLANO_INTERPRETACAO.md']=GameForgeIntent.report(spec);
        if($('instruction').value.trim())state.files['COMANDO_ORIGINAL.md']='# Comando original\\n\\n'+$('instruction').value;
        state.files['RELATORIO_LEITURA_GDD.md']=($('gdd').value.trim()?readingReport($('gdd').value,spec):'# Solicitação por comando direto\\n')+'\n## Leitura por IA\n\n'+JSON.stringify(data.gdd_coverage||{},null,2)+'\n';
        if(data.gdd_coverage)log('[GDD] '+data.gdd_coverage.chunks_processed+'/'+data.gdd_coverage.chunks_total+' partes processadas pela IA.');
        state.files['RELATORIO_REFERENCIAS.md']=repoKnowledge.report((data.references_used||[]).length?data.references_used:references())+'\nArquivos atuais lidos:\n'+((data.source_files_read||[]).map(x=>'- '+x).join('\n')||'- Nenhum (somente resumos curados)')+'\n\nReferências passadas como contexto ao modelo; aplicação concreta precisa de inspeção do código e testes.\n';
        state.files['RELATORIO_GERACAO.md']='# Relatório da IA\n\n'+(data.summary||'Código gerado com IA.')+'\n\n## Implementado\n'+(data.implemented||[]).map(x=>'- '+x).join('\n')+'\n\n## Pendências\n'+(data.pending||[]).map(x=>'- '+x).join('\n');
        $('development-plan').textContent=JSON.stringify(data.plan||{},null,2);
        state.files['PLANO_DESENVOLVIMENTO.md']=data.plan_report||'# Plano de desenvolvimento\n\nPlanejamento indisponível.';
        log('[Com IA] '+(data.summary||'Concluído.'));
        if(data.checks)log('[Verificação] '+data.checks);
        log('[Biblioteca] '+(data.references_used||[]).length+' referências selecionadas; '+(data.source_files_read||[]).length+' arquivo(s) atual(is) do GitHub consultado(s).');
        feedback('A IA devolveu o código. Teste o jogo na prévia antes de publicar.');
      }
      Object.assign(state.files,retainedAsset);
      unrestoredProject=false;devHistory.length=0;renderHistory();
      roadmapSaveFiles();
      state.generation++;state.spec=spec;
      qaState.last=null;qaState.baseline=null;qaState.vision=null;
      $('qa-before').removeAttribute('src');$('qa-after').removeAttribute('src');$('qa-shot').removeAttribute('src');
      $('qa-report').textContent='Nenhuma inspeção realizada.'; qaButtons();
      listFiles();selectFile('game.js');runPreview();roadmapRender();saveState();
      // No celular, conduzir o usuário ao jogo gerado sem alterar o fluxo desktop.
      if(typeof window.matchMedia==='function'&&window.matchMedia('(max-width: 780px)').matches){
        const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        $('preview-step').scrollIntoView({block:'start',behavior:reducedMotion?'auto':'smooth'});
      }
    }catch(e){
      const message=e.name==='AbortError'?'A solicitação excedeu o tempo limite.':e.message;
      log('[Erro] '+message);feedback(message,true);status('Erro ao gerar',true);
    }finally{$('generate').disabled=false;}
  }
  /* v0.9 — melhorias sucessivas, com plano, histórico e testes. */
  function renderHistory(){
    $('dev-history').textContent=devHistory.length ? `Histórico: ${devHistory.length} alteração(ões) reversíveis. Última: ${devHistory[devHistory.length-1].instruction}` : 'Histórico de melhorias vazio.';
    $('undo-improvement').disabled=devHistory.length===0;
  }
  function pushHistory(instruction){
    devHistory.push({instruction:String(instruction||'').slice(0,160),files:{...state.files},taskRecords:roadmapTasks.map(({id,status,notes,revision})=>({id,status,notes,revision})),gdd:$('gdd').value,at:new Date().toISOString()});
    if(devHistory.length>4)devHistory.shift();renderHistory();
  }
  function undoImprovement(){
    if(stagedImprovement){feedback('Descarte a proposta pendente antes de desfazer.',true);return;}
    if(qaState.candidate){feedback('Resolva a correção candidata antes de desfazer uma melhoria.',true);return;}
    const previous=devHistory.pop();if(!previous)return;
    state.files=previous.files;
    if(previous.taskRecords)roadmapTasks=GameForgeRoadmap.build($('gdd').value,previous.taskRecords);
    roadmapRender();state.spec=GameForgeParser.parseGdd($('gdd').value);
    // O GDD original permanece; a configuração ativa é extraída novamente abaixo, quando disponível.
    const result=state.files['game.js']?.match(/const GAME_SPEC = (\{[^\n]*\});/);
    if(result){try{state.spec=JSON.parse(result[1]);}catch{}}
    qaState.last=null;qaState.baseline=null;
    listFiles();selectFile('game.js');runPreview();renderHistory();saveState();qaButtons();
    feedback('Melhoria desfeita. Arquivos anteriores restaurados.');
  }
  let stagedImprovement=null;
  function candidateReset(){
    stagedImprovement=null;
    $('dev-candidate').hidden=true;
    $('dev-candidate-summary').textContent='';
    $('dev-candidate-diff').textContent='';
    $('improve').disabled=!state.files['game.js'];
  }
  function rootGameForgeStudio(){return typeof GameForgeStudioIntelligence!=='undefined'&&!!GameForgeStudioIntelligence.review;}
  function displayPlan(p){
    const main=p.tasks?.length ? p.tasks.map((t,i)=>`${i+1}. ${t.title} — ${t.rationale||t.why}${t.possible===false?' (exige IA)':''}\n   Testes: ${(t.checks||[]).join('; ')}`).join('\n') +
      '\n\nPendências: '+(p.pending||[]).join('; ') : (p.pending||[]).join('\n')||'Nenhuma mudança reconhecida. Descreva o que deve mudar.';
    const studio=p.studio;
    const assessment=studio?'\n\n[Studio Intelligence] Dependências explícitas: '+studio.graph.edges.length+
      '; arquivos potencialmente impactados: '+(studio.impact.join(', ')||'não identificados')+
      '\nGate de qualidade: '+studio.gate.status+' — '+studio.gate.reason+
      '\nRestrições preservadas: '+(studio.brief.restrictions.join('; ')||'nenhuma identificada')+
      '\nAtenção: nenhum teste marcado como aprovado antes da execução.':'';
    const route=p.orchestration;
    const routing=route?'\n\n[GF-ARCH-13] Planejamento especializado (nenhum agente executado):\n'+
      route.agents.filter(a=>a.status==='PLANNED').map(a=>'• '+a.name+': '+(a.targetFiles.join(', ')||'revisão necessária')).join('\n')+
      '\nProtegidos: '+(route.protectedFiles.join(', ')||'nenhum arquivo explicitamente nomeado')+
      '\nDependentes: '+(route.impacted.join(', ')||'não identificados')+
      '\nQA: todos os gates pendentes. A proposta exigirá aprovação.':'';
    $('development-plan').textContent=main+assessment+routing;
  }
  function planImprovement(){
    if(!state.files['game.js']){feedback('Primeiro crie um jogo a partir do GDD.',true);return null;}
    const instruction=$('instruction').value.trim();
    if(!instruction){feedback('Escreva o que deseja mudar na caixa de instrução.',true);return null;}
    const p=GameForgeDevelopment.plan(instruction,state.spec,state.files);lastPlan=p;displayPlan(p);return p;
  }
  async function improveGame(){
    if(stagedImprovement){feedback('Revise ou descarte a proposta anterior primeiro.',true);return;}
    if(qaState.candidate){feedback('Aceite ou descarte a correção candidata primeiro.',true);return;}
    const planned=planImprovement();if(!planned)return;
    const instruction=$('instruction').value.trim();
    const activeTask=preparedTaskId&&instruction.startsWith('TAREFA DO GDD:')?selectedRoadmap():null;
    $('improve').disabled=true;status('Planejando melhoria...');
    let output=null;
    try{
      if(state.mode==='offline'){
        output=GameForgeDevelopment.modify(state.files,state.spec,planned);
        if(!output.changed){feedback('O modo sem IA não reconheceu uma alteração implementável. Use IA para esse pedido.',true);log('[Motor] Nenhum arquivo sobrescrito. '+output.pending.join('; '));return;}
      }else{
        const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),900000);
        const payload={model:$('model').value.trim(),gdd:$('gdd').value,instruction,
          current_files:{'game.js':state.files['game.js'],'style.css':state.files['style.css']},
          reference_ids:references().map(x=>x.id),read_sources:$('repo-live-sources').checked,
          deep_plan:$('deep-plan').checked,mode:'improve'};
        const headers={'Content-Type':'application/json'};if($('api-token').value)headers['X-GameForge-Token']=$('api-token').value;
        let res;try{res=await fetch(serverAddress()+'/api/studio/develop',{method:'POST',headers,body:JSON.stringify(payload),signal:ctrl.signal});}finally{clearTimeout(timeout);}
        const data=await res.json().catch(()=>({detail:`HTTP ${res.status}`}));
        if(!res.ok)throw Error(typeof data.detail==='string'?data.detail:'Falha no desenvolvimento');
        if(!data.files?.['game.js']||!data.files?.['style.css'])throw Error('A IA não devolveu arquivos completos.');
        if(data.files['game.js']===state.files['game.js']&&data.files['style.css']===state.files['style.css'])throw Error('A IA não modificou os arquivos.');
        displayPlan(data.plan||planned);lastPlan=data.plan||planned;
        output={changed:true,files:{...state.files,...data.files,'PLANO_DESENVOLVIMENTO.md':data.plan_report||''},applied:data.implemented||[],pending:data.pending||[]};
      }
      const proposedFiles={...output.files,
        'RELATORIO_EVOLUCAO.md':GameForgeDevelopment.report({...planned,
          pending:[...new Set([...(planned.pending||[]),...(output.pending||[])])]},output.applied)};
      const route=planned.orchestration||GameForgeStudioOrchestrator.plan({instruction,spec:state.spec,files:state.files});
      const candidate=GameForgeStudioOrchestrator.stage({currentFiles:state.files,proposedFiles,route});
      stagedImprovement={candidate,output,planned,instruction,activeTaskId:activeTask?.id||null};
      $('dev-candidate-summary').textContent='Arquivos alterados: '+candidate.filesTouched.join(', ')+
        '. Restrições preservadas no plano: '+(candidate.restricted.join('; ')||'nenhuma explícita')+
        '. Código ainda NÃO aplicado. Para rejeitar, escolha Descartar.';
      $('dev-candidate-diff').textContent=GameForgeStudioOrchestrator.preview(candidate,state.files);
      $('dev-candidate').hidden=false;
      $('improve').disabled=true;
      feedback('Proposta preparada. Confira a lista de arquivos e clique em Aprovar e testar ou Descartar.');
    }catch(e){feedback('Falha na melhoria: '+(e.name==='AbortError'?'API excedeu tempo limite':e.message),true);log('[Evolução] '+e.message);}
    finally{$('improve').disabled=!!stagedImprovement||!state.files['game.js'];status(state.files['game.js']?'Prévia disponível':'Pronto para criar');}
  }
  async function acceptStagedImprovement(){
    const pending=stagedImprovement;
    if(!pending){feedback('Nenhuma proposta aguardando aprovação.',true);return;}
    if($('instruction').value.trim()!==pending.instruction){
      feedback('A instrução mudou. Descarte a proposta e gere outra para evitar conflito.',true);return;
    }
    if(qaState.candidate){feedback('Resolva primeiro a correção candidata do QA.',true);return;}
    $('dev-candidate-accept').disabled=true;
    try{
      const files=GameForgeStudioOrchestrator.apply(state.files,pending.candidate,{approved:true});
      const before=qaState.last;
      pushHistory(pending.instruction);
      state.files=files;
      if(pending.output.spec)state.spec=pending.output.spec;
      refreshEvidence();
      const task=pending.activeTaskId&&preparedTaskId===pending.activeTaskId?selectedRoadmap():null;
      if(task&&task.id===pending.activeTaskId){
        roadmapTasks=GameForgeRoadmap.changeStatus(roadmapTasks,task.id,'em andamento','Código aprovado; aguardando QA e revisão manual.');
        roadmapSaveFiles();roadmapRender();
      }
      candidateReset();
      listFiles();selectFile('game.js');runPreview();saveState();
      log('[Evolução aprovada] '+pending.candidate.filesTouched.join(', '));
      feedback('Alterações aprovadas. Executando teste de regressão...');
      try{
        const report=await qaRun();
        if(before&&report.issues.length>before.issues.length){
          log('[Regressão] Alertas aumentaram: '+before.issues.length+' → '+report.issues.length+'. Arquivos restaurados.');
          undoImprovement();
          feedback('Possível regressão detectada; versão anterior restaurada.',true);
          return;
        }
        if(before)qaState.baseline=before;
        if(task&&task.id===preparedTaskId){
          roadmapTasks=GameForgeRoadmap.changeStatus(roadmapTasks,task.id,'aguardando revisão',
            'QA executado: '+report.issues.length+' alerta(s). Teste humano pendente.');
          roadmapSaveFiles();roadmapRender();
        }
        feedback('Proposta aplicada. QA executado: '+report.issues.length+' alerta(s). Revise o jogo manualmente.');
      }catch(e){log('[QA indisponível] '+e.message);feedback('Proposta aplicada, mas QA não concluiu. Use Desfazer caso necessário.',true);}
      renderHistory();roadmapRender();saveState();
    }catch(e){feedback('Proposta não aplicada: '+e.message,true);log('[Aprovação] '+e.message);}
    finally{$('dev-candidate-accept').disabled=false;}
  }
  function discardStagedImprovement(){
    if(!stagedImprovement)return;
    candidateReset();
    feedback('Proposta descartada. Nenhum arquivo do projeto foi alterado.');
  }

  async function create3dFromGdd(){
    const msg=$('create-3d-result');const btn=$('create-3d');
    const spec=analyze();if(!spec)return;
    btn.disabled=true;msg.textContent='Criando projeto 3D no backend...';
    try{
      const payload={name:projectName(),gdd:$('gdd').value,instruction:$('instruction').value.slice(0,10000)};
      const headers={'Content-Type':'application/json'};if($('api-token').value)headers['X-GameForge-Token']=$('api-token').value;
      const response=await fetch(serverAddress()+'/api/studio/3d/create',{method:'POST',headers,body:JSON.stringify(payload)});
      const data=await response.json().catch(()=>({detail:'Resposta inválida'}));
      if(!response.ok)throw Error(data.detail||'Falha ao criar o 3D');
      msg.textContent='Projeto '+data.slug+' criado no backend. '+(data.build?.success?'Compilado. ':'Execute Compilar no painel de engenharia. ')+(data.limitations||[]).join(' ');
      const link=document.createElement('a');link.textContent=data.build?.success?'Abrir jogo 3D':'Selecionar projeto no painel 06';
      link.href=data.build?.success?serverAddress()+data.build.preview:'#eng-project';link.rel='noopener';if(data.build?.success)link.target='_blank';
      msg.append(' ',link);
      document.getElementById('eng-refresh')?.click();
    }catch(e){msg.textContent='3D indisponível: '+e.message;}finally{btn.disabled=false;}
  }
  $('dev-candidate-accept').addEventListener('click',()=>projectOperation(acceptStagedImprovement));
  $('dev-candidate-discard').addEventListener('click',discardStagedImprovement);
  $('gf14-inspect').addEventListener('click',()=>{if(refreshEvidence()){listFiles();saveState();feedback('Mapa de código e matriz de requisitos atualizados sem marcar testes pendentes como aprovados.');}});
  $('gf15-run').addEventListener('click',()=>projectOperation(runTypedQa));
  $('gf16-run').addEventListener('click',()=>projectOperation(runAdvancedQa));
  $('gf17-run').addEventListener('click',()=>projectOperation(runSaveResumeQa));
  $('plan-improvement').addEventListener('click',planImprovement);
  $('improve').addEventListener('click',()=>projectOperation(improveGame));
  $('undo-improvement').addEventListener('click',undoImprovement);
  $('create-3d').addEventListener('click',create3dFromGdd);
  $('deep-plan').addEventListener('change',saveState);

  /* Laboratório de QA visual v0.4: executa jogo no iframe e testa regressões. */
  const qaState={last:null,baseline:null,vision:null,candidate:null,baseCode:null};
  let gf15Running=false, gf16Running=false, gf17Running=false;
  const qaStatus=message=>{$('qa-status').textContent=message;};

  function currentRequirementSource(){
    return {instruction:$('instruction').value,gdd:$('gdd').value,spec:state.spec};
  }
  function typedSuiteForCurrent(){
    let suite=null;
    try{suite=JSON.parse(state.files['RESULTADOS_TESTES_GF15.json']||'null');}catch{}
    if(!suite)return null;
    if(!GameForgeScenarioQA.validResult(suite,currentRequirementSource(),state.files)){
      delete state.files['RESULTADOS_TESTES_GF15.json'];
      delete state.files['RELATORIO_TESTES_GF15.md'];
      $('gf15-summary').textContent='Os requisitos ou o código mudaram. Evidências anteriores descartadas. Execute novamente.';
      return null;
    }
    return suite;
  }
  async function runTypedQa(){
    if(!state.files['game.js']||gf15Running)return;
    if(stagedImprovement||qaState.candidate){
      feedback('Conclua ou descarte a proposta de correção antes do teste direcionado.',true);
      return;
    }
    gf15Running=true;$('gf15-run').disabled=true;
    try{
      await waitPreview();
      const source=currentRequirementSource();
      const p=GameForgeScenarioQA.plan({...source,files:state.files});
      const suite=await GameForgeScenarioQA.execute({...source,files:state.files,plan:p,frame:$('preview'),
        onUpdate:msg=>{$('gf15-summary').textContent=msg;}});
      state.files['RESULTADOS_TESTES_GF15.json']=JSON.stringify(suite,null,2);
      state.files['RELATORIO_TESTES_GF15.md']=GameForgeScenarioQA.report(suite);
      refreshEvidence();
      $('gf15-summary').textContent='GF-ARCH-15: '+suite.results.length+' cenário(s) executado(s). '+
        suite.counts.pass+' observação(ões) positivas, '+suite.counts.fail+' falha(s), '+
        suite.counts.inconclusive+' inconclusivo(s), '+suite.counts.error+' erro(s) de execução.\n'+
        'PASS valida somente o cenário específico, não a mecânica completa. Os relatórios estão no projeto e no ZIP.';
      listFiles();saveState();
      feedback('Testes direcionados executados. Confira resultados e evidências por requisito.');
    }catch(err){
      $('gf15-summary').textContent='Não foi possível concluir os testes: '+String(err?.message||err);
      feedback('QA direcionado não concluído: '+String(err?.message||err),true);
    }finally{
      gf15Running=false;qaButtons();
    }
  }
  function advancedSuiteForCurrent(){
    let suite=null;
    try{suite=JSON.parse(state.files['RESULTADOS_AVANCADOS_GF16.json']||'null');}catch{}
    if(!suite)return null;
    if(!GameForgeAdvancedScenarioQA.valid(suite,currentRequirementSource(),state.files)){
      delete state.files['RESULTADOS_AVANCADOS_GF16.json'];
      delete state.files['RELATORIO_AVANCADO_GF16.md'];
      $('gf16-summary').textContent='Código ou requisitos alterados. Descartadas as observações GF16 anteriores; teste novamente.';
      return null;
    }
    return suite;
  }
  async function runAdvancedQa(){
    if(!state.files['game.js']||gf16Running||gf15Running)return;
    if(stagedImprovement||qaState.candidate){
      feedback('Revise ou descarte a proposta pendente antes de testar.',true);return;
    }
    gf16Running=true;qaButtons();
    try{
      const source=currentRequirementSource(),files={...state.files},spec=state.spec||GameForgeParser.parseGdd($('gdd').value);
      const p=GameForgeAdvancedScenarioQA.plan({...source,files});
      if(!p.scenarios.some(x=>x.selected)){
        $('gf16-summary').textContent='Nenhum teste avançado aplicável aos requisitos atuais. Descreva missões, inimigos, chefes ou salvamento.';
        return;
      }
      const exportFiles={...files,...await assetBinaryFiles()};
      const html=GameForgeGenerator.shell(spec.title,exportFiles['style.css'],exportFiles['game.js'],true,exportFiles);
      const result=await GameForgeAdvancedScenarioQA.run({...source,files,plan:p,html,onUpdate:message=>{
        $('gf16-summary').textContent=message;
      }});
      if(p.codeFingerprint!==GameForgeAdvancedScenarioQA.revision(state.files)||
         p.requestFingerprint!==GameForgeAdvancedScenarioQA.requestRevision(currentRequirementSource())){
        $('gf16-summary').textContent='O projeto mudou enquanto o QA era executado. Resultados descartados para evitar evidências obsoletas.';
        return;
      }
      state.files['RESULTADOS_AVANCADOS_GF16.json']=JSON.stringify(result,null,2);
      state.files['RELATORIO_AVANCADO_GF16.md']=GameForgeAdvancedScenarioQA.report(result);
      refreshEvidence();
      $('gf16-summary').textContent='GF-ARCH-16 — prévia descartável encerrada. '+result.results.length+
        ' cenário(s): '+result.counts.pass+' observação(ões) positivas, '+
        result.counts.inconclusive+' inconclusivo(s), '+result.counts.fail+' falha(s).\n'+
        'Sua prévia principal não recebeu comandos. PASS significa apenas o comportamento observado, nunca a mecânica completa.';
      listFiles();saveState();
      feedback('QA avançado concluído na cópia isolada. Consulte os relatórios no projeto.');
    }catch(err){
      $('gf16-summary').textContent='Teste avançado não concluído: '+String(err?.message||err);
      feedback('Erro no teste descartável: '+String(err?.message||err),true);
    }finally{
      gf16Running=false;qaButtons();
    }
  }
  function saveResumeSuiteForCurrent(){
    let suite=null;
    try{suite=JSON.parse(state.files['RESULTADOS_RESTAURACAO_GF17.json']||'null');}catch{}
    if(!suite)return null;
    if(!GameForgeSaveResumeQA.valid(suite,currentRequirementSource(),state.files)){
      delete state.files['RESULTADOS_RESTAURACAO_GF17.json'];
      delete state.files['RELATORIO_RESTAURACAO_GF17.md'];
      $('gf17-summary').textContent='Código, GDD ou assets alterados: o teste anterior perdeu validade.';
      return null;
    }
    return suite;
  }
  async function runSaveResumeQa(){
    if(!state.files['game.js']||gf15Running||gf16Running||gf17Running)return;
    if(stagedImprovement||qaState.candidate){
      feedback('Conclua a proposta pendente antes de testar salvamento.',true);return;
    }
    gf17Running=true;qaButtons();
    try{
      const source=currentRequirementSource(),files={...state.files};
      const plan=GameForgeSaveResumeQA.plan({...source,files});
      if(!plan.applicable){
        $('gf17-summary').textContent='GF17: este teste exige um jogo de simulação com salvamento ativado. Outros motores continuam sem teste automático de restauração completo.';
        return;
      }
      const assets={...files,...await assetBinaryFiles()};
      const spec=state.spec||GameForgeParser.parseGdd($('gdd').value);
      const html=GameForgeGenerator.shell(spec.title,assets['style.css'],assets['game.js'],true,assets);
      const suite=await GameForgeSaveResumeQA.run({...source,files,plan,html,
        onUpdate:msg=>{$('gf17-summary').textContent=msg;}});
      if(!GameForgeSaveResumeQA.valid(suite,currentRequirementSource(),state.files)){
        $('gf17-summary').textContent='O jogo mudou durante o QA. Resultado descartado.';
        return;
      }
      state.files['RESULTADOS_RESTAURACAO_GF17.json']=JSON.stringify(suite,null,2);
      state.files['RELATORIO_RESTAURACAO_GF17.md']=GameForgeSaveResumeQA.report(suite);
      refreshEvidence();
      $('gf17-summary').textContent='GF-ARCH-17 — '+suite.status+': '+suite.reason+
        '\nOs testes usaram dois clones; o armazenamento real e a partida aberta permaneceram intocados.'+
        '\nPASS significa restauração no armazenamento VIRTUAL, não garantia de salvamento em produção.';
      listFiles();saveState();
      feedback('GF17 concluído: '+suite.status+'. Confira o relatório de restauração.');
    }catch(err){
      $('gf17-summary').textContent='Teste de restauração não concluído: '+String(err?.message||err);
      feedback('GF17: '+String(err?.message||err),true);
    }finally{gf17Running=false;qaButtons();}
  }
  function refreshEvidence(qaReport=null){
    if(!state.files['game.js']){
      $('gf14-summary').textContent='Nenhum jogo foi gerado para análise.';
      return null;
    }
    const codeMap=GameForgeCodeProvenance.index(state.files);
    const matrix=GameForgeRequirementEvidence.extract({
      instruction:$('instruction').value,gdd:$('gdd').value,spec:state.spec,files:state.files
    });
    const general=GameForgeRequirementEvidence.evaluate(matrix,{files:state.files,qa:qaReport});
    const tested=GameForgeScenarioQA.attach(general,typedSuiteForCurrent(),currentRequirementSource(),state.files);
    const advanced=GameForgeAdvancedScenarioQA.attach(tested,advancedSuiteForCurrent(),currentRequirementSource(),state.files);
    const examined=GameForgeSaveResumeQA.attach(advanced,saveResumeSuiteForCurrent(),currentRequirementSource(),state.files);
    state.files['MAPA_CODIGO_GF14.json']=JSON.stringify(codeMap,null,2);
    state.files['MATRIZ_REQUISITOS_GF14.json']=JSON.stringify(examined,null,2);
    state.files['MANIFESTO_AGENTES_GF14.json']=JSON.stringify(GameForgeAgentHandoff.create({instruction:$('instruction').value,spec:state.spec,files:state.files}),null,2);
    state.files['RELATORIO_REQUISITOS_GF14.md']=GameForgeRequirementEvidence.report(examined)+
      '\n'+GameForgeCodeProvenance.report(codeMap);
    $('gf14-summary').textContent='GF-ARCH-14 — '+examined.summary.total+' requisito(s), '+
      examined.summary.observedPartial+' observação(ões) parciais, '+
      examined.summary.issues+' alerta(s), '+examined.summary.unsupported+' pendência(s).\n'+
      codeMap.definitions.length+' símbolo(s) localizados e '+codeMap.links.length+
      ' relação(ões) inferidas entre arquivos.\n'+
      (qaReport?'Resultados deste QA incorporados; nenhum requisito marcado como totalmente aprovado.':
       'Sem teste executado para esta avaliação. Clique em Testar comportamento para observar o jogo.')+
      '\nConfira os relatórios na lista de arquivos e no ZIP exportado.';
    return {codeMap,matrix:examined};
  }

  function qaButtons(){
    const ready=!!state.files['game.js'],has=!!qaState.last,ref=!!qaState.baseline,ai=state.mode==='ai';
    $('qa-run').disabled=!ready||gf15Running||gf16Running||gf17Running;
    $('gf15-run').disabled=!ready||gf15Running||gf16Running||gf17Running;
    $('gf16-run').disabled=!ready||gf15Running||gf16Running||gf17Running;
    $('gf17-run').disabled=!ready||gf15Running||gf16Running||gf17Running;
    $('qa-baseline').disabled=!has;
    $('qa-compare').disabled=!(has&&ref);
    $('qa-vision').disabled=!(has&&ai);
    $('qa-repair').disabled=!(has&&ai)||!!qaState.candidate;
  }
  function fmtReport(report){
    return [...report.issues.map(i=>'⚠ '+i.message),...report.passes.map(i=>'✓ '+i),...report.notes.map(i=>'ℹ '+i)].join('\n');
  }
  function qaReportMarkdown(report){
    return '# Inspeção automática v0.4\n\nData: '+report.at+'\nCenário: '+report.scenario+'\n\n'+
      '## Alertas\n'+(report.issues.map(i=>'- ['+i.severity+'] '+i.message).join('\n')||'- Nenhum alerta automático.')+
      '\n\n## Testes aprovados\n'+report.passes.map(x=>'- '+x).join('\n')+'\n\n## Limitações\n'+report.notes.map(x=>'- '+x).join('\n')+'\n';
  }
  async function waitPreview(){
    const frame=$('preview');
    if(!frame.contentWindow)throw Error('Prévia ainda não carregada.');
    const t=GameForgeVisualQA.transport(frame);
    try{
      for(let i=0;i<10;i++){
        try{await t.send('ping');return;}
        catch(e){if(i===9)throw e;await new Promise(r=>setTimeout(r,180));}
      }
    }finally{t.close();}
  }
  async function qaRun(){
    if(!state.files['game.js']||gf15Running||gf16Running||gf17Running)return;
    $('qa-run').disabled=true;qaStatus('Executando roteiro de testes...');
    try{
      $('preview-box').scrollIntoView({block:'center',inline:'nearest'});
      await waitPreview();
      const report=await GameForgeVisualQA.run($('preview'),state.spec?.genre||'unknown',qaStatus);
      qaState.last=report;qaState.vision=null;roadmapRender();
      $('qa-before').src=report.before.image;
      $('qa-after').src=report.after.image;
      if(report.shot?.image)$('qa-shot').src=report.shot.image;else $('qa-shot').removeAttribute('src');
      document.querySelector('#qa-before').nextElementSibling.textContent='Início do teste';
      document.querySelector('#qa-after').nextElementSibling.textContent='Após movimento';
      $('qa-report').textContent=fmtReport(report);
      state.files['RELATORIO_QA.md']=qaReportMarkdown(report);
      refreshEvidence(report);
      qaStatus('QA concluído: '+report.issues.length+' alerta(s). Capturas comparáveis pelo botão “Comparar”.');
      log('[QA] '+report.issues.length+' alertas, '+report.passes.length+' verificações aprovadas.');
      if(qaState.candidate){
        qaState.candidate.tested=true;$('qa-accept').disabled=false;
        $('qa-candidate-message').textContent='Candidata testada: '+report.issues.length+' alerta(s). Compare com a referência antes de aceitar.';
      }
      listFiles();if(!qaState.candidate)saveState();
      return report;
    }catch(e){qaStatus('Não foi possível inspecionar: '+e.message);log('[QA] '+e.message);throw e;}
    finally{qaButtons();}
  }
  async function qaCompare(){
    if(!qaState.baseline||!qaState.last)return;
    try{
      const diff=await GameForgeVisualQA.pixelDiff(qaState.baseline.after.image,qaState.last.after.image);
      const baselineIssues=qaState.baseline.issues.length,currentIssues=qaState.last.issues.length;
      const msg='Comparação: '+diff.changedPct+'% dos pixels mudaram; áreas escuras '+diff.blackPct+'%. Alertas: '+baselineIssues+' → '+currentIssues+'.';
      $('qa-before').src=qaState.baseline.after.image;
      $('qa-after').src=qaState.last.after.image;
      $('qa-before').nextElementSibling.textContent='Versão de referência';
      $('qa-after').nextElementSibling.textContent='Versão atual';
      state.files['RELATORIO_QA.md']=(state.files['RELATORIO_QA.md']||'')+'\n## Comparação entre versões\n'+msg+'\nMudanças de pixels não provam melhoria.\n';
      $('qa-report').textContent=msg+'\n'+fmtReport(qaState.last)+'\n\nA diferença visual não comprova melhora. Compare as imagens e a jogabilidade.';
      qaStatus(msg);
      if(!qaState.candidate)saveState();
      if(qaState.candidate)$('qa-candidate-message').textContent=msg+' Revise antes de aceitar.';
    }catch(e){qaStatus('Falha ao comparar: '+e.message);}
  }
  function qaBaseline(){
    if(!qaState.last)return;
    qaState.baseline=qaState.last;
    qaStatus('Referência guardada em memória para comparação nesta sessão.');qaButtons();
  }
  function serverAddress(){
    const server=$('api-url').value.trim()||(!/github\.io$/i.test(location.hostname)&&/^https?:$/.test(location.protocol)?location.origin:'');
    if(!/^https?:\/\//.test(server))throw Error('Configure o Servidor de IA em http(s) para continuar.');
    if(location.protocol==='https:'&&server.startsWith('http://')&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(server))throw Error('Use servidor HTTPS.');
    return server.replace(/\/$/,'');
  }
  async function qaApi(path,payload){
    const headers={'Content-Type':'application/json'};
    if($('api-token').value)headers['X-GameForge-Token']=$('api-token').value;
    const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),120000);
    try{
      const response=await fetch(serverAddress()+path,{method:'POST',headers,body:JSON.stringify(payload),signal:ctrl.signal});
      const body=await response.json().catch(()=>({detail:'Resposta inválida do servidor'}));
      if(!response.ok)throw Error(typeof body.detail==='string'?body.detail:'Erro HTTP '+response.status);
      return body;
    }finally{clearTimeout(timeout);}
  }
  async function qaVision(){
    if(!qaState.last||state.mode!=='ai')return;
    $('qa-vision').disabled=true;qaStatus('Enviando duas capturas à IA para revisão visual...');
    const q=qaState.last;
    try{
      const result=await qaApi('/api/studio/vision',{
        model:$('model').value.trim(),gdd:$('gdd').value.slice(0,12000),
        report:{issues:q.issues,passes:q.passes,notes:q.notes,scenario:q.scenario},
        before:q.before.image,after:q.after.image,
      });
      qaState.vision=result;
      const rows=(result.issues||[]).map(i=>'⚠ '+i.description+' — '+i.suggestion+' (confiança: '+i.confidence+')');
      $('qa-report').textContent=fmtReport(q)+'\n\nREVISÃO VISUAL POR IA\n'+(result.summary||'')+'\n'+rows.join('\n')+'\n'+(result.limits||[]).join('\n');
      state.files['RELATORIO_VISUAL_IA.md']='# Revisão visual com IA\n\n'+(result.summary||'')+'\n\n'+rows.map(x=>'- '+x).join('\n');
      listFiles();if(!qaState.candidate)saveState();qaStatus('Revisão visual concluída. A descrição da IA é hipótese, não teste definitivo.');
    }catch(e){qaStatus('Não foi possível analisar com IA: '+e.message);}
    finally{qaButtons();}
  }
  async function qaRepair(){
    if(!qaState.last||state.mode!=='ai'||qaState.candidate)return;
    $('qa-repair').disabled=true;
    qaStatus('IA gerando uma correção candidata a partir do relatório QA...');
    const report=qaState.last;
    const issues=report.issues.map(i=>'['+i.type+'] '+i.message).join('\n')||'Nenhum alerta detectado pelas regras automáticas.';
    const aiIssues=(qaState.vision?.issues||[]).map(i=>'['+i.category+' | '+i.confidence+'] '+i.description+'; possível ajuste: '+i.suggestion).join('\n');
    const instruction=[
      'Corrija incrementalmente defeitos reais indicados pelo diagnóstico de qualidade a seguir.',
      'Preserve gameplay, controles e todos os sistemas que já funcionam. Não considere alterações aleatórias de pixel como defeito.',
      'Verificações automáticas:\n'+issues,
      'Revisão multimodal (hipóteses, não fatos confirmados):\n'+aiIssues,
      'Notas de limitação:\n'+report.notes.join('\n'),
      'Pedido original do desenvolvedor:\n'+$('instruction').value,
    ].join('\n\n').slice(0,9800);
    try{
      const result=await qaApi('/api/studio/generate',{
        model:$('model').value.trim(),gdd:$('gdd').value,instruction,
        current_files:{'game.js':state.files['game.js'],'style.css':state.files['style.css']},reference_ids:references().map(x=>x.id),read_sources:$('repo-live-sources').checked
      });
      if(!result.files?.['game.js']||!result.files?.['style.css'])throw Error('A IA não devolveu código completo.');
      qaState.baseCode={'game.js':state.files['game.js'],'style.css':state.files['style.css']};
      qaState.candidate={files:result.files,summary:result.summary||'Correção proposta',tested:false};
      qaState.baseline=report;
      state.files['game.js']=result.files['game.js'];state.files['style.css']=result.files['style.css'];
      $('qa-candidate').classList.remove('hidden');$('qa-accept').disabled=true;
      $('qa-candidate-message').textContent=qaState.candidate.summary+' — execute o teste e compare antes de aceitar.';
      listFiles();selectFile('game.js');runPreview();
      qaStatus('Correção candidata carregada somente na prévia. Clique “Testar comportamento”.');
    }catch(e){qaStatus('Falha ao propor correção: '+e.message);}
    finally{qaButtons();}
  }
  function qaAccept(){
    if(!qaState.candidate||!qaState.candidate.tested){qaStatus('Execute o teste da correção candidata antes de aceitá-la.');return;}
    qaState.candidate=null;qaState.baseCode=null;
    $('qa-candidate').classList.add('hidden');saveState();qaButtons();
    qaStatus('Correção aceita no projeto. Exporte um ZIP para backup.');
  }
  function qaReject(){
    if(!qaState.candidate)return;
    Object.assign(state.files,qaState.baseCode);
    qaState.last=qaState.baseline;
    if(qaState.last){state.files['RELATORIO_QA.md']=qaReportMarkdown(qaState.last);$('qa-before').src=qaState.last.before.image;$('qa-after').src=qaState.last.after.image;}
    qaState.candidate=null;qaState.baseCode=null;qaState.vision=null;
    $('qa-candidate').classList.add('hidden');
    listFiles();selectFile('game.js');runPreview();saveState();qaButtons();
    qaStatus('Correção descartada. Código original restaurado.');
  }
  $('qa-run').addEventListener('click',()=>projectOperation(()=>qaRun().catch(()=>{})));
  $('qa-baseline').addEventListener('click',qaBaseline);
  $('qa-compare').addEventListener('click',qaCompare);
  $('qa-vision').addEventListener('click',()=>projectOperation(qaVision));
  $('qa-repair').addEventListener('click',()=>projectOperation(qaRepair));
  $('qa-accept').addEventListener('click',qaAccept);
  $('qa-reject').addEventListener('click',qaReject);
  /* V0.18: biblioteca local de ate 4 GLBs estaticos, ate 25 MB cada. */
  function glbReferencedInScene(assetId){
    const raw=$('scene3d-json').value.trim();
    if(raw&&GameForgeScene3DLayout.references(raw).includes(assetId))return true;
    const spec=GameForgeProject.activeSpec(state.files,null);
    return Array.isArray(spec?.stageConfig)&&spec.stageConfig.some(stage=>
      Array.isArray(stage?.sceneObjects)&&stage.sceneObjects.some(e=>e?.kind==='glb'&&e.assetId===assetId));
  }
  function assetPlacement(){
    const value=(id,min,max,def)=>{
      const n=Number($(id).value);
      return Number.isFinite(n)?Math.max(min,Math.min(max,n)):def;
    };
    return {x:value('scene-asset-x',-35,35,5),z:value('scene-asset-z',-35,35,5),scale:value('scene-asset-scale',.2,4,1)};
  }
  function restoreSceneAssetControls(preferred){
    let manifest;
    try{manifest=currentAssetManifest();}
    catch(err){$('scene-asset-status').textContent='Manifesto de GLB invalido: '+err.message;return;}
    const select=$('scene-asset-select'),previous=preferred||select.value,legacy=!!state.files['ASSET_CENARIO.b64'];
    const list=[new Option('Nenhum objeto','')];
    if(legacy)list.push(new Option('Objeto antigo (compatibilidade)','legacy'));
    for(const a of manifest.assets)list.push(new Option(a.name+' ('+(a.bytes/1048576).toFixed(1)+' MB)',a.id));
    select.replaceChildren(...list);
    select.value=list.some(o=>o.value===previous)?previous:(manifest.assets[0]?.id||(legacy?'legacy':''));
    const chosen=manifest.assets.find(a=>a.id===select.value);
    let placement={x:5,z:5,scale:1};
    if(chosen)placement=chosen.placement;
    else if(select.value==='legacy'){
      try{placement={...placement,...JSON.parse(state.files['ASSET_CENARIO.json']||'{}')};}catch{}
    }
    for(const key of ['x','z','scale'])$('scene-asset-'+key).value=placement[key];
    $('scene-asset-role').value=chosen?.role||'scene';
    const total=manifest.assets.reduce((n,a)=>n+a.bytes,0);
    $('scene-asset-list').textContent=manifest.assets.length+' de 4 modelos · '+(total/1048576).toFixed(1)+' de 50 MB' +(legacy?' · um GLB antigo adicional':'');
    $('scene-asset-status').textContent=manifest.assets.length||legacy?'Modelos disponíveis no projeto. Ajuste um objeto e execute a prévia.':'Nenhum modelo adicionado.';
  }
  $('scene-asset-select').addEventListener('change',()=>restoreSceneAssetControls($('scene-asset-select').value));
  $('scene-asset-file').addEventListener('change',async e=>{
    const input=e.target,files=Array.from(input.files||[]);
    if(!files.length)return;
    if(projectOperations||qaState.candidate){feedback('Conclua a operacao atual antes de importar novos arquivos.',true);input.value='';return;}
    projectOperations++;
    let imported=0,lastId='';
    const auditMessages=[];
    $('scene-asset-audit').textContent='Analisando arquivos GLB localmente...';
    try{
      if(!state.files['engine-3d.js'])throw Error('Gere primeiro um jogo 3D no modo Sem IA.');
      for(const file of files){
        if(!file.name.toLowerCase().endsWith('.glb'))throw Error('Somente arquivos .glb sao aceitos: '+file.name);
        if(file.size>GameForgeAssetLibrary.MAX_BYTES)throw Error('Arquivo acima de 25 MB: '+file.name);
        const current=currentAssetManifest();
        if(current.assets.length>=GameForgeAssetLibrary.MAX_ASSETS)throw Error('Limite de 4 objetos por projeto.');
        const size=current.assets.reduce((n,a)=>n+a.bytes,0)+file.size;
        if(size>GameForgeAssetLibrary.MAX_TOTAL)throw Error('Biblioteca acima de 50 MB.');
        const report=await GameForgeModelInspector.readFile(file);
        if(report.meshes<1)throw Error('GLB sem malhas: '+file.name);
        const data=GameForgeAssetLibrary.validateGLB(new Uint8Array(await file.arrayBuffer()));
        const readiness=GameForgeGLBReadiness.analyze(GameForgeModelInspector.readGlb(data.buffer),{bytes:data.length,role:$('scene-asset-role').value});
        auditMessages.push(file.name+'\n'+GameForgeGLBReadiness.format(readiness));
        if(readiness.blockers.length)throw Error('GLB incompatível: '+readiness.blockers.join(' '));
        GameForgeGLB.decode(null,data); // valida geometria, hierarquia e texturas antes de salvar
        const id=GameForgeAssetLibrary.newId();
        const item={id,name:file.name,bytes:data.length,sha256:await GameForgeAssetLibrary.sha256(data),role:$('scene-asset-role').value,placement:assetPlacement()};
        const next=GameForgeAssetLibrary.append(current,item);
        await GameForgeAssetLibrary.put(assetProjectId,id,data);
        state.files['ASSET_LIBRARY.json']=JSON.stringify(next);
        lastId=id;imported++;
      }
      qaState.last=null;qaState.baseline=null;
      restoreSceneAssetControls(lastId);listFiles();saveState();
      $('scene-asset-audit').textContent=auditMessages.join('\n\n');
      const previewOk=await runPreview();
      feedback(imported+' modelo(s) GLB salvo(s) na biblioteca. '+(previewOk?'A prévia foi preparada. ':'A prévia não carregou; revise os avisos. ')+'Exporte ZIP para backup completo.',!previewOk);
    }catch(err){
      restoreSceneAssetControls(lastId);listFiles();
      if(imported){saveState();await runPreview();}
      $('scene-asset-status').textContent='Importacao: '+imported+' concluido(s). '+err.message;
      $('scene-asset-audit').textContent=auditMessages.length?auditMessages.join('\n\n'):'Preflight nao concluido: '+err.message;
      feedback(err.message,true);
    }finally{projectOperations--;input.value='';}
  });
  for(const key of ['x','z','scale','role'])$('scene-asset-'+key).addEventListener('change',()=>{
    const id=$('scene-asset-select').value;
    if(!id)return;
    try{
      if(id==='legacy')state.files['ASSET_CENARIO.json']=JSON.stringify(assetPlacement());
      else {
        if($('scene-asset-role').value!=='scene'&&glbReferencedInScene(id))throw Error('Remova o GLB das fases do editor antes de trocar seu papel.');
        state.files['ASSET_LIBRARY.json']=JSON.stringify(GameForgeAssetLibrary.update(currentAssetManifest(),id,{...assetPlacement(),role:$('scene-asset-role').value}));
      }
      qaState.last=null;qaState.baseline=null;runPreview();saveState();
      $('scene-asset-status').textContent='Posicao/escala salvas no modelo selecionado.';
    }catch(err){restoreSceneAssetControls(id);feedback('Nao foi possivel alterar o modelo: '+err.message,true);}
  });
  $('scene-asset-remove').addEventListener('click',()=>projectOperation(async()=>{
    const id=$('scene-asset-select').value;if(!id)return;
    try{
      if(id==='legacy'){delete state.files['ASSET_CENARIO.b64'];delete state.files['ASSET_CENARIO.json'];}
      else{
        if(glbReferencedInScene(id))throw Error('Este GLB está em uma cena 3D. Remova suas instâncias no editor e aplique a cena antes de excluir o asset.');
        await GameForgeAssetLibrary.erase(assetProjectId,id);
        state.files['ASSET_LIBRARY.json']=JSON.stringify(GameForgeAssetLibrary.remove(currentAssetManifest(),id));
      }
      qaState.last=null;qaState.baseline=null;
      restoreSceneAssetControls();listFiles();saveState();await runPreview();
      feedback('Modelo removido da cena e do armazenamento deste projeto.');
    }catch(err){feedback('Falha ao remover GLB: '+err.message,true);}
  }));
  $('model-file').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{
      const report=await GameForgeModelInspector.readFile(file);
      $('model-report').textContent=file.name+' | malhas '+report.meshes+', skins '+report.skins+', ossos '+report.bones+', materiais '+report.materials+'\nClipes: '+(report.animations.join(', ')||'nenhum')+'\nAlertas: '+(report.warnings.join(' | ')||'nenhum estrutural')+'\n'+report.limitations;
    }catch(e){$('model-report').textContent='Erro ao inspecionar: '+e.message;}
    event.target.value='';
  });
  $('character-generate').addEventListener('click',async()=>{
    const target=$('character-result');const button=$('character-generate');
    const height=Number($('character-height').value);
    if(!Number.isFinite(height)||height<.4||height>3.5){target.textContent='Altura precisa estar entre 0,4 e 3,5 m.';return;}
    button.disabled=true;target.textContent='Solicitando geração procedural no Blender...';
    try{
      const data=await qaApi('/api/studio/character',{
        project:projectName(),name:$('character-name').value.trim(),
        style:$('character-style').value,height
      });
      const report=data.report||{};
      target.textContent='Modelo criado: '+data.filename+' | '+(report.bones||0)+' ossos · '+(report.animations||[]).length+' clipes. '+(data.warning||'');
      const links=document.createElement('div');links.className='character-links';
      for(const [label,uri] of [['Baixar GLB',data.download_url],['Laboratório 3D',data.viewer_url]]){
        if(typeof uri!=='string'||!uri.startsWith('/'))continue;
        const link=document.createElement('a');link.textContent=label;link.href=new URL(uri,serverAddress()).href;
        link.target='_blank';link.rel='noopener';link.style.marginRight='12px';links.append(link);
      }
      target.append(links);
    }catch(e){target.textContent='Não foi possível criar personagem: '+e.message;}
    finally{button.disabled=false;}
  });

  $('knowledge-refresh').addEventListener('click',renderReferences);
  $('knowledge-clear').addEventListener('click',()=>{pinnedReferences=[];renderReferences();saveState();});
  $('analyze').addEventListener('click',analyze);
  $('download-urban-plan').addEventListener('click',()=>{
    const spec=analyze();
    if(!spec||spec.genre!=='urban-action'||!spec.urbanProfile){
      feedback('Importe primeiro um GDD de ação urbana 3D em terceira pessoa.',true);return;
    }
    const contract={
      version:1,genre:'urban-action',dimension:'3d',camera:'third-person',
      engineAvailability:spec.engineAvailability,confidence:spec.urbanProfile.confidence,
      evidence:spec.urbanProfile.evidence,contentCounts:spec.urbanProfile.contentCounts,
      requirements:spec.urbanProfile.requirements
    };
    const files={
      'GAME_DESIGN_CONTRACT.json':JSON.stringify(contract,null,2),
      'PLANO_URBAN_ACTION.md':GameForgeUrbanDesign.report(spec.urbanProfile),
      'GDD_original.md':$('gdd').value
    };
    fileBlob(GameForgeZip.zipFiles(files),'gameforge-plano-urbano-3d.zip');
    feedback('Contrato, plano de implementação e GDD original exportados; jogo 3D ainda não gerado.');
  });
  $('idea-to-gdd').addEventListener('click',()=>{
    const idea=$('instruction').value.trim();
    if(!idea){feedback('Digite a ideia do novo jogo antes de criar o GDD.',true);return;}
    if($('gdd').value.trim().length>1000 && !window.confirm('O GDD atual sera substituido pela nova ideia. Se quiser preserva-lo, baixe um backup antes. Continuar?'))return;
    const genre=GameForgeParser.detectGenre(idea);
    const dim=$('game-dimension').value==='3d'||($('game-dimension').value==='auto'&&/\\b3d\\b/i.test(idea))?'3d':'2d';
    const name=genre==='shooter'?'ARMADA ESTELAR':genre==='rpg'?'CRÔNICAS DO VALE':genre==='fps'?'OPERAÇÃO HORIZONTE':'NOVO PROJETO';
    const gdd='# '+name+'\\n\\n## Conceito\\n'+idea+'\\n\\n## Controles e sistemas\\nImplementar os controles e as mecanicas disponiveis deste estilo.\\n\\n## Fase 1 — Início\\nIntroduzir as mecânicas básicas.\\n\\n## Fase 2 — Desafio\\nAumentar o desafio.\\n\\n## Fase 3 — Confronto\\nObjetivo final da campanha.\\n';
    $('gdd').value=gdd;$('instruction').value='';$('project-name').value=name;
    enableAutoDetection();
    unrestoredProject=false;
    $('file-indicator').textContent='Novo GDD criado a partir da sua ideia';
    analyze();saveState();feedback('Novo GDD criado. Clique em Criar jogo para gerar o motor '+dim.toUpperCase()+'.');
  });

  $('example').addEventListener('click',()=>{unrestoredProject=false;$('gdd').value=example;$('instruction').value='';$('project-name').value='Sombras do Vale';enableAutoDetection();analyze();saveState();});
  $('md-file').addEventListener('change',async e=>{
    const file=e.target.files&&e.target.files[0];if(!file)return;
    if(!/\.(md|markdown)$/i.test(file.name)){feedback('Envie um GDD .md ou .markdown.',true);return;}
    if(file.size>1_000_000){feedback('GDD acima de 1 MB. Separe anexos ou partes do documento.',true);return;}
    const value=await file.text();unrestoredProject=false;$('gdd').value=value; // Não cortar o documento importado
    $('instruction').value=''; // Não misturar comando de outro projeto com o novo documento.
    $('rpg-layout-json').value='';
    $('scene3d-json').value='';
    enableAutoDetection(); // Arquivos novos sempre começam com interpretação automática.
    const parsed=analyze();if(parsed)$('project-name').value=parsed.title;
    $('file-indicator').textContent=file.name+' · '+(file.size/1024).toFixed(1)+' KB · '+(parsed?.sectionCount||0)+' capítulos';feedback('GDD integral carregado: '+file.name+' ('+file.size+' bytes).');saveState();e.target.value='';
  });
  document.querySelectorAll('input[name=mode]').forEach(radio=>radio.addEventListener('change',()=>{state.mode=radio.value;$('ai-settings').classList.toggle('hidden',state.mode!=='ai');$('generate').textContent=state.mode==='ai'?'✦ Criar novo jogo com IA':'▶ Criar novo jogo';qaButtons();}));
  for(const name of ['navinha','neon','dragao']){
    $('example-'+name).addEventListener('click',()=>{
      unrestoredProject=false;
      restoreCreationOptions({dimension:'2d',genre:'shooter'});
      $('gdd').value=shooterExamples[name];$('instruction').value='';
      $('project-name').value=(shooterExamples[name].split('\n')[0].replace(/^#\s*/,''));
      $('file-indicator').textContent='Exemplo '+name+' · editável';
      analyze();saveState();feedback('GDD de '+name+' carregado. Agora clique em Gerar jogo.');
    });
  }
  const expandedExamples={
    rpg:{dimension:'2d',genre:'rpg',title:'GUARDIÕES DO VALE',theme:'forest',idea:'RPG de ação com mapa amplo, experiência, níveis, poções, inventário e combate. Recolher os selos, enfrentar os guardiões e entrar no portal.'},
    defense:{dimension:'2d',genre:'tower-defense',title:'FORTALEZA DAS MARÉS',theme:'forest',idea:'Defesa de torres com construção por grade, melhoria de torres, ondas inimigas, créditos e defesa da base.'},
    lanes:{dimension:'2d',genre:'lane-defense',title:'JARDINS DA AURORA',theme:'forest',idea:'Defesa por linhas estilo Plants vs. Zombies mas com unidades originais: cinco linhas, geradores de energia, vigias que atiram, barreiras que bloqueiam, gelo que desacelera, invasores com diferentes classes e chefe final.'},
    blocks:{dimension:'2d',genre:'block-td',title:'TORRES DO ARQUIPÉLAGO',theme:'forest',idea:'Tower Defense em blocos estilo Block Tower TD com criação de terreno por blocos, torres elevadas, extratores de recursos, ataque com alcance ampliado, upgrades de torres e bônus roguelike entre ondas.'},
    adventure3d:{dimension:'3d',genre:'arena',title:'O VALE DOS GUARDIÕES',theme:'forest',idea:'Aventura 3D em terceira pessoa. Explorar floresta com personagens low poly animados, encontrar cristais, combater criaturas e liberar o portal.'},
    shooter3d:{dimension:'3d',genre:'shooter',title:'ARMADA DAS ESTRELAS 3D',theme:'neon',idea:'Navinha espacial shoot em up 3D. Pilote uma nave de combate entre ondas de inimigos com projéteis reais, movimento livre no plano, power-ups e chefões com três fases. Teclado, controles touch, pausa e progresso de fases.'},
    rpg3d:{dimension:'3d',genre:'rpg',title:'CRÔNICAS DO VALE 3D',theme:'forest',idea:'RPG de ação 3D com personagem em terceira pessoa, magias, cristais, experiência por inimigo eliminado, evolução de níveis, poções de cura, chefes e portais para as fases seguintes.'},
    urbanmissions:{dimension:'3d',genre:'urban-action',title:'PORTO VESPER — MISSÕES DINÂMICAS',theme:'neon',idea:'Ação urbana 3D com duas missões diferentes de coleta, entrega, combate e captura.',gdd:'# PORTO VESPER — MISSÕES DINÂMICAS\n\nJogo de ação criminal urbana 3D em terceira pessoa com cidade, negócios e missões.\n\n## Missão 1 — Recuperar documentos\nColete 2 provas espalhadas pelo bairro.\nDepois entregue 2 provas no armazém.\nRecompensa 600.\n\n## Missão 2 — Retomar comércio\nCapture o armazém depois de derrotar 1 guarda.\nRecompensa 850.\n'},
    urban3d:{dimension:'3d',genre:'urban-action',title:'PORTO VESPER — PRIMEIRO BAIRRO',theme:'neon',idea:'Ação criminal urbana 3D em terceira pessoa com cidade, ruas, negócios, combate com um guarda, missão de captura e salvamento. Carros dirigíveis, polícia, interiores e campanhas grandes são objetivos futuros.',gdd:'# PORTO VESPER — PRIMEIRO BAIRRO\n\n## Gênero e câmera\nAção criminal urbana 3D em terceira pessoa com câmera atrás do protagonista.\n\n## Primeira missão — O Armazém\nBairro com ruas, colisões, um guarda, pistola com munição e um negócio capturável com recompensa única.\n\n## Sistemas planejados\nVeículos dirigíveis, polícia, territórios, interiores, guardas mais inteligentes e animações GLB exigirão mais desenvolvimento.\n'},
    fps3d:{dimension:'3d',genre:'fps',title:'POSTO NÉON',theme:'neon',idea:'FPS 3D. Explorar o posto, usar WASD para andar e Q/E para mirar, eliminar sentinelas, coletar energia e abrir a saída.'},
    racing3d:{dimension:'3d',genre:'racing',title:'CIRCUITO DO POENTE',theme:'desert',idea:'Corrida 3D. Dirigir entre checkpoints em ordem, evitar tráfego e completar as voltas do circuito.'},
    platform3d:{dimension:'3d',genre:'platform',title:'ILHAS DO AMANHECER',theme:'ruins',idea:'Plataforma 3D. Saltar entre ilhas, recolher cristais, evitar quedas e alcançar o portal final.'}
  };
  for(const [key,preset] of Object.entries(expandedExamples)){
    $('example-'+key).addEventListener('click',()=>{
      unrestoredProject=false;restoreCreationOptions(preset);
      $('project-name').value=preset.title;$('instruction').value='';
      $('gdd').value=preset.gdd||('# '+preset.title+'\n\n## Visão geral\n'+preset.idea+'\n\n## Controles e interface\nMenu, pausa, controles touch e HUD.\n\n'+['Primeiros passos','Rota dos guardiões','O último desafio'].map((title,i)=>'## Fase '+(i+1)+' — '+title+'\n'+preset.idea+'\n').join('\n'));
      $('file-indicator').textContent='Exemplo '+GameForgeParser.labels[preset.genre]+' '+preset.dimension.toUpperCase();analyze();saveState();feedback('Exemplo carregado. Clique em Criar novo jogo para jogar.');
    });
  }
  for(const id of ['game-dimension','game-style','game-theme','game-world-size','game-quality','game-graphics-2d','game-visual-style'])$(id).addEventListener('change',()=>{if(id==='game-dimension')renderStyles();analyze();saveState();});
  $('generate').addEventListener('click',()=>projectOperation(generate));
  $('rerun').addEventListener('click',runPreview);
  $('apply-edit').addEventListener('click',applyEdit);
  $('export').addEventListener('click',()=>projectOperation(downloadZip));$('export-top').addEventListener('click',()=>projectOperation(downloadZip));$('html-export').addEventListener('click',()=>projectOperation(downloadHtml));
  $('open-game').addEventListener('click',()=>projectOperation(async()=>{
    try{
      const spec=state.spec||GameForgeParser.parseGdd($('gdd').value);
      const files={...state.files,...await assetBinaryFiles()};
      const html=GameForgeGenerator.shell(spec.title,files['style.css'],files['game.js'],true,files);
      const blob=new Blob([html],{type:'text/html'}),url=URL.createObjectURL(blob);
      window.open(url,'_blank','noopener');
      setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(e){feedback('Não foi possível abrir o jogo: '+e.message,true);}
  }));
  $('fullscreen').addEventListener('click',()=>{const el=$('preview-box');if(document.fullscreenElement)document.exitFullscreen();else if(el.requestFullscreen)el.requestFullscreen();});
  window.addEventListener('message',ev=>{if(ev.source!==$('preview').contentWindow)return;if(ev.data&&ev.data.kind==='gameforge-error'){log('[Prévia] '+String(ev.data.message).slice(0,400));status('Erro na prévia',true);}});
  $('file-editor').addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const t=e.target;const s=t.selectionStart;t.setRangeText('  ',s,t.selectionEnd,'end');}if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();applyEdit();}});
  $('gdd').addEventListener('paste',event=>{
    const el=$('gdd'),newText=event.clipboardData?.getData('text')||'';
    const replacingWhole=!el.value.trim()||(el.selectionStart===0&&el.selectionEnd===el.value.length);
    if(replacingWhole&&newText.trim().length>80){
      enableAutoDetection();
      $('instruction').value='';
      $('rpg-layout-json').value='';
      $('scene3d-json').value='';
    }
  });
  $('gdd').addEventListener('input',()=>{renderReferences();scheduleSave();});
  $('instruction').addEventListener('input',()=>{renderReferences();scheduleSave();});
  $('project-name').addEventListener('input',scheduleSave);
  $('rpg-layout-json').addEventListener('input',scheduleSave);
  $('scene3d-json').addEventListener('input',scheduleSave);
  $('scene3d-open').addEventListener('click',event=>{
    try{
      const manifest=currentAssetManifest();
      const context={version:1,projectId:assetProjectId,
        assets:manifest.assets.filter(a=>a.role==='scene').map(a=>({
          id:a.id,name:a.name,bytes:a.bytes,sha256:a.sha256||null,role:a.role
        }))};
      localStorage.setItem('gameforge-scene3d-assets-v1',JSON.stringify(context));
    }catch(e){event.preventDefault();feedback('Não foi possível abrir o editor com modelos: '+e.message,true);}
  });
  $('scene3d-receive').addEventListener('click',()=>{
    try{
      const raw=localStorage.getItem('gameforge-scene3d-transfer-v1');
      if(!raw)throw Error('Nenhuma cena enviada. Use Enviar ao Studio no editor visual.');
      const normalized=GameForgeScene3DLayout.normalize(raw);
      GameForgeScene3DLayout.validateAssets(normalized,currentAssetManifest());
      $('scene3d-json').value=JSON.stringify(normalized,null,2);
      scheduleSave();feedback('Cena recebida: '+normalized.stages.length+' fase(s). Gere o jogo 3D ou clique em Aplicar ao jogo gerado.');
    }catch(e){feedback('Erro ao receber cena: '+e.message,true);}
  });
  $('scene3d-apply').addEventListener('click',async()=>{
    try{
      if(qaState.candidate||stagedImprovement||projectOperations)throw Error('Conclua correções e operações pendentes antes de editar.');
      if(!state.files['game.js']||!state.files['engine-3d.js'])throw Error('Primeiro gere um jogo 3D no modo Sem IA.');
      const raw=$('scene3d-json').value.trim();
      if(!raw)throw Error('Importe uma cena válida antes de aplicar.');
      const original=GameForgeProject.activeSpec(state.files,null);
      if(!original)throw Error('GAME_SPEC não encontrado no game.js.');
      const updated=GameForgeScene3DLayout.apply(original,raw,currentAssetManifest());
      const re=/const GAME_SPEC = \{[^\n]*\};/;
      if(!re.test(state.files['game.js']))throw Error('Formato do GAME_SPEC não reconhecido. Não alterado.');
      const next=state.files['game.js'].replace(re,'const GAME_SPEC = '+JSON.stringify(updated)+';');
      if(next===state.files['game.js'])throw Error('A cena já foi aplicada.');
      pushHistory('GF-OPEN-02: atualizar cena 3D');
      state.files['game.js']=next;
      state.files['SCENE3D_LAYOUT.json']=JSON.stringify(GameForgeScene3DLayout.extract(updated),null,2);
      state.spec=updated;
      state.files['index.html']=GameForgeGenerator.shell(updated.title,state.files['style.css'],next,false,state.files);
      qaState.last=null;qaState.baseline=null;refreshEvidence();
      listFiles();selectFile('game.js');saveState();
      const playable=await runPreview();
      feedback('Cena 3D aplicada ao game.js e ao ZIP. '+(playable?'Prévia atualizada.':'Revise a prévia.'),!playable);
    }catch(e){feedback('Não foi possível aplicar cena 3D: '+e.message,true);}
  });
  $('rpg-layout-receive').addEventListener('click',()=>{
    try{
      const raw=localStorage.getItem('gameforge-rpg-layout-transfer-v1');
      if(!raw)throw Error('Nenhum layout enviado. Abra o editor e clique em Enviar ao Studio.');
      if(new Blob([raw]).size>30000)throw Error('Layout acima de 30 KB.');
      const data=JSON.parse(raw),entries=Array.isArray(data?.stages)?data.stages:[data];
      const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=100&&p.x<=2250&&p.y>=100&&p.y<=1450;
      if(!entries.length||entries.length>30||entries.some(e=>!e||!e.puzzle||!['key','lever','gate'].every(k=>valid(e.puzzle[k]))||!Array.isArray(e.chests)||e.chests.length>8||e.chests.some(c=>!valid(c)||!Number.isInteger(c.coins)||c.coins<0||c.coins>250)))throw Error('Layout inválido.');
      $('rpg-layout-json').value=raw;scheduleSave();feedback(entries.length+' fase(s) recebida(s). Gere o RPG 2D para aplicar as posições.');
    }catch(e){feedback('Falha ao receber layout: '+e.message,true);}
  });
  $('repo-live-sources').addEventListener('change',saveState);
  $('gdd').addEventListener('change',saveState);$('instruction').addEventListener('change',saveState);$('project-name').addEventListener('change',saveState);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&!qaState.candidate)saveState();});
  renderStyles();
  if(globalThis.GameForgeSNES2DEditor){
    globalThis.GameForgeSNES2DEditor.mount({
      document,root:$('sn2-editor'),
      getGenerated:()=>state.files,
      onEdit:result=>{
        if(qaState.candidate||stagedImprovement)
          throw Error('Aceite ou descarte a correção pendente antes de editar o jogo.');
        state.files=result.files;state.spec=result.spec;
        qaState.last=null;qaState.baseline=null;
        refreshEvidence();listFiles();
        if(state.selected&&state.files[state.selected])selectFile(state.selected);
        else selectFile('game.js');
        saveState();runPreview();
        feedback('GF-SNES-02: mapa e atlas incorporados ao jogo exportável. Prévia atualizada.');
      }
    });
  }
  if(globalThis.GameForgeQuestEditor){
    globalThis.GameForgeQuestEditor.mount({
      document,root:$('quest-editor'),instruction:$('instruction'),
      getGenerated:()=>state.files,
      onEdit:result=>{
        if(!window.confirm('Esta edição altera as missões do jogo já criado. Se a migração estiver marcada, só saves compatíveis serão importados. Faça backup do projeto e do save antes. Continuar?'))
          throw Error('Edição cancelada. O jogo original está preservado.');
        state.files=result.files;state.spec=result.spec;
        qaState.last=null;qaState.baseline=null;
        refreshEvidence();listFiles();
        if(state.selected==='game.js')selectFile('game.js');
        saveState();runPreview();
        feedback('Missões atualizadas no game.js sem recriar o projeto. '+result.notice);
      },
      onApply:()=>{
        restoreCreationOptions({dimension:'2d',genre:'simulation'});
        const parsed=analyze();
        if(parsed)feedback('Missões configuradas. Agora clique em Criar jogo para gerar a campanha 2D.');
        saveState();
      }
    });
  }
  stageEditorRender();
  restoreState();
  renderReferences();analyze();
})();
