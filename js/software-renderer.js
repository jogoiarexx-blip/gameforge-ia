/* Small offline CPU renderer for browsers without WebGL2. Geometry/cameras remain Three.js. */
function gameForgeSoftwareRenderer(THREE,canvas){
 'use strict';
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('Canvas 2D indisponível');
 let width=960,height=540,pixelRatio=1,clear=[171,200,203];
 let buffers=new WeakMap();const modelView=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3(),maxTriangles=4500;
 const info={render:{calls:0,triangles:0},memory:{geometries:0}};
 const byte=v=>Math.max(0,Math.min(255,Math.round(v)));
 const rgb=color=>[color.r,color.g,color.b].map(v=>byte(Math.pow(Math.max(0,v),1/2.2)*255));
 function setSize(w,h){width=Math.max(1,Math.round(w));height=Math.max(1,Math.round(h));canvas.width=Math.round(width*pixelRatio);canvas.height=Math.round(height*pixelRatio);}
 // Clip a camera-space polygon to the near plane before projection (large floor triangles cross it).
 function clipNear(poly,near){
  const result=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],insideA=a[2]<=-near,insideB=b[2]<=-near;if(insideA)result.push(a);if(insideA!==insideB){const t=(-near-a[2])/(b[2]-a[2]);result.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,-near]);}}return result;
 }
 function render(scene,camera){
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);ctx.fillStyle='rgb('+clear.join(',')+')';ctx.fillRect(0,0,width,height);
  const triangles=[],background=[],projection=camera.projectionMatrix.elements,near=Math.max(.08,camera.near||.1),fog=scene.fog,fogRGB=fog?rgb(fog.color):clear;
  let calls=0,geometryCount=0;
  scene.traverseVisible(object=>{
   if(!object.isMesh||!object.geometry||!object.material)return;
   const geo=object.geometry,attr=geo.attributes.position;if(!attr)return;geometryCount++;
   const mats=Array.isArray(object.material)?object.material:[object.material];if(mats[0].visible===false)return;
   let cached=buffers.get(geo);if(!cached||cached.length!==attr.count*3){cached=new Float64Array(attr.count*3);buffers.set(geo,cached);}
   modelView.multiplyMatrices(camera.matrixWorldInverse,object.matrixWorld);normalMatrix.getNormalMatrix(object.matrixWorld);
   const m=modelView.elements,n=normalMatrix.elements,worldPositions=attr.array,indices=geo.index&&geo.index.array;
   for(let v=0;v<attr.count;v++){const j=v*3,x=attr.getX(v),y=attr.getY(v),z=attr.getZ(v);cached[j]=m[0]*x+m[4]*y+m[8]*z+m[12];cached[j+1]=m[1]*x+m[5]*y+m[9]*z+m[13];cached[j+2]=m[2]*x+m[6]*y+m[10]*z+m[14];}
   const count=indices?indices.length:attr.count;let submitted=false;
   for(let i=0;i<count;i+=3){
    const ia=(indices?indices[i]:i)*3,ib=(indices?indices[i+1]:i+1)*3,ic=(indices?indices[i+2]:i+2)*3;
    let material=mats[0];if(mats.length>1){const group=geo.groups.find(g=>i>=g.start&&i<g.start+g.count);material=mats[group?group.materialIndex:0]||mats[0];}
    if(material.visible===false||material.opacity===0)continue;
    const az=cached[ia+2],bz=cached[ib+2],cz=cached[ic+2];if(az>-near&&bz>-near&&cz>-near)continue;if(fog&&-Math.max(az,bz,cz)>fog.far)continue;
    let poly=[[cached[ia],cached[ia+1],az],[cached[ib],cached[ib+1],bz],[cached[ic],cached[ic+1],cz]];if(az>-near||bz>-near||cz>-near)poly=clipNear(poly,near);if(poly.length<3)continue;
    const projected=poly.map(p=>{const x=p[0],y=p[1],z=p[2],w=projection[3]*x+projection[7]*y+projection[11]*z+projection[15];return [(projection[0]*x+projection[4]*y+projection[8]*z+projection[12])/w*width/2+width/2,-(projection[1]*x+projection[5]*y+projection[9]*z+projection[13])/w*height/2+height/2];});
    const area=(projected[1][0]-projected[0][0])*(projected[2][1]-projected[0][1])-(projected[1][1]-projected[0][1])*(projected[2][0]-projected[0][0]);
    if(material.side!==THREE.DoubleSide&&(material.side===THREE.BackSide?area<0:area>=0))continue;
    const xs=projected.map(p=>p[0]),ys=projected.map(p=>p[1]);if(Math.max(...xs)<0||Math.min(...xs)>width||Math.max(...ys)<0||Math.min(...ys)>height)continue;
    const ax=worldPositions[ib]-worldPositions[ia],ay=worldPositions[ib+1]-worldPositions[ia+1],azn=worldPositions[ib+2]-worldPositions[ia+2],bx=worldPositions[ic]-worldPositions[ia],by=worldPositions[ic+1]-worldPositions[ia+1],bzn=worldPositions[ic+2]-worldPositions[ia+2];
    const nx=ay*bzn-azn*by,ny=azn*bx-ax*bzn,nz=ax*by-ay*bx,wx=n[0]*nx+n[3]*ny+n[6]*nz,wy=n[1]*nx+n[4]*ny+n[7]*nz,wz=n[2]*nx+n[5]*ny+n[8]*nz;
    const len=Math.hypot(wx,wy,wz)||1,shade=material.isMeshBasicMaterial?1:.52+.48*Math.max(0,(-.4*wx+.8*wy+.5*wz)/len),base=rgb(material.color||new THREE.Color(0xffffff)),emissive=material.emissive?rgb(material.emissive):[0,0,0];
    const depth=-(az+bz+cz)/3,fogMix=fog?Math.max(0,Math.min(1,(depth-fog.near)/Math.max(1,fog.far-fog.near))):0;
    const color=base.map((c,k)=>byte((c*shade+emissive[k]*(material.emissiveIntensity||0)*.3)*(1-fogMix)+fogRGB[k]*fogMix));
    const tri={points:projected,depth:object.renderOrder>=1000?-1000:depth,layer:object.renderOrder,color:'rgb('+color.join(',')+')'};if(object.renderOrder<0)background.push(tri);else triangles.push(tri);submitted=true;
   }if(submitted)calls++;
  });
  // Keep the closest triangles if a particularly dense stage exceeds the CPU budget.
  triangles.sort((a,b)=>a.depth-b.depth);if(triangles.length>maxTriangles-background.length)triangles.length=Math.max(0,maxTriangles-background.length);triangles.reverse();background.sort((a,b)=>a.layer-b.layer||b.depth-a.depth);
  for(const tri of background.concat(triangles)){ctx.fillStyle=tri.color;ctx.beginPath();ctx.moveTo(tri.points[0][0],tri.points[0][1]);for(let i=1;i<tri.points.length;i++)ctx.lineTo(tri.points[i][0],tri.points[i][1]);ctx.closePath();ctx.fill();if(ctx.stroke){ctx.strokeStyle=tri.color;ctx.lineWidth=.45;ctx.stroke();}}
  info.render.calls=calls;info.render.triangles=triangles.length+background.length;info.memory.geometries=geometryCount;
 }
 return {mode:'software',shadowMap:{enabled:false,type:null},info,renderLists:{dispose(){buffers=new WeakMap();}},setSize,setPixelRatio(value){pixelRatio=Math.min(1,Math.max(.5,Number(value)||1));setSize(width,height);},setClearColor(value){clear=rgb(new THREE.Color(value));},render,dispose(){buffers=new WeakMap();}};
}
if(typeof module!=='undefined')module.exports=gameForgeSoftwareRenderer;
if(typeof globalThis!=='undefined')globalThis.gameForgeSoftwareRenderer=gameForgeSoftwareRenderer;
