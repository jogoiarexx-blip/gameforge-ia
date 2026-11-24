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
   const exact=clips.find(c=>regex.test(c?.name||'')&&(state!=='hit'||!aliases.attack.test(c?.name||'')));
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
  let active=null,state='static',oneShotRemaining=0,terminal=false,disposed=false;
  // Guardar a pose produzida pelo mixer, não a pose já modificada pela camada.
  const bones=[];model.traverse?.(o=>{if(o.isBone)bones.push(o);});
  const pose=bones.map(b=>({b,q:b.quaternion.clone(),p:b.position.clone(),s:b.scale.clone()}));
  const layers=new Map();
  const restore=()=>{for(const e of pose){e.b.quaternion.copy(e.q);e.b.position.copy(e.p);e.b.scale.copy(e.s);}};
  const capture=()=>{for(const e of pose){e.q.copy(e.b.quaternion);e.p.copy(e.b.position);e.s.copy(e.b.scale);}};
  function setPoseLayer(name,offset,weight=1){
   if(disposed||typeof name!=='string'||!offset||!Number.isFinite(weight)||weight<0||weight>1)return false;
   const matches=bones.filter(b=>b.name===name);
   const q=offset.quaternion;
   if(matches.length!==1||!Array.isArray(q)||q.length!==4||!q.every(Number.isFinite)||Math.hypot(...q)<1e-8)return false;
   const delta=new T.Quaternion(...q).normalize();
   layers.set(matches[0],new T.Quaternion().slerp(delta,weight));return true;
  }
  function clearPoseLayers(){if(layers.size){restore();layers.clear();}}
  const oneShot=next=>['death','hit','attack'].includes(next);
  const duration=next=>Math.max(.08,clips.find(c=>c.name===map[next])?.duration||.65);
  function setState(next){
   if(disposed||terminal)return false;
   if(oneShotRemaining>0&&next!=='death'&&next!=='hit')return false;
   // Sem clipe de ação não inventar ataque, impacto ou morte a partir de Idle.
   if(oneShot(next)&&!map[next])return false;
   const target=map[next]||((next==='run'||next==='aim')?map.walk:null)||map.idle||map.walk||map.run;
   if(!target)return false;
   if(target===active&&state===next&&!oneShot(next))return target===map[next];
   if(target===active&&state===next&&next==='hit'&&oneShotRemaining>0)return false;
   if(target===active&&state===next&&next==='attack'&&oneShotRemaining>0)return false;
   if(target===active&&state!==next&&!oneShot(next)&&!oneShot(state)){
    state=next;return target===map[next];
   }
   const action=actions[target];
   if(!action)return false;
   if(active&&active!==target&&actions[active])actions[active].fadeOut(.14);
   action.stopFading();action.setEffectiveWeight(1);action.setEffectiveTimeScale(1);
   action.reset().fadeIn(.14).play();
   if(['death','hit','attack'].includes(next)&&map[next]){
    action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;
    oneShotRemaining=duration(next);
    if(next==='death')terminal=true;
   }else{
    action.setLoop(T.LoopRepeat,Infinity);action.clampWhenFinished=false;
    oneShotRemaining=0;
   }
   active=target;state=next;
   return target===map[next];
  }
  setState('idle');
  return {available:true,clips:clips.map(x=>x.name),map,
   get state(){return state;},get oneShotRemaining(){return oneShotRemaining;},
   duration,setState,setPoseLayer,clearPoseLayers,
   reset(){if(disposed)return;clearPoseLayers();mixer.stopAllAction();active=null;state='static';oneShotRemaining=0;terminal=false;setState('idle');},
   update(dt){
    if(disposed||!Number.isFinite(dt)||dt<=0)return;
    const step=Math.min(dt,.1);
    if(layers.size)restore();
    mixer.update(step);
    capture();
    if(!terminal)for(const [bone,q] of layers)bone.quaternion.multiply(q).normalize();
    oneShotRemaining=Math.max(0,oneShotRemaining-step);
   },
   dispose(){if(disposed)return;clearPoseLayers();mixer.stopAllAction();mixer.uncacheRoot(model);disposed=true;}
  };
 }
 return {create,classify};
}
root.gameForgeActorAnimationsFactory=gameForgeActorAnimationsFactory;
if(typeof module!=='undefined')module.exports=gameForgeActorAnimationsFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
