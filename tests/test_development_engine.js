const assert=require('node:assert/strict');
const fs=require('node:fs');const cp=require('node:child_process');const os=require('node:os');const path=require('node:path');
const R=path.join(__dirname,'..','js');
const parser=require(path.join(R,'parser.js'));
require(path.join(R,'runtime-template.js'));require(path.join(R,'shooter-runtime.js'));
const generator=require(path.join(R,'generator.js'));
const dev=require(path.join(R,'development-engine.js'));
function test(genre,md){
 const spec=parser.parseGdd(md);assert.equal(spec.genre,genre);
 const origin=generator.generate(spec,md),code=origin['game.js'];
 const instruction='Deixe o jogo mais difícil, com mais inimigos, chefes mais fortes, o jogador mais rápido, tiros mais rápidos, otimize as partículas e adicione uma fase "O Último Portal"';
 const p=dev.plan(instruction,spec,origin);
 assert(p.supported);assert(p.tasks.length>=6,p.tasks.map(x=>x.title));
 const first=dev.modify(origin,spec,p);assert(first.changed);
 assert.notEqual(first.files['game.js'],code);
 assert(first.files['game.js'].includes('"O Último Portal"'));
 assert.equal((first.files['game.js'].split('function gameForge')).length,(code.split('function gameForge')).length,'runtime preservado');
 assert(first.spec.tuning.enemyMultiplier>1);assert(first.spec.tuning.bossMultiplier>1);
 const second=dev.modify(first.files,first.spec,dev.plan('Deixe o jogo mais difícil e com mais inimigos',first.spec,first.files));
 assert(second.changed);assert(second.spec.tuning.enemyMultiplier>first.spec.tuning.enemyMultiplier);
 const missing=dev.modify(second.files,second.spec,dev.plan('Crie uma personagem em GLB com 100 mil polígonos',second.spec,second.files));
 assert.equal(missing.changed,false);assert.deepEqual(missing.files,second.files);
 const tmp=path.join(os.tmpdir(),`gf-v09-${genre}-${process.pid}.js`);
 fs.writeFileSync(tmp,second.files['game.js']);cp.execFileSync('node',['--check',tmp]);fs.rmSync(tmp);
 console.log('OK: evolução sucessiva '+genre+', sem apagar runtime e sem inventar recurso');
}
test('shooter','# Patrulha Estelar\n## Jogo de navinha\n## Fase 1 — Início');
test('arena','# Ruas do Medo\n## Survival horror de zumbis\n## Fase 1 — Cidade');
