'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/runtime-template.js'),'utf8');
function boot(genre,stages=['Fase 1']){
  const elements=new Map(),listeners={},frames=[];
  const context2d=new Proxy({}, {get(target,key){
    if(key==='createLinearGradient')return ()=>({addColorStop(){}});
    if(key==='measureText')return ()=>({width:20});
    return target[key]??(()=>{});
  },set(target,key,value){target[key]=value;return true;}});
  function element(id){
    if(!elements.has(id))elements.set(id,{
      id,style:{},textContent:'',classList:{add(){},remove(){}},
      addEventListener(name,fn){(this.listeners??={})[name]=fn;},
      click(){this.listeners?.click?.({preventDefault(){}});},
      focus(){},getBoundingClientRect(){return {left:0,top:0,width:960,height:540}},
      getContext(){return context2d;}
    });
    return elements.get(id);
  }
  const document={getElementById:element,querySelectorAll:()=>[]};
  const window={addEventListener(name,fn){listeners[name]=fn;}};
  const sandbox={GAME_SPEC:{title:'Teste',genre,dimension:'2d',stages,features:{timer:false},graphicsQuality:'low'},
    document,window,requestAnimationFrame(fn){frames.push(fn);},console};
  vm.runInNewContext(source,sandbox,{timeout:2000});
  sandbox.gameForgeBoot();
  assert.equal(frames.length,1);
  function tick(ms){const callback=frames.shift();assert.ok(callback);callback(ms);}
  return {start:()=>element('start').click(),tick,telemetry:()=>window.__gameforgeTelemetry(),
    keydown:key=>listeners.keydown({key,preventDefault(){}}),
    keyup:key=>listeners.keyup({key}),pause:()=>element('pause').click()};
}
for(const genre of ['platform','racing','arena']){
  test('inicializa, atualiza e pausa motor '+genre,()=>{
    const game=boot(genre);
    assert.equal(game.telemetry().state,'menu');
    game.tick(16);
    game.start();
    assert.equal(game.telemetry().state,'play');
    game.tick(32);game.tick(48);
    assert.ok(game.telemetry().frames>=3);
    assert.ok(game.telemetry().clock>0);
    const before=game.telemetry().clock;
    game.pause();game.tick(64);
    assert.equal(game.telemetry().clock,before);
    game.pause();game.tick(80);
    assert.ok(game.telemetry().clock>before);
  });
}
test('aceleracao responde a controle no motor de corrida',()=>{
  const game=boot('racing');game.start();game.keydown('ArrowUp');
  for(let i=1;i<=20;i++)game.tick(i*16);
  assert.ok(game.telemetry().racing.speed>0);
  assert.ok(game.telemetry().racing.distance>0);
  game.keyup('ArrowUp');
});

test('corrida completa uma fase e exibe vitoria sem perder o estado',()=>{
  const game=boot('racing');game.start();game.keydown('ArrowUp');
  for(let i=1;i<=1500&&game.telemetry().state==='play';i++)game.tick(i*16);
  assert.equal(game.telemetry().state,'victory');
  assert.ok(game.telemetry().racing.distance>0);
});
test('corrida passa para a segunda fase e reinicia o percurso',()=>{
  const game=boot('racing',['Fase 1','Fase 2']);game.start();game.keydown('ArrowUp');game.keydown('ArrowLeft');
  for(let i=1;i<=1500&&game.telemetry().stage===0;i++)game.tick(i*16);
  assert.equal(game.telemetry().stage,1);
  assert.equal(game.telemetry().state,'play');
  assert.ok(game.telemetry().racing.distance<6000);
});
