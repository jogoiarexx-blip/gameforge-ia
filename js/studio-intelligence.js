/* GameForge GF-ARCH-12 — análise local e auditável, sem execução de código de terceiros.
 * Inspirado em Graphify (relações explícitas), Game Studios (brief/gates) e
 * DeepSeek Harness (extensões por contrato). Não inclui as bibliotecas externas. */
(function(root){
'use strict';
const ALLOWED=new Set(['read-spec','read-files','write-plan']);
const toText=(x,max=1200)=>String(x==null?'':x).slice(0,max);
function normalizedPath(path){
  const parts=[];
  for(const part of String(path||'').replace(/\\/g,'/').split('/')){
    if(!part||part==='.')continue;
    if(part==='..'){if(!parts.length)return null;parts.pop();continue;}
    parts.push(part);
  }
  return parts.join('/');
}
function resolvePath(source,reference){
  const ref=String(reference||'').split(/[?#]/)[0];
  if(!ref||/^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(ref))return null;
  const folder=source.includes('/')?source.slice(0,source.lastIndexOf('/')+1):'';
  return normalizedPath((ref[0]==='/'?'':folder)+ref.replace(/^\/+/,''));
}
function dependencyGraph(files){
  const entries=Object.entries(files||{}).filter(([k,v])=>typeof v==='string'&&v.length<2500000).slice(0,300);
  const paths=new Set(entries.map(([p])=>normalizedPath(p)).filter(Boolean));
  const nodes=[...paths].sort(),edges=[],missing=[],seen=new Set();
  for(const [source,body] of entries){
    const from=normalizedPath(source);
    if(!from)continue;
    const regexes=[];
    if(/\.(?:js|mjs|cjs|ts)$/i.test(from)){
      regexes.push(/\b(?:import\s*(?:[\s\S]{0,150}?\s+from\s*)?|export\s+[\s\S]{0,150}?\s+from\s*|require\s*\(|import\s*\()\s*['"]([^'"]+)['"]/g);
    }
    if(/\.html?$/i.test(from)){
      regexes.push(/<(?:script|link)\b[^>]*?\b(?:src|href)\s*=\s*['"]([^'"]+)['"][^>]*>/gi);
    }
    if(/\.css$/i.test(from))regexes.push(/@import\s+(?:url\()?['"]([^'"]+)['"]/gi);
    for(const re of regexes){
      let match;
      while((match=re.exec(body))){
        const raw=match[1];
        if(!raw||(!raw.startsWith('.')&&!raw.startsWith('/')&&!/\.html?$/i.test(from)))continue;
        const target=resolvePath(from,raw);
        if(!target||target===from)continue;
        const id=from+' -> '+target;
        if(seen.has(id))continue;seen.add(id);
        const row={from,to:target,relation:'imports',evidence:'EXTRACTED'};
        if(paths.has(target))edges.push(row);
        else if(raw.startsWith('.')||raw.startsWith('/'))missing.push(row);
      }
    }
  }
  return {version:1,method:'Referências textuais explícitas; não AST nem análise de chamadas',nodes,edges,unresolved:missing};
}
function affectedFiles(graph,changed=['game.js']){
  const affected=new Set((changed||[]).map(normalizedPath).filter(Boolean));
  const queue=[...affected];
  for(let n=0;n<queue.length;n++){
    if(n>300)break;
    for(const edge of graph.edges){
      if(edge.to===queue[n]&&!affected.has(edge.from)){
        affected.add(edge.from);queue.push(edge.from);
      }
    }
  }
  return [...affected].filter(x=>graph.nodes.includes(x)).sort();
}
function brief(input){
  const spec=input.spec||{}, instruction=toText(input.instruction,4000).trim();
  const restrictions=[];
  for(const part of instruction.split(/[.!?\n;]/)){
    if(/\b(?:n[aã]o|sem|evit[ae]|preserv[ae]|mantenh[ao]|nunca)\b/i.test(part.trim()))
      restrictions.push(part.trim().slice(0,160));
  }
  const stages=Array.isArray(spec.stages)?spec.stages.length:null;
  return {
    version:1,
    name:toText(spec.name||spec.title||'Projeto sem título',90),
    genre:toText(spec.genre||'não identificado',40),
    dimension:toText(spec.dimension||'não identificada',20),
    instruction:instruction.slice(0,1200),
    restrictions:[...new Set(restrictions)].slice(0,12),
    stages:stages,
    pending:Array.isArray(spec.implementation?.pending)?spec.implementation.pending.slice(0,12).map(x=>toText(x.description||x,160)):[],
    note:'Resumo de dados disponíveis, não prova de que as mecânicas funcionam.'
  };
}
function gate(input){
  const files=input.files||{},hasGame=typeof files['game.js']==='string'&&files['game.js'].length>0;
  const checks=[
    {id:'syntax',name:'Sintaxe JavaScript e carregamento',status:'pending'},
    {id:'preview',name:'Prévia jogável e comandos',status:'pending'},
    {id:'regression',name:'Regressão e comparação com o checkpoint',status:'pending'},
    {id:'human',name:'Teste manual por uma pessoa',status:'pending'}
  ];
  return {status:hasGame?'needs-validation':'blocked',
    reason:hasGame?'Testes ainda não executados por este módulo.':'Primeiro gere o jogo; não existe game.js para validar.',
    checks,checkpoint:'Antes de aceitar alterações, preserve o projeto atual via backup e valide a prévia.'};
}
function createHarness(){
  const plugins=new Map();
  function register(plugin){
    if(!plugin||!(/^[a-z][a-z0-9.-]{1,50}$/).test(plugin.id)||typeof plugin.run!=='function')
      throw Error('Plugin inválido: exige id seguro e função run.');
    if(plugins.has(plugin.id))throw Error('Plugin já registrado: '+plugin.id);
    const capabilities=plugin.capabilities||[];
    if(!Array.isArray(capabilities)||capabilities.some(c=>!ALLOWED.has(c)))
      throw Error('Permissão não autorizada: '+plugin.id);
    plugins.set(plugin.id,{id:plugin.id,capabilities:[...capabilities],run:plugin.run});
  }
  function execute(input={}){
    const source={instruction:toText(input.instruction,12000),spec:input.spec||{},
      files:input.files||{},changedFiles:Array.isArray(input.changedFiles)?input.changedFiles.slice(0,30):['game.js']};
    const context=Object.freeze({instruction:source.instruction,
      spec:Object.freeze({...source.spec}),files:Object.freeze({...source.files}),
      changedFiles:Object.freeze([...source.changedFiles])});
    const output={plugins:[],brief:null,graph:null,impact:[],gate:null};
    for(const plugin of plugins.values()){
      const result=plugin.run(context);
      if(!result||typeof result!=='object'||Array.isArray(result))throw Error('Resultado inválido do plugin '+plugin.id);
      for(const field of ['brief','graph','impact','gate']){
        if(Object.prototype.hasOwnProperty.call(result,field)){
          if(output[field]!=null&&(field!=='impact'||output.impact.length))throw Error('Campo duplicado: '+field);
          output[field]=result[field];
        }
      }
      output.plugins.push(plugin.id);
    }
    return output;
  }
  return {register,execute,list:()=>[...plugins.values()].map(p=>({id:p.id,capabilities:[...p.capabilities]}))};
}
function createDefaultHarness(){
  const h=createHarness();
  h.register({id:'studio-brief',capabilities:['read-spec','write-plan'],run:c=>({brief:brief(c)})});
  h.register({id:'graph-impact',capabilities:['read-files','write-plan'],run:c=>{
    const graph=dependencyGraph(c.files);
    return {graph,impact:affectedFiles(graph,c.changedFiles)};
  }});
  h.register({id:'qa-gate',capabilities:['read-files','write-plan'],run:c=>({gate:gate(c)})});
  return h;
}
function review(input){return createDefaultHarness().execute(input);}
function report(result){
  const b=result?.brief||{},g=result?.graph||{nodes:[],edges:[],unresolved:[]},q=result?.gate||{checks:[],status:'blocked'};
  return '# GameForge — Studio Intelligence GF-ARCH-12\n\n'+
    '## Brief verificável\n'+
    '- Nome: '+(b.name||'não informado')+'\n- Motor: '+(b.genre||'?')+' / '+(b.dimension||'?')+
    '\n- Fases declaradas: '+(b.stages==null?'não informadas':b.stages)+
    '\n- Pedido original (trecho): '+(b.instruction||'não informado')+
    '\n- Restrições explícitas: '+((b.restrictions||[]).join('; ')||'nenhuma identificada')+
    '\n- Requisitos pendentes: '+((b.pending||[]).join('; ')||'nenhum identificado')+
    '\n\n## Grafo de dependências extraídas\n'+
    '- Método: '+g.method+'\n- Arquivos examinados: '+g.nodes.length+
    '\n- Relações confirmadas no texto: '+g.edges.length+
    '\n- Referências sem alvo nos arquivos fornecidos: '+g.unresolved.length+
    '\n- Arquivos potencialmente impactados: '+((result.impact||[]).join(', ')||'não determinados')+
    '\n\n## Gate de qualidade e checkpoint\n'+
    '- Situação: '+q.status+' — '+(q.reason||'')+'\n'+
    (q.checks||[]).map(c=>'- [ ] '+c.name+' (não executado)').join('\n')+
    '\n- '+(q.checkpoint||'')+
    '\n\n**Limite:** grafo textual não verifica chamadas dinâmicas, runtime, desempenho ou mecânicas. Nenhum teste é marcado como aprovado sem execução.\n';
}
root.GameForgeStudioIntelligence={createHarness,createDefaultHarness,dependencyGraph,affectedFiles,brief,gate,review,report};
if(typeof module!=='undefined')module.exports=root.GameForgeStudioIntelligence;
})(typeof globalThis!=='undefined'?globalThis:this);
