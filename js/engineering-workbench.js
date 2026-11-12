/* GameForge v0.7 — advanced workbench + temporal Three.js QA. All actions require a local or configured backend. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('eng-project')) return;
  let candidate = '', selected = '', previewUrls = [];
  function endpoint() {
    const input = $('api-url')?.value.trim();
    if (input) return input.replace(/\/+$/, '');
    if (location.protocol === 'http:' || location.protocol === 'https:') return location.origin;
    return 'http://127.0.0.1:8765';
  }
  function headers() {
    const obj = {'Content-Type':'application/json'};
    const t=$('api-token')?.value;
    if (t) obj['X-GameForge-Token']=t;
    return obj;
  }
  function setStatus(msg, error=false) {
    $('eng-status').textContent=msg;
    $('eng-status').style.color=error?'#ffb2b8':'#9dcdd3';
  }
  function report(value) {
    $('eng-report').textContent=typeof value==='string'?value:JSON.stringify(value,null,2);
  }
  async function api(path,method='GET',body) {
    const ctrl=new AbortController(), timer=setTimeout(()=>ctrl.abort(),210000);
    try {
      const r=await fetch(endpoint()+path,{method,headers:headers(),body:body===undefined?undefined:JSON.stringify(body),signal:ctrl.signal});
      const result=await r.json().catch(()=>({detail:'Falha HTTP '+r.status}));
      if (!r.ok) throw new Error(typeof result.detail==='string'?result.detail:JSON.stringify(result.detail));
      return result;
    } finally {clearTimeout(timer);}
  }
  function resetCandidate() {
    candidate='';$('eng-accept').disabled=true;$('eng-discard').disabled=true;
    $('eng-diff-section').hidden=true;$('eng-diff').textContent='';
  }
  function currentProject() {
    selected=$('eng-project').value;
    if (!selected) throw Error('Escolha ou crie um projeto no backend primeiro.');
    return encodeURIComponent(selected);
  }
  async function execute(label,fun) {
    const buttons=['eng-refresh','eng-new','eng-import','eng-scan','eng-build','eng-test','eng-propose','eng-accept','eng-discard','eng-telemetry-install','eng-telemetry-test'];
    for (const name of buttons) $(name).disabled=true;
    setStatus(label);
    try {await fun();}
    catch (e) {setStatus(e.name==='AbortError'?'Tempo limite excedido.':e.message,true);report('Erro: '+e.message);}
    finally {
      for (const name of buttons) $(name).disabled=false;
      $('eng-accept').disabled=!candidate;$('eng-discard').disabled=!candidate;
    }
  }
  function safeText(t){return String(t??'');}
  async function refresh(selectName='') {
    const [state,projects]=await Promise.all([api('/api/engineer/status'),api('/api/projects')]);
    const names=Array.isArray(projects)?projects:[];
    $('eng-project').replaceChildren();
    const first=document.createElement('option');first.value='';first.textContent='Selecione o projeto...';$('eng-project').append(first);
    for(const project of names){const op=document.createElement('option');op.value=project.slug;op.textContent=project.name;$('eng-project').append(op);}
    if(selectName&&names.some(x=>x.slug===selectName))$('eng-project').value=selectName;
    else if(selected&&names.some(x=>x.slug===selected))$('eng-project').value=selected;
    selected=$('eng-project').value;
    setStatus('Backend conectado · OpenCode: '+(state.opencode_installed?'instalado':'não instalado')+' · Tree-sitter: '+(state.tree_sitter_installed?'instalado':'fallback Node')+' · Playwright: '+(state.playwright_installed?'instalado':'não instalado'));
  }
  $('eng-refresh').addEventListener('click',()=>execute('Conectando...',()=>refresh()));
  $('eng-new').addEventListener('click',()=>execute('Criando projeto...',async()=>{
    const name=$('eng-new-name').value.trim();if(name.length<2)throw Error('Digite o nome do jogo.');
    const response=await api('/api/projects','POST',{name});
    resetCandidate();await refresh(response.slug);report('Projeto '+response.name+' criado.\nUse o painel avançado /advanced ou os arquivos da pasta workspace para colocar seu código Three.js.');
  }));
  $('eng-import').addEventListener('click',()=>execute('Importando fontes em projeto isolado...',async()=>{
    const name=$('eng-new-name').value.trim()||$('project-name').value.trim();
    const file=$('eng-import-file').files?.[0];
    if (!file) throw Error('Selecione um arquivo ZIP com os códigos do jogo.');
    if (file.size>40*1024*1024) throw Error('ZIP maior que 40 MB. Envie somente os fontes.');
    const payload=new FormData();payload.set('name',name);payload.set('file',file);
    const token=$('api-token')?.value;
    const h={};if(token)h['X-GameForge-Token']=token;
    const resp=await fetch(endpoint()+'/api/engineer/import',{method:'POST',headers:h,body:payload});
    const result=await resp.json().catch(()=>({detail:'Erro de importação'}));
    if(!resp.ok) throw Error(result.detail||'Falha de importação');
    await refresh(result.slug);resetCandidate();report(result);
    setStatus('Importado: '+result.imported_count+' arquivos. Analise o código; talvez seja necessário adaptar o build.');
  }));
  $('eng-project').addEventListener('change',()=>{selected=$('eng-project').value;resetCandidate();});
  $('eng-scan').addEventListener('click',()=>execute('Analisando módulos...',async()=>{
    const data=await api('/api/engineer/'+currentProject()+'/scan');
    report('ARQUIVOS: '+data.files_scanned+' | FUNÇÕES: '+data.functions_found+' | IMPORTS: '+data.imports_found+'\n'+
      'MOTOR: '+(data.tree_sitter?'Tree-sitter AST':'Node --check/fallback')+'\n'+
      'PROBLEMAS: '+data.issues.length+'\n\n'+
      data.issues.slice(0,35).map(x=>x.file+': '+x.message).join('\n')+'\n\n'+
      data.files.slice(0,40).map(x=>x.path+' · '+x.functions.slice(0,8).join(', ')).join('\n')+'\n\n'+data.scope);
    setStatus('Varredura concluída: '+data.issues.length+' problema(s) sinalizados.');
  }));
  $('eng-build').addEventListener('click',()=>execute('Compilando...',async()=>{
    const result=await api('/api/build/'+currentProject(),'POST');
    report(result.log||result);setStatus(result.success?'Build concluído. Agora clique Executar e testar.':'Build falhou; analise o log.',!result.success);
  }));
  $('eng-test').addEventListener('click',()=>execute('Iniciando Chromium e capturando evidências...',async()=>{
    const project=currentProject();
    const data=await api('/api/engineer/'+project+'/test','POST');
    report(data);setStatus('Teste concluído: '+(data.passed?'sem erros fatais observados':'problemas detectados')+' · Quadros capturados: '+data.shots.length,!data.passed);
    for(const u of previewUrls)URL.revokeObjectURL(u);previewUrls=[];$('eng-shots').replaceChildren();
    for(const shot of data.shots){
      const r=await fetch(endpoint()+shot.url,{headers:headers()});if(!r.ok)continue;
      const uri=URL.createObjectURL(await r.blob());previewUrls.push(uri);
      const f=document.createElement('figure'),img=document.createElement('img'),cap=document.createElement('figcaption');
      img.src=uri;img.alt='Captura '+shot.name;cap.textContent=shot.name;
      f.append(img,cap);$('eng-shots').append(f);
    }
  }));
  $('eng-telemetry-install').addEventListener('click',()=>execute('Preparando módulo de telemetria...',async()=>{
    const result=await api('/api/engineer/'+currentProject()+'/telemetry/install','POST');
    $('eng-telemetry-instructions').hidden=false;
    $('eng-telemetry-instructions').open=true;
    $('eng-telemetry-snippet').textContent=result.snippet+'\n'+result.note;
    $('eng-telemetry-results').textContent=result.game_loop_connected?
      'Módulo e conexão encontrados. Faça o build e execute o QA temporal.':
      'Módulo instalado; ainda falta conectar o código do seu ator, câmera e loop de renderização (veja o exemplo).';
    report(result);
    setStatus(result.game_loop_connected?'Telemetria pronta para compilação.':'Módulo instalado, mas precisa de integração manual no loop do jogo.');
  }));
  $('eng-telemetry-test').addEventListener('click',()=>execute('Executando cenários temporais W/S/A/D...',async()=>{
    const project=currentProject();
    const result=await api('/api/engineer/'+project+'/telemetry','POST');
    const box=$('eng-telemetry-results');
    if(!result.instrumented){
      box.textContent='Não instrumentado: '+(result.reason||'O jogo não forneceu telemetria.');
      report(result);setStatus('Nenhuma medição real de personagem foi produzida.',true);return;
    }
    const lines=['Medições: '+(result.measured||[]).join(', '),
      'Não medidos: '+(result.not_measured||[]).join(', '),
      'Alertas: '+(result.issues||[]).length];
    for(const issue of (result.issues||[]).slice(0,12))
      lines.push('['+issue.severity+'] '+issue.scenario+' · '+issue.code+': '+issue.message);
    for(const sc of result.scenarios||[])
      lines.push(sc.name+' · '+sc.frames+' quadros · '+JSON.stringify(sc.measurements||{}));
    box.textContent=lines.join('\n');
    box.style.whiteSpace='pre-wrap';
    report(result);
    setStatus(result.issues?.length?'Telemetria coletada com alertas; revise a evidência.':'Telemetria coletada, sem alertas nos sinais medidos.',!!result.issues?.length);
    for(const u of previewUrls)URL.revokeObjectURL(u);previewUrls=[];$('eng-shots').replaceChildren();
    for(const shot of result.shots||[]){
      const r=await fetch(endpoint()+shot.url,{headers:headers()});if(!r.ok)continue;
      const uri=URL.createObjectURL(await r.blob());previewUrls.push(uri);
      const f=document.createElement('figure'),img=document.createElement('img'),cap=document.createElement('figcaption');
      img.src=uri;img.alt='Captura de animação '+shot.name;cap.textContent=shot.name;
      f.append(img,cap);$('eng-shots').append(f);
    }
  }));
  $('eng-propose').addEventListener('click',()=>execute('OpenCode analisando uma cópia dos arquivos...',async()=>{
    const project=currentProject();
    const userTask=$('eng-task').value.trim()||$('instruction').value.trim();
    if(!userTask)throw Error('Escreva a correção desejada.');
    const doc=$('eng-use-gdd').checked?$('gdd').value.slice(0,1900):'';
    const instruction=(userTask+'\n'+(doc?'GDD resumido (dados):\n'+doc:'')).slice(0,6500);
    const model=$('model').value.trim();
    const r=await api('/api/engineer/'+project+'/propose','POST',{instruction,model});
    resetCandidate();candidate=r.candidate_id||'';
    report(r.agent_output+'\n\n'+r.message+'\n\nArquivos: '+(r.changed||[]).map(x=>x.path).join(', '));
    if(candidate){$('eng-diff-section').hidden=false;$('eng-diff').textContent=r.diff;$('eng-diff-section').open=true;}
    setStatus(candidate?'Proposta pronta para revisar. Nenhum arquivo real foi alterado.':r.message);
  }));
  $('eng-accept').addEventListener('click',()=>execute('Aprovando a proposta...',async()=>{
    const project=currentProject();if(!candidate)throw Error('Nenhuma proposta pendente.');
    const r=await api('/api/engineer/'+project+'/accept','POST',{candidate_id:candidate});
    resetCandidate();report(r);setStatus('Alterações aprovadas. Backup criado. Compile e teste novamente.');
  }));
  $('eng-discard').addEventListener('click',()=>execute('Descartando proposta...',async()=>{
    const project=currentProject();if(!candidate)throw Error('Nenhuma proposta pendente.');
    await api('/api/engineer/'+project+'/discard','POST',{candidate_id:candidate});
    resetCandidate();report('Proposta descartada. Nenhum arquivo do jogo foi modificado.');setStatus('Proposta descartada.');
  }));
  // Do not make a cross-origin request automatically on Pages or reveal a token.
  if (location.hostname==='127.0.0.1'||location.hostname==='localhost')refresh().catch(()=>setStatus('Backend indisponível; inicie start.bat e clique Conectar.',true));
})();
