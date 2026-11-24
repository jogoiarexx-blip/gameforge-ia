/* GF-TRAIN-25 — optional Rapier adapter, separate from rendering and lightweight runtime. */
(function(root){
'use strict';
function gameForgeRapierFactory(){
 const fixed=1/60;
 const finite=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
 const vector=(v,max=10000)=>v&&['x','y','z'].every(k=>finite(v[k],-max,max));
 function create(R,options={}){
  if(!R?.World||!R?.RigidBodyDesc||!R?.ColliderDesc)throw Error('Rapier deve ser inicializado antes de criar o mundo.');
  const gravity=options.gravity??{x:0,y:-9.81,z:0};
  if(!vector(gravity,100))throw Error('Gravidade inválida');
  const world=new R.World(gravity);world.timestep=fixed;
  const objects=new Map();let accumulator=0,steps=0,closed=false;
  const live=()=>{if(closed)throw Error('Mundo físico encerrado');};
  function add(id,shape,position,opts={}){
   live();
   if(typeof id!=='string'||!id||id.length>80||objects.has(id)||objects.size>=512||!vector(position))throw Error('Identificador ou posição inválida');
   const type=opts.type??'fixed';
   if(!['fixed','dynamic','kinematic'].includes(type))throw Error('Tipo físico inválido');
   let cd;
   if(shape?.kind==='box'&&vector(shape.half,100)&&Object.values(shape.half).every(v=>v>=.025))
    cd=R.ColliderDesc.cuboid(shape.half.x,shape.half.y,shape.half.z);
   else if(shape?.kind==='sphere'&&finite(shape.radius,.025,100))cd=R.ColliderDesc.ball(shape.radius);
   else if(shape?.kind==='capsule'&&finite(shape.radius,.025,10)&&finite(shape.halfHeight,0,10))cd=R.ColliderDesc.capsule(shape.halfHeight,shape.radius);
   else throw Error('Forma física inválida');
   if(opts.friction!==undefined){if(!finite(opts.friction,0,2))throw Error('Atrito inválido');cd.setFriction(opts.friction);}
   if(opts.restitution!==undefined){if(!finite(opts.restitution,0,1))throw Error('Restituição inválida');cd.setRestitution(opts.restitution);}
   const desc=type==='dynamic'?R.RigidBodyDesc.dynamic():type==='kinematic'?R.RigidBodyDesc.kinematicPositionBased():R.RigidBodyDesc.fixed();
   desc.setTranslation(position.x,position.y,position.z);
   if(opts.rotation!==undefined){
    const q=opts.rotation;if(!q||!['x','y','z','w'].every(k=>finite(q[k],-1,1)))throw Error('Rotação inválida');
    const n=Math.hypot(q.x,q.y,q.z,q.w);if(n<1e-8)throw Error('Rotação inválida');
    desc.setRotation({x:q.x/n,y:q.y/n,z:q.z/n,w:q.w/n});
   }
   if(type==='dynamic')desc.setCcdEnabled(opts.ccd===true);
   const body=world.createRigidBody(desc);
   try{
    const collider=world.createCollider(cd,body);
    objects.set(id,{body,collider,type});
   }catch(e){world.removeRigidBody(body);throw e;}
   return id;
  }
  function remove(id){live();const x=objects.get(id);if(!x)return false;world.removeRigidBody(x.body);objects.delete(id);return true;}
  function pose(id){live();const x=objects.get(id);if(!x)return null;const p=x.body.translation(),q=x.body.rotation();return {position:{x:p.x,y:p.y,z:p.z},rotation:{x:q.x,y:q.y,z:q.z,w:q.w}};}
  function impulse(id,v){live();const x=objects.get(id);if(!x||x.type!=='dynamic'||!vector(v,10000))return false;x.body.applyImpulse(v,true);return true;}
  function moveKinematic(id,p){live();const x=objects.get(id);if(!x||x.type!=='kinematic'||!vector(p))return false;x.body.setNextKinematicTranslation(p);return true;}
  function ray(origin,direction,distance=100){
   live();if(!vector(origin)||!vector(direction)||!finite(distance,.001,10000))return null;
   const len=Math.hypot(direction.x,direction.y,direction.z);if(len<1e-8)return null;
   const hit=world.castRay(new R.Ray(origin,{x:direction.x/len,y:direction.y/len,z:direction.z/len}),distance,true);
   if(!hit)return null;const time=hit.timeOfImpact??hit.toi;
   const id=[...objects].find(([,x])=>x.collider.handle===hit.collider.handle)?.[0];
   return id&&Number.isFinite(time)?{id,distance:time}:null;
  }
  function step(dt,beforeStep){
   live();if(!finite(dt,0,60))return 0;
   accumulator+=Math.min(dt,.25);let count=0;
   while(accumulator+1e-10>=fixed&&count<5){
    if(typeof beforeStep==='function')beforeStep(fixed,steps);
    world.step();accumulator=Math.max(0,accumulator-fixed);steps++;count++;
   }
   if(count===5&&accumulator>=fixed)accumulator=0;
   return count;
  }
  function dispose(){if(closed)return;closed=true;objects.clear();world.free();}
  return {add,remove,pose,impulse,moveKinematic,ray,step,dispose,
   stats:()=>({bodies:objects.size,steps,hz:60,closed})};
 }
 async function init(R,opts){if(typeof R?.init!=='function')throw Error('Biblioteca Rapier ausente');await R.init();return create(R,opts);}
 return {init,create};
}
root.gameForgeRapierFactory=gameForgeRapierFactory;
if(typeof module!=='undefined')module.exports=gameForgeRapierFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
