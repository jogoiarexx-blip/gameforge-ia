/* GF-010: escolha de rotas por fase para campanhas shoot'em up 3D.
 * Contrato puro, sem navegador, rede, localStorage ou timers.
 * O GDD seleciona modos predefinidos verificáveis; não executa texto arbitrário.
 */
(function(root){
'use strict';
function gameForgeStageBranchesFactory(){
 const names=['Superior','Central','Inferior'];
 const profiles=[
  {id:'high',name:'Caminho superior',enemyMultiplier:.75,enemySpeed:.9,reward:120},
  {id:'middle',name:'Caminho central',enemyMultiplier:1,enemySpeed:1,reward:200},
  {id:'low',name:'Caminho inferior',enemyMultiplier:1.4,enemySpeed:1.2,reward:320},
  {id:'secret',name:'Passagem secreta',enemyMultiplier:1.6,enemySpeed:1.3,reward:500,secret:true}
 ];
 function parse(text){
  const norm=String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const wants=/(?:\b(?:2|3|tres|dois)\s+caminhos?\b|\b(?:caminhos?|rotas?)\s+(?:alternativ[ao]s?|diferentes|ramificad[ao]s?)\b|\bescolh(?:a|er)\s+(?:um\s+)?(?:caminho|rota)\b)/.test(norm);
  if(!wants)return null;
  const two=/\b(?:2|dois)\s+caminhos?\b/.test(norm)&&!/\b(?:3|tres)\s+caminhos?\b/.test(norm);
  const secret=/\b(?:secret[ao]|escondid[ao]|passagem secreta)\b/.test(norm);
  return {version:1,enabled:true,choices:two?['high','low']:['high','middle','low'],secret};
 }
 function options(config,unlock=false){
  if(!config||config.enabled!==true||config.version!==1)return [];
  const ids=Array.isArray(config.choices)?config.choices:[];
  const result=profiles.filter(p=>ids.includes(p.id));
  if(config.secret&&unlock)result.push(profiles[3]);
  return result.map(p=>({...p}));
 }
 function choose(config,id,unlock=false){
  return options(config,unlock).find(p=>p.id===id)||null;
 }
 function validateCheckpoint(config,raw,stageCount){
  if(!config||!raw||raw.version!==1||!Number.isInteger(raw.stage)||
     raw.stage<0||raw.stage>=stageCount||!Number.isFinite(raw.health)||
     raw.health<=0||raw.health>100||!Number.isSafeInteger(raw.score)||raw.score<0||
     !Number.isInteger(raw.weapon)||raw.weapon<1||raw.weapon>3||
     !Number.isInteger(raw.kills)||raw.kills<0||raw.kills>1e7||
     !(raw.route===null||(typeof raw.route==='string'&&raw.route.length<=20)))return null;
  const option=raw.route===null?null:choose(config,raw.route,raw.kills>=10);
  if(raw.route!==null&&!option)return null;
  return {version:1,stage:raw.stage,route:option?.id||null,
   health:raw.health,score:raw.score,weapon:raw.weapon,kills:raw.kills};
 }
 return {parse,options,choose,validateCheckpoint};
}
root.gameForgeStageBranchesFactory=gameForgeStageBranchesFactory;
if(typeof module!=='undefined')module.exports=gameForgeStageBranchesFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
