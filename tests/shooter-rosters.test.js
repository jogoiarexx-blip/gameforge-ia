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

test('cada tema tem herói e elenco exclusivos, realmente usados pelas ondas',()=>{const heroes=new Set(),models=new Set();for(const theme of ['dragon','space','neon']){const g=harness(theme);g.start();g.tick(115);const t=g.telemetry();assert.ok(t.enemySamples.length>=3);assert.ok(new Set(t.enemySamples.map(e=>e.model)).size>=3);assert.ok(t.enemySamples.every(e=>t.roster.includes(e.model)));assert.ok(!heroes.has(t.heroModel));heroes.add(t.heroModel);for(const id of t.roster){assert.ok(!models.has(id));models.add(id);}}assert.equal(models.size,10);});
