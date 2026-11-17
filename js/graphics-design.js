/* GF-GFX-01: linguagem visual -> parâmetros de renderização verificáveis. */
(function(root){
'use strict';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const styles={pixel:/\b(pixel ?art|pixelad[oa]s?|16 ?bits?|8 ?bits?|estilo snes|estilo retro)\b/,
 cartoon:/\b(cartoon|desenho animado|cel shading|cel.shaded|estilo desenho)\b/,
 illustrated:/\b(ilustrad[oa]s?|pintad[oa]s? a mao|pintura digital|aquarela)\b/,
 natural:/\b(realista|realismo|naturalista|fotografico|fotorrealista)\b/,
 lowpoly:/\b(low ?poly|poucos poligonos|baixo poligono)\b/};
function compile(spec,gdd='',command='',options={}){
 const p={version:1,style:'illustrated',quality:'auto',atmosphere:'day',shadows:true,particles:true,theme:spec.visualStyle!=='auto'?spec.visualStyle:spec.worldOptions?.theme||'forest'};
 if(!['forest','neon','desert','ruins'].includes(p.theme))p.theme='forest';
 const pending=[],applied=[],warnings=[];
 const changes=[];
 for(const [document,text] of [['GDD',gdd],['Comando',command]]){
  String(text||'').split(/\r?\n/).forEach((line,index)=>{
   // Ordem textual e negação local; proibir uma opção não equivale a pedi-la.
   const t=norm(line);
   const add=(field,value,re)=>{for(const m of t.matchAll(new RegExp(re.source,'g'))){
    const prefix=t.slice(0,m.index).split(/[;,.!?]|\b(?:mas|com)\b/).pop();
    if(/\b(sem|nao quero|nao usar|evitar)\b.{0,55}$/.test(prefix))continue;
    changes.push({field,value,index:m.index,origin:{document,line:index+1,excerpt:line.slice(0,160)}});
   }};
   const offset=changes.length;
   for(const [style,re] of Object.entries(styles))add('style',style,re);
   add('quality','high',/\b(qualidade (?:alta|maxima)|graficos? (?:melhores|detalhados|caprichados)|mais detalhes|visual detalhado)\b/);
   add('quality','medium',/\b(qualidade (?:media|equilibrada)|graficos? equilibrados)\b/);
   add('quality','low',/\b(qualidade (?:baixa|leve)|modo leve|celular fraco|rodar leve|graficos? leves)\b/);
   add('quality','auto',/\b(qualidade automatica|ajustar qualidade automaticamente)\b/);
   add('atmosphere','sunset',/\b(por do sol|entardecer|luz dourada|golden hour)\b/);
   add('atmosphere','night',/\b(cenario noturno|ambiente noturno|a noite|luz noturna)\b/);
   add('atmosphere','day',/\b(luz do dia|ambiente diurno|cenario diurno)\b/);
   for(const [theme,re] of Object.entries({forest:/\b(floresta|natureza|bosque)\b/,desert:/\b(deserto|desertico)\b/,neon:/\b(neon|cyberpunk)\b/,ruins:/\b(ruinas|templo antigo)\b/}))add('theme',theme,re);
   // Estas são opções negativas com suporte real, independentes de estilos.
   for(const [field,value,re] of [
    ['shadows',false,/\b(sem sombras?|desativar sombras?|nao quero sombras?)\b/],['shadows',true,/\b(com sombras?|ativar sombras?)\b/],
    ['particles',false,/\b(sem particulas?|desativar particulas?|nao quero particulas?)\b/],['particles',true,/\b(com particulas?|ativar particulas?)\b/]]){
    for(const m of t.matchAll(new RegExp(re.source,'g')))changes.push({field,value,index:m.index,origin:{document,line:index+1,excerpt:line.slice(0,160)}});
   }
   const sorted=changes.splice(offset).sort((a,b)=>a.index-b.index);changes.push(...sorted);
  });
 }
 const origins={};for(const c of changes){p[c.field]=c.value;origins[c.field]=c.origin;}
 if(options.graphicsQuality&&options.graphicsQuality!=='auto')p.quality=options.graphicsQuality;
 if(options.quality&&options.quality!=='auto'&&spec.dimension==='3d')p.quality=options.quality;
 if(options.visualStyle&&options.visualStyle!=='auto')p.theme=options.visualStyle;
 if(options.theme&&options.theme!=='auto'&&spec.dimension==='3d')p.theme=options.theme;
 const explicit=changes.length>0||p.quality!=='auto';
 spec.renderProfile=p;
 if(p.quality!=='auto'){spec.graphicsQuality=p.quality;spec.worldOptions={...spec.worldOptions,quality:p.quality};}
 spec.visualStyle=p.theme;spec.worldOptions={...spec.worldOptions,theme:p.theme};
 if(explicit)applied.push({id:'visual-profile',description:'Perfil visual '+p.style+' · qualidade '+p.quality+' · '+p.atmosphere+' · '+p.theme,where:'Renderização '+spec.dimension,detail:(origins.style||origins.quality)?.document+' linha '+((origins.style||origins.quality)?.line||1)});
 const t=norm(gdd+'\n'+command);
 if(/\b(fotorrealista|fotografico|ray tracing|path tracing|texturas? 4k|unreal engine|nanite|lumen)\b/.test(t))pending.push({id:'advanced-graphics',description:'Fotorrealismo, ray tracing e assets de alta resolução exigem pipeline e conteúdo próprios; o perfil naturalista continua procedural',where:'Gráficos avançados'});
 if(p.style==='pixel'&&spec.dimension==='3d')warnings.push('Pixel art em 3D usa resolução reduzida com bordas nítidas; modelos continuam tridimensionais procedurais.');
 return {profile:p,applied,pending,warnings,origins};
}
root.GameForgeGraphicsDesign={compile,norm,styles};
if(typeof module!=='undefined')module.exports=root.GameForgeGraphicsDesign;
})(typeof globalThis!=='undefined'?globalThis:this);
