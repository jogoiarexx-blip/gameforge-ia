const {test}=require('node:test');
const assert=require('node:assert/strict');
const world=require('../js/world-rules')();
const parser=require('../js/parser');
const campaign=require('../js/campaign-editor');
const dev=require('../js/development-engine');
require('../js/runtime-template');require('../js/shooter-runtime');require('../js/expanded-2d-runtime');require('../js/three-runtime');require('../js/world-rules');require('../js/software-renderer');require('../js/strategy-rules');
require('../vendor/three-source');
const generator=require('../js/generator');
const vm=require('node:vm');
function setup(genre='arena',dimension='3d'){
 const spec=parser.parseGdd('# Minha campanha\n## Fase 1\n## Fase 2\n## Fase 3','',{dimension,genre});
 return {spec,files:generator.generate(spec,'# Minha campanha')};
}
test('cada missão 3D destrava apenas depois de cumprir a condição programada',()=>{
 const base={enemies:2,collected:1,required:3,elapsed:0,seconds:45};
 assert.equal(world.missionReady('default',{...base,enemies:0,collected:2}),false);
 assert.equal(world.missionReady('default',{...base,enemies:0,collected:3}),true);
 assert.equal(world.missionReady('eliminate',{...base,enemies:1,collected:3}),false);
 assert.equal(world.missionReady('eliminate',{...base,enemies:0,collected:0}),true);
 assert.equal(world.missionReady('collect',{...base,enemies:9,collected:3}),true);
 assert.equal(world.missionReady('collect',{...base,collected:2}),false);
 assert.equal(world.missionReady('survive',{...base,elapsed:44.9}),false);
 assert.equal(world.missionReady('survive',{...base,elapsed:45}),true);
 assert.equal(world.missionReady('survive',{...base,elapsed:45,seconds:999}),false);
});
test('editor habilita e valida os modos apenas no motor 3D atualizado',()=>{
 const {spec,files}=setup();
 assert.equal(campaign.hasMissionRuntime(files),true);
 const output=campaign.edit(files,1,{mission:'survive',seconds:80,name:'Resistência',enemies:11,objective:'Sobreviva'});
 assert.equal(output.spec.stageConfig[1].mission,'survive');
 assert.equal(output.spec.stageConfig[1].seconds,80);
 assert.equal(campaign.option(output.spec,0).mission,'default');
 assert.match(output.files['CAMPANHA_EDITOR.md'],/survive/);
 assert.doesNotThrow(()=>new vm.Script(output.files['game.js']));
 const limited=campaign.edit(output.files,1,{mission:'survive',seconds:999});
 assert.equal(limited.spec.stageConfig[1].seconds,180);
 const old={'game.js':'const GAME_SPEC = '+JSON.stringify(spec)+';\n// motor antigo','style.css':'body{}'};
 assert.throws(()=>campaign.edit(old,1,{mission:'survive',seconds:45}),/motor 3D antigo/);
 const td=setup('tower-defense','2d');
 const ignores=campaign.edit(td.files,0,{mission:'survive',seconds:50,waves:7});
 assert.equal(ignores.spec.stageConfig[0].mission,'default');
 assert.equal(ignores.spec.stageConfig[0].waves,7);
});
test('comando em linguagem natural transforma a fase pedida, preservando as outras',()=>{
 const {spec,files}=setup('fps');
 const command='Na fase 2, sobreviver por 45 segundos';
 const p=dev.plan(command,spec,files);
 assert.equal(p.supported,true);assert(p.tasks.some(t=>t.title==='Programar objetivo da fase'&&t.possible));
 const output=dev.modify(files,spec,p);
 assert.equal(output.changed,true);
 assert.equal(output.spec.stageConfig[1].mission,'survive');assert.equal(output.spec.stageConfig[1].seconds,45);
 assert.equal(output.spec.stageConfig[0],undefined);
 assert.match(output.files['CAMPANHA_EDITOR.md'],/survive/);
 assert.match(output.files['game.js'],/missionReady/);
 const eliminate=dev.modify(output.files,output.spec,dev.plan('Na fase 1, eliminar todos os inimigos',output.spec,output.files));
 assert.equal(eliminate.spec.stageConfig[0].mission,'eliminate');
 assert.equal(eliminate.spec.stageConfig[1].mission,'survive');
 const collect=dev.modify(eliminate.files,eliminate.spec,dev.plan('Na fase 3, coletar os cristais',eliminate.spec,eliminate.files));
 assert.equal(collect.spec.stageConfig[2].mission,'collect');
 assert.doesNotThrow(()=>new vm.Script(collect.files['game.js']));
});
test('comandos sem fase, fora do limite ou em motor sem suporte não afirmam implementação',()=>{
 const {spec,files}=setup();
 for(const command of ['sobreviver por 50 segundos','fase 22 sobreviver por 30 segundos']){
  const plan=dev.plan(command,spec,files);assert.equal(plan.supported,false);
  assert.equal(dev.modify(files,spec,plan).changed,false);
 }
 const td=setup('tower-defense','2d');
 const unsupported=dev.plan('fase 1 sobreviver por 20 segundos',td.spec,td.files);
 assert.equal(unsupported.supported,false);
});
