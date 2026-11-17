'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../js/parser'),D=require('../js/graphics-design'),corpus=require('../training/visual-corrections-ptbr-v8.json');
test('GF-TRAIN-08: 64 revisões visuais preservam os 16 modelos e configurações não alteradas',()=>{
 assert.equal(corpus.cases.length,64);assert.equal(new Set(corpus.cases.map(x=>x.gdd+"\n"+x.instruction)).size,64);
 assert.equal(new Set(corpus.cases.map(x=>x.expected.genre+'-'+x.expected.dimension)).size,16);
 const errors=[];
 for(const row of corpus.cases){
  const s=P.parseGdd(row.gdd,row.instruction),baseline=P.parseGdd(row.gdd,''),e=row.expected;
  for(const key of ['stages','stageConfig','tuning','simulation','combatEconomy','urbanMissions'])if(JSON.stringify(s[key])!==JSON.stringify(baseline[key]))errors.push(row.instruction+': mudou '+key);
  for(const key of ['genre','dimension'])if(s[key]!==e[key])errors.push(row.instruction+': '+key+'='+s[key]);
  for(const key of ['style','quality','atmosphere','shadows','particles'])if(s.renderProfile[key]!==e[key])errors.push(row.instruction+': '+key+'='+s.renderProfile[key]);
  if(s.implementation.pending.some(x=>x.id==='advanced-graphics')!==e.advanced)errors.push(row.instruction+': advanced-graphics');
  if(s.designIR.blocked.length)errors.push(row.instruction+': motor bloqueado');
 }
 assert.deepEqual(errors,[]);
});
const compile=(gdd,cmd='',options={})=>{const spec={dimension:'3d',visualStyle:'auto',worldOptions:{}};const result=D.compile(spec,gdd,cmd,options);return {spec,...result};};
test('GF-TRAIN-08: negação termina em novo comando, mas é herdada em listas',()=>{
 for(const text of ['Sem sombras e partículas','Tira as sombras e desliga as partículas','Não ativar sombras e partículas','n quero sombras nem partículas']){
  const p=compile('',text).profile;assert.equal(p.shadows,false,text);assert.equal(p.particles,false,text);
 }
 for(const text of ['Sem sombras e com partículas','Não quero sombras mas quero partículas','Desligar sombras, depois ativar partículas']){
  const p=compile('',text).profile;assert.equal(p.shadows,false,text);assert.equal(p.particles,true,text);
 }
 const p=compile('Sem sombras e partículas.','Não desativar sombras; ligar partículas.').profile;
 assert.equal(p.shadows,true);assert.equal(p.particles,true);
});
test('GF-TRAIN-08: remover estilo ativo escolhe alternativa e explica a escolha',()=>{
 const r=compile('Visual pixel art.','Sem pixel art.');assert.equal(r.profile.style,'illustrated');assert.match(r.warnings.join(' '),/pixel removida.*illustrated/);
 const a=compile('Cartoon.','Sem pixel art.');assert.equal(a.profile.style,'cartoon','excluir outro estilo não muda o atual');
 const b=compile('Pixel art.','Sem pixel art, mas depois quero pixel art.');assert.equal(b.profile.style,'pixel');
 const all=compile('','Sem ilustrado, sem cartoon, sem low poly, sem pixel art, sem naturalista.');assert.ok(all.warnings.some(x=>/Todas as opções/.test(x)));
});
test('GF-TRAIN-08: qualidade automática limpa qualidade anterior e opções manuais prevalecem',()=>{
 const r=compile('Qualidade alta.','Qualidade automática.');assert.equal(r.spec.graphicsQuality,'auto');assert.equal(r.spec.worldOptions.quality,'auto');
 const m=compile('Qualidade alta.','Qualidade automática, sem sombras.',{graphicsQuality:'low'});
 assert.equal(m.profile.quality,'low');assert.equal(m.profile.shadows,false);
 assert.equal(m.spec.renderInterpretation.origins.quality.document,'Opções');
});
test('GF-TRAIN-08: requisitos avançados são revogados individualmente',()=>{
 assert.equal(compile('Ray tracing e texturas 4K.','Sem ray tracing.').pending.length,1);
 assert.equal(compile('Ray tracing e texturas 4K.','Sem ray tracing e sem texturas 4K.').pending.length,0);
 assert.equal(compile('','Sem ray tracing nem path tracing ou fotorrealista.').pending.length,0);
 assert.equal(compile('Sem ray tracing.','Agora quero ray tracing.').pending.length,1);
});
test('GF-TRAIN-08: origem de efeito gráfico aponta para o comando recente',()=>{
 const r=compile('Com sombras.','Retire as sombras.');assert.equal(r.origins.shadows.document,'Comando');assert.equal(r.origins.shadows.line,1);
});

test('GF-TRAIN-08: exportação e backup preservam a trilha da interpretação visual',()=>{
 require('../js/runtime-template');const G=require('../js/generator'),B=require('../js/project-backup');
 const s=P.parseGdd('# Arena 2D\nJogo de arena 2D, pixel art, qualidade alta.','Agora sem pixel art e sem sombras.');
 const files=G.generate(s,''),trace=JSON.parse(files['INTERPRETACAO_VISUAL.json']);
 assert.equal(trace.origins.style.document,'Comando');assert.ok(trace.excluded.style.includes('pixel'));
 assert.equal(JSON.parse(files['PERFIL_VISUAL.json']).shadows,false);
 const snap=B.decode(B.encode({name:'Revisão visual',files,gdd:'',instruction:''}));
 assert.equal(snap.files['INTERPRETACAO_VISUAL.json'],files['INTERPRETACAO_VISUAL.json']);
});
