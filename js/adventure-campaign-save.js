/* GF-TRAIN-08: checkpoint de fase + marcos de objetivos em andamento.
 * Mantém a chave e compatibilidade com checkpoints da versão 7 (sem progress).
 * O jogo só inclui IDs de cristais e inimigos efetivamente coletados/derrotados.
 */
function gameForgeAdventureCampaignSaveFactory(){
 'use strict';
 const version=1,genres=new Set(['rpg','platform']);
 function fingerprint(spec){
  const source=JSON.stringify([
   spec.title||'',spec.dimension||'',spec.genre||'',
   spec.stages||[],spec.stageConfig||[],spec.worldOptions||{},
   spec.tuning||{},spec.features||{}
  ]);
  let hash=2166136261;
  for(let i=0;i<source.length;i++){
   hash^=source.charCodeAt(i);
   hash=Math.imul(hash,16777619)>>>0;
  }
  return hash.toString(36);
 }
 function key(spec){
  const slug=String(spec.title||'jogo').toLowerCase().normalize('NFD')
   .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-')
   .replace(/^-|-$/g,'').slice(0,44)||'jogo';
  return 'gameforge-adventure-campaign-v1-'+slug+'-'+fingerprint(spec);
 }
 const integer=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
 function ids(value,max=99,limit=99){
  if(!Array.isArray(value)||value.length>limit)return null;
  let previous=-1;
  for(const item of value){
   if(!integer(item,0,max)||item<=previous)return null;
   previous=item;
  }
  return value.slice();
 }
 function progressOf(spec,data){
  if(data===undefined)return undefined; // checkpoints v7 continuam legíveis
  if(!data||typeof data!=='object'||Array.isArray(data))return null;
  const crystals=ids(data.crystals,99,99),defeated=ids(data.defeated,99,32);
  if(!crystals||!defeated||!integer(data.platformCheckpoint,0,40))return null;
  if(spec.genre==='platform'&&defeated.length)return null;
  if(spec.genre==='rpg'&&data.platformCheckpoint!==0)return null;
  return {crystals,defeated,platformCheckpoint:data.platformCheckpoint};
 }
 function validate(spec,data){
  const count=Array.isArray(spec?.stages)?spec.stages.length:0;
  if(!spec||spec.dimension!=='3d'||!genres.has(spec.genre)||count<2||
     !data||typeof data!=='object'||Array.isArray(data)||
     data.version!==version||data.fingerprint!==fingerprint(spec)||
     !integer(data.stage,0,count-1)||
     !integer(data.score,0,1000000000)||
     !integer(data.health,1,100)||
     !integer(data.ammo,0,1000000))return null;
  const progress=progressOf(spec,data.progress);
  if(progress===null)return null;
  // Sem marco jogável, a fase zero não deve ter save: evita um 'save vazio'.
  if(data.stage===0&&(!progress||(!progress.crystals.length&&!progress.defeated.length&&
     progress.platformCheckpoint===0)))return null;
  const state={
   version,fingerprint:data.fingerprint,stage:data.stage,
   score:data.score,health:data.health,ammo:data.ammo
  };
  if(progress)state.progress=progress;
  if(spec.genre==='rpg'){
   if(!data.rpg||typeof data.rpg!=='object'||Array.isArray(data.rpg)||
      !integer(data.rpg.level,1,30)||!integer(data.rpg.xp,0,1000000)||
      !integer(data.rpg.potions,0,9))return null;
   state.rpg={level:data.rpg.level,xp:data.rpg.xp,potions:data.rpg.potions};
  }else if(data.rpg!==undefined)return null;
  return state;
 }
 function make(spec,state){
  if(!state||typeof state!=='object')return null;
  return validate(spec,{version,fingerprint:fingerprint(spec),
   stage:state.stage,score:state.score,health:Math.round(state.health),ammo:state.ammo,
   ...(spec.genre==='rpg'?{rpg:state.rpg}:{}),
   ...(state.progress!==undefined?{progress:state.progress}:{}),
  });
 }
 return {version,key,fingerprint,validate,make};
}
if(typeof module!=='undefined')module.exports=gameForgeAdventureCampaignSaveFactory;
if(typeof globalThis!=='undefined')globalThis.gameForgeAdventureCampaignSaveFactory=gameForgeAdventureCampaignSaveFactory;
