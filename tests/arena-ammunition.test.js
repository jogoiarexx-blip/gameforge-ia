const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');
const boot=require('../js/runtime-template');
test('arena de30 fases mantém combate disponível após esvaziar a munição sem acertar inimigos',()=>{
 const callbacks=[],handlers={},els={};let now=0;
 const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]||(()=>{})});
 const element=id=>els[id]||(els[id]={style:{},textContent:'',classList:{add(){},remove(){}},addEventListener(k,f){this[k]=f;},focus(){},getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:960,height:540})});
 const env={GAME_SPEC:{genre:'arena',title:'Campanha',stages:Array.from({length:30},(_,i)=>'Fase '+i),features:{enemies:true,bosses:true},tuning:{difficulty:.0001,enemyMultiplier:10000,fireRateMultiplier:100}},document:{getElementById:element,querySelectorAll:()=>[]},requestAnimationFrame:f=>callbacks.push(f),window:null,Math:Object.create(Math)};
 env.Math.random=()=>.5;env.window=env;env.addEventListener=(k,f)=>{handlers[k]=f;};vm.createContext(env);vm.runInContext('('+boot.toString()+')()',env);
 const tick=n=>{for(let i=0;i<n;i++){now+=1000/60;callbacks.shift()(now);}};
 element('start').click();tick(1);handlers.keydown({key:' ',preventDefault(){}});tick(40);handlers.keyup({key:' '});
 assert.equal(Number(els.ammo.textContent),0);assert(env.__gameforgeTelemetry().enemies>0);
 tick(100);assert(Number(els.ammo.textContent)>0);assert.equal(env.__gameforgeTelemetry().state,'play');
});
