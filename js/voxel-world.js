/* GF-VOXEL-01: bounded, deterministic creative construction sandbox. */
function gameForgeVoxelWorldFactory(K){
 'use strict';
 const S=16,H=160,MIN=-32,MAX=32,LIMIT=4096,finite=Number.isFinite,int=Number.isSafeInteger;
 const colors={1:[.36,.64,.23],2:[.57,.37,.23],3:[.52,.56,.58],4:[.69,.48,.22],5:[.32,.34,.38],6:[.73,.28,.19]};
 const inside=(x,y,z)=>int(x)&&int(y)&&int(z)&&x>=MIN&&x<MAX&&z>=MIN&&z<MAX&&y>=0&&y<H;
 const cellKey=(x,y,z)=>x+','+y+','+z;
 const validEdit=e=>Array.isArray(e)&&e.length===4&&inside(e[0],e[1],e[2])&&e[1]>0&&int(e[3])&&e[3]>=0&&e[3]<=6;
 function create(seed,initial=[]){
  if(!int(seed)||seed<0||seed>2147483647)throw Error('Seed inválida');
  if(!Array.isArray(initial)||initial.length>LIMIT||!initial.every(validEdit))throw Error('Edições inválidas');
  const chunks=new Map(),edits=new Map();
  for(let cx=-2;cx<2;cx++)for(let cz=-2;cz<2;cz++)chunks.set(K.key(cx,cz),K.generateChunk(seed,cx,cz).voxels);
  function get(x,y,z){
   if(y<0)return 3;
   if(!inside(x,y,z))return 0;
   const p=K.localBlock(x,y,z);return chunks.get(K.key(p.cx,p.cz))[p.index];
  }
  const base=(x,y,z)=>{const h=K.heightAt(seed,x,z);return y>h?0:y===h?1:y>=h-3?2:3;};
  function edit(x,y,z,id){
   if(!validEdit([x,y,z,id])||get(x,y,z)===id)return null;
   const k=cellKey(x,y,z);
   if(id!==base(x,y,z)&&!edits.has(k)&&edits.size>=LIMIT)return null;
   const p=K.localBlock(x,y,z);
   chunks.get(K.key(p.cx,p.cz))[p.index]=id;
   if(id===base(x,y,z))edits.delete(k);else edits.set(k,[x,y,z,id]);
   const dirty=new Set([K.key(p.cx,p.cz)]);
   if(p.lx===0&&p.cx>-2)dirty.add(K.key(p.cx-1,p.cz));
   if(p.lx===15&&p.cx<1)dirty.add(K.key(p.cx+1,p.cz));
   if(p.lz===0&&p.cz>-2)dirty.add(K.key(p.cx,p.cz-1));
   if(p.lz===15&&p.cz<1)dirty.add(K.key(p.cx,p.cz+1));
   return [...dirty];
  }
  for(const [x,y,z,id] of initial)if(get(x,y,z)!==id&&!edit(x,y,z,id))throw Error('Limite de edições');
  function collides(x,y,z){
   if(![x,y,z].every(finite)||x-.29<MIN||x+.29>=MAX||z-.29<MIN||z+.29>=MAX||y<1||y+1.75>=H)return true;
   for(let yy=Math.floor(y+1e-5);yy<=Math.floor(y+1.75-1e-5);yy++)
    for(let zz=Math.floor(z-.29);zz<=Math.floor(z+.29);zz++)
     for(let xx=Math.floor(x-.29);xx<=Math.floor(x+.29);xx++)
      if(get(xx,yy,zz))return true;
   return false;
  }
  function spawn(){
   const x=.5,z=.5;
   for(let y=H-2;y>0;y--)if(get(0,y-1,0)&&!collides(x,y,z))return {x,y,z,yaw:0,pitch:-.4};
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
   const positions=[],rgb=[],a=chunks.get(K.key(cx,cz));
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
    if(!inside(...p))return null;
    const id=get(...p);if(id)return {cell:[...p],previous,id,distance:t};
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
   if(!hit?.cell||get(...hit.cell)!==hit.id||hit.cell[1]===0)return null;
   return edit(...hit.cell,0);
  }
  function place(hit,id,player){
   const p=hit?.previous;
   if(!p||!hit.cell||!get(...hit.cell)||get(...p)!==0||![1,2,3,4,5,6].includes(id)||overlaps(player,...p))return null;
   return edit(...p,id);
  }
  return {seed,get,edit,mesh,ray,spawn,collides,mine,place,edits:()=>[...edits.values()].map(e=>[...e]),chunkKeys:()=>[...chunks.keys()]};
 }
 function saveKey(config){return 'gameforge-voxel-v1:'+config.seed+':'+encodeURIComponent(config.title)+(config.mode==='resources'?':resources-v1':'');}
 function readSave(raw,config,E){
  if(typeof raw!=='string'||raw.length>160000)return null;
  try{
   const s=JSON.parse(raw);
   if(!s||s.version!==1||s.seed!==config.seed||s.title!==config.title||
    !Array.isArray(s.edits)||s.edits.length>LIMIT||!s.edits.every(validEdit)||
    new Set(s.edits.map(e=>cellKey(...e))).size!==s.edits.length||
    !s.player||![s.player.x,s.player.y,s.player.z,s.player.yaw,s.player.pitch].every(finite)||
    Math.abs(s.player.yaw)>Math.PI*2||Math.abs(s.player.pitch)>1.5||
    !int(s.mined)||s.mined<0||s.mined>1e9||!int(s.placed)||s.placed<0||s.placed>1e9)return null;
   const resources=config.mode==='resources';
   if(resources){
    if(s.mode!=='resources'||!E?.valid(s.bag)||typeof s.equipped!=='boolean'||
     (s.equipped&&E.count(s.bag,7)<1)||!int(s.selected)||s.selected<1||s.selected>6)return null;
   }else if(s.mode==='resources'||s.edits.some(e=>e[3]>3))return null;
   const world=create(config.seed,s.edits);
   if(world.collides(s.player.x,s.player.y,s.player.z))return null;
   return {world,player:{x:s.player.x,y:s.player.y,z:s.player.z,yaw:s.player.yaw,pitch:s.player.pitch},mined:s.mined,placed:s.placed,...(resources?{bag:E.copy(s.bag),equipped:s.equipped,selected:s.selected}:{})};
  }catch{return null;}
 }
 return {create,readSave,saveKey,MIN,MAX,H,LIMIT};
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelWorldFactory=gameForgeVoxelWorldFactory;
if(typeof module!=='undefined')module.exports=gameForgeVoxelWorldFactory;
