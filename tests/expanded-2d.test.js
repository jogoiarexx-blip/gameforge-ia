const test = require('node:test');
const assert = require('node:assert/strict');
let rules;
try { rules = require('../js/strategy-rules.js'); } catch (_) { rules = {}; }

test('RPG movement stops against world obstacles and normalizes diagonal travel', () => {
  assert.equal(typeof rules.moveActor, 'function', 'movement rules are implemented');
  const a={x:50,y:50,r:10};
  rules.moveActor(a,1,1,100,1,{width:300,height:300},[]);
  assert.ok(Math.abs(a.x-120.710678)<.001);
  assert.ok(Math.abs(a.y-120.710678)<.001);
  const b={x:50,y:50,r:10};
  rules.moveActor(b,1,0,100,.5,{width:300,height:300},[{x:75,y:10,w:40,h:100}]);
  assert.ok(b.x<=65, 'actor cannot tunnel through the wall');
});

test('RPG XP grants multiple levels and upgrades persist in stage checkpoints', () => {
  assert.equal(typeof rules.gainXP, 'function', 'experience rules are implemented');
  const player={level:1,xp:0,maxHp:100,hp:30,attack:16,coins:100,potions:2};
  assert.equal(rules.gainXP(player,155),2);
  assert.deepEqual([player.level,player.xp,player.maxHp,player.attack],[3,5,124,22]);
  const checkpoint=rules.checkpoint(player);
  player.coins=0;player.potions=0;player.hp=1;
  rules.restore(player,checkpoint);
  assert.deepEqual([player.hp,player.coins,player.potions],[54,100,2]);
});

test('RPG damage honors invulnerability and potions consume only when healing', () => {
  assert.equal(typeof rules.damage, 'function', 'combat rules are implemented');
  const p={hp:100,maxHp:100,potions:2,invulnerable:0};
  assert.equal(rules.potion(p),false);
  assert.equal(rules.damage(p,25),true);
  assert.equal(rules.damage(p,25),false);
  assert.equal(p.hp,75);
  assert.equal(rules.potion(p),true);
  assert.deepEqual([p.hp,p.potions],[100,1]);
});

test('tower placement rejects path, duplicates and unaffordable cells without spending', () => {
  assert.equal(typeof rules.createDefense, 'function', 'defense rules are implemented');
  const d=rules.createDefense(0,{difficulty:1});
  const path=d.path[2]; const money=d.coins;
  assert.equal(rules.placeTower(d,path.x,path.y).ok,false);
  assert.equal(d.coins,money);
  assert.equal(rules.placeTower(d,2,1).ok,true);
  assert.equal(d.coins,money-60);
  assert.equal(rules.placeTower(d,2,1).ok,false);
  d.coins=0; assert.equal(rules.placeTower(d,3,1).ok,false);
  assert.equal(d.towers.length,1);
});

test('tower upgrades strengthen actual damage and stop at the maximum level', () => {
  assert.equal(typeof rules.upgradeTower, 'function', 'upgrade rules are implemented');
  const d=rules.createDefense(0,{});d.coins=1000;
  rules.placeTower(d,2,1);
  const t=d.towers[0];
  assert.equal(rules.upgradeTower(d,t).ok,true);
  assert.ok(t.damage>18);assert.ok(t.range>150);
  assert.equal(rules.upgradeTower(d,t).ok,true);
  assert.equal(rules.upgradeTower(d,t).ok,false);
  assert.equal(t.level,3);
});

test('defense waves follow the ordered path, finish, and damage base for escaped units', () => {
  assert.equal(typeof rules.startWave, 'function', 'wave rules are implemented');
  const d=rules.createDefense(0,{difficulty:1});
  assert.equal(rules.startWave(d),true);
  assert.equal(rules.startWave(d),false);
  rules.stepDefense(d,.5);
  assert.ok(d.enemies.length>0);
  const e=d.enemies[0]; assert.equal(e.segment,0); assert.ok(e.x>d.path[0].x*d.cell+d.cell/2);
  for(let i=0;i<3000 && d.active;i++)rules.stepDefense(d,.05);
  assert.equal(d.active,false);
  assert.ok(d.base<100);
  assert.equal(d.wave,1);
  assert.equal(rules.startWave(d),true);
});

test('defense towers target enemies and earn resources on kills', () => {
  assert.equal(typeof rules.stepDefense, 'function', 'defense simulation is implemented');
  const d=rules.createDefense(0,{});d.coins=1000;
  rules.placeTower(d,2,1);rules.placeTower(d,4,1);rules.placeTower(d,6,1);
  for(const t of d.towers){rules.upgradeTower(d,t);rules.upgradeTower(d,t);}
  const money=d.coins;rules.startWave(d);
  for(let i=0;i<2200 && d.active;i++) rules.stepDefense(d,.05);
  assert.ok(d.kills>0);assert.ok(d.coins>money);assert.equal(d.enemies.length,0);
});

