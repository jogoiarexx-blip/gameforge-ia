'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Parser=require('../js/parser.js');
const Caps=require('../js/game-capabilities.js');
const Intent=require('../js/intent-compiler.js');
const Backup=require('../js/project-backup.js');
require('../js/runtime-template.js');
require('../js/shooter-runtime.js');
require('../js/world-rules.js');
require('../js/software-renderer.js');
require('../js/three-runtime.js');
require('../js/shooter-3d-runtime.js');
require('../js/strategy-rules.js');
require('../js/expanded-2d-runtime.js');
require('../js/advanced-td-rules.js');
require('../js/advanced-td-runtime.js');
require('../js/qa-bridge.js');
require('../vendor/three-source.js');
const Generator=require('../js/generator.js');
const item=(spec,id)=>spec.implementation.audit.items.find(i=>i.id===id);
test('GF-004: fonte e linha do GDD acompanham o código e texto de HUD não apaga 60 segundos',()=>{
 const gdd=['# Operação Aurora','## Fase 1 — Defesa','Sobreviver 60 segundos',
  'Objetivo: sobreviver até chegar ao portal','## Fase 2 — Terminal','6 inimigos na fase 2'].join('\n');
 const spec=Parser.parseGdd(gdd,'',{genre:'fps',dimension:'3d'});
 assert.equal(spec.stageConfig[0].mission,'survive');
 assert.equal(spec.stageConfig[0].seconds,60);
 assert.equal(spec.stageConfig[1].enemies,6);
 const mission=item(spec,'mission');
 assert.equal(mission.status,'configurada');
 assert.deepEqual([mission.origin.document,mission.origin.line],['GDD',3]);
 assert.match(mission.contract,/missionReady/);
 assert.equal(item(spec,'objective-label').origin.line,4);
 assert.equal(item(spec,'enemies').origin.line,6);
 assert.equal(Caps.check(spec).length,0);
});
test('GF-004: escopo negativo não vira tarefa de crafting, multiplayer e skills',()=>{
 const doc='# Fortaleza\n## Fora de escopo\nSem multiplayer.\nSem crafting.\nSem árvore de habilidades.';
 const spec=Parser.parseGdd(doc,'',{genre:'rpg',dimension:'3d'});
 assert.equal(spec.implementation.audit.counts.pendente,0);
 assert.ok(!spec.implementation.pending.some(x=>['craft','network','skill-tree'].includes(x.id)));
});
test('GF-004: gênero incompatível não é apresentado como mecânica implementada',()=>{
 const spec=Parser.parseGdd('# Início\n## Fase 1\nQuatro ondas de inimigos','',{genre:'platform',dimension:'3d'});
 const audit=spec.implementation.audit;
 assert.equal(audit.counts.configurada,0);
 assert.equal(item(spec,'waves').status,'incompativel');
 assert.equal(item(spec,'enemies').status,'incompativel');
 assert.equal(spec.stageConfig[0].waves,undefined);
 assert.equal(spec.stageConfig[0].enemies,undefined);
});
test('GF-004: uma árvore de habilidades solicitada ao RPG 3D é pendência com linha e motivo',()=>{
 const spec=Parser.parseGdd('# Reinos\n## Progressão\nQuero árvore de habilidades, crafting e multiplayer.','',{genre:'rpg',dimension:'3d'});
 for(const id of ['skill-tree','craft','network']){
  const row=item(spec,id);
  assert.equal(row.status,'pendente');
  assert.equal(row.origin.document,'GDD');
  assert.equal(row.origin.line,3);
  assert.match(row.reason,/sem lógica executável/);
 }
 assert.equal(spec.implementation.audit.counts.implementada,0);
});
test('GF-004: loja FPS é módulo implementado, preço é só configuração e fontes não são perdidas',()=>{
 const command='Crie FPS 3D com loja para comprar munição e kit médico.\nMunição custa 20 créditos.';
 const spec=Parser.parseGdd('',command,{dimension:'3d',genre:'fps'});
 assert.equal(spec.combatEconomy.enabled,true);
 assert.equal(spec.combatEconomy.prices.ammo,20);
 assert.equal(item(spec,'combat-store').status,'implementada');
 assert.equal(item(spec,'combat-store').origin.document,'Comando');
 assert.match(item(spec,'combat-store').test,/combat-economy\.test\.js/);
 assert.equal(item(spec,'combat-store-prices').status,'configurada');
 const files=Generator.generate(spec,'');
 const status=JSON.parse(files['CAPACIDADES.json']);
 assert.equal(status.counts.implementada,1);
 assert.match(files['CONTRATO_CAPACIDADES.md'],/Implementada|implementada/);
 assert.match(files['game.js'],/gameForgeCombatEconomyFactory/);
 assert.doesNotThrow(()=>new vm.Script(files['game.js']));
 const backup=Backup.decode(Backup.encode({name:'FPS',gdd:'',instruction:command,files}));
 assert.equal(backup.files['CAPACIDADES.json'],files['CAPACIDADES.json']);
 assert.equal(backup.files['CONTRATO_CAPACIDADES.md'],files['CONTRATO_CAPACIDADES.md']);
});
test('GF-004: instrução recente ativa ou desativa a loja sobreposta ao GDD anterior',()=>{
 const gdd='# FPS\nSem loja de munição';
 const on=Parser.parseGdd(gdd,'Agora adicione uma loja para comprar munição.',{genre:'fps',dimension:'3d'});
 assert.equal(on.combatEconomy.enabled,true);
 assert.equal(item(on,'combat-store').status,'implementada');
 assert.equal(item(on,'combat-store').origin.document,'Comando');
 const off=Parser.parseGdd('# FPS\nCrie uma loja para comprar munição','Remova a loja.',{genre:'fps',dimension:'3d'});
 assert.equal(off.combatEconomy.enabled,false);
 assert.equal(item(off,'combat-store-off').status,'configurada');
 assert.equal(item(off,'combat-store'),undefined);
});
test('GF-004: exportador rejeita configuração incompatível de motor sem executar código',()=>{
 const spec=Parser.parseGdd('# Arena\n## Fase 1','',{genre:'arena',dimension:'3d'});
 spec.stageConfig[0].laps=4;
 assert.match(Caps.check(spec).join('; '),/laps incompatível/);
 assert.throws(()=>Generator.generate(spec,'# Arena'),/GAME_SPEC incompatível/);
 const badStore=Parser.parseGdd('# Corrida','',{genre:'racing',dimension:'3d'});
 badStore.combatEconomy={enabled:true};
 assert.match(Caps.check(badStore).join('; '),/somente no FPS 3D/);
});
test('GF-004: um GDD grande preserva limites sem explodir manifesto',()=>{
 const doc='# Invasão\n## Fase 1\n'+Array.from({length:1600},()=>'- 5 inimigos').join('\n');
 const spec=Parser.parseGdd(doc,'',{genre:'arena',dimension:'3d'});
 assert.equal(spec.stageConfig[0].enemies,5);
 assert.ok(spec.implementation.audit.items.length<120);
 assert.ok(JSON.stringify(spec.implementation.audit).length<20000);
 assert.match(Caps.report(spec),/Contrato executável/);
});
test('GF-004: SPA carrega capacidades antes do compilador e apresenta status separados',()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 const app=fs.readFileSync(require.resolve('../js/app.js'),'utf8');
 assert.ok(html.indexOf('js/game-capabilities.js')>0);
 assert.ok(html.indexOf('js/game-capabilities.js')<html.indexOf('js/intent-compiler.js'));
 assert.match(app,/Contrato de capacidades/);
 assert.match(app,/Implementada/);
 assert.match(app,/Incompatível/);
});
