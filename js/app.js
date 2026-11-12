/* GameForge Studio: funciona como site estático, sem dependências externas. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const state={files:{},spec:null,selected:null,mode:'offline',generation:0};
  const allowed=['index.html','style.css','game.js','GDD_original.md','RELATORIO_GERACAO.md','RELATORIO_QA.md','RELATORIO_VISUAL_IA.md','RELATORIO_REFERENCIAS.md'];
  const example=$('gdd').value;
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
  function analyze(){
    const md=$('gdd').value.trim();
    if(!md){feedback('Cole ou importe um documento GDD antes de analisar.',true);return null;}
    state.spec=GameForgeParser.parseGdd(md,$('instruction').value);
    const spec=state.spec;
    renderReferences();
    const tags=spec.detected.slice(0,13).map(x=>`<span class="tag">${esc(x)}</span>`).join('');
    $('analysis').innerHTML=`<strong>${esc(spec.title)}</strong><div class="tags">${tags}</div><div class="muted">Fases: ${spec.stages.map(esc).join(' • ')}</div><p class="muted">Sem IA: será gerado um protótipo nas mecânicas disponíveis, não uma reprodução integral do GDD.</p>`;
    return spec;
  }
  function projectName(){return ($('project-name').value.trim()||'gameforge-jogo').replace(/[\\/:*?"<>|]+/g,'-').slice(0,70);}
  function saveState(){
    if(typeof qaState!=='undefined'&&qaState.candidate)return;
    try{
      const {files}=state; const snapshot=JSON.stringify({gdd:$('gdd').value,name:$('project-name').value,instruction:$('instruction').value,files,selected:state.selected,model:$('model').value,apiUrl:$('api-url').value,liveSources:$('repo-live-sources').checked,pinnedReferences});
      if(snapshot.length<2_500_000)localStorage.setItem('gameforge-studio-v03',snapshot);
    }catch(e){console.warn('Armazenamento indisponível:',e);}
  }
  function restoreState(){
    try{
      const raw=localStorage.getItem('gameforge-studio-v03'); if(!raw)return;
      const snap=JSON.parse(raw);
      if(typeof snap.gdd==='string')$('gdd').value=snap.gdd;
      if(typeof snap.name==='string')$('project-name').value=snap.name;
      if(typeof snap.instruction==='string')$('instruction').value=snap.instruction;
      if(typeof snap.model==='string')$('model').value=snap.model;
      if(typeof snap.apiUrl==='string')$('api-url').value=snap.apiUrl;
      if(typeof snap.liveSources==='boolean')$('repo-live-sources').checked=snap.liveSources;
      if(Array.isArray(snap.pinnedReferences))pinnedReferences=snap.pinnedReferences.filter(x=>repoKnowledge.entries.some(r=>r.id===x)).slice(0,5);
      renderReferences();
      if(snap.files&&typeof snap.files==='object'){
        state.files=Object.fromEntries(Object.entries(snap.files).filter(([name,src])=>allowed.includes(name)&&typeof src==='string'));
        if(state.files['game.js']){
          state.spec=GameForgeParser.parseGdd($('gdd').value,$('instruction').value);
          listFiles();selectFile(allowed.includes(snap.selected)?snap.selected:'game.js');runPreview();
          feedback('Último projeto restaurado deste navegador.');
        }
      }
    }catch(e){console.warn('Não foi possível restaurar o projeto:',e);}
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
    listFiles();selectFile(state.selected);if(!qaState.candidate)saveState();
    if(['game.js','style.css','index.html'].includes(state.selected))runPreview();
    feedback('Alteração aplicada ao arquivo '+state.selected+'.');
  }
  function runPreview(){
    if(!state.files['game.js']||!state.files['style.css'])return;
    const spec=state.spec||GameForgeParser.parseGdd($('gdd').value);
    $('preview-empty').classList.add('hide');
    const doc=GameForgeGenerator.shell(spec.title,state.files['style.css'],state.files['game.js'],true);
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
    const files={...state.files};
    if(qaState.last){
      files['QA_inicio.png']=screenshotBytes(qaState.last.before.image);
      files['QA_movimento.png']=screenshotBytes(qaState.last.after.image);
    }
    if(qaState.baseline)files['QA_referencia.png']=screenshotBytes(qaState.baseline.after.image);
    if(state.spec)files['index.html']=GameForgeGenerator.shell(state.spec.title,files['style.css'],files['game.js'],false);
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
    const text=GameForgeGenerator.shell(spec.title,state.files['style.css'],state.files['game.js'],true);
    fileBlob(new Blob([text],{type:'text/html;charset=utf-8'}),projectName().replace(/\s+/g,'-')+'.html');
    feedback('Jogo HTML autônomo exportado.');
  }
  async function generate(){
    if(qaState.candidate){feedback('Aceite ou descarte a correção candidata antes de gerar outro jogo.',true);return;}
    const spec=analyze();if(!spec)return;
    const mode=state.mode;
    $('generate').disabled=true;
    status('Gerando...');$('log').textContent=`[Studio] Interpretando GDD de ${spec.sourceLength} caracteres...`;
    try{
      if(mode==='offline'){
        state.files=GameForgeGenerator.generate(spec,$('gdd').value);
        state.files['RELATORIO_REFERENCIAS.md']=repoKnowledge.report(references())+'\nModo sem IA: estas recomendações não foram automaticamente aplicadas ao motor do jogo.\n';
        log(`[Sem IA] Tipo ${spec.genre}, ${spec.stages.length} fase(s), código gerado no navegador.`);
        log('[Sem IA] Mecânicas de modelos pré-programados. Não é interpretação integral de regras inéditas.');
        feedback('Jogo gerado sem IA. Ele já pode ser jogado, editado e exportado.');
      }else{
        const server=$('api-url').value.trim() || (!/github\.io$/i.test(location.hostname) && /^https?:$/.test(location.protocol)?location.origin:'');
        if(!server)throw new Error('Informe uma API HTTPS em “Servidor de IA”. O GitHub Pages não executa o backend.');
        if(!/^https?:\/\//.test(server))throw new Error('URL inválida do servidor (http:// ou https://).');
        if(location.protocol==='https:'&&server.startsWith('http://')&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(server))throw new Error('Use HTTPS para conectar um site HTTPS à API.');
        const payload={model:$('model').value.trim(),gdd:$('gdd').value,instruction:$('instruction').value,current_files:{'game.js':state.files['game.js']||'','style.css':state.files['style.css']||''},reference_ids:references().map(x=>x.id),read_sources:$('repo-live-sources').checked};
        log('[Com IA] Solicitando código ao servidor: '+server);
        const headers={'Content-Type':'application/json'};if($('api-token').value)headers['X-GameForge-Token']=$('api-token').value;
        const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),180000);
        let res;
        try{res=await fetch(server.replace(/\/$/,'')+'/api/studio/generate',{method:'POST',headers,body:JSON.stringify(payload),signal:ctrl.signal});}
        finally{clearTimeout(timeout);}
        const data=await res.json().catch(()=>({detail:`Erro HTTP ${res.status}`}));
        if(!res.ok)throw new Error(typeof data.detail==='string'?data.detail:JSON.stringify(data.detail||data).slice(0,300));
        if(!data.files||!data.files['game.js']||!data.files['style.css'])throw new Error('Resposta da IA incompleta: game.js e style.css são obrigatórios.');
        state.files={...GameForgeGenerator.generate(spec,$('gdd').value),...data.files};
        state.files['RELATORIO_REFERENCIAS.md']=repoKnowledge.report((data.references_used||[]).length?data.references_used:references())+'\nArquivos atuais lidos:\n'+((data.source_files_read||[]).map(x=>'- '+x).join('\n')||'- Nenhum (somente resumos curados)')+'\n\nReferências passadas como contexto ao modelo; aplicação concreta precisa de inspeção do código e testes.\n';
        state.files['RELATORIO_GERACAO.md']='# Relatório da IA\n\n'+(data.summary||'Código gerado com IA.')+'\n\n## Implementado\n'+(data.implemented||[]).map(x=>'- '+x).join('\n')+'\n\n## Pendências\n'+(data.pending||[]).map(x=>'- '+x).join('\n');
        log('[Com IA] '+(data.summary||'Concluído.'));
        if(data.checks)log('[Verificação] '+data.checks);
        log('[Biblioteca] '+(data.references_used||[]).length+' referências selecionadas; '+(data.source_files_read||[]).length+' arquivo(s) atual(is) do GitHub consultado(s).');
        feedback('A IA devolveu o código. Teste o jogo na prévia antes de publicar.');
      }
      state.generation++;state.spec=spec;
      qaState.last=null;qaState.baseline=null;qaState.vision=null;
      $('qa-before').removeAttribute('src');$('qa-after').removeAttribute('src');
      $('qa-report').textContent='Nenhuma inspeção realizada.'; qaButtons();
      listFiles();selectFile('game.js');runPreview();saveState();
    }catch(e){
      const message=e.name==='AbortError'?'A solicitação excedeu o tempo limite.':e.message;
      log('[Erro] '+message);feedback(message,true);status('Erro ao gerar',true);
    }finally{$('generate').disabled=false;}
  }
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
      await waitPreview();
      const report=await GameForgeVisualQA.run($('preview'),state.spec?.genre||'unknown',qaStatus);
      qaState.last=report;qaState.vision=null;
      $('qa-before').src=report.before.image;
      $('qa-after').src=report.after.image;
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
        model:$('model').value.trim(),gdd:$('gdd').value.slice(0,60000),instruction,
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
  $('qa-run').addEventListener('click',()=>qaRun().catch(()=>{}));
  $('qa-baseline').addEventListener('click',qaBaseline);
  $('qa-compare').addEventListener('click',qaCompare);
  $('qa-vision').addEventListener('click',qaVision);
  $('qa-repair').addEventListener('click',qaRepair);
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
  $('example').addEventListener('click',()=>{$('gdd').value=example;$('instruction').value='';$('project-name').value='Sombras do Vale';analyze();saveState();});
  $('md-file').addEventListener('change',async e=>{
    const file=e.target.files&&e.target.files[0];if(!file)return;
    if(!/\.(md|markdown)$/i.test(file.name)){feedback('Envie um GDD .md ou .markdown.',true);return;}
    if(file.size>200000){feedback('GDD muito grande: máximo de 200 KB.',true);return;}
    const value=await file.text();$('gdd').value=value.slice(0,100000);
    const parsed=analyze();if(parsed)$('project-name').value=parsed.title;
    $('file-indicator').textContent=file.name;feedback('GDD carregado: '+file.name);saveState();
  });
  document.querySelectorAll('input[name=mode]').forEach(radio=>radio.addEventListener('change',()=>{state.mode=radio.value;$('ai-settings').classList.toggle('hidden',state.mode!=='ai');$('generate').textContent=state.mode==='ai'?'✦ Criar / melhorar com IA':'▶ Gerar jogo a partir do GDD';qaButtons();}));
  $('generate').addEventListener('click',generate);
  $('rerun').addEventListener('click',runPreview);
  $('apply-edit').addEventListener('click',applyEdit);
  $('export').addEventListener('click',downloadZip);$('export-top').addEventListener('click',downloadZip);$('html-export').addEventListener('click',downloadHtml);
  $('open-game').addEventListener('click',()=>{const spec=state.spec||GameForgeParser.parseGdd($('gdd').value);const html=GameForgeGenerator.shell(spec.title,state.files['style.css'],state.files['game.js'],true);const blob=new Blob([html],{type:'text/html'});const url=URL.createObjectURL(blob);window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);});
  $('fullscreen').addEventListener('click',()=>{const el=$('preview-box');if(document.fullscreenElement)document.exitFullscreen();else if(el.requestFullscreen)el.requestFullscreen();});
  window.addEventListener('message',ev=>{if(ev.source!==$('preview').contentWindow)return;if(ev.data&&ev.data.kind==='gameforge-error'){log('[Prévia] '+String(ev.data.message).slice(0,400));status('Erro na prévia',true);}});
  $('file-editor').addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const t=e.target;const s=t.selectionStart;t.setRangeText('  ',s,t.selectionEnd,'end');}if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();applyEdit();}});
  $('gdd').addEventListener('input',()=>{renderReferences();});
  $('instruction').addEventListener('input',()=>{renderReferences();});
  $('repo-live-sources').addEventListener('change',saveState);
  $('gdd').addEventListener('change',saveState);$('instruction').addEventListener('change',saveState);$('project-name').addEventListener('change',saveState);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&!qaState.candidate)saveState();});
  restoreState();
  renderReferences();analyze();
})();
