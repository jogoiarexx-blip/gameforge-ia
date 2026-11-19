'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Studio=require('../js/studio-intelligence');

const sample={
 'index.html':'<link rel="stylesheet" href="./style.css"><script src="./game.js"></script>',
 'game.js':'import "./rules.js"; const GAME_SPEC = {"genre":"arena"};',
 'rules.js':'export const n=1;',
 'style.css':'body{margin:0}'
};

test('GF-ARCH-12: identifica relações diretas reais entre arquivos',()=>{
 const g=Studio.dependencyGraph(sample);
 assert.deepEqual(g.nodes,['game.js','index.html','rules.js','style.css']);
 assert.ok(g.edges.some(e=>e.from==='index.html'&&e.to==='game.js'&&e.evidence==='EXTRACTED'));
 assert.ok(g.edges.some(e=>e.from==='game.js'&&e.to==='rules.js'&&e.evidence==='EXTRACTED'));
 assert.ok(g.edges.some(e=>e.from==='index.html'&&e.to==='style.css'));
 assert.deepEqual(g.unresolved,[]);
});
test('GF-ARCH-12: propaga impacto reverso sem inventar dependências',()=>{
 const g=Studio.dependencyGraph(sample);
 assert.deepEqual(Studio.affectedFiles(g,['rules.js']),['game.js','index.html','rules.js']);
 assert.deepEqual(Studio.affectedFiles(g,['style.css']),['index.html','style.css']);
 assert.deepEqual(Studio.affectedFiles(g,['desconhecido.js']),[]);
});
test('GF-ARCH-12: detecta referências ausentes sem dizer que arquivo existe',()=>{
 const g=Studio.dependencyGraph({'index.html':'<script src="./missing.js"></script>','style.css':'@import "./missing.css";'});
 assert.equal(g.edges.length,0);
 assert.ok(g.unresolved.some(e=>e.to==='missing.js'));
 assert.ok(g.unresolved.some(e=>e.to==='missing.css'));
});
test('GF-ARCH-12: não segue links externos nem acessa arquivos fora da raiz',()=>{
 const g=Studio.dependencyGraph({'index.html':'<script src="https://cdn.test/vendor.js"></script><script src="../../private.js"></script>'});
 assert.deepEqual(g.edges,[]);
 assert.deepEqual(g.unresolved,[]);
});
test('GF-ARCH-12: brief conserva restrições literais e pendências',()=>{
 const b=Studio.brief({instruction:'Melhorar o boss. Não mexer no WhatsApp; manter o salvamento.',spec:{genre:'fps',dimension:'3d',stages:['A','B'],implementation:{pending:[{description:'Crafting não suportado'}]}}});
 assert.equal(b.genre,'fps');assert.equal(b.stages,2);
 assert.ok(b.restrictions.some(s=>/WhatsApp/.test(s)));
 assert.ok(b.restrictions.some(s=>/salvamento/.test(s)));
 assert.ok(b.pending.includes('Crafting não suportado'));
});
test('GF-ARCH-12: sem aprovação falsa de QA',()=>{
 const empty=Studio.review({instruction:'um jogo novo'});
 assert.equal(empty.gate.status,'blocked');
 const ready=Studio.review({files:sample});
 assert.equal(ready.gate.status,'needs-validation');
 assert.ok(ready.gate.checks.every(x=>x.status==='pending'));
 assert.match(Studio.report(ready),/não executado/);
});
test('GF-ARCH-12: plugins só aceitam capacidades previstas e ids exclusivos',()=>{
 const h=Studio.createHarness();
 h.register({id:'meu-plugin',capabilities:['read-files','write-plan'],run:c=>({brief:{name:Object.keys(c.files).length}})});
 assert.throws(()=>h.register({id:'meu-plugin',run:()=>({})}),/já registrado/);
 assert.throws(()=>h.register({id:'plugin-perigoso',capabilities:['execute-shell'],run:()=>({})}),/Permissão/);
 assert.throws(()=>h.register({id:'__proto__',run:()=>({})}),/Plugin inválido/);
 assert.equal(h.execute({files:sample}).brief.name,4);
});
test('GF-ARCH-12: entrada é protegida de mutação na execução de plugin',()=>{
 const h=Studio.createHarness();
 h.register({id:'seguro',capabilities:['read-spec','write-plan'],run:c=>{
   assert.ok(Object.isFrozen(c));assert.ok(Object.isFrozen(c.spec));assert.ok(Object.isFrozen(c.files));
   assert.throws(()=>{c.spec.genre='wrong'},TypeError);
   return {gate:{status:'pending'}};
 }});
 const original={genre:'fps'};
 h.execute({spec:original});
 assert.equal(original.genre,'fps');
});
test('GF-ARCH-12: plugin não pode sobrescrever resultado anterior',()=>{
 const h=Studio.createHarness();
 h.register({id:'primeiro',capabilities:['write-plan'],run:()=>({brief:{name:'um'}})});
 h.register({id:'segundo',capabilities:['write-plan'],run:()=>({brief:{name:'dois'}})});
 assert.throws(()=>h.execute({}),/Campo duplicado/);
});
test('GF-ARCH-12: relatório audita dependências e preserva status',()=>{
 const r=Studio.review({instruction:'Aumente a dificuldade mas sem apagar o save',spec:{genre:'arena',dimension:'2d'},files:sample});
 assert.deepEqual(r.plugins,['studio-brief','graph-impact','qa-gate']);
 assert.ok(r.impact.includes('game.js'));
 assert.ok(r.impact.includes('index.html'));
 const text=Studio.report(r);
 assert.match(text,/Grafo de dependências/);
 assert.match(text,/sem apagar o save/);
 assert.match(text,/needs-validation/);
});

