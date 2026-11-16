'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
require('../js/game-corpus.js');
require('../js/urban-design.js');
require('../js/game-capabilities.js');
const IR=require('../js/design-ir.js');
require('../js/intent-compiler.js');
const Parser=require('../js/parser.js');
const Backup=require('../js/project-backup.js');
const Generator=require('../js/generator.js');
const scenarios=[
 ['criança: GTA com carros, polícia, missão e negócios 3D','Crie um jogo tipo GTA com mundo aberto 3D, dirigir carros, polícia, negócios e missões','urban-action','3d'],
 ['máfia: câmera por trás, carro, loja e combate','Quero um jogo de máfia 3D com câmera por trás do personagem, carros, lojas e tiroteio','urban-action','3d'],
 ['padrinho: terceira pessoa, cidade e negócios','quero criar jogo do padrinho com camera em terceira pessoa e cidade e negocios e 3d','urban-action','3d'],
 ['Godfather legado: visão superior em Canvas 2D','# Godfather Web Edition\nCanvas 2D em visão superior oblíqua, negócios, carros e polícia','arena','2d'],
 ['FPS GoldenEye com veículos não vira GTA','# GoldenEye 077\nFPS 3D tático em primeira pessoa. Guardas, armas, veículos e espionagem com missões.','fps','3d'],
 ['corrida 3D com polícia não vira GTA','Jogo de corrida 3D com carro, rua, pista, polícia e turbo','racing','3d'],
 ['nave com cidades não vira GTA','Jogo de naves espaciais 3D com cidades, bombas e inimigos','shooter','3d'],
 ['aventura em terceira pessoa sem crime não vira GTA','Aventura 3D em terceira pessoa com animais, floresta e combate','arena','3d'],
 ['plataforma Nintendo 2D','Faça jogo parecido com Donkey Kong Country 3, com pulos, plataformas e chefes, 2D','platform','2d'],
 ['zumbis visão superior 2D','Faça jogo de zumbi top-down 2D com evolução de arma e loot','arena','2d'],
 ['FPS sem armas tem gênero FPS mas requer motor sem tiros','Crie um jogo de terror 3D em primeira pessoa, esconder, fugir de monstros, sem tiros','fps','3d'],
 ['jogo 2D com proibição de 3D','Crie um jogo de plataforma 2D sem 3D com pulos','platform','2d'],
 ['game estilo 007 mas navinha','Quero um game estilo 007 no nintendo 64 mas sem FPS, nave espacial vertical 2D','shooter','2d'],
 ['RPG 3D com quests e habilidades','Crie um RPG 3D com inventário de 30 itens, diálogos, quests e evolução de habilidades','rpg','3d'],
 ['farming não deve fingir ser simulador','Um jogo tipo farming simulator 3D: dirigir caminhão, plantar, vender e construir fazenda','arena','3d'],
 ['barco viking não deve fingir navegação','Quero uma aventura naval de viking com barcos, batalhas e tesouros','arena','2d']
];
test('GF-003: 16 pedidos curtos leigos preservam gênero e dimensão, inclusive GTA/máfia/padrinho',()=>{
 for(const [label,command,genre,dimension] of scenarios){
  const spec=Parser.parseGdd('',command);
  assert.equal(spec.genre,genre,label+': gênero');
  assert.equal(spec.dimension,dimension,label+': dimensão');
  assert.ok(spec.designIR?.requirements&&Array.isArray(spec.designIR.constraints),label+': IR');
 }
});
test('GF-004: pedidos urbanos registram separadamente carro, polícia, negócio e limite do protótipo',()=>{
 const spec=Parser.parseGdd('',scenarios[0][1]);
 assert.equal(spec.engineAvailability.status,'prototype');
 assert.ok(spec.designIR.requirements.some(r=>r.id==='driving'&&r.status==='pendente'));
 assert.ok(spec.designIR.requirements.some(r=>r.id==='police'&&r.status==='pendente'));
 assert.ok(spec.designIR.requirements.some(r=>r.id==='business'&&r.status==='parcial'));
 assert.equal(spec.designIR.blocked.length,0);
 assert.equal(spec.implementation.audit.counts.implementada,0);
});
test('GF-004: restrição sem tiros bloqueia FPS e preserva pedido de furtividade como pendente',()=>{
 const spec=Parser.parseGdd('',scenarios[10][1]);
 assert.equal(spec.designIR.blocked[0].id,'no-shooting');
 assert.ok(spec.designIR.requirements.some(r=>r.id==='stealth'&&r.status==='pendente'));
 assert.ok(spec.implementation.pending.some(r=>r.id==='stealth'));
 assert.match(IR.report(spec.designIR),/Sem tiros ou armas/);
 assert.throws(()=>Generator.generate(spec,''),/incompatível com o motor/);
});
test('GF-004: proibição não apaga solicitações positivas escritas depois na mesma linha',()=>{
 const spec=Parser.parseGdd('','Faça jogo no estilo GTA 3D sem armas, sem combate, com carros, lojas e polícia');
 assert.equal(spec.genre,'urban-action');
 assert.ok(spec.designIR.requirements.some(r=>r.id==='driving'));
 assert.ok(spec.designIR.requirements.some(r=>r.id==='police'));
 assert.ok(spec.designIR.requirements.some(r=>r.id==='business'));
 assert.ok(spec.designIR.blocked.some(r=>r.id==='no-shooting'));
});
test('GF-004: pedidos de inventário, diálogo, quests e evolução não são omitidos do relatório',()=>{
 const spec=Parser.parseGdd('',scenarios[13][1]);
 for(const id of ['inventory-3d','dialogue','quests','skill-tree']){
  const row=spec.designIR.requirements.find(r=>r.id===id);
  assert.ok(row,'Faltando '+id);
  assert.equal(row.status,'pendente',id);
  assert.ok(spec.implementation.pending.some(r=>r.id===id),id);
  assert.equal(row.origin.document,'Comando');
  assert.equal(row.origin.line,1);
 }
 assert.ok(spec.implementation.audit.counts.pendente>=4);
});
test('GF-004: impossibilidade de motor agrícola/naval é declarada, não silenciosamente adaptada',()=>{
 for(const index of [14,15]){
  const spec=Parser.parseGdd('',scenarios[index][1]);
  assert.ok(spec.designIR.blocked.some(x=>x.id==='missing-core-engine'),scenarios[index][0]);
  assert.throws(()=>Generator.generate(spec,''),/GDD incompatível/);
 }
});
test('GF-004: referências externas não alteram o gênero principal e opções manuais continuam prevalecendo',()=>{
 const request='Quero fazer jogo de máfia 3D em terceira pessoa com carros, lojas e polícia';
 const spec=Parser.parseGdd('',request,{genre:'racing',dimension:'3d'});
 assert.equal(spec.genre,'racing');
 assert.equal(spec.designIR.engine,'racing-3d');
 assert.ok(spec.designIR.requirements.some(r=>r.id==='police'&&r.status==='pendente'));
});
test('GF-004: GDD e comando mantêm linha exata e não copiam documento integral no IR',()=>{
 const gdd=['# Jogo de espionagem','FPS 3D com guardas','Furtividade e diálogos com NPCs'].join('\n');
 const spec=Parser.parseGdd(gdd,'Não quero tiros.',{genre:'fps',dimension:'3d'});
 const stealth=spec.designIR.requirements.find(x=>x.id==='stealth');
 assert.equal(stealth.origin.document,'GDD');
 assert.equal(stealth.origin.line,3);
 assert.equal(spec.designIR.blocked[0].origin.document,'Comando');
 assert.equal(spec.designIR.blocked[0].origin.line,1);
 assert.ok(JSON.stringify(spec.designIR).length<13000);
});
test('GF-004: IR e aviso de bloqueio constam da UI, gerador e backup sem quebrar formatos antigos',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const generator=fs.readFileSync(path.join(__dirname,'../js/generator.js'),'utf8');
 assert.ok(html.indexOf('js/design-ir.js')>0);
 assert.ok(html.indexOf('js/design-ir.js')<html.indexOf('js/parser.js'));
 assert.match(app,/Requisitos detalhados do pedido/);
 assert.match(app,/Não é possível gerar este jogo como solicitado/);
 assert.match(generator,/designIR\?\.blocked/);
 const report=IR.report(Parser.parseGdd('',scenarios[0][1]).designIR);
 const snap=Backup.normalize({name:'Projeto',gdd:'',instruction:scenarios[0][1],
  files:{'PLANO_REQUISITOS.md':report}});
 assert.equal(snap.files['PLANO_REQUISITOS.md'],report);
});
