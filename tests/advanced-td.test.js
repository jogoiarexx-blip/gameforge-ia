const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const parser=require('../js/parser');
const R=require('../js/advanced-td-rules');
const boot=require('../js/advanced-td-runtime');
require('../js/runtime-template');require('../js/shooter-runtime');require('../js/expanded-2d-runtime');
require('../js/strategy-rules');require('../js/advanced-td-rules');require('../js/advanced-td-runtime');
const generator=require('../js/generator');

test('GDD detects original lane and block tower-defence genres instead of generic TD',()=>{
 assert.equal(parser.parseGdd('# Jardim\nPlantas vs Zumbis\nDefesa por linhas').genre,'lane-defense');
 assert.equal(parser.parseGdd('# Blocos TD\nTower defense em blocos').genre,'block-td');
 assert.equal(parser.parseGdd('# Block Tower TD\nRoguelike defense').genre,'block-td');
 assert.equal(parser.parseGdd('# Defesa de torres\nTorres, ondas e base').genre,'tower-defense');
 for(const genre of ['lane-defense','block-td']){
  assert.equal(parser.parseGdd('# Game','',{dimension:'2d',genre}).genre,genre);
  assert.throws(()=>parser.parseGdd('# Game','',{dimension:'3d',genre}),/compatível/);
 }
});

test('lane defence has meaningful economy, occupancy, upgrade and sell rules',()=>{
 const d=R.create('lane',0);
 assert.equal(d.rows,5);assert.equal(d.cols,9);
 assert.equal(R.place(d,0,2,'income').ok,true);
 assert.equal(R.place(d,0,2,'bolt').ok,false);
 const start=d.money;for(let i=0;i<470;i++)R.step(d,.05); // generator now yields 25 every 22 seconds
 assert.ok(d.money>start+15,'income generators actually produce resources');
 assert.equal(R.place(d,1,2,'bolt').ok,true);
 const tower=d.towers[1];d.money=1000;
 assert.equal(R.upgrade(d,tower).ok,true);
 assert.ok(tower.damage>21);
 const refund=R.sell(d,tower);
 assert.equal(refund.ok,true);assert.ok(refund.amount>0);
 assert.equal(d.towers.includes(tower),false);
});

test('tower defense blocks need foundations, preserve road and have altitude advantage',()=>{
 const d=R.create('blocks',0);
 assert.equal(d.cols,12);assert.equal(d.rows,8);
 const path=d.path[Math.floor(d.path.length/2)];
 assert.equal(R.buildBlock(d,path.x,path.y).ok,false);
 assert.equal(R.place(d,1,0,'bolt').ok,false,'needs a block foundation');
 assert.equal(R.buildBlock(d,1,0).ok,true);
 assert.equal(R.buildBlock(d,1,0).ok,true);
 assert.equal(R.buildBlock(d,1,0).ok,true);
 assert.equal(R.buildBlock(d,1,0).ok,false,'three block height limit');
 assert.equal(d.tiles[1],3);
 d.money=1000;
 assert.equal(R.place(d,1,0,'bolt').ok,true);
 assert.equal(d.towers[0].height,3);
 assert.equal(R.place(d,1,0,'frost').ok,false);
 assert.equal(R.upgrade(d,d.towers[0]).ok,true);
 assert.equal(d.towers[0].level,2);
});

test('enemies advance in five lanes, can damage structures and cannot ignore reserve mowers',()=>{
 const d=R.create('lane',0);
 R.place(d,0,0,'wall');R.begin(d);
 for(let n=0;n<150;n++)R.step(d,.05);
 assert.ok(d.spawned>0);assert.ok(d.enemies.length>0);
 const e=d.enemies[0];e.lane=1;e.y=1.5;e.x=.02;e.speed=3;
 R.step(d,.05);
 assert.equal(d.mowers[1],false,'first leak triggers emergency');
 assert.equal(d.base,100,'mower prevents initial base loss');
 d.enemies=[{...e,dead:false,x:.02,slow:0,lane:1,y:1.5}];
 d.active=true;d.spawned=d.amount;
 R.step(d,.05);
 assert.ok(d.base<100,'second leak damages base');
});

test('wave completion and roguelike choices protect transitions and victory state',()=>{
 const d=R.create('blocks',0,{}, {waves:2});
 assert.equal(R.begin(d),true);assert.equal(R.begin(d),false);
 d.spawned=d.amount;d.enemies=[];R.step(d,.05);
 assert.equal(d.awaitingChoice,true);assert.equal(R.begin(d),false);
 assert.equal(R.selectPerk(d,'repair'),false,'unoffered choices are not accepted');
 const perk=d.perks[0];const before=d.bonuses.damage;
 assert.equal(R.selectPerk(d,perk),true);
 assert.equal(d.awaitingChoice,false);
 if(perk==='damage')assert.ok(d.bonuses.damage>before);
 assert.equal(R.begin(d),true);
 d.spawned=d.amount;d.enemies=[];R.step(d,.05);
 assert.equal(d.victory,true);assert.equal(d.over,true);
 assert.equal(R.begin(d),false);
});

