/* GF-VOXEL-01: bounded, deterministic creative construction sandbox. */
function gameForgeVoxelWorldFactory(K){
 'use strict';
 const S=16,H=160,MIN=-32,MAX=32,LIMIT=4096,finite=Number.isFinite,int=Number.isSafeInteger;
 const colors={1:[.36,.64,.23],2:[.57,.37,.23],3:[.52,.56,.58],4:[.69,.48,.22],5:[.32,.34,.38],6:[.73,.28,.19],8:[.44,.27,.12],9:[.19,.48,.16],10:[.37,.75,.21],12:[.65,.39,.13],15:[.67,.43,.31],20:[.23,.24,.25],21:[.67,.46,.20],28:[.18,.45,.72],29:[.67,.61,.44]};
 const mapSize=n=>[64,128,256,512].includes(n)?n:64;
 const inside=(x,y,z,bound=32)=>int(x)&&int(y)&&int(z)&&x>=-bound&&x<bound&&z>=-bound&&z<bound&&y>=0&&y<H;
 const cellKey=(x,y,z)=>x+','+y+','+z;
 const validEdit=(e,bound=32)=>Array.isArray(e)&&e.length===4&&inside(e[0],e[1],e[2],bound)&&e[1]>0&&int(e[3])&&e[3]>=0&&(e[3]<=6||e[3]===8||e[3]===12||e[3]===15||e[3]===20||e[3]===21||e[3]===29);
 function create(seed,initial=[],options={}){
  if(!int(seed)||seed<0||seed>2147483647)throw Error('Seed inválida');
  const size=mapSize(options.size),MIN=-size/2,MAX=size/2,LIMIT=size===64?4096:16384,lo=MIN/S,hi=MAX/S;
  const isInside=(x,y,z)=>inside(x,y,z,MAX),landscape=options.landscape===true,details=landscape&&options.details===true;
  if(!Array.isArray(initial)||initial.length>LIMIT||!initial.every(e=>validEdit(e,MAX)))throw Error('Edições inválidas');
  const chunks=new Map(),edits=new Map(),trees=new Map(),owners=new Map(),forest=options.forest===true,storage=options.storage===true,tools=options.tools===true,advanced=options.advanced===true;
  const LF=typeof gameForgeVoxelLandscapeFactory==='function'?gameForgeVoxelLandscapeFactory:typeof require==='function'?require('./voxel-landscape.js'):null;
  const land=landscape?LF(K):null,lazy=size===512,columns=landscape&&!lazy?new Array(size*size):null;
  if(columns)for(let x=MIN;x<MAX;x++)for(let z=MIN;z<MAX;z++)columns[(z-MIN)*size+x-MIN]=land.column(seed,x,z,details);
  const column=(x,z)=>columns?columns[(z-MIN)*size+x-MIN]:land.column(seed,x,z,details);
  const height=(x,z)=>landscape?column(x,z).h:K.heightAt(seed,x,z);
  const allKeys=[],overlay=new Map(),CACHE_LIMIT=96;
  for(let cx=lo;cx<hi;cx++)for(let cz=lo;cz<hi;cz++)allKeys.push(K.key(cx,cz));
  const base=(x,y,z)=>{if(landscape)return land.block(seed,x,y,z,column(x,z),tools,advanced);const h=K.heightAt(seed,x,z);if(y>h)return 0;if(y===h)return 1;if(y>=h-3)return 2;if(!tools||y<=0||y<h-14)return 3;const r=K.hash(seed^Math.imul(y,2654435761),x,z);return r>.86?15:advanced&&r>.78?21:advanced&&r>.70?20:3;};
  let generated=0,evicted=0;
  function loadChunk(cx,cz){
   if(cx<lo||cx>=hi||cz<lo||cz>=hi)throw Error('Chunk fora do mundo');
   const key=K.key(cx,cz);let a=chunks.get(key);
   if(a){if(lazy){chunks.delete(key);chunks.set(key,a);}return a;}
   a=landscape?new Uint8Array(S*S*H):K.generateChunk(seed,cx,cz).voxels;
   for(let x=0;x<S;x++)for(let z=0;z<S;z++){
    const gx=cx*S+x,gz=cz*S+z;
    if(landscape){const c=column(gx,gz);for(let y=0;y<=Math.max(c.h+c.wall,54,c.top||0);y++)a[(y*S+z)*S+x]=land.block(seed,gx,y,gz,c,tools,advanced);}
    else if(tools){const h=height(gx,gz);for(let y=Math.max(1,h-14);y<h-3;y++)a[(y*S+z)*S+x]=base(gx,y,gz);}
   }
   const changed=overlay.get(key);if(changed)for(const [index,id] of changed)a[index]=id;
   chunks.set(key,a);generated++;
   if(lazy&&chunks.size>CACHE_LIMIT){chunks.delete(chunks.keys().next().value);evicted++;}
   return a;
  }
  function setCell(x,y,z,id){
   const p=K.localBlock(x,y,z),key=K.key(p.cx,p.cz),original=base(x,y,z);
   let changes=overlay.get(key);
   if(id===original){if(changes){changes.delete(p.index);if(!changes.size)overlay.delete(key);}}
   else {if(!changes){changes=new Map();overlay.set(key,changes);}changes.set(p.index,id);}
   const a=chunks.get(key);if(a)a[p.index]=id;
  }
  if(!lazy)for(let cx=lo;cx<hi;cx++)for(let cz=lo;cz<hi;cz++)loadChunk(cx,cz);
  function get(x,y,z){
   if(y<0)return 3;if(!isInside(x,y,z))return 0;
   const p=K.localBlock(x,y,z),key=K.key(p.cx,p.cz),a=chunks.get(key);
   if(a)return a[p.index];
   const changes=overlay.get(key);return changes?.has(p.index)?changes.get(p.index):base(x,y,z);
  }
  const solid=(x,y,z)=>{const id=get(x,y,z);return id!==0&&id!==28;};
  function edit(x,y,z,id){
   if(!validEdit([x,y,z,id],MAX)||get(x,y,z)===id||owners.has(cellKey(x,y,z))||trees.has(cellKey(x,y+1,z))||(!forest&&id===8)||(!storage&&id===12)||(!tools&&id===15)||(!advanced&&[20,21].includes(id))||(!landscape&&id===29))return null;
   const k=cellKey(x,y,z);
   if(id!==base(x,y,z)&&!edits.has(k)&&edits.size>=LIMIT)return null;
   const p=K.localBlock(x,y,z);
   setCell(x,y,z,id);
   if(id===base(x,y,z))edits.delete(k);else edits.set(k,[x,y,z,id]);
   const dirty=new Set([K.key(p.cx,p.cz)]);
   if(p.lx===0&&p.cx>lo)dirty.add(K.key(p.cx-1,p.cz));
   if(p.lx===15&&p.cx<hi-1)dirty.add(K.key(p.cx+1,p.cz));
   if(p.lz===0&&p.cz>lo)dirty.add(K.key(p.cx,p.cz-1));
   if(p.lz===15&&p.cz<hi-1)dirty.add(K.key(p.cx,p.cz+1));
   return [...dirty];
  }
  for(const [x,y,z,id] of initial)if(get(x,y,z)!==id&&!edit(x,y,z,id))throw Error('Limite de edições');
  // GF-VOXEL-03: trees are separate from player edits. Complete tree records
  // are restored once; cut trees cannot regenerate when chunks are rebuilt.
  const MAX_TREES=size===64?64:Math.min(lazy?4096:1024,size*size/64),GROW_SECONDS=20;
  function treeCells(t,grown=t.grown){
   const a=[[t.x,t.y,t.z,grown?8:10]];
   if(!grown)return a;
   const trunk=landscape&&t.style===1?5:3;
   for(let i=1;i<trunk;i++)a.push([t.x,t.y+i,t.z,8]);
   for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)if(dx||dz){
    a.push([t.x+dx,t.y+trunk-1,t.z+dz,9]);
    if(trunk===5&&(dx===0||dz===0))a.push([t.x+dx,t.y+trunk-2,t.z+dz,9]);
   }
   a.push([t.x,t.y+trunk,t.z,9]);return a;
  }
  function legalTree(t){
   return t&&int(t.x)&&int(t.y)&&int(t.z)&&t.x>MIN&&t.x<MAX-1&&t.z>MIN&&t.z<MAX-1&&
    t.y>=1&&t.y<=(landscape?H-6:H-4)&&(!landscape||[0,1].includes(t.style))&&typeof t.grown==='boolean'&&finite(t.remaining)&&
    t.remaining>=0&&t.remaining<=GROW_SECONDS&&(t.grown?t.remaining===0:true);
  }
  function canGrowAt(t,player,ignoreOwn=false){
   if(!legalTree(t)||![1,2].includes(get(t.x,t.y-1,t.z)))return false;
   const id=cellKey(t.x,t.y,t.z);
   return treeCells(t,true).every(([x,y,z])=>isInside(x,y,z)&&
    (get(x,y,z)===0||(ignoreOwn&&owners.get(cellKey(x,y,z))===id))&&
    (!player||!overlaps(player,x,y,z)));
  }
  function writeTreeCells(t,remove=false){
   const id=cellKey(t.x,t.y,t.z),dirty=new Set();
   for(const [x,y,z,b] of treeCells(t)){
    const p=K.localBlock(x,y,z),chunk=K.key(p.cx,p.cz),k=cellKey(x,y,z);
    if(remove){owners.delete(k);setCell(x,y,z,0);}
    else {owners.set(k,id);setCell(x,y,z,b);}
    dirty.add(chunk);
    if(p.lx===0&&p.cx>lo)dirty.add(K.key(p.cx-1,p.cz));
    if(p.lx===15&&p.cx<hi-1)dirty.add(K.key(p.cx+1,p.cz));
    if(p.lz===0&&p.cz>lo)dirty.add(K.key(p.cx,p.cz-1));
    if(p.lz===15&&p.cz<hi-1)dirty.add(K.key(p.cx,p.cz+1));
   }
   return [...dirty];
  }
  function addTree(t){
   if(trees.size>=MAX_TREES||!legalTree(t)||![1,2].includes(get(t.x,t.y-1,t.z))||!treeCells(t).every(([x,y,z])=>isInside(x,y,z)&&get(x,y,z)===0))return false;
   const id=cellKey(t.x,t.y,t.z);
   if(trees.has(id))return false;
   trees.set(id,{...t});writeTreeCells(t);return true;
  }
  if(forest){
   if(options.trees!==undefined){
    if(!Array.isArray(options.trees)||options.trees.length>MAX_TREES)throw Error('Floresta inválida');
    for(const t of options.trees)if(!legalTree(t)||!addTree({x:t.x,y:t.y,z:t.z,grown:t.grown,remaining:t.remaining,...(landscape?{style:t.style}:{})}))throw Error('Árvore inválida ou sobreposta');
   }else{
    // Guaranteed accessible tree north of spawn plus seed-dependent grid trees.
    const positions=[[0,-4]];
    for(let x=MIN+6;x<=MAX-6;x+=8)for(let z=MIN+6;z<=MAX-6;z+=8){
     if((details&&column(x,z).site)||Math.hypot(x,z)<7||K.hash(seed,x,z)<(landscape&&column(x,z).biome==='dry'?.78:.34))continue;
     positions.push([x,z]);
    }
    for(const [x,z] of positions)addTree({x,y:height(x,z)+1,z,grown:true,remaining:0,...(landscape?{style:K.hash(seed^734,x,z)>.48?1:0}:{})});
   }
  }
  function treeHit(hit){
   if(!forest||!hit?.cell||get(...hit.cell)!==hit.id)return null;
   const id=owners.get(cellKey(...hit.cell)),t=trees.get(id);
   return t?{id,grown:t.grown,wood:t.grown?(landscape&&t.style===1?5:3):0,saplings:1}:null;
  }
  function cutTree(hit){
   const found=treeHit(hit);
   if(!found)return null;
   const t=trees.get(found.id),dirty=writeTreeCells(t,true);
   trees.delete(found.id);return dirty;
  }
  function plant(hit,player){
   if(!forest||!hit?.previous||!hit.cell||get(...hit.cell)!==hit.id||trees.size>=MAX_TREES)return null;
   const [x,y,z]=hit.previous;
   const t={x,y,z,grown:false,remaining:GROW_SECONDS,...(landscape?{style:K.hash(seed^734,x,z)>.48?1:0}:{})};
   if(hit.cell[0]!==x||hit.cell[1]!==y-1||hit.cell[2]!==z||!canGrowAt(t,player))return null;
   trees.set(cellKey(x,y,z),t);return writeTreeCells(t);
  }
  function grow(seconds,player){
   const dirty=new Set();
   if(!forest||!finite(seconds)||seconds<0||seconds>1)return [];
   for(const t of trees.values()){
    if(t.grown)continue;
    t.remaining=Math.max(0,t.remaining-seconds);
    if(t.remaining>1e-6||!canGrowAt(t,player,true))continue;
    for(const id of writeTreeCells(t,true))dirty.add(id);
    t.grown=true;t.remaining=0;
    for(const id of writeTreeCells(t))dirty.add(id);
   }
   return [...dirty];
  }
  function forestState(){return [...trees.values()].map(t=>({...t}));}
  function collides(x,y,z){
   if(![x,y,z].every(finite)||x-.29<MIN||x+.29>=MAX||z-.29<MIN||z+.29>=MAX||y<1||y+1.75>=H)return true;
   for(let yy=Math.floor(y+1e-5);yy<=Math.floor(y+1.75-1e-5);yy++)
    for(let zz=Math.floor(z-.29);zz<=Math.floor(z+.29);zz++)
     for(let xx=Math.floor(x-.29);xx<=Math.floor(x+.29);xx++)
      if(solid(xx,yy,zz))return true;
   return false;
  }
  function spawn(){
   const x=.5,z=.5;
   for(let y=H-2;y>0;y--)if(solid(0,y-1,0)&&!collides(x,y,z))return {x,y,z,yaw:0,pitch:-.4};
   return null;
  }
  // Amanhã pode ser substituído por greedy meshing/worker; hoje: apenas faces expostas.
  const faces=[
   [1,0,0,[[1,0,0],[1,1,0],[1,1,1],[1,0,1]],.8],
   [-1,0,0,[[0,0,1],[0,1,1],[0,1,0],[0,0,0]],.72],
   [0,1,0,[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],1],
   [0,-1,0,[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],.58],
   [0,0,1,[[1,0,1],[1,1,1],[0,1,1],[0,0,1]],.87],
   [0,0,-1,[[0,0,0],[0,1,0],[1,1,0],[1,0,0]],.76]];
  function mesh(cx,cz){
   const positions=[],rgb=[],a=loadChunk(cx,cz);
   if(!a)throw Error('Chunk fora do mundo');
   for(let y=0;y<H;y++)for(let z=0;z<S;z++)for(let x=0;x<S;x++){
    const id=a[(y*S+z)*S+x];if(!id)continue;
    const gx=cx*S+x,gz=cz*S+z,c=colors[id];
    for(const [dx,dy,dz,verts,shade] of faces){
     if(get(gx+dx,y+dy,gz+dz))continue;
     for(const i of [0,1,2,0,2,3]){
      const v=verts[i];positions.push(gx+v[0],y+v[1],gz+v[2]);rgb.push(c[0]*shade,c[1]*shade,c[2]*shade);
     }
    }
   }
   return {positions:new Float32Array(positions),colors:new Float32Array(rgb),faces:positions.length/18};
  }
  // DDA atravessa as células em ordem, retornando também a célula vazia anterior.
  function ray(origin,direction,reach=6){
   if(!Array.isArray(origin)||!Array.isArray(direction)||origin.length!==3||direction.length!==3||
      !origin.every(finite)||!direction.every(finite)||!finite(reach)||reach<=0||reach>12)return null;
   const norm=Math.hypot(...direction);if(norm<1e-8)return null;
   const dir=direction.map(v=>v/norm),p=origin.map(Math.floor),step=dir.map(Math.sign);
   const delta=dir.map(v=>v?Math.abs(1/v):Infinity);
   const next=dir.map((v,i)=>v?((v>0?p[i]+1:p[i])-origin[i])/v:Infinity);
   let previous=null,t=0;
   for(let n=0;n<64&&t<=reach;n++){
    if(!isInside(...p))return null;
    const id=get(...p);if(id&&id!==28)return {cell:[...p],previous,id,distance:t};
    previous=[...p];
    let axis=0;if(next[1]<next[axis])axis=1;if(next[2]<next[axis])axis=2;
    t=next[axis];next[axis]+=delta[axis];p[axis]+=step[axis];
   }
   return null;
  }
  function overlaps(player,x,y,z){
   return player.x+.29>x&&player.x-.29<x+1&&player.y+1.75>y&&player.y<y+1&&player.z+.29>z&&player.z-.29<z+1;
  }
  function mine(hit){
   if(!hit?.cell||get(...hit.cell)!==hit.id||hit.id===28||hit.cell[1]===0)return null;
   return edit(...hit.cell,0);
  }
  function place(hit,id,player){
   const p=hit?.previous;
   if(!p||!hit.cell||!get(...hit.cell)||get(...p)!==0||![1,2,3,4,5,6,8,12,29].includes(id)||overlaps(player,...p))return null;
   return edit(...p,id);
  }
  function decorations(cx,cz){
   if(!details)return [];
   const out=[];
   for(let x=cx*S;x<(cx+1)*S;x++)for(let z=cz*S;z<(cz+1)*S;z++){
    if(!isInside(x,1,z))continue;const c=column(x,z),y=c.h+1;
    if(c.site||get(x,y-1,z)!==1||get(x,y,z)!==0||get(x,y+1,z)!==0)continue;
    const h=K.hash(seed^97531,x,z);if(h<.88)continue;
    out.push({x:x+.5,y,z:z+.5,kind:h>.98?'shrub':h>.945?'flower':'grass',variant:K.hash(seed^273,x,z)>.5?1:0});
   }
   return out;
  }
  function snapshot(cx,cz){
   const a=loadChunk(cx,cz);if(!a)throw Error('Chunk fora do mundo');
   const p=new Uint8Array(18*18*H);
   for(let y=0;y<H;y++)for(let z=0;z<S;z++)p.set(a.subarray((y*S+z)*S,(y*S+z+1)*S),(y*18+z+1)*18+1);
   for(let y=0;y<H;y++){for(let z=-1;z<=S;z++){p[(y*18+z+1)*18]=get(cx*S-1,y,cz*S+z);p[(y*18+z+1)*18+17]=get(cx*S+S,y,cz*S+z);}for(let x=0;x<S;x++){p[y*324+x+1]=get(cx*S+x,y,cz*S-1);p[y*324+17*18+x+1]=get(cx*S+x,y,cz*S+S);}}
   return p;
  }
  return {seed,size,MIN,MAX,LIMIT,get,solid,edit,mesh,snapshot,decorations,ray,spawn,collides,mine,place,treeHit,cutTree,plant,grow,forestState,edits:()=>[...edits.values()].map(e=>[...e]),editCount:()=>edits.size,chunkKeys:()=>allKeys.slice(),cacheStats:()=>({lazy,resident:chunks.size,total:allKeys.length,generated,evicted,limit:lazy?CACHE_LIMIT:allKeys.length,voxelBytes:chunks.size*S*S*H,overlayChunks:overlay.size})};
 }
 function saveKey(config){return 'gameforge-voxel-v1:'+config.seed+':'+encodeURIComponent(config.title)+(config.mode==='resources'?':resources-v1':'')+(config.mode==='resources'&&config.forest===true?':forest-v1':'')+(config.survival===true?':survival-v1':'')+(config.storage===true?':storage-v1':'')+(config.tools===true?':tools-v1':'')+(config.advanced===true?':advanced-v1':'')+(mapSize(config.size)>64?':map-'+mapSize(config.size):'')+(config.landscape===true?':landscape-v1':'')+(config.details===true?':details-v1':'');}
 function readSave(raw,config,E,S,D,U,A){
  const size=mapSize(config.size),limit=size===64?4096:16384;
  if(typeof raw!=='string'||raw.length>(size===64?160000:size===512?1800000:850000))return null;
  try{
   const s=JSON.parse(raw);
   if(!s||s.version!==1||s.seed!==config.seed||s.title!==config.title||
    !Array.isArray(s.edits)||s.edits.length>limit||!s.edits.every(e=>validEdit(e,size/2))||
    new Set(s.edits.map(e=>cellKey(...e))).size!==s.edits.length||
    !s.player||![s.player.x,s.player.y,s.player.z,s.player.yaw,s.player.pitch].every(finite)||
    Math.abs(s.player.yaw)>Math.PI*2||Math.abs(s.player.pitch)>1.5||
    !int(s.mined)||s.mined<0||s.mined>1e9||!int(s.placed)||s.placed<0||s.placed>1e9)return null;
   const resources=config.mode==='resources',forest=resources&&config.forest===true,survival=resources&&config.survival===true,storage=resources&&config.storage===true,tools=resources&&config.tools===true,advanced=tools&&config.advanced===true;
   if(!config.landscape&&(s.landscape===true||s.edits.some(e=>e[3]===29)))return null;
   if(config.landscape===true&&s.landscape!==true)return null;
   if((config.details===true)!==(s.details===true))return null;
   if(size>64?s.size!==size:s.size!==undefined&&s.size!==64)return null;
   if(!advanced&&(s.advanced!==undefined||s.edits.some(e=>[20,21].includes(e[3]))))return null;
   if(!tools&&(s.tools!==undefined||s.edits.some(e=>e[3]===15)))return null;
   if(!storage&&(s.storage!==undefined||s.edits.some(e=>e[3]===12)))return null;
   if(!survival&&s.survival!==undefined)return null;
   if(forest?(s.forest!==true||!Array.isArray(s.trees)):(s.forest===true||s.edits.some(e=>e[3]===8)))return null;
   if(resources){
    if(s.mode!=='resources'||!E?.valid(s.bag)||s.bag.some(v=>v&&((v.id===11&&!survival)||(!forest&&[8,10].includes(v.id))||(v.id===12&&!storage)||(!tools&&v.id>=13&&v.id!==29)||(!advanced&&v.id>=17&&v.id!==29)||(!config.landscape&&v.id===29)))||typeof s.equipped!=='boolean'||
     (tools?(!U?.valid(s.tools,s.bag)||s.equipped!==!!s.tools.active):(s.equipped&&E.count(s.bag,7)<1))||!int(s.selected)||s.selected<1||![1,2,3,4,5,6,...(forest?[8,10]:[]),...(storage?[12]:[]),...(config.landscape?[29]:[])].includes(s.selected))return null;
   }else if(s.mode==='resources'||s.edits.some(e=>e[3]>3&&!(config.landscape&&e[3]===29)))return null;
   const world=create(config.seed,s.edits,{forest,storage,tools,advanced,size,landscape:config.landscape===true,details:config.details===true,...(forest?{trees:s.trees}:{})});
   if(world.collides(s.player.x,s.player.y,s.player.z)|| (survival&&!S?.valid(s.survival,world))||(storage&&!D?.valid(s.storage,world,config))||(advanced&&!A?.valid(s.advanced,s.bag,world)))return null;
   return {world,player:{x:s.player.x,y:s.player.y,z:s.player.z,yaw:s.player.yaw,pitch:s.player.pitch},mined:s.mined,placed:s.placed,...(survival?{survival:s.survival}:{}),...(storage?{storage:s.storage}:{}),...(tools?{tools:s.tools}:{}),...(advanced?{advanced:s.advanced}:{}),...(resources?{bag:E.copy(s.bag),equipped:s.equipped,selected:s.selected}:{})};
  }catch{return null;}
 }
 return {create,readSave,saveKey,MIN,MAX,H,LIMIT};
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelWorldFactory=gameForgeVoxelWorldFactory;
if(typeof module!=='undefined')module.exports=gameForgeVoxelWorldFactory;
