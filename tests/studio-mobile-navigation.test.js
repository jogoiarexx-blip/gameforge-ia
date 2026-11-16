'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../css/app.css'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');

test('atalhos do celular apontam para quatro etapas existentes e únicas',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(ids.length,new Set(ids).size,'IDs duplicados no Studio');
 const nav=html.match(/<nav class="mobile-steps"[^>]*>([\s\S]*?)<\/nav>/);
 assert.ok(nav,'navegação mobile presente');
 const targets=[...nav[1].matchAll(/href="#([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(targets,['idea-step','create-step','preview-step','files-step']);
 for(const id of targets)assert.equal(ids.filter(item=>item===id).length,1,'Destino único: '+id);
 assert.match(html,/class="step-continue" href="#create-step"/);
});
test('atalhos não inserem ferramentas avançadas na tela principal',()=>{
 const pos=name=>html.indexOf(name);
 assert.ok(pos('id="idea-step"')<pos('id="create-step"'));
 assert.ok(pos('id="create-step"')<pos('id="preview-step"'));
 assert.ok(pos('id="preview-step"')<pos('class="studio-disclosure tools-collection"'));
 for(const cls of ['roadmap-disclosure','stage-disclosure','development-disclosure']){
  assert.match(html,new RegExp('class="studio-disclosure '+cls+'"'));
 }
 assert.ok(!/<details\b[^>]*\bopen(?:\s|=|>)/i.test(html),'Ferramentas começam recolhidas');
});
test('CSS protege navegação, foco, breakpoints e modo tela cheia',()=>{
 assert.match(css,/\.mobile-steps a:focus-visible/);
 assert.match(css,/@media\s*\(max-width:780px\)/);
 assert.match(css,/@media\s*\(max-width:400px\)/);
 assert.match(css,/\.center-panel \.preview-box:fullscreen\{/);
 assert.match(css,/height:100dvh;min-height:0/);
 assert.match(css,/scroll-margin-top:132px/);
 assert.match(css,/@media\s*\(prefers-reduced-motion:reduce\)/);
});
test('criação concluída leva para a prévia só no celular e respeita movimento reduzido',()=>{
 assert.match(app,/window\.matchMedia\('\(max-width: 780px\)'\)/);
 assert.match(app,/window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
 assert.match(app,/\$\('preview-step'\)\.scrollIntoView\(/);
 assert.ok(app.indexOf("listFiles();selectFile('game.js');runPreview();roadmapRender();saveState();")<
  app.indexOf("$('preview-step').scrollIntoView("));
});
