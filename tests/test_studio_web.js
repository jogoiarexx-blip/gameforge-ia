/* Testes da geração determinística sem browser/serviços de IA. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const cp=require('node:child_process');
const root=path.join(__dirname,'..');
const parser=require(path.join(root,'js/parser.js'));
require(path.join(root,'js/runtime-template.js'));
require(path.join(root,'js/shooter-runtime.js'));
const generator=require(path.join(root,'js/generator.js'));
const zip=require(path.join(root,'js/zip.js'));
const tests=[
 ['Survival', '# FRESTAS\n## Fase 1 — Depósito\n- zumbis atacam', 'arena'],
 ['Corrida', '# CARGA PESADA\n## Corrida de caminhão\n## Fase 1 — Estrada', 'racing'],
 ['Plataforma', '# CRASH\n## Jogo de plataforma e salto\n## Fase 1 — Ilha','platform'],
 ['Nave espacial', '# NEON BLAST\n## Jogo de navinha shoot em up\n## Fase 1 — Cidade Neon\n## Fase 2 — Núcleo','shooter'],
 ['Dragão atirador', '# Sky Dragon\n## Dragon Fury jogo de nave com dragão\n## Fase 1 — Montanhas','shooter'],
];
for(const [label,md,genre] of tests){
 const spec=parser.parseGdd(md);
 assert.equal(spec.genre,genre,label);
 assert.equal(spec.stages.length,label==='Nave espacial'?2:1);
 const files=generator.generate(spec,md);
 assert(files['game.js'].includes('GAME_SPEC'));
 if (genre==='shooter') {
  assert(files['game.js'].includes('gameForgeShooterBoot') || files['game.js'].includes('bossSeen'));
  assert(files['game.js'].includes('enemyShot'));
  assert(files['MANIFESTO_SHMUP.md'].includes('Vida do chefe'));
 }
 assert(files['index.html'].includes('game.js'));
 assert.equal(files['GDD_original.md'],md);
 const tmp=path.join(os.tmpdir(),`gf-${genre}-${process.pid}.js`);
 fs.writeFileSync(tmp,files['game.js']);
 cp.execFileSync('node',['--check',tmp]);
 fs.unlinkSync(tmp);
 console.log('OK:',label,'->',genre);
}
assert(zip.zipFiles({'main.js':'console.log(1)'}).size>50);
assert.throws(()=>zip.zipFiles({'../evil':'x'}));
console.log('OK: ZIP local e proteção de caminho.');