test('GF-ARCH-12: capacidades controlam efetivamente acesso e saída',()=>{
 const h=Studio.createHarness();
 h.register({id:'sem-leitura',capabilities:['write-plan'],run:c=>{
  assert.deepEqual(c.files,{});assert.deepEqual(c.spec,{});
  return {brief:{name:'limitado'}};
 }});
 assert.equal(h.execute({files:sample,spec:{genre:'fps'}}).brief.name,'limitado');
 const b=Studio.createHarness();
 b.register({id:'leitura-pura',capabilities:['read-files'],run:()=>({brief:{name:'falha'}})});
 assert.throws(()=>b.execute({files:sample}),/sem permissão de escrita/);
});
test('GF-ARCH-12: grafo do motor separa ligações inferidas e explícitas',()=>{
 const g=Studio.engineGraph({
  'js/alpha.js':'root.GameForgeAlpha={get:()=>1};',
  'js/beta.js':'const x=root.GameForgeAlpha.get(); root.GameForgeBeta={run:()=>x};',
  'index.html':'<script src="./js/alpha.js"></script><script src="./js/beta.js"></script>'
 });
 assert.ok(g.edges.some(e=>e.from==='js/beta.js'&&e.to==='js/alpha.js'&&e.evidence==='INFERRED'));
 assert.ok(g.edges.some(e=>e.from==='index.html'&&e.to==='js/alpha.js'&&e.evidence==='EXTRACTED'));
 assert.ok(g.symbols.includes('GameForgeAlpha'));
});
test('GF-ARCH-12: CLI lê o motor real sem acesso externo',()=>{
 const {analyze}=require('../tools/map-gameforge.cjs');
 const out=analyze('js/development-engine.js');
 assert.ok(out.graph.nodes.length>40);
 assert.ok(out.graph.nodes.includes('js/development-engine.js'));
 assert.ok(out.graph.nodes.includes('index.html'));
 assert.ok(out.impact.includes('js/development-engine.js'));
 assert.ok(out.impact.includes('index.html'));
});
