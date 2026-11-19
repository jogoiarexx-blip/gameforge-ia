#!/usr/bin/env node
'use strict';
// Inspeção local do motor GameForge, sem rede, IA externa ou escrita de arquivos.
const fs=require('node:fs');
const path=require('node:path');
const S=require('../js/studio-intelligence');
const root=path.resolve(__dirname,'..');
function gather(){
  const files={};
  for(const dir of ['js','tests','css']){
    const abs=path.join(root,dir);
    for(const name of fs.readdirSync(abs)){
      if(!/\.(?:js|css)$/i.test(name))continue;
      const rel=dir+'/'+name;
      files[rel]=fs.readFileSync(path.join(abs,name),'utf8');
    }
  }
  files['index.html']=fs.readFileSync(path.join(root,'index.html'),'utf8');
  return files;
}
function analyze(changed){
  const graph=S.engineGraph(gather());
  const impact=changed?S.affectedFiles(graph,[changed]):[];
  const incoming=new Map(graph.nodes.map(n=>[n,0]));
  for(const e of graph.edges)incoming.set(e.to,(incoming.get(e.to)||0)+1);
  const central=[...incoming].sort((a,b)=>b[1]-a[1]).slice(0,12);
  return {graph,impact,central};
}
function main(){
  const args=process.argv.slice(2),pos=args.indexOf('--impact');
  const changed=pos>=0?args[pos+1]:null;
  if(pos>=0&&(!changed||changed.startsWith('--')))throw Error('Informe caminho após --impact');
  const result=analyze(changed);
  if(args.includes('--json')){process.stdout.write(JSON.stringify(result,null,2)+'\n');return;}
  const g=result.graph;
  console.log('GameForge — Mapa local de dependências GF-ARCH-12');
  console.log('Arquivos: '+g.nodes.length+'; relações extraídas/inferidas: '+g.edges.filter(e=>e.evidence==='EXTRACTED').length+'/'+g.edges.filter(e=>e.evidence==='INFERRED').length);
  console.log('Arquivos com maior número de referências de entrada:');
  for(const [name,count] of result.central)console.log('  '+name+': '+count);
  if(changed)console.log('Impacto potencial de '+changed+': '+(result.impact.join(', ')||'não encontrado no grafo'));
  console.log('NOTA: referências inferidas são apenas indícios; não substituem testes ou AST.');
}
if(require.main===module)main();
module.exports={gather,analyze};
