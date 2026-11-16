/* GF-010: escolha de rotas por fase para campanhas shoot'em up 3D.
 * Contrato puro, sem navegador, rede, localStorage ou timers.
 * O GDD seleciona modos predefinidos verificáveis; não executa texto arbitrário.
 */
(function(root){
'use strict';
function gameForgeStageBranchesFactory(){
 const names=['Superior','Central','Inferior'];
 const profiles=[
  {id:'high',name:'Caminho superior',enemyMultiplier:.75,enemySpeed:.9,reward:120,
   scene:{id:'sky-bridges',bg:0x183c59,ground:0x244b65,structures:0x68b9da,glow:0xbde9f0}},
  {id:'middle',name:'Caminho central',enemyMultiplier:1,enemySpeed:1,reward:200,
   scene:{id:'central-outpost',bg:0x181d3b,ground:0x303a52,structures:0xc89966,glow:0xffd49a}},
  {id:'low',name:'Caminho inferior',enemyMultiplier:1.4,enemySpeed:1.2,reward:320,
   scene:{id:'canyon-ruins',bg:0x412b31,ground:0x513738,structures:0x9a6851,glow:0xf6a46b}},
  {id:'secret',name:'Passagem secreta',enemyMultiplier:1.6,enemySpeed:1.3,reward:500,secret:true,
   scene:{id:'hidden-rift',bg:0x22113f,ground:0x3a295b,structures:0x885bd1,glow:0xe2a0ff}}
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
 // Evento autoral de cada caminho: local, deterministico e independente de rede.
 // ID estavel por fase/rota, importante para nao multiplicar recompensa no save.
 function events(route,stage){
  if(!route||!['high','middle','low','secret'].includes(route.id)||
     !Number.isInteger(stage)||stage<0||stage>29)return [];
  const kinds={high:'supply',middle:'ambush',low:'hazard',secret:'cache'};
  const labels={supply:'Suprimentos aéreos',ambush:'Emboscada do posto',
   hazard:'Chuva de projéteis',cache:'Relíquia da fenda'};
  const type=kinds[route.id];
  return [{id:'s'+stage+':'+route.id+':'+type,type,at:4.5,
   label:labels[type],reward:type==='cache'?240:100,
   enemies:type==='ambush'?2:0,projectiles:type==='hazard'?4:0}];
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
  const allowed=option?events(option,raw.stage).filter(e=>['supply','cache'].includes(e.type)).map(e=>e.id):[];
  const claimed=raw.claimed===undefined?[]:raw.claimed;
  if(!Array.isArray(claimed)||claimed.length>8||claimed.some(id=>typeof id!=='string'||!allowed.includes(id))||
     new Set(claimed).size!==claimed.length)return null;
  return {version:1,stage:raw.stage,route:option?.id||null,
   health:raw.health,score:raw.score,weapon:raw.weapon,kills:raw.kills,claimed:[...claimed]};
 }
 return {parse,options,choose,events,validateCheckpoint};
}
root.gameForgeStageBranchesFactory=gameForgeStageBranchesFactory;
if(typeof module!=='undefined')module.exports=gameForgeStageBranchesFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
