const {test}=require('node:test');
const assert=require('node:assert/strict');
const campaign=require('../js/campaign-editor');
const parser=require('../js/parser');
const dev=require('../js/development-engine');
const make=(genre='arena',dimension='2d')=>{
 const spec=parser.parseGdd('# Demo\n## Fase 1\nIntro\n## Fase 2\nBoss','',{genre,dimension});
 return {'game.js':'const GAME_SPEC = '+JSON.stringify(spec)+';\n// restante do motor preservado','style.css':'body{}'};
};
test('salva configuração e renomeia apenas fase escolhida',()=>{
 const files=make('arena','3d');
 const result=campaign.edit(files,1,{name:'Núcleo da cidade',enemies:13,boss:'no',theme:'neon',objective:'Proteja os civis'});
 assert.equal(result.changed,true);
 assert.equal(result.spec.stages[0],campaign.inspect(files).stages[0]);
 assert.equal(result.spec.stages[1],'Núcleo da cidade');
 assert.equal(result.spec.stageConfig[1].enemies,13);
 assert.equal(result.spec.stageConfig[1].boss,'no');
 assert.equal(result.spec.stageConfig[1].theme,'neon');
 assert.equal(result.spec.stageConfig[1].objective,'Proteja os civis');
 assert.match(result.files['game.js'],/restante do motor preservado/);
 assert.match(result.files['CAMPANHA_EDITOR.md'],/Núcleo da cidade/);
});
test('desabilita no dado parâmetros não compatíveis com estilo',()=>{
 const tower=campaign.edit(make('tower-defense'),0,{enemies:55,boss:'no',waves:7,laps:5,theme:'neon'});
 assert.equal(tower.spec.stageConfig[0].enemies,0);
 assert.equal(tower.spec.stageConfig[0].boss,'auto');
 assert.equal(tower.spec.stageConfig[0].waves,7);
 assert.equal(tower.spec.stageConfig[0].laps,0);
 assert.equal(tower.spec.stageConfig[0].theme,'auto');
 const racing=campaign.edit(make('racing','3d'),0,{enemies:99,laps:6,theme:'desert'});
 assert.equal(racing.spec.stageConfig[0].enemies,12);
 assert.equal(racing.spec.stageConfig[0].laps,6);
});
test('mantém configurações das demais fases e protege dados arbitrários',()=>{
 const files=make('shooter');
 const one=campaign.edit(files,0,{enemies:80,boss:'no',name:'Começo',objective:'\nTexto | safe'});
 const two=campaign.edit(one.files,1,{enemies:31,boss:'yes',name:'Final'});
 assert.equal(two.spec.stageConfig[0].enemies,80);
 assert.equal(two.spec.stageConfig[1].enemies,31);
 assert.equal(two.spec.stageConfig[0].objective,'Texto | safe');
 assert.equal(two.changed,true);
 assert.equal(campaign.edit(two.files,1,{...campaign.option(two.spec,1),name:'Final'}).changed,false);
 assert.throws(()=>campaign.edit({'game.js':'alert(1)','style.css':'body{}'},0,{}),/GAME_SPEC/);
});
test('melhoria incremental mantém personalizações anteriores',()=>{
 const files=campaign.edit(make('arena','3d'),0,{enemies:14,boss:'yes',name:'Pátio'}).files;
 const spec=campaign.inspect(files);
 const output=dev.modify(files,spec,dev.plan('aumentar dificuldade',spec,files));
 assert.equal(output.spec.stageConfig[0].enemies,14);
 assert.equal(output.spec.stages[0],'Pátio');
});
