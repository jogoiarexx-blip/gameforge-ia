'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const boot=require('../js/shooter-runtime.js');

function harness(){
  const callbacks=[],handlers={},elements=new Map();
  let now=0;
  const gradient=()=>({addColorStop(){}});
  const ctx=new Proxy({createLinearGradient:gradient,createRadialGradient:gradient,measureText:()=>({width:12})},{
    get(obj,key){return obj[key]??(()=>{});},
    set(obj,key,value){obj[key]=value;return true;}
  });
  const element=id=>{
    if(!elements.has(id))elements.set(id,{
      id,style:{},textContent:'',dataset:{},
      classList:{add(){},remove(){}},
      setAttribute(){},appendChild(){},focus(){},
      addEventListener(type,fn){this.events??={};this.events[type]=fn;},
      click(){this.events?.click?.({preventDefault(){}});},
      getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:960,height:540})
    });
    return elements.get(id);
  };
  const env={
    GAME_SPEC:{title:'Teste de naves',dimension:'2d',genre:'shooter',stages:['Primeira','Segunda'],features:{bosses:true},shooterOptions:{theme:'space'}},
    document:{getElementById:element,createElement:()=>element('created-'+elements.size),querySelector:()=>element('dialog'),querySelectorAll:()=>[]},
    requestAnimationFrame:fn=>callbacks.push(fn),setTimeout:()=>1,
    addEventListener(type,fn){handlers[type]=fn;},
    console
  };
  env.window=env;env.globalThis=env;
  vm.runInNewContext('('+boot.toString()+')()',env,{timeout:3000});
  function advance(ms){
    now+=ms;
    const fn=callbacks.shift();assert.equal(typeof fn,'function','rAF agendado');
    fn(now);
  }
  const tick=(count,fps=60)=>{for(let i=0;i<count;i++)advance(1000/fps);};
  return {
    start:()=>element('start').click(),
    pause:()=>element('pause').click(),
    tick,advance,
    keydown:key=>handlers.keydown({key,preventDefault(){},repeat:false}),
    keyup:key=>handlers.keyup({key}),
    telemetry:()=>env.__gameforgeTelemetry(),
    elements
  };
}

test('shooter mantém tempo de simulação e movimento equivalentes em 30/60/120 FPS',()=>{
 const clocks=[],positions=[];
 for(const fps of [30,60,120]){
  const game=harness();game.start();game.tick(2);
  const before=game.telemetry();
  game.keydown('ArrowRight');game.tick(fps,fps);game.keyup('ArrowRight');
  const after=game.telemetry();
  assert.equal(after.simulationHz,60);
  assert.equal(after.frames-before.frames,fps);
  assert.ok(after.simulationSteps-before.simulationSteps>=59);
  assert.ok(after.simulationSteps-before.simulationSteps<=61);
  clocks.push(after.clock-before.clock);
  positions.push(after.player.x);
 }
 assert.ok(Math.max(...clocks)-Math.min(...clocks)<.035,'tempo divergiu em FPS diferentes');
 assert.ok(Math.max(...positions)-Math.min(...positions)<13,'movimento depende do FPS');
});

test('shooter não recupera 20 segundos de física após aba suspensa',()=>{
 const game=harness();game.start();game.tick(2);
 const before=game.telemetry();
 game.advance(20000);const after=game.telemetry();
 assert.ok(after.clock-before.clock<=5/60+1e-7);
 assert.ok(after.simulationSteps-before.simulationSteps<=5);
 game.pause();const paused=game.telemetry();
 game.advance(20000);
 assert.equal(game.telemetry().clock,paused.clock);
 game.pause();game.advance(1000/60);
 assert.ok(game.telemetry().clock-paused.clock<=1/60+1e-7);
});

test('reiniciar shooter zera contador de simulação sem impedir progressão',()=>{
 const game=harness();game.start();game.tick(18);
 assert.ok(game.telemetry().simulationSteps>=17);
 game.start();assert.equal(game.telemetry().simulationSteps,0);
 assert.equal(game.telemetry().clock,0);game.tick(1);
 assert.ok(game.telemetry().simulationSteps<=1);
});
