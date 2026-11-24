'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),boot=require('../js/shooter-runtime.js');
function harness(theme='space'){
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
    GAME_SPEC:{title:'Teste de naves',dimension:'2d',genre:'shooter',stages:['Primeira','Segunda'],features:{bosses:true},shooterOptions:{theme}},
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

test('perfis têm velocidade e ataques distintos',()=>{const results={};for(const theme of ['dragon','space','neon']){const g=harness(theme);g.start();g.tick(2);const x=g.telemetry().player.x;g.keydown('ArrowRight');g.tick(20);g.keyup('ArrowRight');const distance=g.telemetry().player.x-x;g.keydown(' ');g.tick(6);g.keyup(' ');const shot=g.telemetry();g.keydown('x');g.tick(2);g.keyup('x');const power=g.telemetry();assert.equal(power.specialUses,1);assert.ok(power.energy<100);results[theme]={distance,shot,power};}assert.ok(results.dragon.distance<results.space.distance&&results.space.distance<results.neon.distance);assert.ok(results.dragon.shot.projectileTypes.includes('flame'));assert.ok(results.space.power.projectileTypes.includes('missile'));assert.ok(results.neon.power.dash>0);});
test('segurar X não repete especial e reiniciar restaura recurso',()=>{const g=harness('neon');g.start();g.keydown('x');g.tick(90);assert.equal(g.telemetry().specialUses,1);g.keyup('x');g.tick(1);g.start();assert.equal(g.telemetry().specialUses,0);assert.equal(g.telemetry().energy,100);});
