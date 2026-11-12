const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const backup=fs.existsSync(__dirname+'/../js/project-backup.js')?require('../js/project-backup.js'):{};
const original=()=>({name:'Meu dragão',gdd:'# Dragão\r\n## Fase final\r\n'+'Mecânicas. '.repeat(32000),instruction:'mais inimigos',selected:'game.js',files:{'game.js':'const GAME_SPEC = {"title":"Dragão","genre":"shooter","stages":["Vale","Final"],"tuning":{"enemyMultiplier":2}};\n// código preservado','style.css':'body{}','GDD_original.md':'# original'},history:[{instruction:'mudança',at:'2026-11-12',files:{'game.js':'// versão anterior','style.css':'body{}'},taskRecords:[]}],roadmapRecords:[{id:'v2-task',status:'validada',notes:'manual',revision:2}],selectedTaskId:'v2-task',pinnedReferences:['character-facing'],deepPlan:true});
test('backup completo preserva GDD >300 KB, código, tarefas e desfazer, sem credenciais',()=>{
 const input={...original(),apiToken:'SEGREDO',apiUrl:'https://private.invalid',model:'secret',settings:{token:'SEGREDO'}};
 const text=backup.encode(input);const snap=backup.decode(text);
 assert.equal(snap.gdd,input.gdd);assert.equal(snap.files['game.js'],input.files['game.js']);
 assert.equal(snap.history[0].files['game.js'],'// versão anterior');assert.equal(snap.roadmapRecords[0].status,'validada');
 assert(!text.includes('SEGREDO'));assert(!text.includes('private.invalid'));
});
test('dados inválidos, versões futuras, traversal e limites são rejeitados',()=>{
 assert.throws(()=>backup.decode('{'),/inválido/i);
 const valid=JSON.parse(backup.encode(original()));
 for(const change of [{version:99},{project:{...valid.project,gdd:'a'.repeat(1000001)}},{project:{...valid.project,files:{'../steal.js':'x'}}},{project:{...valid.project,files:{'game.js':true}}},{project:{...valid.project,files:{'game.js':'x'.repeat(2000001)}}}]){
  assert.throws(()=>backup.decode(JSON.stringify({...valid,...change})));
 }
 assert.throws(()=>backup.decode(' '.repeat(20000001)),/20 MB/);
});
test('quota excedida deixa o último projeto persistido intacto e retorna erro',()=>{
 let saved='anterior';const storage={setItem(){throw new Error('QuotaExceededError');},getItem(){return saved;}};
 const result=backup.save(storage,'project',original());
 assert.equal(result.ok,false);assert.equal(storage.getItem(),'anterior');assert.match(result.message,/backup/i);
});
test('salvamento bem sucedido não corta projetos com mais de 2,5 MB',()=>{
 let saved;const storage={setItem(k,v){saved=v;}};
 const snap=original();snap.files['RELATORIO_GERACAO.md']='x'.repeat(1500000);snap.history[0].files['game.js']='x'.repeat(1500000);
 assert.equal(backup.save(storage,'project',snap).ok,true);assert(JSON.parse(saved).gdd.endsWith('Mecânicas. '));
});
test('configuração ativa é restaurada do jogo e não do GDD inicial',()=>{
 const spec=backup.activeSpec(original().files,{title:'Inicial',stages:['Só uma']});
 assert.deepEqual(spec.stages,['Vale','Final']);assert.equal(spec.tuning.enemyMultiplier,2);
 assert.equal(backup.activeSpec({'game.js':'// livre'},{title:'Inicial'}).title,'Inicial');
 assert.equal(backup.activeSpec({'game.js':'const GAME_SPEC = {"stages":"invalido"};'},{title:'Inicial'}).title,'Inicial');
});
test('migração local preserva jogo e histórico mesmo com arquivos extras devolvidos pela IA',()=>{
 const legacy=original();legacy.files['README.md']='gerado por IA';legacy.history[0].files['extra.js']='antigo';
 const snap=backup.restoreStored(JSON.stringify(legacy));
 assert.equal(snap.files['game.js'],legacy.files['game.js']);assert.equal(snap.history[0].files['game.js'],'// versão anterior');
 assert(!('README.md' in snap.files));assert(!('extra.js' in snap.history[0].files));
});
test('entrada que não pode ser reaberta nunca substitui o último salvamento válido',()=>{
 let saved='ultimo valido';const storage={setItem(k,v){saved=v;}};
 for(const change of [{instruction:'x'.repeat(40001)},{gdd:'x'.repeat(1000001)}]){
  const result=backup.save(storage,'project',{...original(),...change});
  assert.equal(result.ok,false);assert.equal(saved,'ultimo valido');
 }
});
test('backup de jogo 3D conserva motor local e opções de criação',()=>{
 const snap={...original(),creationOptions:{dimension:'3d',genre:'fps',theme:'neon',size:72,quality:'low'}};
 snap.files['engine-3d.js']='/* motor local offline */';snap.files['THREE-LICENSE.txt']='MIT';
 const restored=backup.decode(backup.encode(snap));
 assert.equal(restored.files['engine-3d.js'],'/* motor local offline */');assert.deepEqual(restored.creationOptions,snap.creationOptions);
});
test('histórico 3D não grava cinco cópias da mesma dependência no navegador',()=>{
 const snap=original();snap.gdd='# Jogo';const engine='ENGINE'.repeat(120000);snap.files['engine-3d.js']=engine;
 snap.history=Array.from({length:4},(_,i)=>({instruction:'versão '+i,files:{'game.js':'// versão '+i,'style.css':'body{}','engine-3d.js':engine},gdd:'# Jogo'}));
 let raw;const storage={setItem(k,v){if(v.length>1800000)throw Error('quota');raw=v;}};
 assert.equal(backup.save(storage,'project',snap).ok,true);
 const restored=backup.restoreStored(raw);assert.equal(restored.history[3].files['engine-3d.js'],engine);assert.equal(restored.files['engine-3d.js'],engine);
});
