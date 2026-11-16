'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const semantics=require('../js/mission-semantics.js');
const flow=require('../js/urban-mission-flow.js')();
const parser=require('../js/parser.js');
require('../js/urban-rules.js');
require('../js/urban-runtime.js');
require('../js/urban-mission-flow.js');
require('../js/urban-mission-runtime.js');
require('../js/world-rules.js');
require('../js/software-renderer.js');
require('../vendor/three-source.js');
const generator=require('../js/generator.js');
const gdd=[
 '# Porto Vesper - campanha de duas missões',
 'Jogo de ação criminal urbana 3D em terceira pessoa com cidade, negócios e missões.',
 '## Missão 1 — Recuperar documentos',
 'Colete 2 provas espalhadas no bairro e depois entregue 2 provas no armazém.',
 'Recompensa 600.',
 '## Missão 2 — Retomar comércio',
 'Capture o armazém depois de derrotar 2 guardas.',
 'Recompensa R$ 850.'
].join('\n');
test('Action Model extrai atores, objetos, números, origem, fases e dependências',()=>{
 const model=semantics.parse(gdd);
 assert.equal(model.version,2);
 assert.equal(model.actor,'player');
 assert.equal(model.missions.length,2);
 assert.equal(model.issues.length,0);
 const [first,second]=semantics.executable(model);
 assert.equal(first.steps[0].action,'collect');
 assert.equal(first.steps[0].quantity,2);
 assert.equal(first.steps[0].target,'evidence');
 assert.equal(first.steps[1].action,'deliver');
 assert.equal(first.steps[1].objectQuantity,2);
 assert.deepEqual(first.steps[1].requires,[first.steps[0].id]);
 assert.equal(first.reward,600);
 assert.equal(first.steps[0].source.line,4);
 assert.equal(second.steps[0].action,'eliminate','derrotar precede captura mesmo quando frase vem invertida');
 assert.equal(second.steps[0].quantity,2);
 assert.equal(second.steps[1].action,'capture');
 assert.deepEqual(second.steps[1].requires,[second.steps[0].id]);
 assert.equal(second.reward,850);
 assert.equal(model.relations.length,2);
});
test('GAME_SPEC mantém grafo de ações e gera missões urbanas realmente diferentes',()=>{
 const spec=parser.parseGdd(gdd);
 assert.equal(spec.genre,'urban-action');
 assert.equal(spec.dimension,'3d');
 assert.equal(spec.urbanMissions.length,2);
 assert.equal(spec.stages.length,2);
 assert.equal(spec.actionModel.version,2);
 const files=generator.generate(spec,gdd);
 assert.match(files['game.js'],/gameForgeUrbanMissionBoot/);
 assert.match(files['game.js'],/GameForgeUrbanMissionFlow/);
 assert.match(files['game.js'],/mission.*?stage/si);
 assert.ok(files['engine-3d.js'],'Three local');
 assert.equal(files['GDD_original.md'],gdd);
});
test('eventos de missão dependem da sequência e recompensa nunca é duplicada',()=>{
 const plan=semantics.executable(semantics.parse(gdd));
 let s=flow.initial(plan);
 assert.equal(flow.signal(plan,s,{type:'interact',target:'warehouse'}).accepted,false);
 let a=flow.signal(plan,s,{type:'pickup',target:'evidence'});assert.equal(a.accepted,true);s=a.state;
 assert.equal(s.status,'play');assert.equal(s.cash,1000);
 assert.equal(flow.signal(plan,s,{type:'interact',target:'warehouse'}).accepted,false);
 s=flow.signal(plan,s,{type:'pickup',target:'evidence'}).state;
 a=flow.signal(plan,s,{type:'interact',target:'warehouse'});
 assert.equal(a.complete,true);s=a.state;
 assert.equal(s.status,'intermission');assert.equal(s.cash,1600);
 assert.equal(flow.signal(plan,s,{type:'interact',target:'warehouse'}).accepted,false);
 assert.equal(s.cash,1600);
 s=flow.advance(plan,s).state;
 assert.equal(s.stage,1);
 assert.equal(flow.signal(plan,s,{type:'interact',target:'warehouse'}).accepted,false);
 for(let i=0;i<2;i++)s=flow.signal(plan,s,{type:'kill',target:'guard'}).state;
 a=flow.signal(plan,s,{type:'interact',target:'warehouse'});
 assert.equal(a.complete,true);s=a.state;
 assert.equal(s.status,'victory');assert.equal(s.cash,2450);
 assert.equal(flow.signal(plan,s,{type:'interact',target:'warehouse'}).accepted,false);
 assert.equal(s.cash,2450);
});
test('save versionado valida contrato, contagens, premiação e rejeita corrupção',()=>{
 const plan=semantics.executable(semantics.parse(gdd));
 let s=flow.initial(plan);
 s=flow.signal(plan,s,{type:'pickup',target:'evidence'}).state;
 assert.deepEqual(flow.restore(plan,JSON.parse(JSON.stringify(s))),s);
 assert.equal(flow.restore(plan,{...s,schema:'old'}),null);
 assert.equal(flow.restore(plan,{...s,counts:{[plan[0].steps[0].id]:900}}),null);
 assert.equal(flow.restore(plan,{...s,cash:Infinity}),null);
 assert.equal(flow.restore(plan,{...s,completed:['forged']}),null);
});
test('números além do limite, ações inexistentes e condições desconhecidas ficam pendentes',()=>{
 const source=[
  '# Bairro de máfia 3D em terceira pessoa, com negócios, cidade e missões',
  '## Missão 1',
  'Elimine 20 guardas e capture o armazém depois de derrotar todos.',
  '## Missão 2',
  'Dirija o carro e fuja da polícia.',
  '## Missão 3',
  'Colete 2 provas somente se sua vida estiver acima de 50.'
 ].join('\n');
 const model=semantics.parse(source);
 assert.ok(model.issues.some(x=>/20/.test(x.reason)));
 assert.ok(model.issues.some(x=>/drive/.test(x.reason)));
 assert.ok(model.issues.some(x=>/police/.test(x.reason)));
 assert.ok(model.issues.some(x=>/Condição/.test(x.reason)));
 assert.equal(semantics.executable(model).length,0,'não criar missões falsas para pedidos incompletos');
});
test('pedido sem fases não muda o protótipo URB-01 original',()=>{
 const spec=parser.parseGdd('# Cidade\nJogo de ação urbana 3D em terceira pessoa com um bairro, combate, polícia e negócios.');
 assert.equal(spec.genre,'urban-action');
 assert.equal(spec.urbanMissions.length,0);
 assert.match(generator.generate(spec,'# Cidade')['game.js'],/gameForgeUrban3DBoot/);
});
test('uma fase com objetivos explícitos não inventa vinte outras fases ou missões extras',()=>{
 const source='# Cidade de máfia 3D em terceira pessoa com negócios e polícia.\n## Missão 1\nElimine 2 guardas e capture o armazém.\n## Missão 2\nInvada o interior do banco.';
 const spec=parser.parseGdd(source);
 assert.equal(spec.urbanMissions.length,1);
 assert.ok(spec.actionModel.issues.some(i=>i.action==='interior'));
 assert.ok(spec.implementation.pending.some(i=>/interior|interior do banco|programado/.test(i.description)));
 const files=generator.generate(spec,source);
 assert.equal(files['GDD_original.md'],source);
 assert.equal(spec.stages.length,1);
});
