/* GF-TRAIN-27: bounded modular inventory and bone sockets; no network or implicit saves. */
(function(root){
'use strict';
function gameForgeEquipmentFactory(){
 const slots=['weapon','armor','accessory'];
 const rarities=['common','uncommon','rare','epic','legendary'];
 const stats=['attack','defense','speed','maxHealth'];
 const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 const key=s=>typeof s==='string'&&/^[a-z0-9][a-z0-9_-]{0,47}$/.test(s)&&!['constructor','prototype','__proto__'].includes(s);
 function catalog(raw){
  if(!Array.isArray(raw)||raw.length>200)return null;
  const out=new Map();
  for(const item of raw){
   if(!item||!key(item.id)||out.has(item.id)||typeof item.name!=='string'||!item.name.trim()||item.name.length>80||
    !['material','consumable',...slots].includes(item.kind)||!rarities.includes(item.rarity))return null;
   const equipment=slots.includes(item.kind),stack=item.stack??(equipment?1:99);
   if(!integer(stack,1,99)||equipment&&stack!==1)return null;
   const bonuses=item.stats??{},upgrade=item.upgrade??null;
   if(typeof bonuses!=='object'||!bonuses||Array.isArray(bonuses)||Object.keys(bonuses).some(k=>!stats.includes(k)||!integer(bonuses[k],0,1000)))return null;
   if(!equipment&&(Object.keys(bonuses).length||upgrade))return null;
   if(upgrade&&(!key(upgrade.material)||!integer(upgrade.cost,1,99)||!integer(upgrade.max,1,10)))return null;
   out.set(item.id,{id:item.id,name:item.name,kind:item.kind,rarity:item.rarity,stack,stats:{...bonuses},upgrade:upgrade?{...upgrade}:null});
  }
  for(const item of out.values())if(item.upgrade&&out.get(item.upgrade.material)?.kind!=='material')return null;
  return out;
 }
 function create(raw,options={}){
  const defs=catalog(raw);if(!defs)throw Error('Catálogo inválido');
  const capacity=options.capacity??24;if(!integer(capacity,1,48))throw Error('Capacidade inválida');
  const project=options.projectId;if(!key(project))throw Error('Projeto inválido');
  const revision=options.catalogVersion??1;if(!integer(revision,1,1000000))throw Error('Versão inválida');
  const empty=()=>({version:1,projectId:project,catalogVersion:revision,nextId:1,items:[],equipped:{weapon:null,armor:null,accessory:null}});
  function validate(raw){
   if(!raw||raw.version!==1||raw.projectId!==project||raw.catalogVersion!==revision||
    !integer(raw.nextId,1,1e9)||!Array.isArray(raw.items)||raw.items.length>capacity||
    !raw.equipped||Object.keys(raw.equipped).length!==slots.length)return null;
   const used=new Set(),items=[];
   for(const it of raw.items){
    const def=defs.get(it?.itemId);
    if(!def||!integer(it.uid,1,raw.nextId-1)||used.has(it.uid)||!integer(it.qty,1,def.stack)||
     !integer(it.level,0,def.upgrade?.max??0))return null;
    used.add(it.uid);items.push({uid:it.uid,itemId:it.itemId,qty:it.qty,level:it.level});
   }
   const equipped={};
   for(const slot of slots){
    const uid=raw.equipped[slot];
    if(uid!==null&&(!integer(uid,1,raw.nextId-1)||defs.get(items.find(it=>it.uid===uid)?.itemId)?.kind!==slot))return null;
    equipped[slot]=uid;
   }
   return {version:1,projectId:project,catalogVersion:revision,nextId:raw.nextId,items,equipped};
  }
  let state=empty();
  const snapshot=()=>validate(state);
  const count=(id,s=state)=>s.items.reduce((n,x)=>n+(x.itemId===id?x.qty:0),0);
  function add(id,qty=1){
   const d=defs.get(id);if(!d||!integer(qty,1,999))return false;
   const s=snapshot();let left=qty;
   for(const it of s.items)if(it.itemId===id&&it.qty<d.stack&&left){
    const n=Math.min(left,d.stack-it.qty);it.qty+=n;left-=n;
   }
   while(left&&s.items.length<capacity&&s.nextId<1e9){
    const n=Math.min(left,d.stack);s.items.push({uid:s.nextId++,itemId:id,qty:n,level:0});left-=n;
   }
   if(left)return false;state=s;return true;
  }
  function equip(uid){
   const it=state.items.find(x=>x.uid===uid),d=defs.get(it?.itemId);
   if(!d||!slots.includes(d.kind))return false;
   state.equipped[d.kind]=uid;return true;
  }
  function unequip(slot){if(!slots.includes(slot))return false;state.equipped[slot]=null;return true;}
  function discard(uid,qty=1){
   const it=state.items.find(x=>x.uid===uid);
   if(!it||!integer(qty,1,it.qty)||Object.values(state.equipped).includes(uid))return false;
   it.qty-=qty;if(!it.qty)state.items=state.items.filter(x=>x.uid!==uid);return true;
  }
  function upgrade(uid){
   const s=snapshot(),it=s.items.find(x=>x.uid===uid),u=defs.get(it?.itemId)?.upgrade;
   if(!u||it.level>=u.max)return false;
   let cost=u.cost*(it.level+1);
   if(count(u.material,s)<cost)return false;
   for(const x of s.items)if(x.itemId===u.material&&cost){const n=Math.min(cost,x.qty);x.qty-=n;cost-=n;}
   s.items=s.items.filter(x=>x.qty>0);it.level++;state=s;return true;
  }
  function attributes(){
   const result=Object.fromEntries(stats.map(k=>[k,0]));
   for(const slot of slots){const it=state.items.find(x=>x.uid===state.equipped[slot]);if(!it)continue;
    for(const [k,v] of Object.entries(defs.get(it.itemId).stats))result[k]+=Math.round(v*(1+it.level*.15));}
   return result;
  }
  function load(serialized){
   if(typeof serialized!=='string'||serialized.length>30000)return false;
   let next;try{next=validate(JSON.parse(serialized));}catch{return false;}
   if(!next)return false;state=next;return true;
  }
  return {snapshot,count,add,equip,unequip,discard,upgrade,attributes,load,serialize:()=>JSON.stringify(snapshot()),reset:()=>{state=empty();}};
 }
 // Attachment is a rigid accessory owned by caller; never mutate the skeleton or clone a skinned rig.
 function sockets(model){
  const bones=new Map(),attached=new Map();
  model?.traverse?.(o=>{if(o.isBone&&o.name){const list=bones.get(o.name)||[];list.push(o);bones.set(o.name,list);}});
  function detach(slot){const node=attached.get(slot);if(!node)return null;node.removeFromParent();attached.delete(slot);return node;}
  function attach(slot,boneName,node,transform={}){
   const bone=bones.get(boneName);
   if(!slots.includes(slot)||bone?.length!==1||!node?.isObject3D||node.parent||node===model)return false;
   let invalid=false;node.traverse(o=>{if(o===model||o.isBone||o.isSkinnedMesh)invalid=true;});if(invalid)return false;
   const p=transform.position??[0,0,0],q=transform.quaternion??[0,0,0,1],s=transform.scale??1;
   if(!Array.isArray(p)||p.length!==3||!p.every(v=>Number.isFinite(v)&&Math.abs(v)<=10)||
    !Array.isArray(q)||q.length!==4||!q.every(Number.isFinite)||Math.hypot(...q)<1e-8||
    !Number.isFinite(s)||s<.01||s>10)return false;
   detach(slot);node.position.set(...p);node.quaternion.set(...q).normalize();node.scale.setScalar(s);
   bone[0].add(node);attached.set(slot,node);return true;
  }
  return {attach,detach,clear(){for(const slot of [...attached.keys()])detach(slot);}};
 }
 return {create,catalog,sockets};
}
root.gameForgeEquipmentFactory=gameForgeEquipmentFactory;
if(typeof module!=='undefined')module.exports=gameForgeEquipmentFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
