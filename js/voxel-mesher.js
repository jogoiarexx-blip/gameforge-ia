/* GF-VOXEL-09: greedy exposed-face meshing; transferable padded chunk snapshot. */
function gameForgeVoxelMesherFactory(){
 'use strict';
 const S=16,H=160,P=18,colors={1:[.36,.64,.23],2:[.57,.37,.23],3:[.52,.56,.58],4:[.69,.48,.22],5:[.32,.34,.38],6:[.73,.28,.19],8:[.44,.27,.12],9:[.19,.48,.16],10:[.37,.75,.21],12:[.65,.39,.13],15:[.67,.43,.31],20:[.23,.24,.25],21:[.67,.46,.20],28:[.18,.45,.72],29:[.67,.61,.44]};
 const dims=[S,H,S];
 function tile(id,axis,sign){return id===1?(axis===1?(sign>0?1:2):24):id===8?(axis===1?25:8):id===28?26:id===29?27:id;}
 function build(snapshot,cx,cz,textured){
  const pos=[],rgb=[],uv=[],tiles=[];let faces=0,exposed=0;
  const get=(x,y,z)=>y<0?3:y>=H?0:snapshot[(y*P+z+1)*P+x+1];
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
   // Cyclic axes ensure cross(u,v) points along positive normal.
   const u=(axis+1)%3,v=(axis+2)%3,nu=dims[u],nv=dims[v],mask=new Uint8Array(nu*nv);
   const shade=axis===1?(sign>0?1:.58):axis===0?(sign>0?.8:.72):(sign>0?.87:.76);
   for(let plane=0;plane<dims[axis];plane++){
    mask.fill(0);
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){
     const p=[0,0,0];p[axis]=plane;p[u]=i;p[v]=j;const id=get(...p);
     if(!id)continue;p[axis]+=sign;const adjacent=get(...p);
     if(adjacent&&(adjacent!==28||id===28))continue;
     mask[j*nu+i]=id;exposed++;
    }
    for(let j=0;j<nv;j++)for(let i=0;i<nu;){
     const id=mask[j*nu+i];if(!id){i++;continue;}
     let w=1,h=1;while(i+w<nu&&mask[j*nu+i+w]===id)w++;
     outer:while(j+h<nv){for(let k=0;k<w;k++)if(mask[(j+h)*nu+i+k]!==id)break outer;h++;}
     for(let yy=0;yy<h;yy++)mask.fill(0,(j+yy)*nu+i,(j+yy)*nu+i+w);
     const corners=[[0,0],[w,0],[w,h],[0,h]],order=sign>0?[0,1,2,0,2,3]:[0,2,1,0,3,2],c=textured?[1,1,1]:colors[id]||[1,0,1];
     for(const k of order){
      const [a,b]=corners[k],p=[0,0,0];p[axis]=plane+(sign>0?1:0);p[u]=i+a;p[v]=j+b;
      pos.push(p[0]+cx*S,p[1],p[2]+cz*S);rgb.push(c[0]*shade,c[1]*shade,c[2]*shade);
      // On vertical walls the texture V axis follows world height.
      uv.push(axis===0?b:a,axis===0?a:b);tiles.push(tile(id,axis,sign));
     }
     faces++;i+=w;
    }
   }
  }
  return {positions:new Float32Array(pos),colors:new Float32Array(rgb),uv:new Float32Array(uv),tiles:new Float32Array(tiles),faces,exposed};
 }
 return {build};
}
if(typeof globalThis!=='undefined')globalThis.gameForgeVoxelMesherFactory=gameForgeVoxelMesherFactory;
if(typeof module!=='undefined')module.exports=gameForgeVoxelMesherFactory;