test('waves spawn distinct enemy archetypes and bounded boss',()=>{
 const d=R.create('blocks',1,{}, {waves:1});
 assert.equal(R.begin(d),true);
 for(let i=0;i<500;i++){R.step(d,.05);if(d.spawned===d.amount)break;}
 assert.equal(d.spawned,d.amount);
 assert.ok(d.enemies.some(x=>x.kind==='runner'));
 assert.ok(d.enemies.some(x=>x.kind==='armored'));
 assert.ok(d.enemies.some(x=>x.boss));
 assert.ok(d.enemies.every(x=>x.hp>0&&x.speed>0));
});

test('offline exporter serializes both engines and uses no remote dependencies',()=>{
 for(const genre of ['lane-defense','block-td']){
  const s=parser.parseGdd('# Original TD\n## Fase 1','',{dimension:'2d',genre});
  const files=generator.generate(s,'# Original TD');
  assert.match(files['game.js'],/gameForgeTDRulesFactory/);
  assert.match(files['game.js'],/gameForgeAdvancedTDBoot/);
  assert.doesNotThrow(()=>new vm.Script(files['game.js']));
  assert.equal(files['GDD_original.md'],'# Original TD');
  assert.ok(files['game.js'].length>25000);
  assert.ok(!files['index.html'].includes('http://'));
  assert.deepEqual([...files['index.html'].matchAll(/<script src="([^"]+)"/g)].map(x=>x[1]),['game.js']);
 }
});

function harness(genre){
 const handlers=[],elements=new Map(),frames=[],listeners={};
 const gradient={addColorStop(){}};
 const ctx=new Proxy({createLinearGradient(){return gradient;}},{get(o,k){return o[k]||(()=>{});},set(o,k,v){o[k]=v;return true;}});
 const make=()=>({style:{},dataset:{},children:[],textContent:'',classList:{add(){},remove(){}},setAttribute(){},focus(){},
  addEventListener(type,fn){this[type]=fn;},appendChild(child){this.children.push(child);},click(){if(this.clickHandler)this.clickHandler();if(typeof this.click==='function'&&this.listeners?.click)this.listeners.click();},
  getContext(){return ctx;},getBoundingClientRect(){return {left:0,top:0,width:960,height:540};}});
 const doc={getElementById(id){if(!elements.has(id))elements.set(id,make());return elements.get(id);},
  querySelector:()=>make(),querySelectorAll:()=>[],createElement:()=>make(),
  addEventListener(name,fn){listeners[name]=fn;}};
 const window={addEventListener(name,fn){listeners[name]=fn;}};
 const sandbox={GAME_SPEC:{title:'TD test',genre,stages:['Round 1','Round 2'],worldOptions:{seed:77},stageConfig:[{waves:2}]},
  GameForgeTDRules:R,document:doc,window,requestAnimationFrame:fn=>frames.push(fn),console,Math,performance:{now(){return 0;}}};
 // Existing callbacks on fake nodes are dispatched with .click() through the generic listener map.
 const old=make;for(const id of ['start','restart','pause']){const el=doc.getElementById(id);el.listeners={};el.addEventListener=function(type,fn){this.listeners[type]=fn;};el.click=function(){this.listeners.click();};}
 const env=vm.createContext(sandbox);vm.runInContext('('+boot.toString()+')()',env);
 let now=0;
 return {sandbox,elements,click(id){elements.get(id).click();},frame(n){for(let i=0;i<n;i++){now+=16.67;const fn=frames.shift();assert.ok(fn);fn(now);}},keydown(key){listeners.keydown({key,repeat:false,target:{tagName:'CANVAS'},preventDefault(){}});},
  pointer(x,y){elements.get('game').pointerdown({clientX:x,clientY:y});}};
}
test('playable canvas runtime starts, builds by touch, runs waves and pauses without simulating',()=>{
 for(const genre of ['lane-defense','block-td']){
  const h=harness(genre);
  h.click('start');h.frame(2);
  const before=h.sandbox.window.__gameforgeTelemetry();assert.equal(before.state,'play');
  if(genre==='block-td'){h.pointer(106+1*62+15,91+0*49+15);h.keydown('1');h.pointer(106+1*62+15,91+0*49+15);}
  else h.pointer(80+1*88+15,112+2*72+15);
  h.frame(2);
  assert.ok(h.sandbox.window.__gameforgeTelemetry().towers>=1);
  h.keydown('n');h.frame(20);
  assert.equal(h.sandbox.window.__gameforgeTelemetry().wave,1);
  h.click('pause');const frozen=h.sandbox.window.__gameforgeTelemetry().time;
  h.frame(10);assert.equal(h.sandbox.window.__gameforgeTelemetry().time,frozen);
 }
});
