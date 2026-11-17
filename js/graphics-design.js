/* GF-GFX-01: linguagem visual -> parâmetros de renderização verificáveis. */
(function(root){
'use strict';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\bn\s+(?=quero|usar|ativar|ligar|ter)\b/g,'nao ');
const styles={pixel:/\b(pixel ?art|pixelad[oa]s?|16 ?bits?|8 ?bits?|estilo snes|estilo retro)\b/,
 cartoon:/\b(cartoon|desenho animado|cel shading|cel.shaded|estilo desenho)\b/,
 illustrated:/\b(ilustrad[oa]s?|pintad[oa]s? a mao|pintura digital|aquarela)\b/,
 natural:/\b(realista|realismo|naturalista|fotografico|fotorrealista)\b/,
 lowpoly:/\b(low ?poly|poucos poligonos|baixo poligono)\b/};
function compile(spec,gdd='',command='',options={}){
 const p={version:1,style:'illustrated',quality:'auto',atmosphere:'day',shadows:true,particles:true,theme:spec.visualStyle!=='auto'?spec.visualStyle:spec.worldOptions?.theme||'forest'};
 if(!['forest','neon','desert','ruins'].includes(p.theme))p.theme='forest';
 const pending=[],applied=[],warnings=[];
 const changes=[],origins={},excluded={style:new Set(),quality:new Set(),atmosphere:new Set(),theme:new Set()},advanced={};
 // Escopo por oração: listas herdam negação; um novo comando explícito a encerra.
 function negativeAt(text,index){
  const prefix=text.slice(0,index).split(/[;,.!?]|\b(?:mas|depois|agora|porem)\b/).pop();
  const markers=/\b(nao\s+(?:quero\s+)?(?:mais\s+)?(?:desativar|desligar|remover|tirar)|nao(?:\s+quero)?(?:\s+mais)?(?:\s+(?:usar|ativar|ligar|ter|com))?|sem|evitar|evite|desativar|desative|desativa|desligar|desligue|desliga|remover|remova|remove|tirar|tire|tira|retirar|retire|retira|com|quero|usar|use|colocar|coloque|ativar|ative|ativa|ligar|ligue|liga|manter|mantenha)\b/g;
  let negative=false;
  for(const m of prefix.matchAll(markers))negative=!/^nao\s+(?:quero\s+)?(?:mais\s+)?(?:desativar|desligar|remover|tirar)$/.test(m[0])&&/^(?:nao|sem|evit|desativ|deslig|remov|tir|retir)/.test(m[0]);
  return negative;
 }
 for(const [document,text] of [['GDD',gdd],['Comando',command]]){
  String(text||'').split(/\r?\n/).forEach((line,index)=>{
   const t=norm(line),events=[];
   const add=(field,value,re)=>{for(const m of t.matchAll(new RegExp(re.source,'g')))events.push({field,value,index:m.index,negative:negativeAt(t,m.index),origin:{document,line:index+1,excerpt:line.slice(0,160)}});};
   for(const [style,re] of Object.entries(styles))add('style',style,re);
   add('quality','high',/\b(qualidade (?:alta|maxima)|graficos? (?:melhores|detalhados|caprichados)|mais detalhes|visual detalhado)\b/);
   add('quality','medium',/\b(qualidade (?:media|equilibrada)|graficos? equilibrados)\b/);
   add('quality','low',/\b(qualidade (?:baixa|leve)|modo leve|celular fraco|rodar leve|graficos? leves)\b/);
   add('quality','auto',/\b(qualidade automatica|ajustar qualidade automaticamente)\b/);
   add('atmosphere','sunset',/\b(por do sol|entardecer|luz dourada|golden hour)\b/);
   add('atmosphere','night',/\b(cenario noturno|ambiente noturno|a noite|luz noturna)\b/);
   add('atmosphere','day',/\b(luz do dia|ambiente diurno|cenario diurno)\b/);
   for(const [theme,re] of Object.entries({forest:/\b(floresta|natureza|bosque)\b/,desert:/\b(deserto|desertico)\b/,neon:/\b(neon|cyberpunk)\b/,ruins:/\b(ruinas|templo antigo)\b/}))add('theme',theme,re);
   add('shadows',true,/\bsombras?\b/);add('particles',true,/\bparticulas?\b/);
   for(const [id,re] of Object.entries({photo:/\b(fotorrealista|fotografico)\b/,ray:/\bray tracing\b/,path:/\bpath tracing\b/,textures:/\btexturas? 4k\b/,unreal:/\bunreal engine\b/,nanite:/\bnanite\b/,lumen:/\blumen\b/}))add('advanced',id,re);
   events.sort((a,b)=>a.index-b.index);
   for(const event of events){
    const {field,value,negative,origin}=event;
    if(field==='advanced'){advanced[value]=!negative;continue;}
    if(field==='shadows'||field==='particles'){p[field]=!negative;}
    else if(negative){
     excluded[field].add(value);
     if(p[field]===value){
      const alternatives={style:['illustrated','cartoon','lowpoly','pixel','natural'],quality:['auto','medium','low','high'],atmosphere:['day','sunset','night'],theme:['forest','ruins','desert','neon']}[field];
      const fallback=alternatives.find(x=>!excluded[field].has(x));
      if(fallback===undefined){warnings.push('Todas as opções de '+field+' foram excluídas; mantenha ao menos uma opção suportada.');continue;}
      p[field]=fallback;
      warnings.push('Opção '+value+' removida; '+field+' usa '+fallback+' até receber outra escolha.');
     }
    }else{excluded[field].delete(value);p[field]=value;}
    origins[field]=origin;changes.push(event);
   }
  });
 }
 for(const [field,key,enabled] of [['quality','graphicsQuality',true],['quality','quality',spec.dimension==='3d'],['theme','visualStyle',true],['theme','theme',spec.dimension==='3d']]){
  if(enabled&&options[key]&&options[key]!=='auto'){p[field]=options[key];origins[field]={document:'Opções',line:null,excerpt:key+'='+options[key]};}
 }
 spec.renderInterpretation={version:1,origins,excluded:Object.fromEntries(Object.entries(excluded).map(([k,v])=>[k,[...v]])),note:'GDD antes do comando; última menção por campo prevalece. Opções manuais têm prioridade. Exclusões sem alternativa usam fallback informado nos avisos.'};
 const explicit=changes.length>0||p.quality!=='auto';
 spec.renderProfile=p;
 spec.graphicsQuality=p.quality;spec.worldOptions={...spec.worldOptions,quality:p.quality};
 spec.visualStyle=p.theme;spec.worldOptions={...spec.worldOptions,theme:p.theme};
 if(explicit)applied.push({id:'visual-profile',description:'Perfil visual '+p.style+' · qualidade '+p.quality+' · '+p.atmosphere+' · '+p.theme,where:'Renderização '+spec.dimension,detail:(origins.style||origins.quality||origins.shadows||origins.particles||origins.theme||origins.atmosphere)?.document+' linha '+((origins.style||origins.quality||origins.shadows||origins.particles||origins.theme||origins.atmosphere)?.line||1)});
 if(Object.values(advanced).some(Boolean))pending.push({id:'advanced-graphics',description:'Fotorrealismo, ray tracing e assets de alta resolução exigem pipeline e conteúdo próprios; o perfil naturalista continua procedural',where:'Gráficos avançados'});
 if(p.style==='pixel'&&spec.dimension==='3d')warnings.push('Pixel art em 3D usa resolução reduzida com bordas nítidas; modelos continuam tridimensionais procedurais.');
 return {profile:p,applied,pending,warnings,origins};
}
root.GameForgeGraphicsDesign={compile,norm,styles};
if(typeof module!=='undefined')module.exports=root.GameForgeGraphicsDesign;
})(typeof globalThis!=='undefined'?globalThis:this);
