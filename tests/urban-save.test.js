'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const Save=require('../js/urban-save.js')();
const R=require('../js/urban-rules.js')();
const F=require('../js/urban-mission-flow.js')();
function storage(){
 const map=new Map();
 return {
  map,
  fail:null,
  getItem(k){return map.has(k)?map.get(k):null;},
  setItem(k,v){if(k===this.fail)throw Error('QuotaExceeded');map.set(k,String(v));},
  removeItem(k){map.delete(k);}
 };
}
test('GF-025 escreve primeiro temporario, confirma leitura e promove sem deixar pendencia',()=>{
 const db=storage(),store=Save.create(()=>db,'demo',data=>data?.version===1?data:null);
 assert.equal(store.write({version:1,cash:1450}),true);
 assert.deepEqual(store.read(),{version:1,cash:1450});
 assert.equal(db.map.has('demo:pending'),false);
});
test('GF-025 falha no temporario preserva save anterior e avisa corretamente',()=>{
 const db=storage(),store=Save.create(db,'demo',data=>data?.version===1?data:null);
 assert.equal(store.write({version:1,cash:1000}),true);
 db.fail='demo:pending';
 assert.equal(store.write({version:1,cash:9999}),false);
 assert.equal(store.read().cash,1000);
});
test('GF-025 quota na promocao preserva a versao principal ja salva',()=>{
 const db=storage(),store=Save.create(db,'demo',data=>data?.version===1?data:null);
 store.write({version:1,cash:1500});
 db.fail='demo';
 assert.equal(store.write({version:1,cash:1900}),false);
 assert.equal(store.read().cash,1500);
});
test('GF-025 dados invalidos nao entram no estado do jogo',()=>{
 const db=storage(),store=Save.create(db,'urban-v1',raw=>R.load(raw));
 db.setItem('urban-v1',JSON.stringify({version:900,cash:Infinity}));
 assert.equal(store.read(),null);
 db.setItem('urban-v1','{');
 assert.equal(store.read(),null);
 assert.equal(store.write({version:1,cash:900}),true);
 assert.equal(store.read(),null,'validador urbano rejeita payload incompleto');
});
test('GF-025 restaura save legado v1 usando mesmo nome de chave e remove temporario',()=>{
 const db=storage(),key='gameforge-urban-v1-exemplo';
 const store=Save.create(db,key,raw=>R.load(raw));
 const old={version:1,x:0,z:9,health:100,cash:1450,ammo:8,reserve:28,guardDefeated:true,captured:true,rewardGranted:true};
 db.setItem(key,JSON.stringify(old));
 assert.equal(store.read().cash,1450);
 assert.equal(store.write({...old,cash:1800}),true);
 assert.equal(store.read().cash,1800);
 assert.equal(store.remove(),true);
 assert.equal(db.getItem(key),null);
});
test('GF-025 confirma plano de missoes antes de recuperar estado e nao duplica recompensa',()=>{
 const plan=[{id:'m1',title:'Captura',reward:600,steps:[{id:'s1',action:'capture',target:'warehouse',quantity:1,requires:[]}]}];
 const db=storage(),store=Save.create(db,'gameforge-urban-missions-v2-demo',data=>F.restore(plan,data));
 let state=F.initial(plan);
 state=F.signal(plan,state,{type:'interact',target:'warehouse'}).state;
 assert.equal(state.cash,1600);
 assert.equal(store.write(state),true);
 const loaded=store.read();
 assert.equal(loaded.cash,1600);
 assert.equal(F.signal(plan,loaded,{type:'interact',target:'warehouse'}).accepted,false);
 assert.equal(F.signal(plan,loaded,{type:'interact',target:'warehouse'}).state.cash,1600);
 db.setItem(store.key,JSON.stringify({...state,schema:'mismatched-plan'}));
 assert.equal(store.read(),null);
});
test('GF-025 pacote de salvamento nao exige DOM nem rede',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../js/urban-save.js'),'utf8');
 const context={};vm.createContext(context);vm.runInContext(source,context);
 assert.equal(typeof context.gameForgeUrbanSaveFactory,'function');
});
test('GF-025 copia progresso anterior validado para backup antes de substituir o save',()=>{
 const db=storage(),store=Save.create(db,'demo',value=>value?.version===1?value:null);
 assert.equal(store.write({version:1,cash:1000}),true);
 assert.equal(store.write({version:1,cash:1800}),true);
 assert.deepEqual(JSON.parse(db.getItem('demo:backup')),{version:1,cash:1000});
 assert.equal(store.read().cash,1800);
 db.setItem('demo','{corrompido');
 assert.equal(store.read().cash,1000,'backup valido recupera progresso sem aceitar JSON corrompido');
});
test('GF-025 corrupcao do save principal nao sobrescreve o backup valido',()=>{
 const db=storage(),store=Save.create(db,'demo',value=>value?.version===1?value:null);
 store.write({version:1,cash:1400});store.write({version:1,cash:1800});
 db.setItem('demo','{');
 assert.equal(store.write({version:1,cash:2000}),true);
 assert.equal(JSON.parse(db.getItem('demo:backup')).cash,1400);
 db.setItem('demo','{');
 assert.equal(store.read().cash,1400);
});
test('GF-025 nao restaura backup de schema incompativel e remove todas as chaves',()=>{
 const db=storage(),store=Save.create(db,'demo',value=>value?.version===1?value:null);
 db.setItem('demo','{');
 db.setItem('demo:backup',JSON.stringify({version:2,cash:900000}));
 assert.equal(store.read(),null);
 store.remove();
 assert.equal(db.getItem('demo'),null);
 assert.equal(db.getItem('demo:backup'),null);
 assert.equal(db.getItem('demo:pending'),null);
});
