/* GF-TRAIN-06 — checkpoint de campanha do shooter 3D.
 * Uma fase só é salva DEPOIS da vitória anterior. Não restaura ondas, projéteis
 * ou eventos no meio do combate; impede repetição de bônus por recarga.
 * Exportado para funcionar offline e sem servidor.
 */
function gameForgeShooterCampaignSaveFactory(){
 'use strict';
 const version=1;
 function fingerprint(spec){
  const snapshot=JSON.stringify([
   spec.title||'',spec.dimension||'',spec.genre||'',
   spec.stages||[],spec.stageConfig||[],spec.shooterOptions||{},spec.tuning||{}
  ]);
  // Hash estável para separar edições distintas do mesmo jogo.
  // Não pretende ser autenticação de dados locais.
  let h=2166136261;
  for(let i=0;i<snapshot.length;i++){
   h^=snapshot.charCodeAt(i);
   h=Math.imul(h,16777619)>>>0;
  }
  return h.toString(36);
 }
 function key(spec){
  const slug=String(spec.title||'jogo').toLowerCase()
   .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
   .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,44)||'jogo';
  return 'gameforge-shooter-campaign-v1-'+slug+'-'+fingerprint(spec);
 }
 function validate(spec,value){
  const length=Array.isArray(spec?.stages)?spec.stages.length:0;
  if(!value||typeof value!=='object'||Array.isArray(value)||
     value.version!==version||value.fingerprint!==fingerprint(spec))return null;
  const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
  if(length<2||!integer(value.stage,1,length-1)||
     !integer(value.health,1,100)||!integer(value.weapon,1,3)||
     !integer(value.kills,0,1000000)||!integer(value.score,0,1000000000))return null;
  return {version,fingerprint:value.fingerprint,stage:value.stage,
   health:value.health,weapon:value.weapon,kills:value.kills,score:value.score};
 }
 function make(spec,state){
  return validate(spec,{version,fingerprint:fingerprint(spec),
   stage:state.stage,health:Math.min(100,Math.max(1,Math.round(state.health))),
   weapon:state.weapon,kills:state.kills,score:state.score});
 }
 return {version,key,fingerprint,validate,make};
}
if(typeof module!=='undefined')module.exports=gameForgeShooterCampaignSaveFactory;
if(typeof globalThis!=='undefined')globalThis.gameForgeShooterCampaignSaveFactory=gameForgeShooterCampaignSaveFactory;
