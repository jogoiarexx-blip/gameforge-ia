'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../css/app.css'),'utf8');

test('layout preserva controles essenciais únicos e scripts de geração',()=>{
 const matches=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 const ids=new Set(matches);
 assert.equal(ids.size,matches.length,'IDs duplicados impedem vinculação dos eventos');
 for(const id of [
  'project-name','gdd','md-file','analyze','game-dimension','game-style',
  'instruction','generate','rerun','preview','preview-box','status',
  'file-list','file-editor','apply-edit','export','html-export',
  'project-backup','project-open','rpg-layout-json',
  'roadmap-rebuild','stage-save','plan-improvement','improve',
  'qa-run','eng-project','scene-asset-file','model-file'
 ])assert.ok(ids.has(id),'Controle removido do DOM: '+id);
 assert.match(html,/src="\.\/js\/app\.js"/);
 assert.match(html,/src="\.\/js\/project-backup\.js"/);
});

test('seções avançadas ficam recolhidas e todas possuem resumo acessível',()=>{
 const classes=['backup','rpg','engine','examples','knowledge','roadmap','stage',
  'development','qa','engineering','model','log','tools-collection'];
 for(const name of classes)assert.match(html,new RegExp('class="studio-disclosure '+name+'-?disclosure?"|class="studio-disclosure '+name+'"'),'Seção ausente: '+name);
 const starts=[...html.matchAll(/<details\b[^>]*>/g)].length;
 const ends=[...html.matchAll(/<\/details>/g)].length;
 const summaries=[...html.matchAll(/<summary\b[^>]*>/g)].length;
 assert.equal(starts,ends);
 assert.equal(starts,summaries);
 assert.ok(starts>=15);
 assert.ok(!/<details[^>]*\bopen(?:\s|>|=)/i.test(html),'A interface deve começar simples');
});

test('fluxo principal existe fora dos menus avançados e prévia vem antes das ferramentas',()=>{
 let detailDepth=0;
 const clearIds=new Set(['project-name','gdd','md-file','generate','preview-box','preview','file-editor','export']);
 const found=new Set();
 const tokenizer=/<\/details>|<details\b[^>]*>|<[^>]+\bid="[^"]+"[^>]*>/g;
 for(const token of html.matchAll(tokenizer)){
  const tag=token[0];
  if(tag.startsWith('</details')){detailDepth--;assert.ok(detailDepth>=0);continue;}
  if(tag.startsWith('<details')){detailDepth++;continue;}
  const id=tag.match(/\bid="([^"]+)"/)?.[1];
  if(clearIds.has(id)){
   assert.equal(detailDepth,0,id+' precisa ser acessível sem expandir menus');
   found.add(id);
  }
 }
 assert.equal(detailDepth,0);
 assert.equal(found.size,clearIds.size);
 assert.ok(html.indexOf('id="preview-box"')<html.indexOf('class="studio-disclosure tools-collection"'));
 assert.ok(html.indexOf('id="generate"')<html.indexOf('id="preview-box"'));
});

test('estilos dão prioridade ao centro, responsividade e foco de teclado',()=>{
 assert.match(css,/\.studio\s*\{[\s\S]*?grid-template-columns:minmax\(270px,310px\) minmax\(0,1fr\) minmax\(270px,300px\)/);
 assert.match(css,/\.studio-disclosure>summary:focus-visible/);
 assert.match(css,/@media\(max-width:780px\)/);
 assert.doesNotMatch(css,/\.left-panel \.panel-scroll>[^{}\n]+\{order:/,'Fluxo não deve usar CSS order');
 assert.match(css,/\.center-panel \.preview-box\s*\{/);
});

test('ordem real do DOM acompanha os campos visíveis e o teclado',()=>{
 const left=html.slice(html.indexOf('<section class="panel left-panel"'),html.indexOf('<section class="panel center-panel"'));
 const markers=[
  'for="project-name"','id="project-name"','class="label-row"','class="file-pick"',
  'id="gdd"','id="analyze"','id="analysis"','class="step-continue"',
  'class="studio-disclosure engine-disclosure"','class="studio-disclosure examples-disclosure"',
  'class="studio-disclosure backup-disclosure"','class="studio-disclosure rpg-disclosure"',
  'class="studio-disclosure knowledge-disclosure"'
 ];
 let previous=-1;
 for(const marker of markers){
   const index=left.indexOf(marker);
   assert.ok(index>previous,'Ordem visual/teclado incorreta: '+marker);
   previous=index;
 }
});