// Canvas/DOM is an inert rendering boundary; real event handlers and simulations run.
function runtimeHarness(genre){
  const fs=require('node:fs'),vm=require('node:vm');
  const callbacks=[],listeners={};
  const gradient={addColorStop(){}};
  const context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,measureText:s=>({width:s.length*7})},{get:(o,k)=>k in o?o[k]:()=>{}});
  const elements=new Map();
  const make=()=>({textContent:'',style:{},children:[],classList:{add(){},remove(){}},addEventListener(name,fn){this[name]=fn;},appendChild(el){this.children.push(el);},setAttribute(){},focus(){},getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:960,height:540})});
  const document={getElementById(id){if(!elements.has(id))elements.set(id,make());return elements.get(id);},querySelector:()=>make(),querySelectorAll:()=>[],createElement:()=>make(),addEventListener(name,fn){listeners[name]=fn;}};
  const window={addEventListener(name,fn){listeners[name]=fn;}};
  const sandbox={GAME_SPEC:{title:'Test',genre,stages:['Forest','Keep'],tuning:{}},GameForgeStrategyRules:rules,window,document,Math,performance:{now:()=>0},requestAnimationFrame:fn=>callbacks.push(fn),setTimeout:()=>0,clearTimeout(){}};
  vm.createContext(sandbox);
  if(!fs.existsSync(require('node:path').join(__dirname,'../js/expanded-2d-runtime.js')))return null;
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../js/expanded-2d-runtime.js'),'utf8')+'\ngameForgeExpanded2DBoot();',sandbox);
  let clock=0;
  return {elements,window,listeners,frame(n=1){for(let i=0;i<n;i++){clock+=1000/60;const cb=callbacks.shift();assert.ok(cb,'animation scheduled');cb(clock);}},key(key,type='keydown'){const e={key,code:key===' '?'Space':key,preventDefault(){},repeat:false,target:{tagName:'CANVAS'}};if(listeners[type])listeners[type](e);},click(id){elements.get(id).click();}};
}

test('serialized RPG boot moves world coordinates, pauses simulation and restarts its stage',()=>{
  const h=runtimeHarness('rpg');assert.ok(h,'expanded boot exists');
  h.click('start');h.frame(2);const start=h.window.__gameforgeTelemetry.player.x;
  h.key('d');h.frame(40);h.key('d','keyup');
  assert.ok(h.window.__gameforgeTelemetry.player.x>start+50);
  assert.ok(Number.isFinite(h.window.__gameforgeTelemetry.player.screenX));
  h.click('pause');const frozen=h.window.__gameforgeTelemetry.player.x;
  h.key('d');h.frame(20);h.key('d','keyup');
  assert.equal(h.window.__gameforgeTelemetry.player.x,frozen);
  h.click('restart');h.frame(2);
  assert.equal(h.window.__gameforgeTelemetry.state,'play');
  assert.ok(h.window.__gameforgeTelemetry.player.x<start+5);
});

test('serialized defense boot places and upgrades towers with keyboard actions',()=>{
  const h=runtimeHarness('tower-defense');assert.ok(h,'expanded boot exists');
  h.click('start');h.frame(2);h.key(' ');h.key(' ','keyup');h.frame();
  assert.equal(h.window.__gameforgeTelemetry.towers,1);
  const gold=h.window.__gameforgeTelemetry.resources;
  h.key(' ');h.key(' ','keyup');h.frame();
  assert.ok(h.window.__gameforgeTelemetry.resources<gold,'space upgrades selected tower');
  h.key('n');h.key('n','keyup');h.frame(10);
  assert.equal(h.window.__gameforgeTelemetry.wave,1);
  assert.ok(h.window.__gameforgeTelemetry.enemies>0);
});

test('RPG portal requires all relics and the boss defeat before stage progression',()=>{
  assert.equal(typeof rules.portalReady,'function','portal rules are implemented');
  assert.equal(rules.portalReady(2,true),false);
  assert.equal(rules.portalReady(3,false),false);
  assert.equal(rules.portalReady(3,true),true);
});

test('defense loses when base reaches zero and cannot start another wave',()=>{
  const d=rules.createDefense(0,{});d.base=10;rules.startWave(d);
  for(let i=0;i<3000&&!d.over;i++)rules.stepDefense(d,.05);
  assert.equal(d.base,0);assert.equal(d.over,true);assert.equal(d.victory,false);
  assert.equal(rules.startWave(d),false);
});

test('defense victory requires surviving the final wave, including its boss',()=>{
  const d=rules.createDefense(0,{});d.coins=10000;
  for(const [x,y] of [[2,2],[4,4],[6,4],[8,3],[10,3],[11,4],[13,4]]){
    const {tower}=rules.placeTower(d,x,y);rules.upgradeTower(d,tower);rules.upgradeTower(d,tower);
  }
  let sawBoss=false;
  for(let wave=0;wave<3;wave++){
    assert.equal(rules.startWave(d),true);
    for(let i=0;i<3000&&d.active;i++){rules.stepDefense(d,.05);if(d.enemies.some(e=>e.kind==='boss'))sawBoss=true;}
    if(wave<2)assert.equal(d.victory,false);
  }
  assert.equal(sawBoss,true);assert.equal(d.victory,true);assert.ok(d.base>0);
});

test('preview QA receives callable telemetry with canvas coordinates and advancing frames',()=>{
  const h=runtimeHarness('rpg');assert.equal(typeof h.window.__gameforgeTelemetry,'function');
  const before=h.window.__gameforgeTelemetry();h.click('start');h.frame(3);
  const after=h.window.__gameforgeTelemetry();
  assert.ok(after.frames>before.frames);assert.ok(Number.isFinite(after.player.screenY));
  assert.equal(after.state,'play');
});
