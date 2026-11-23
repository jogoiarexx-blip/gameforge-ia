'use strict';
/* GF-TRAIN-20 — gates de regressão dos contratos atuais.
 * Evita restaurar APIs antigas de checkpoint sem compatibilidade.
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Parser=require('../js/parser.js');
const Rules=require('../js/world-rules.js')();

function spec(genre,extras={}){
 return {title:'Teste de Regresso',dimension:'3d',genre,projectId:'gf-01234567-89abcdef',
  stages:['Entrada','Confronto'],stageConfig:[{mission:'survive',seconds:5},{}],...extras};
}
test('GF-TRAIN-20: checkpoint de campanha no motor atual apenas onde comprovado',()=>{
 for(const genre of ['arena','fps','rpg']){
  const game=spec(genre);
  const key=Rules.checkpointKey(game);
  assert.equal(key,'gameforge-campaign-v1:'+genre+':gf-01234567-89abcdef');
  const saved=Rules.checkpointPayload(game,{
   stage:1,health:77,score:500,ammo:42,clock:12.5,rpgLevel:2,rpgXP:45,rpgPotions:2
  });
  assert.ok(saved);
  assert.equal(Rules.readCheckpoint(JSON.stringify(saved),game).stage,1);
  assert.equal(Rules.readCheckpoint(JSON.stringify({...saved,health:1000}),game),null);
  assert.equal(Rules.readCheckpoint(JSON.stringify({...saved,projectId:'gf-ffffffff-ffffffff'}),game),null);
 }
 assert.equal(Rules.checkpointKey(spec('platform')),null,
  'checkpoint da plataforma 3D antiga nao deve ser declarado implementado');
 assert.equal(Rules.checkpointKey(spec('shooter')),null,
  'checkpoint geral da navinha 3D antiga nao deve ser declarado implementado');
 assert.equal(Rules.checkpointKey(spec('fps',{combatEconomy:{enabled:true}})),null,
  'FPS com loja precisa de contrato especifico, nao checkpoint universal');
 assert.equal(Rules.checkpointKey(spec('arena',{projectId:'invalido'})),null);
});
test('GF-TRAIN-20: corpus de pedidos vira GAME_SPEC com parâmetros observáveis',()=>{
 const arena=Parser.parseGdd('','Crie um jogo de arena 3D com três fases. Na fase 1, sobreviver por 5 segundos.',
  {genre:'auto',dimension:'auto'});
 assert.equal(arena.genre,'arena');assert.equal(arena.dimension,'3d');
 assert.equal(arena.stageConfig[0].mission,'survive');
 assert.equal(arena.stageConfig[0].seconds,5);
 assert.equal(arena.stages.length,3);
 const shop=Parser.parseGdd('','Crie FPS 3D com três fases e loja para comprar munição. Balas custam 30 créditos.',
  {genre:'auto',dimension:'auto'});
 assert.equal(shop.genre,'fps');assert.equal(shop.dimension,'3d');
 assert.equal(shop.combatEconomy.enabled,true);
 assert.equal(shop.combatEconomy.prices.ammo,30);
 const shooter=Parser.parseGdd('','Crie um jogo de navinha 3D com 3 fases e chefe somente na última.',
  {genre:'auto',dimension:'auto'});
 assert.equal(shooter.genre,'shooter');assert.equal(shooter.dimension,'3d');
 assert.deepEqual(shooter.stageConfig.map(c=>c.boss),['no','no','yes']);
});
