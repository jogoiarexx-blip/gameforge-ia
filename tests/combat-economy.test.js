const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const economyFactory=require('../js/combat-economy.js');
const parser=require('../js/parser.js'),development=require('../js/development-engine.js');
require('../js/runtime-template.js');require('../js/shooter-runtime.js');require('../js/three-runtime.js');
require('../js/shooter-3d-runtime.js');require('../js/software-renderer.js');require('../js/world-rules.js');
require('../js/advanced-td-rules.js');require('../js/advanced-td-runtime.js');require('../js/expanded-2d-runtime.js');
require('../js/strategy-rules.js');require('../vendor/three-source.js');
const generator=require('../js/generator.js'),worldRules=require('../js/world-rules.js');
test('compras de munição, medkit e melhoria de arma descontam créditos e respeitam limites',()=>{
 const shop=economyFactory().create({startingCredits:350,startingReserve:0,prices:{ammo:25,heal:30,upgrade:100}});
 assert.equal(shop.state().credits,350);
 assert.equal(shop.purchase('heal',100).ok,false);
 let buy=shop.purchase('heal',20);
 assert.equal(buy.ok,true);assert.equal(buy.health,60);assert.equal(shop.state().credits,320);
 buy=shop.purchase('ammo',60);
 assert.equal(buy.ok,true);assert.equal(shop.state().reserve,40);
 assert.equal(shop.useReserve(14),14);assert.equal(shop.state().reserve,26);
 buy=shop.purchase('upgrade',60);
 assert.equal(buy.ok,true);assert.equal(shop.state().level,2);
 assert.equal(shop.state().damage,2);
 assert.equal(shop.state().credits,195);
 assert.equal(shop.purchase('upgrade',60).ok,false,'custo do próximo nível deve aumentar');
 assert.equal(shop.purchase('invalid',60).ok,false);
 assert.equal(shop.state().credits,195);
 assert.equal(shop.state().spent,155);
});
test('economia não permite saldos negativos, cura acima do máximo, nem ultrapassar o limite da arma',()=>{
 const shop=economyFactory().create({startingCredits:-100,startingReserve:99999,prices:{ammo:0,heal:-999,upgrade:10000}});
 assert.equal(shop.state().credits,0);assert.equal(shop.state().reserve,250);
 assert.equal(shop.state().prices.ammo,5);assert.equal(shop.state().prices.heal,5);
 assert.equal(shop.state().prices.upgrade,2000);
 assert.equal(shop.purchase('ammo',50).ok,false);
 assert.equal(shop.useReserve(9999),20);
 assert.equal(shop.state().reserve,230);
 const rich=economyFactory().create({startingCredits:9999,prices:{upgrade:20}});
 assert.equal(rich.purchase('upgrade',1).ok,true);
 assert.equal(rich.purchase('upgrade',1).ok,true);
 assert.equal(rich.purchase('upgrade',1).ok,false);
 assert.equal(rich.state().level,3);
 assert.equal(rich.purchase('heal',95).health,100);
});
test('inimigos deixam créditos persistentes e upgrades custam mais a cada nível',()=>{
 const shop=economyFactory().create({startingCredits:0,prices:{upgrade:50}});
 assert.equal(shop.earn(),20);assert.equal(shop.earn(true),90);
 assert.equal(shop.state().credits,110);
 assert.equal(shop.purchase('upgrade',100).ok,true);
 assert.equal(shop.state().prices.upgrade,100);
 assert.equal(shop.purchase('upgrade',100).ok,false);
 assert.equal(shop.state().earned,110);
});
test('GDD em português configura preço, loja e gera código com módulo local sem rede',()=>{
 const instruction='Crie um FPS 3D com loja para comprar munição, recuperar vida com kit médico e melhorar armas.\nMunição custa 20 créditos. Kit médico custa 40 créditos. Melhoria de arma custa 150 créditos.';
 const spec=parser.parseGdd('',instruction,{dimension:'auto',genre:'auto'});
 assert.equal(spec.genre,'fps');assert.equal(spec.combatEconomy.enabled,true);
 assert.deepEqual(spec.combatEconomy.prices,{ammo:20,heal:40,upgrade:150});
 const files=generator.generate(spec,'');
 assert.match(files['game.js'],/function gameForgeCombatEconomyFactory/);
 assert.match(files['game.js'],/function buildShopUI\(/);
 assert.match(files['game.js'],/gameForgeCombatEconomyFactory\(\)\.create/);
 assert.doesNotThrow(()=>new vm.Script(files['game.js']));
 assert.equal(files['engine-3d.js'].length>100000,true);
 assert.match(files['RELATORIO_GERACAO.md'],/Loja jogável/);
 assert.equal(files['game.js'].includes('https://cdn'),false);
});
test('requisitos de loja fora do FPS 3D são pendentes e não ativam recursos falsos',()=>{
 const spec=parser.parseGdd('','Crie um jogo de navinha 3D com loja para comprar munição e armas.',{dimension:'3d',genre:'shooter'});
 assert.equal(spec.combatEconomy,undefined);
 assert.ok(spec.implementation.pending.some(x=>x.id==='combat-store'));
});
test('comando incremental ativa loja em FPS novo sem remover motor; jogos antigos são preservados',()=>{
 const spec=parser.parseGdd('# FPS\n## Fase 1\nPistolas e munição','',{dimension:'3d',genre:'fps'});
 const files=generator.generate(spec,'# FPS');
 assert.equal(spec.combatEconomy,undefined);
 const plan=development.plan('Adicione loja para comprar munição e melhorar armas.',spec,files);
 assert.equal(plan.supported,true);
 const revised=development.modify(files,spec,plan);
 assert.equal(revised.changed,true);
 assert.equal(revised.spec.combatEconomy.enabled,true);
 assert.ok(revised.files['game.js'].includes('function buildShopUI('));
 assert.doesNotThrow(()=>new vm.Script(revised.files['game.js']));
 const legacy={'game.js':files['game.js'].replace(/const gameForgeCombatEconomyFactory = [\s\S]*?;\n(?=\()/,'').replace('function buildShopUI','function oldShopUI'),'style.css':'body{}'};
 const legacyPlan=development.plan('Adicione loja para comprar munição.',spec,legacy);
 assert.ok(legacyPlan.pending.some(x=>/módulo de loja/.test(x)));
 assert.equal(development.modify(legacy,spec,legacyPlan).changed,false);
});
test('simulação FPS usa loja real com pausa, compras via teclado, recarga finita e reinício',()=>{
 const context={AbortController,console};vm.createContext(context);
 vm.runInContext(fs.readFileSync(require.resolve('../vendor/three-source.js'),'utf8'),context);
 vm.runInContext(context.GameForgeThreeSource,context);
 const handlers={},els={},frames=[],children=[];let now=0;
 const node=tag=>({
  tag,textContent:'',hidden:false,disabled:false,style:{},listeners:{},parentElement:null,children:[],
  setAttribute(){},append(...items){this.children.push(...items);},
  addEventListener(kind,fn){this.listeners[kind]=fn;},
  click(){if(!this.disabled)this.listeners.click?.();},
  focus(){},getBoundingClientRect(){return {width:960,height:540}}
 });
 const host=node('main');host.append=(...args)=>children.push(...args);
 const element=id=>els[id]||(els[id]=Object.assign(node('element'),{id,
   classList:{add(){},remove(){}},dataset:{},getBoundingClientRect(){return {width:960,height:540}}}));
 element('game').parentElement=host;
 const THREE={...context.THREE,WebGLRenderer:class{
   constructor(){this.shadowMap={};this.info={render:{calls:0},memory:{geometries:0}};this.renderLists={dispose(){}};}
   setClearColor(){}setPixelRatio(){}setSize(){}render(){}
 }};
 const spec=parser.parseGdd('','Crie FPS 3D com loja para comprar munição e melhorar armas. 2 fases.',{dimension:'3d',genre:'fps'});
 const env={GAME_SPEC:{...spec,stageConfig:[{enemies:1},{enemies:1}],tuning:{difficulty:.25}},
  THREE,gameForgeCombatEconomyFactory:economyFactory,gameForgeWorldRules:worldRules,gameForgeSoftwareRenderer:null,
  document:{getElementById:element,createElement:node,querySelectorAll:()=>[],addEventListener(){}},
  performance:{now:()=>now},requestAnimationFrame:fn=>frames.push(fn),addEventListener:(kind,fn)=>(handlers[kind]||(handlers[kind]=[])).push(fn),
  window:null,globalThis:null};
 env.window=env;env.globalThis=env;vm.createContext(env);
 vm.runInContext('('+require('../js/three-runtime.js').toString()+')()',env);
 const key=k=>(handlers.keydown||[]).forEach(fn=>fn({key:k,repeat:false,preventDefault(){}}));
 const release=k=>(handlers.keyup||[]).forEach(fn=>fn({key:k}));
 const tick=(n=1)=>{for(let i=0;i<n;i++){now+=1000/60;const fn=frames.shift();assert.equal(typeof fn,'function');fn(now);}};
 element('start').click();tick(3);
 const initial=env.__gameforgeTelemetry().combatEconomy;
 assert.equal(initial.magazine,20);
 assert.equal(initial.reserve,60);
 assert.equal(initial.credits,90);
 const btn=children.find(n=>n.textContent==='Loja [B]');
 assert.ok(btn,'touch/mouse shop button missing');
 btn.click();assert.equal(env.__gameforgeTelemetry().paused,true);
 const shop=children.find(n=>n.tag==='section');assert.equal(shop.hidden,false);
 key('1');assert.equal(env.__gameforgeTelemetry().combatEconomy.reserve,100);
 assert.equal(env.__gameforgeTelemetry().combatEconomy.credits,60);
 key('b');assert.equal(env.__gameforgeTelemetry().paused,false);
 key(' ');tick(15);release(' ');
 const beforeReload=env.__gameforgeTelemetry().combatEconomy.magazine;
 assert.ok(beforeReload<20);
 key('r');tick(75);
 assert.equal(env.__gameforgeTelemetry().combatEconomy.magazine,20);
 assert.equal(env.__gameforgeTelemetry().combatEconomy.reserve,100-(20-beforeReload));
 element('restart').click();tick(2);
 assert.equal(env.__gameforgeTelemetry().combatEconomy.credits,90);
 assert.equal(env.__gameforgeTelemetry().combatEconomy.reserve,60);
 assert.equal(env.__gameforgeTelemetry().combatEconomy.magazine,20);
});
