/* GF-015: contrato de clips reais para personagens GLB skinned ou de transformacao.
 * Apenas reproduz tracks existentes no arquivo. Não inventa animação nem rig.
 */
(function(root){
'use strict';
function gameForgeActorAnimationsFactory(){
 const aliases={
  idle:/idle|parad|stand|breath|rest/i,
  walk:/walk|andar|passo|locomot/i,
  run:/run|correr|sprint/i,
  aim:/aim|mirar|target|point/i,
  attack:/attack|fire|shoot|golpe|punch|melee|hit_weapon/i,
  hit:/damage|hurt|react|impact|hit/i,
  death:/death|die|dead|fall|morte/i
 };
 function classify(clips=[]){
  const mapping={};
  for(const [state,regex] of Object.entries(aliases)){
   const exact=clips.find(c=>regex.test(c?.name||''));
   if(exact)mapping[state]=exact.name;
  }
  return mapping;
 }
 function create(T,model){
  const clips=Array.isArray(model?.animations)?model.animations:[];
  if(!T?.AnimationMixer||!clips.length)return {available:false,clips:[],state:'static',
   setState(){return false;},update(){},dispose(){}};
  const map=classify(clips),mixer=new T.AnimationMixer(model),actions={};
  for(const clip of clips)actions[clip.name]=mixer.clipAction(clip);
  let active=null,state='static';
  function setState(next){
   const target=map[next]||((next==='run'||next==='aim')?map.walk:null)||map.idle||clips[0].name;
   if(target===active)return target===map[next];
   const action=actions[target];
   if(!action)return false;
   if(active&&actions[active])actions[active].fadeOut(.14);
   action.reset().fadeIn(.14).play();
   if(next==='death'||next==='hit'||next==='attack'){
    action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;
   }else{
    action.setLoop(T.LoopRepeat,Infinity);action.clampWhenFinished=false;
   }
   active=target;state=next;
   return target===map[next];
  }
  setState('idle');
  return {available:true,clips:clips.map(x=>x.name),map,
   get state(){return state;},setState,
   update(dt){if(Number.isFinite(dt)&&dt>0)mixer.update(Math.min(dt,.1));},
   dispose(){mixer.stopAllAction();mixer.uncacheRoot(model);}
  };
 }
 return {create,classify};
}
root.gameForgeActorAnimationsFactory=gameForgeActorAnimationsFactory;
if(typeof module!=='undefined')module.exports=gameForgeActorAnimationsFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
