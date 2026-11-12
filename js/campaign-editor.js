/* Editor determinístico por fase; não executa código do usuário. */
(function(root){
'use strict';
const pattern=/\bconst GAME_SPEC = (\{[^\n]*\});/;
const themes=['auto','forest','desert','neon','ruins'];
function inspect(files){
 const match=String(files?.['game.js']||'').match(pattern);
 if(!match)return null;
 try{const spec=JSON.parse(match[1]);return Array.isArray(spec.stages)&&spec.stages.length>0&&spec.stages.length<=30?spec:null;}catch{return null;}
}
function maxEnemies(spec){
 if(spec.genre==='tower-defense'||(spec.dimension==='3d'&&spec.genre==='platform'))return 0;
 if(spec.genre==='shooter')return 80;
 if(spec.dimension==='3d')return spec.genre==='racing'?12:24;
 return ({rpg:36,platform:45,racing:60})[spec.genre]||48;
}
function option(spec,index){
 const item=Array.isArray(spec?.stageConfig)?spec.stageConfig[index]:null;
 const o=item&&typeof item==='object'&&!Array.isArray(item)?item:{};
 return {enemies:Number.isInteger(o.enemies)&&o.enemies>0?Math.min(maxEnemies(spec),o.enemies):0,
  boss:['yes','no'].includes(o.boss)?o.boss:'auto',
  objective:typeof o.objective==='string'?o.objective.slice(0,140):'',
  waves:Number.isInteger(o.waves)&&o.waves>=1?Math.min(12,o.waves):0,
  laps:Number.isInteger(o.laps)&&o.laps>=1?Math.min(8,o.laps):0,
  theme:themes.includes(o.theme)?o.theme:'auto'};
}
function integer(value,max){const n=Number(value);return Number.isInteger(n)&&n>0?Math.min(n,max):0;}
function edit(files,index,input){
 const old=inspect(files);
 if(!old)throw Error('Editor de campanha disponível apenas para jogos gerados com GAME_SPEC editável.');
 if(!Number.isInteger(index)||index<0||index>=old.stages.length)throw Error('Selecione uma fase existente.');
 const spec=JSON.parse(JSON.stringify(old)),previous=option(old,index),raw={...previous,...input};
 const o={
  enemies:integer(raw.enemies,maxEnemies(spec)),
  boss:['yes','no'].includes(raw.boss)?raw.boss:'auto',
  objective:String(raw.objective||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,140),
  waves:integer(raw.waves,12),laps:integer(raw.laps,8),
  theme:themes.includes(raw.theme)?raw.theme:'auto'
 };
 if(maxEnemies(spec)===0)o.enemies=0;
 if(!['arena','fps','shooter','rpg'].includes(spec.genre))o.boss='auto';
 if(spec.genre!=='tower-defense')o.waves=0;
 if(spec.genre!=='racing'||spec.dimension!=='3d')o.laps=0;
 if(spec.dimension!=='3d')o.theme='auto';
 const proposed=String(input.name??spec.stages[index]).replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,80);
 if(!proposed)throw Error('O nome da fase não pode ser vazio.');
 spec.stages[index]=proposed;
 if(!Array.isArray(spec.stageConfig))spec.stageConfig=[];
 spec.stageConfig[index]=o;
 const changed=JSON.stringify(old)!==JSON.stringify(spec);
 if(!changed)return {changed:false,spec:old,files:{...files}};
 const updated=String(files['game.js']).replace(pattern,'const GAME_SPEC = '+JSON.stringify(spec).replace(/<\//g,'<\\/')+';');
 return {changed:true,spec,files:{...files,'game.js':updated,'CAMPANHA_EDITOR.md':report(spec)}};
}
function report(spec){
 const lines=['# Configuração de campanha por fase','','As configurações executáveis estão em GAME_SPEC.stageConfig no game.js. 0 e "auto" usam o comportamento original do motor. O objetivo escrito é texto no HUD, não uma missão programada.','','| Fase | Inimigos | Chefe | Ondas | Voltas | Tema 3D | Objetivo (HUD) |','|---|---:|---|---:|---:|---|---|'];
 spec.stages.forEach((title,i)=>{const o=option(spec,i);const safe=x=>String(x).replace(/\|/g,'/').replace(/[\r\n]/g,' ');lines.push('| '+(i+1)+' — '+safe(title)+' | '+(o.enemies||'auto')+' | '+o.boss+' | '+(o.waves||'auto')+' | '+(o.laps||'auto')+' | '+o.theme+' | '+safe(o.objective||'Padrão do motor')+' |');});
 return lines.join('\n')+'\n';
}
root.GameForgeCampaign={inspect,option,edit,maxEnemies,report};
if(typeof module!=='undefined')module.exports=root.GameForgeCampaign;
})(typeof globalThis!=='undefined'?globalThis:this);
