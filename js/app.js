/* GameForge Studio: funciona como site estático, sem dependências externas. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const state={files:{},spec:null,selected:null,mode:'offline',generation:0};
  const allowed=GameForgeProject.allowedFiles;
  let pendingProject=null,saveTimer=null,projectOperations=0,unrestoredProject=false;
  const devHistory=[];let lastPlan=null;
  let roadmapTasks=[],selectedTaskId=null,preparedTaskId=null,roadmapCount=60,roadmapSource=null;
  const example=$('gdd').value;
  function creationOptions(){return {dimension:$('game-dimension').value,genre:$('game-style').value,theme:$('game-theme').value,size:Number($('game-world-size').value),quality:$('game-quality').value};}
  function renderStyles(){
    const prior=$('game-style').value,dimension=$('game-dimension').value;
    const genres=GameForgeParser.styles[dimension]||Object.keys(GameForgeParser.labels);
    $('game-style').replaceChildren(new Option('Detectar pelo GDD','auto'),...genres.map(g=>new Option(GameForgeParser.labels[g],g)));
    $('game-style').value=genres.includes(prior)?prior:'auto';
  }
  function restoreCreationOptions(options){
    const o=options||{};$('game-dimension').value=['2d','3d'].includes(o.dimension)?o.dimension:'auto';renderStyles();
    if([...$('game-style').options].some(x=>x.value===o.genre))$('game-style').value=o.genre;
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
    $('knowledge-results').innerHTML=selected.map(item=>`<article class="repo-reference"><div class="repo-reference-top"><div><strong>${esc(item.title)}</strong><span class="repo-type">${esc(item.category)} · ${esc(item.repository.split('/')[1])}</span></div><label><input type="checkbox" data-repo-ref="${esc(item.id)}" ${pinnedReferences.includes(item.id)?'checked':''}> Fixar</label></div><p>${esc(item.summary)}</p><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Ver arquivo no GitHub</a></article>`).join('')||'<span class="muted tiny">Não há padrões relevantes para essa descrição.</span>';
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
    const md=$('gdd').value.trim();
    if(!md){feedback('Cole ou importe um documento GDD antes de analisar.',true);return null;}
    if(new Blob([md]).size>1_000_000){feedback('O GDD ultrapassa 1 MB; divida anexos externos.',true);return null;}
    roadmapSync();
    let spec;try{spec=GameForgeParser.parseGdd(md,$('instruction').value,creationOptions());}catch(e){feedback(e.message,true);return null;}
    state.spec=GameForgeProject.activeSpec(state.files,spec);
    renderReferences();
    const tags=spec.detected.slice(0,13).map(x=>`<span class="tag">${esc(x)}</span>`).join('');
    $('analysis').innerHTML=`<strong>${esc(spec.title)}</strong><div class="tags">${tags}</div><div class="muted">Fases: ${spec.stages.map(esc).join(' • ')}</div><p class="muted">Documento inteiro analisado: ${spec.sourceLength.toLocaleString('pt-BR')} caracteres e ${spec.sectionCount} títulos. O protótipo utiliza até ${spec.stages.length} fases reconhecidas. </p><p class="muted">Sem IA: será gerado um protótipo nas mecânicas disponíveis, não uma reprodução integral do GDD.</p>`;
    return spec;
  }
  function projectName(){return ($('project-name').value.trim()||'gameforge-jogo').replace(/[\\/:*?"<>|]+/g,'-').slice(0,70);}

  /* v0.13 — edição determinística por fase, versionada no game.js e no backup. */
  let stageEditorIndex=0;
  const stageFields=['stage-title','stage-enemies','stage-boss','stage-waves','stage-laps','stage-theme','stage-objective'];
  function stageEditorRead(){
    const spec=GameForgeCampaign.inspect(state.files);
    if(!spec)return;
    const index=stageEditorIndex;const o=GameForgeCampaign.option(spec,index);
    $('stage-title').value=spec.stages[index]||'';
    $('stage-enemies').value=o.enemies;$('stage-boss').value=o.boss;
    $('stage-waves').value=o.waves;$('stage-laps').value=o.laps;
    $('stage-theme').value=o.theme;$('stage-objective').value=o.objective;
    const available=GameForgeCampaign.maxEnemies(spec),genre=spec.genre,three=spec.dimension==='3d';
    $('stage-enemies').max=String(available);$('stage-enemies').disabled=!available;
    $('stage-boss').disabled=!['arena','fps','shooter','rpg'].includes(genre);
    $('stage-waves').disabled=genre!=='tower-defense';
    $('stage-laps').disabled=!(three&&genre==='racing');
    $('stage-theme').disabled=!three;
    $('stage-hint').textContent='Fase '+(index+1)+'/'+spec.stages.length+' · '+(available?'Até '+available+' inimigos; 0 usa a quantidade automática.':'Quantidade de inimigos não editável neste motor.')+' As alterações passam a valer após reiniciar a prévia.';
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
      const input=reset?{name:old.stages[stageEditorIndex],enemies:0,boss:'auto',waves:0,laps:0,theme:'auto',objective:''}:
        {name:$('stage-title').value,enemies:$('stage-enemies').value,boss:$('stage-boss').value,
         waves:$('stage-waves').value,laps:$('stage-laps').value,theme:$('stage-theme').value,objective:$('stage-objective').value};
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
  $('stage-save').addEventListener('click',()=>stageEditorSave(false));
  $('stage-reset').addEventListener('click',()=>stageEditorSave(true));
  function projectSnapshot(){
    roadmapSync();
    return {gdd:$('gdd').value,name:$('project-name').value,instruction:$('instruction').value,files:state.files,selected:state.selected,pinnedReferences,history:devHistory.slice(-4),deepPlan:$('deep-plan').checked,creationOptions:creationOptions(),roadmapRecords:roadmapTasks.map(({id,status,notes,revision})=>({id,status,notes,revision})),selectedTaskId};
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
    unrestoredProject=false;
    clearTimeout(saveTimer);
    $('gdd').value=snap.gdd;$('project-name').value=snap.name;$('instruction').value=snap.instruction;
    pinnedReferences=snap.pinnedReferences.filter(x=>repoKnowledge.entries.some(r=>r.id===x));
    devHistory.length=0;devHistory.push(...snap.history);
    $('deep-plan').checked=snap.deepPlan;
    state.files=snap.files;state.selected=null;preparedTaskId=null;lastPlan=null;state.generation++;
    state.spec=GameForgeProject.activeSpec(state.files,GameForgeParser.parseGdd(snap.gdd));
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
    const keys=Object.keys(state.files).filter(k=>allowed.includes(k));
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
    if(['game.js','style.css','index.html'].includes(state.selected)){qaState.last=null;qaState.baseline=null;}
    listFiles();selectFile(state.selected);if(!qaState.candidate)saveState();
    if(['game.js','style.css','index.html'].includes(state.selected))runPreview();
    feedback('Alteração aplicada ao arquivo '+state.selected+'.');
  }
  function runPreview(){
    if(!state.files['game.js']||!state.files['style.css'])return;
    const spec=state.spec||GameForgeParser.parseGdd($('gdd').value);
    $('preview-empty').classList.add('hide');
    const doc=GameForgeGenerator.shell(spec.title,state.files['style.css'],state.files['game.js'],true,state.files);
    $('preview').srcdoc=doc;
    $('qa-run').disabled=false;
    $('live-indicator').classList.add('active');status('Prévia carregada');
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
  function getExportFiles(){
    roadmapSaveFiles();
    const files={...state.files};
    files['PROJETO.gameforge.json']=GameForgeProject.encode(projectSnapshot());
    if(qaState.last){
      files['QA_inicio.png']=screenshotBytes(qaState.last.before.image);
      files['QA_movimento.png']=screenshotBytes(qaState.last.after.image);
      if(qaState.last.shot?.image)files['QA_disparo.png']=screenshotBytes(qaState.last.shot.image);
    }
    if(qaState.baseline)files['QA_referencia.png']=screenshotBytes(qaState.baseline.after.image);
    if(state.spec)files['index.html']=GameForgeGenerator.shell(state.spec.title,files['style.css'],files['game.js'],false,files);
    return files;
  }
  function downloadZip(){
    if(!state.files['game.js'])return;
    if(qaState.candidate){feedback('Aceite ou descarte a correção antes de exportar.',true);return;}
    try{
      const blob=GameForgeZip.zipFiles(getExportFiles());
      fileBlob(blob,projectName().replace(/\s+/g,'-')+'-gameforge.zip');feedback('ZIP gerado localmente, incluindo código-fonte e GDD.');
    }catch(e){feedback('Erro ao empacotar: '+e.message,true);}
  }
  function downloadHtml(){
    if(!state.files['game.js'])return;
    if(qaState.candidate){feedback('Aceite ou descarte a correção antes de exportar.',true);return;}
    const spec=state.spec||GameForgeParser.parseGdd($('gdd').value);
    const text=GameForgeGenerator.shell(spec.title,state.files['style.css'],state.files['game.js'],true,state.files);
    fileBlob(new Blob([text],{type:'text/html;charset=utf-8'}),projectName().replace(/\s+/g,'-')+'.html');
    feedback('Jogo HTML autônomo exportado.');
  }
  async function projectOperation(action){
    if(projectOperations){feedback('Aguarde a operação atual antes de continuar.',true);return;}
    projectOperations++;
    try{return await action();}finally{projectOperations--;}
  }
  function projectAvailable(){
    if(projectOperations||qaState.candidate){feedback('Conclua o teste ou a alteração em andamento antes de abrir ou baixar um backup.',true);return false;}
    return true;
  }
  function downloadProject(){
    if(!projectAvailable())return;
    try{
      const encoded=GameForgeProject.encode(projectSnapshot());
      fileBlob(new Blob([encoded],{type:'application/json'}),projectName().replace(/\s+/g,'-')+'.gameforge.json');
      feedback('Backup completo baixado. Use Abrir backup para continuar com código, tarefas e histórico.');
    }catch(e){feedback('Backup não gerado: '+e.message,true);}
  }
  $('project-backup').addEventListener('click',downloadProject);
  $('project-open').addEventListener('click',()=>{if(projectAvailable())$('project-file').click();});
  $('project-file').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{
      if(!projectAvailable())return;
      if(file.size>20000000)throw Error('Backup acima de 20 MB.');
      const project=GameForgeProject.decode(await file.text());
      if(!projectAvailable())return;
      pendingProject=project;
      $('project-restore-summary').textContent=`${project.name||'Sem nome'} · ${Object.keys(project.files).length} arquivos · ${new Blob([project.gdd]).size.toLocaleString('pt-BR')} bytes de GDD · ${project.history.length} versões para desfazer.`;
      $('project-restore-dialog').showModal();
    }catch(e){pendingProject=null;feedback('O projeto atual foi preservado. '+e.message,true);}
    finally{event.target.value='';}
  });
  $('project-restore-cancel').addEventListener('click',()=>{$('project-restore-dialog').close();});
  $('project-restore-dialog').addEventListener('close',()=>{pendingProject=null;});
  $('project-restore-confirm').addEventListener('click',()=>{
    if(!pendingProject||!projectAvailable())return;
    const project=pendingProject;pendingProject=null;
    loadProject(project);$('project-restore-dialog').close();saveState();
    feedback('Projeto restaurado. Continue as melhorias ou desfaça uma versão do histórico.');
  });
  async function generate(){
    if(qaState.candidate){feedback('Aceite ou descarte a correção candidata antes de gerar outro jogo.',true);return;}
    const spec=analyze();if(!spec)return;
    const mode=state.mode;
    $('generate').disabled=true;
    status('Gerando...');$('log').textContent=`[Studio] Interpretando GDD de ${spec.sourceLength} caracteres...`;
    try{
      if(mode==='offline'){
        lastPlan=GameForgeDevelopment.plan($('instruction').value,spec,{});
        state.files=GameForgeGenerator.generate(spec,$('gdd').value);
        state.files['RELATORIO_LEITURA_GDD.md']=readingReport($('gdd').value,spec);
        $('development-plan').textContent='Criação inicial: '+spec.genre+' · '+spec.stages.length+' fases. As instruções livres que ultrapassarem as regras precisam de IA.';
        state.files['RELATORIO_REFERENCIAS.md']=repoKnowledge.report(references())+'\nModo sem IA: estas recomendações não foram automaticamente aplicadas ao motor do jogo.\n';
        log(`[Sem IA] Tipo ${spec.genre}, ${spec.stages.length} fase(s), código gerado no navegador.`);
        log('[Sem IA] Mecânicas de modelos pré-programados. Não é interpretação integral de regras inéditas.');
        feedback('Jogo gerado sem IA. Ele já pode ser jogado, editado e exportado.');
      }else{
        if(spec.dimension==='3d')throw Error('Para criar um jogo 3D com o motor local, selecione Sem IA. O backend atual gera os modelos 2D; o painel 3D do backend continua separado.');
        const server=$('api-url').value.trim() || (!/github\.io$/i.test(location.hostname) && /^https?:$/.test(location.protocol)?location.origin:'');
        if(!server)throw new Error('Informe uma API HTTPS em “Servidor de IA”. O GitHub Pages não executa o backend.');
        if(!/^https?:\/\//.test(server))throw new Error('URL inválida do servidor (http:// ou https://).');
        if(location.protocol==='https:'&&server.startsWith('http://')&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(server))throw new Error('Use HTTPS para conectar um site HTTPS à API.');
        const payload={model:$('model').value.trim(),gdd:$('gdd').value,instruction:GameForgeParser.creationInstruction(spec,$('instruction').value),current_files:{},reference_ids:references().map(x=>x.id),read_sources:$('repo-live-sources').checked,deep_plan:$('deep-plan').checked,mode:'create'};
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
        state.files['RELATORIO_LEITURA_GDD.md']=readingReport($('gdd').value,spec)+'\n## Leitura por IA\n\n'+JSON.stringify(data.gdd_coverage||{},null,2)+'\n';
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
      unrestoredProject=false;devHistory.length=0;renderHistory();
      roadmapSaveFiles();
      state.generation++;state.spec=spec;
      qaState.last=null;qaState.baseline=null;qaState.vision=null;
      $('qa-before').removeAttribute('src');$('qa-after').removeAttribute('src');$('qa-shot').removeAttribute('src');
      $('qa-report').textContent='Nenhuma inspeção realizada.'; qaButtons();
      listFiles();selectFile('game.js');runPreview();roadmapRender();saveState();
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
  function displayPlan(p){
    $('development-plan').textContent=p.tasks?.length ? p.tasks.map((t,i)=>`${i+1}. ${t.title} — ${t.rationale||t.why}${t.possible===false?' (exige IA)':''}\n   Testes: ${(t.checks||[]).join('; ')}`).join('\n') +
      '\n\nPendências: '+(p.pending||[]).join('; ') : (p.pending||[]).join('\n')||'Nenhuma mudança reconhecida. Descreva o que deve mudar.';
  }
  function planImprovement(){
    if(!state.files['game.js']){feedback('Primeiro crie um jogo a partir do GDD.',true);return null;}
    const instruction=$('instruction').value.trim();
    if(!instruction){feedback('Escreva o que deseja mudar na caixa de instrução.',true);return null;}
    const p=GameForgeDevelopment.plan(instruction,state.spec,state.files);lastPlan=p;displayPlan(p);return p;
  }
  async function improveGame(){
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
      const before=qaState.last;
      pushHistory(instruction);
      state.files=output.files;
      if(activeTask&&activeTask.id===preparedTaskId){roadmapTasks=GameForgeRoadmap.changeStatus(roadmapTasks,activeTask.id,'em andamento','Código modificado; aguardando execução do QA e revisão manual.');roadmapSaveFiles();roadmapRender();}
      if(output.spec)state.spec=output.spec;
      state.files['RELATORIO_EVOLUCAO.md']=GameForgeDevelopment.report(planned,output.applied);
      listFiles();selectFile('game.js');runPreview();saveState();
      log('[Evolução] '+output.applied.join(', '));
      feedback('Melhoria aplicada ao projeto existente. Executando teste de regressão...');
      try{
        const report=await qaRun();
        if(before && report.issues.length>before.issues.length){
          log('[Regressão] Alertas aumentaram: '+before.issues.length+' → '+report.issues.length+'. Arquivos restaurados.');
          undoImprovement();feedback('Possível regressão detectada; código anterior restaurado.',true);return;
        }
        if(before)qaState.baseline=before;
        if(activeTask&&activeTask.id===preparedTaskId){roadmapTasks=GameForgeRoadmap.changeStatus(roadmapTasks,activeTask.id,'aguardando revisão',`QA executado: ${report.issues.length} alerta(s). Revisão funcional manual pendente.`);roadmapSaveFiles();roadmapRender();}
        feedback('Melhoria salva. QA executado: '+report.issues.length+' alertas. Revise jogabilidade e imagens.');
      }catch(e){log('[Teste indisponível] '+e.message);feedback('Mudança aplicada, mas QA não concluiu. Use Desfazer se houver problemas.',true);}
      renderHistory();roadmapRender();saveState();
    }catch(e){feedback('Falha na melhoria: '+(e.name==='AbortError'?'API excedeu tempo limite':e.message),true);log('[Evolução] '+e.message);}
    finally{$('improve').disabled=!state.files['game.js'];status(state.files['game.js']?'Prévia disponível':'Pronto para criar');}
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
  $('plan-improvement').addEventListener('click',planImprovement);
  $('improve').addEventListener('click',()=>projectOperation(improveGame));
  $('undo-improvement').addEventListener('click',undoImprovement);
  $('create-3d').addEventListener('click',create3dFromGdd);
  $('deep-plan').addEventListener('change',saveState);

  /* Laboratório de QA visual v0.4: executa jogo no iframe e testa regressões. */
  const qaState={last:null,baseline:null,vision:null,candidate:null,baseCode:null};
  const qaStatus=message=>{$('qa-status').textContent=message;};
  function qaButtons(){
    const ready=!!state.files['game.js'],has=!!qaState.last,ref=!!qaState.baseline,ai=state.mode==='ai';
    $('qa-run').disabled=!ready;
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
    if(!state.files['game.js'])return;
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
  $('example').addEventListener('click',()=>{unrestoredProject=false;$('gdd').value=example;$('instruction').value='';$('project-name').value='Sombras do Vale';analyze();saveState();});
  $('md-file').addEventListener('change',async e=>{
    const file=e.target.files&&e.target.files[0];if(!file)return;
    if(!/\.(md|markdown)$/i.test(file.name)){feedback('Envie um GDD .md ou .markdown.',true);return;}
    if(file.size>1_000_000){feedback('GDD acima de 1 MB. Separe anexos ou partes do documento.',true);return;}
    const value=await file.text();unrestoredProject=false;$('gdd').value=value; // Não cortar o documento importado
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
    adventure3d:{dimension:'3d',genre:'arena',title:'O VALE DOS GUARDIÕES',theme:'forest',idea:'Aventura 3D em terceira pessoa. Explorar floresta com personagens low poly animados, encontrar cristais, combater criaturas e liberar o portal.'},
    fps3d:{dimension:'3d',genre:'fps',title:'POSTO NÉON',theme:'neon',idea:'FPS 3D. Explorar o posto, usar WASD para andar e Q/E para mirar, eliminar sentinelas, coletar energia e abrir a saída.'},
    racing3d:{dimension:'3d',genre:'racing',title:'CIRCUITO DO POENTE',theme:'desert',idea:'Corrida 3D. Dirigir entre checkpoints em ordem, evitar tráfego e completar as voltas do circuito.'},
    platform3d:{dimension:'3d',genre:'platform',title:'ILHAS DO AMANHECER',theme:'ruins',idea:'Plataforma 3D. Saltar entre ilhas, recolher cristais, evitar quedas e alcançar o portal final.'}
  };
  for(const [key,preset] of Object.entries(expandedExamples)){
    $('example-'+key).addEventListener('click',()=>{
      unrestoredProject=false;restoreCreationOptions(preset);
      $('project-name').value=preset.title;$('instruction').value='';
      $('gdd').value='# '+preset.title+'\n\n## Visão geral\n'+preset.idea+'\n\n## Controles e interface\nMenu, pausa, controles touch e HUD.\n\n'+['Primeiros passos','Rota dos guardiões','O último desafio'].map((title,i)=>'## Fase '+(i+1)+' — '+title+'\n'+preset.idea+'\n').join('\n');
      $('file-indicator').textContent='Exemplo '+GameForgeParser.labels[preset.genre]+' '+preset.dimension.toUpperCase();analyze();saveState();feedback('Exemplo carregado. Clique em Criar novo jogo para jogar.');
    });
  }
  for(const id of ['game-dimension','game-style','game-theme','game-world-size','game-quality'])$(id).addEventListener('change',()=>{if(id==='game-dimension')renderStyles();analyze();saveState();});
  $('generate').addEventListener('click',()=>projectOperation(generate));
  $('rerun').addEventListener('click',runPreview);
  $('apply-edit').addEventListener('click',applyEdit);
  $('export').addEventListener('click',downloadZip);$('export-top').addEventListener('click',downloadZip);$('html-export').addEventListener('click',downloadHtml);
  $('open-game').addEventListener('click',()=>{const spec=state.spec||GameForgeParser.parseGdd($('gdd').value);const html=GameForgeGenerator.shell(spec.title,state.files['style.css'],state.files['game.js'],true,state.files);const blob=new Blob([html],{type:'text/html'});const url=URL.createObjectURL(blob);window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);});
  $('fullscreen').addEventListener('click',()=>{const el=$('preview-box');if(document.fullscreenElement)document.exitFullscreen();else if(el.requestFullscreen)el.requestFullscreen();});
  window.addEventListener('message',ev=>{if(ev.source!==$('preview').contentWindow)return;if(ev.data&&ev.data.kind==='gameforge-error'){log('[Prévia] '+String(ev.data.message).slice(0,400));status('Erro na prévia',true);}});
  $('file-editor').addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const t=e.target;const s=t.selectionStart;t.setRangeText('  ',s,t.selectionEnd,'end');}if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();applyEdit();}});
  $('gdd').addEventListener('input',()=>{renderReferences();scheduleSave();});
  $('instruction').addEventListener('input',()=>{renderReferences();scheduleSave();});
  $('project-name').addEventListener('input',scheduleSave);
  $('repo-live-sources').addEventListener('change',saveState);
  $('gdd').addEventListener('change',saveState);$('instruction').addEventListener('change',saveState);$('project-name').addEventListener('change',saveState);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&!qaState.candidate)saveState();});
  renderStyles();
  stageEditorRender();
  restoreState();
  renderReferences();analyze();
})();
