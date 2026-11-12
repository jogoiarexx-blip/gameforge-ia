const {test}=require('node:test');const assert=require('node:assert/strict');
const parser=require('../js/parser');
test('GDD distingue RPG e defesa de torres em vez de reduzir tudo a arena',()=>{
 assert.equal(parser.parseGdd('# Reino\n## RPG de ação\nMissões e inventário').genre,'rpg');
 assert.equal(parser.parseGdd('# Defesa\n## Tower defense\nTorres, ondas e base').genre,'tower-defense');
});
test('3D é detectado e preserva controles FPS e gêneros de corrida/plataforma',()=>{
 const fps=parser.parseGdd('# Posto\n## FPS 3D\nTiro em primeira pessoa');
 assert.equal(fps.dimension,'3d');assert.equal(fps.genre,'fps');
 assert.equal(parser.parseGdd('# Ilha\nPlataforma 3D, saltar e coletar').dimension,'3d');
 assert.equal(parser.parseGdd('# Circuito\nCorrida 3D de carros').genre,'racing');
});
test('escolha explícita ganha do texto e combinações não suportadas são rejeitadas',()=>{
 const spec=parser.parseGdd('# Nave 3D\nCorrida e inimigos','',{dimension:'2d',genre:'tower-defense',theme:'desert'});
 assert.equal(spec.dimension,'2d');assert.equal(spec.genre,'tower-defense');assert.equal(spec.worldOptions.theme,'desert');
 assert.throws(()=>parser.parseGdd('# Jogo','',{dimension:'3d',genre:'tower-defense'}),/compatível/);
});
test('campanha reconhece 30 fases e informa as que ultrapassam o limite',()=>{
 const md='# Campanha\n'+Array.from({length:34},(_,i)=>`## Fase ${i+1}\nObjetivo próprio.\n`).join('');
 const spec=parser.parseGdd(md);assert.equal(spec.stages.length,30);assert.equal(spec.campaign.detectedStages,34);assert.equal(spec.campaign.omittedStages,4);
 assert.match(spec.limitations.join(' '),/34.*30/);
});
test('melhorias incrementais ampliam campanha nova até30 e ajustam mundo3D sem trocar runtime',()=>{
 const dev=require('../js/development-engine');
 const spec=parser.parseGdd('# Planeta\nAventura 3D\n'+Array.from({length:12},(_,i)=>'## Fase '+(i+1)+'\n').join(''));
 const files={'game.js':'const GAME_SPEC = '+JSON.stringify(spec)+';\n// runtime preservado','style.css':'body{}'};
 const result=dev.modify(files,spec,dev.plan('adicione uma fase "Cristal Final" e deixe o mundo maior com tema deserto e gráficos leves',spec,files));
 assert.equal(result.spec.stages.length,13);assert.equal(result.spec.worldOptions.theme,'desert');assert.equal(result.spec.worldOptions.quality,'low');assert(result.spec.worldOptions.size>48);assert(result.files['game.js'].endsWith('// runtime preservado'));
});
require('../js/runtime-template');require('../js/shooter-runtime');require('../js/world-rules');require('../js/software-renderer');require('../js/three-runtime');require('../js/strategy-rules');require('../js/expanded-2d-runtime');require('../js/advanced-td-rules');require('../js/advanced-td-runtime');require('../js/qa-bridge');require('../vendor/three-source');
const generator=require('../js/generator');const vm=require('node:vm');
test('novos estilos exportam código válido e 3D inclui Three local/licença sem CDN',()=>{
 for(const [dimension,genres] of Object.entries(parser.styles))for(const genre of genres){
  const spec=parser.parseGdd('# Jogo\n## Fase 1\nInimigos','',{dimension,genre});
  const files=generator.generate(spec,'# Jogo');
  assert.doesNotThrow(()=>new vm.Script(files['game.js']));
  assert.equal(files['GDD_original.md'],'# Jogo');
  if(dimension==='3d'){
   assert.match(files['THREE-LICENSE.txt'],/MIT License/);assert(files['engine-3d.js'].length>500000);
   const scripts=[...files['index.html'].matchAll(/<script src="([^"]+)"/g)].map(x=>x[1]);
   assert.deepEqual(scripts,['engine-3d.js','game.js']);scripts.forEach(name=>assert(name in files));
   const preview=generator.shell(spec.title,files['style.css'],files['game.js'],true,files);
   assert(!/<script src=/.test(preview));assert(preview.includes("connect-src 'none'"));assert(preview.includes('WebGLRenderer'));
   assert(preview.includes('Permission is hereby granted'));
  }
 }
});
test('bundle Three funciona sem baixar código em tempo de execução',()=>{
 const context={console,AbortController};vm.createContext(context);vm.runInContext(globalThis.GameForgeThreeSource,context,{timeout:10000});
 assert.equal(context.THREE.REVISION,'180');assert.equal(typeof context.THREE.WebGLRenderer,'function');
});
test('pedido de IA contém o estilo escolhido e não corta instrução excedente',()=>{
 const spec=parser.parseGdd('# Outro jogo','',{dimension:'2d',genre:'tower-defense'});
 const request=parser.creationInstruction(spec,'Preserve minhas fases.');
 assert.match(request,/Defesa de torres/);assert(request.endsWith('Preserve minhas fases.'));assert.throws(()=>parser.creationInstruction(spec,'a'.repeat(10000)),/10.000/);
});
test('o plano deixa pendentes ajustes sem efeito no estilo escolhido',()=>{
 const dev=require('../js/development-engine');
 for(const [dimension,genre,request] of [['2d','tower-defense','jogador mais rápido'],['3d','arena','reduzir as partículas'],['3d','platform','mais inimigos']]){
  const spec=parser.parseGdd('# Jogo','',{dimension,genre});const files={'game.js':'const GAME_SPEC = '+JSON.stringify(spec)+';','style.css':'body{}'};
  const plan=dev.plan(request,spec,files);assert.equal(plan.supported,false);assert(plan.pending.length>0);assert.equal(dev.modify(files,spec,plan).changed,false);
 }
});
