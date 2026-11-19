/* GF-ARCH-14 — rastreio lexical de código por arquivo e linha.
   Não executa código nem equivale a uma AST com resolução de escopos. */
(function(root){
'use strict';
const identifierStart=x=>/[A-Za-z_$]/.test(x||'');
const identifierPart=x=>/[A-Za-z0-9_$]/.test(x||'');
function tokenize(source,limit=45000){
 const src=String(source||''),out=[],len=Math.min(src.length,2500000);
 let i=0,line=1,prev='';
 function skipString(quote){
  i++;
  while(i<len){
   const char=src[i++];
   if(char==='\\'){if(src[i]==='\n')line++;i++;continue;}
   if(char==='\n')line++;
   if(char===quote)break;
  }
 }
 while(i<len&&out.length<limit){
  const c=src[i],next=src[i+1];
  if(c==='\n'){line++;i++;continue;}
  if(/\s/.test(c)){i++;continue;}
  if(c==='/'&&next==='/'){i+=2;while(i<len&&src[i]!=='\n')i++;continue;}
  if(c==='/'&&next==='*'){
   i+=2;
   while(i<len&&!(src[i]==='*'&&src[i+1]==='/')){if(src[i]==='\n')line++;i++;}
   i=Math.min(len,i+2);continue;
  }
  if(c==='"'||c==="'"||c===String.fromCharCode(96)){skipString(c);prev='literal';continue;}
  if(identifierStart(c)){
   const start=i,at=line;i++;
   while(i<len&&identifierPart(src[i]))i++;
   const value=src.slice(start,i);out.push({value,line:at,offset:start});prev=value;continue;
  }
  if(/[0-9]/.test(c)){i++;while(i<len&&/[0-9a-fA-F._]/.test(src[i]))i++;prev='number';continue;}
  if(c==='='&&next==='>'){out.push({value:'=>',line,offset:i});i+=2;prev='=>';continue;}
  if(c==='/'&&/^(?:=|return|=>|\(|\[|,|:|!)$/.test(prev)){
   i++;let bracket=false,escaped=false;
   while(i<len){
    const x=src[i++];if(x==='\n'){line++;break;}
    if(escaped){escaped=false;continue;}
    if(x==='\\'){escaped=true;continue;}
    if(x==='[')bracket=true;
    else if(x===']')bracket=false;
    else if(x==='/'&&!bracket)break;
   }
   while(i<len&&/[a-z]/i.test(src[i]))i++;prev='regex';continue;
  }
  if('(){}[].=,:;?*!+-'.includes(c)){out.push({value:c,line,offset:i});prev=c;}
  i++;
 }
 return {tokens:out,truncated:src.length>len||out.length>=limit};
}
function index(files={}){
 const entries=Object.entries(files).filter(([p,c])=>/\.(js|mjs|cjs|ts)$/i.test(p)&&typeof c==='string').slice(0,180);
 const definitions=[],references=[],warnings=[];
 for(const [path,code] of entries){
  const scan=tokenize(code),t=scan.tokens,declared=new Set();
  if(scan.truncated)warnings.push(path+': análise limitada por orçamento');
  function define(kind,i,evidence){
   const token=t[i];if(!token||!identifierStart(token.value[0])||declared.has(i))return;
   declared.add(i);
   if(definitions.length<1400)definitions.push({name:token.value,kind,file:path,line:token.line,offset:token.offset,evidence});
  }
  for(let i=0;i<t.length;i++){
   const v=t[i].value;
   if((v==='function'||v==='class')&&t[i+1]&&identifierStart(t[i+1].value[0])){
    define(v,i+1,'EXTRACTED');continue;
   }
   if(['const','let','var'].includes(v)&&t[i+2]?.value==='='){
    for(let k=i+3;k<Math.min(t.length,i+30);k++){
     if(t[k].value===';'||t[k].line>t[i].line+7)break;
     if(t[k].value==='=>'||t[k].value==='function'){define('callable-binding',i+1,'HEURISTIC');break;}
    }
   }
   if(['root','window','globalThis'].includes(v)&&t[i+1]?.value==='.'&&/^GameForge[A-Za-z0-9_]+$/.test(t[i+2]?.value||'')&&t[i+3]?.value==='='){
    define('global-export',i+2,'EXTRACTED');
   }
  }
  for(let i=0;i<t.length;i++){
   const v=t[i].value,call=t[i+1]?.value==='(';
   if(!/^GameForge[A-Za-z0-9_]+$/.test(v)&&!(call&&identifierStart(v[0])))continue;
   if(declared.has(i)||t[i-1]?.value==='function')continue;
   if(t[i-1]?.value==='.'&&call)continue;
   if(t[i-1]?.value==='.'&&t[i+1]?.value==='=')continue;
   if(references.length<2500)references.push({name:v,file:path,line:t[i].line,method:call?'CALL':'SYMBOL_REFERENCE',evidence:'LEXICAL'});
  }
 }
 const definitionsByName=new Map();
 for(const d of definitions){
  const matches=definitionsByName.get(d.name)||[];matches.push(d);definitionsByName.set(d.name,matches);
 }
 const links=[],seen=new Set();
 for(const ref of references){
  const defs=definitionsByName.get(ref.name)||[];
  if(defs.length!==1||defs[0].file===ref.file)continue;
  const d=defs[0],key=ref.file+'|'+d.file+'|'+ref.name;
  if(seen.has(key))continue;seen.add(key);
  links.push({from:ref.file,to:d.file,symbol:ref.name,referenceLine:ref.line,definitionLine:d.line,relation:ref.method,evidence:'INFERRED'});
  if(links.length>=750){warnings.push('Conexões limitadas a 750 entradas');break;}
 }
 return {version:14,method:'Tokenização lexical conservadora, não AST',files:entries.map(([name])=>name),definitions,references,links,warnings,capabilities:{parsesScopes:false,parsesTemplates:false,executesCode:false}};
}
function locationFor(model,name){
 return (model?.definitions||[]).filter(d=>d.name===name).map(d=>({file:d.file,line:d.line,kind:d.kind,evidence:d.evidence}));
}
function report(model,limit=35){
 const m=model||{},symbols=m.definitions||[],links=m.links||[];
 const lines=['# GameForge — Mapa lexical GF-ARCH-14','',
  'Método: '+(m.method||'não disponível'),
  'Arquivos analisados: '+(m.files||[]).length,
  'Declarações: '+symbols.length,'Relações inferidas: '+links.length,'','## Declarações'];
 for(const d of symbols.slice(0,limit))lines.push('- '+d.name+' — '+d.file+':'+d.line+' ['+d.kind+' / '+d.evidence+']');
 if(symbols.length>limit)lines.push('- Demais declarações no arquivo JSON completo.');
 lines.push('','## Relações possíveis entre módulos');
 for(const link of links.slice(0,limit))lines.push('- '+link.from+':'+link.referenceLine+' → '+link.to+':'+link.definitionLine+' ('+link.symbol+')');
 lines.push('','**Limites:** não resolve escopos nem código dinâmico; relações inferidas não provam chamadas reais ou cobertura de testes.');
 return lines.join('\n')+'\n';
}
const api={tokenize,index,locationFor,report};
root.GameForgeCodeProvenance=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
