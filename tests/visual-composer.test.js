'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const tool=require('../js/visual-composer.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('construtor gera instruções acionáveis sem executar JavaScript de usuário',()=>{
 const out=tool.compose({mode:'3d:fps',phases:5,difficulty:'dificil',features:['boss','store','mobile','store']});
 assert.equal(out.dimension,'3d');
 assert.equal(out.genre,'fps');
 assert.match(out.text,/5 fases/);
 assert.match(out.text,/chefe na última fase/);
 assert.match(out.text,/comprar munição/);
 assert.equal((out.text.match(/Adicionar loja/g)||[]).length,1);
});
test('construtor rejeita configuração desconhecida e números fora do limite',()=>{
 for(const config of [
  {mode:'unknown',phases:4},
  {mode:'2d:platform',phases:0},
  {mode:'2d:platform',phases:31},
  {mode:'2d:rpg',phases:2,features:['system-x']},
  {mode:'2d:rpg',phases:2,difficulty:'impossivel'}
 ])assert.throws(()=>tool.compose(config));
});
test('auditoria do pedido usa parser real e não promove pendências a implementadas',()=>{
 const parser=require('../js/parser.js');
 const r=tool.assess({mode:'3d:fps',phases:3,difficulty:'normal',features:['skills','store']},'', '',parser);
 assert.equal(r.request.genre,'fps');
 assert.ok(r.counts.pendente>=1,'árvore de habilidades não foi implementada no motor local');
 assert.ok(r.cautions.some(x=>/árvore de habilidades/i.test(x)));
 assert.ok(r.spec.implementation.audit,'deve existir rastreabilidade por status');
});
test('página inclui o construtor e preserva fluxo de criação',()=>{
 for(const id of ['visual-composer','vc-mode','vc-phases','vc-difficulty','vc-check','vc-apply','vc-command','vc-result'])
   assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/src="\.\/js\/visual-composer\.js"/);
 assert.ok(html.indexOf('id="visual-composer"')<html.indexOf('id="generate"'));
 assert.match(html,/id="gdd"/);
});
