'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),boot=require('../js/shooter-runtime.js');
function harness(theme='space',stages=['Primeira','Segunda']){
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
    GAME_SPEC:{title:'Teste de naves',dimension:'2d',genre:'shooter',stages,features:{bosses:true},shooterOptions:{theme}},
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

test('cenários por título e por tema, renderização limitada',()=>{for(const [theme,stages,expected] of [["dragon",["Castelo","Vulcão","Oceano"],["castle","volcano","ocean"]],["space",["Asteroides","Estação orbital","Nebulosa"],["asteroids","station","nebula"]],["neon",["Cidade Neon","Rodovia","Túnel"],["megacity","highway","tunnel"]]]){const g=harness(theme,stages);g.start();g.tick(120);const q=g.telemetry();assert.equal(q.scenery.stageScenes.join(','),expected.join(','));assert.equal(q.scenery.layers,3);assert.ok(q.scenery.draws>0&&q.scenery.draws<=39);for(let i=1;i<stages.length;i++){const single=harness(theme,[stages[i]]);single.start();single.tick(2);assert.equal(single.telemetry().scenery.id,expected[i]);}}});
test('cenários desconhecidos usam ciclo próprio, estável entre execuções',()=>{for(const theme of ['dragon','space','neon']){const a=harness(theme,['A','B','C']),b=harness(theme,['A','B','C']);a.start();b.start();a.tick(2);b.tick(2);assert.equal(a.telemetry().scenery.stageScenes.join(','),b.telemetry().scenery.stageScenes.join(','));assert.equal(new Set(a.telemetry().scenery.stageScenes).size,3);}});
