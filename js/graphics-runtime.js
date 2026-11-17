/* Uma instância por jogo; serializável, offline e sem estado de gameplay. */
(function(root){
function gameForgeGraphicsFactory(spec){
 'use strict';
 const raw=spec.renderProfile||{};
 const profile={style:['pixel','cartoon','illustrated','natural','lowpoly'].includes(raw.style)?raw.style:'illustrated',
  quality:['auto','low','medium','high'].includes(raw.quality)?raw.quality:'auto',
  theme:['forest','desert','neon','ruins'].includes(raw.theme)?raw.theme:'forest',
  atmosphere:['day','sunset','night'].includes(raw.atmosphere)?raw.atmosphere:'day',
  shadows:raw.shadows!==false,particles:raw.particles!==false};
 const mobile=typeof window!=='undefined'&&window.innerWidth<=600;
 const quality=profile.quality==='auto'?(mobile?'low':'medium'):profile.quality;
 const detail=quality==='low'?1:quality==='medium'?2:3;
 const palettes={forest:{sky:'#234b60',ground:'#315a43',light:'#89b06e',dark:'#173c36',accent:'#f7d38b'},
  desert:{sky:'#794e55',ground:'#aa7950',light:'#e0b578',dark:'#694d40',accent:'#91e5de'},
  neon:{sky:'#15162f',ground:'#303153',light:'#70528a',dark:'#1d2548',accent:'#66f2e6'},
  ruins:{sky:'#353c55',ground:'#636374',light:'#9a9b9b',dark:'#34394b',accent:'#c8b4eb'}};
 const palette={...palettes[profile.theme]};
 if(profile.style==='cartoon'){palette.light=profile.theme==='forest'?'#a9d66f':palette.light;palette.accent=profile.theme==='forest'?'#ffe18a':palette.accent;}
 if(profile.style==='natural'){for(const key of Object.keys(palette)){const n=parseInt(palette[key].slice(1),16),r=n>>16,g=(n>>8)&255,b=n&255,gray=r*.3+g*.59+b*.11;palette[key]='#'+[r,g,b].map(c=>Math.round(c*.78+gray*.22).toString(16).padStart(2,'0')).join('');}}
 const stats={backgrounds:0,actors:0,finishes:0,scenes:0,materials:0};
 const scenes=new WeakSet();let scratch=null;
 const dot=(c,x,y,r,color)=>{c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();};
 function backdrop(c,w,h,time=0,kind='land'){
  stats.backgrounds++;c.save();
  if(kind!=='space'){
   const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,profile.atmosphere==='night'?'#101c36':profile.atmosphere==='sunset'?'#9d6263':palette.sky);g.addColorStop(1,palette.dark);c.fillStyle=g;c.fillRect(0,0,w,h);
   dot(c,w*.79,h*.18,profile.atmosphere==='night'?22:34,profile.atmosphere==='night'?'#d8e5ed':'#f5d69d');
   for(let layer=0;layer<3;layer++){
    c.globalAlpha=.28+layer*.18;c.fillStyle=layer===2?palette.dark:palette.ground;
    for(let i=0;i<8;i++){const x=i*w/6-100-Math.sin(time*.03)*layer*12,y=h*(.62+layer*.1);c.beginPath();c.moveTo(x,y);c.lineTo(x+85,y-75-(i*43)%80);c.lineTo(x+230,y);c.fill();}
   }
  }
  if(profile.particles){c.globalAlpha=.35;for(let i=0;i<detail*7;i++){const x=(i*149+Math.sin(i+time*.3)*12+w)%w,y=(i*71+time*(kind==='space'?8:2))%h;dot(c,x,y,i%3?1:2,palette.accent);}}
  c.restore();
 }
 function surface(c,x,y,w,h,kind='stone'){
  c.save();const base=kind==='soil'?palette.ground:palette.dark;
  c.fillStyle=base;c.fillRect(x,y,w,h);
  c.fillStyle=palette.light;c.globalAlpha=.5;c.fillRect(x,y,w,Math.min(5,h/5));
  c.fillStyle='#071521';c.globalAlpha=.35;c.fillRect(x,y+h-4,w,4);c.fillRect(x+w-3,y,3,h);
  if(detail>1)for(let i=0;i<Math.min(24,Math.floor(w/14));i++){c.globalAlpha=.2;c.fillStyle=i%2?palette.light:'#0c1b25';c.fillRect(x+((i*37+11)%Math.max(1,w-6)),y+8+(i*17)%Math.max(1,h-14),3+(i%4),2);}
  if(profile.style==='cartoon'){c.globalAlpha=1;c.strokeStyle='#142431';c.lineWidth=2;c.strokeRect(x+1,y+1,w-2,h-2);}
  c.restore();
 }
 function actor(c,x,y,r=18,paint='#65c6b5',time=0,boss=false){
  stats.actors++;c.save();c.translate(x,y);
  if(profile.shadows){c.fillStyle='#07121d55';c.beginPath();c.ellipse(3,r*.8,r,r*.32,0,0,Math.PI*2);c.fill();}
  const step=Math.sin(time*8)*r*.12;
  c.fillStyle='#24364d';c.fillRect(-r*.5,r*.15, r*.34,r*.7+step);c.fillRect(r*.16,r*.15,r*.34,r*.7-step);
  if(profile.style==='pixel'){c.fillStyle=paint;c.fillRect(-r*.65,-r*.65,r*1.3,r);c.fillStyle='#efc4a0';c.fillRect(-r*.42,-r*1.13,r*.84,r*.6);}
  else if(profile.style==='lowpoly'){c.fillStyle=paint;c.beginPath();c.moveTo(-r*.8,r*.4);c.lineTo(-r*.5,-r*.65);c.lineTo(r*.45,-r*.65);c.lineTo(r*.8,r*.4);c.closePath();c.fill();c.fillStyle='#edc49f';c.beginPath();for(let i=0;i<6;i++){const a=i/6*Math.PI*2;c.lineTo(Math.cos(a)*r*.47,-r*.83+Math.sin(a)*r*.47);}c.closePath();c.fill();}
  else{
   const g=c.createLinearGradient(-r,0,r,0);g.addColorStop(0,palette.dark);g.addColorStop(.4,paint);g.addColorStop(1,paint);c.fillStyle=g;c.beginPath();c.roundRect(-r*.65,-r*.65,r*1.3,r*1.1,r*.25);c.fill();
   dot(c,0,-r*.83,r*.47,'#edc49f');
  }
  if(profile.style==='cartoon'){c.strokeStyle='#1c2d3e';c.lineWidth=3;c.strokeRect(-r*.65,-r*.65,r*1.3,r*1.1);}
  c.fillStyle=palette.accent;c.fillRect(-r*.65,r*.12,r*1.3,r*.12);
  c.fillStyle='#24354a';c.fillRect(-r*.47,-r*1.24,r*.95,r*.22);c.fillRect(r*.1,-r*.95,r*.14,r*.14);
  c.fillStyle='#f1cca6';c.fillRect(-r*.88,-r*.45,r*.22,r*.7-step);c.fillRect(r*.66,-r*.45,r*.22,r*.7+step);
  if(boss){c.strokeStyle=palette.accent;c.lineWidth=3;c.beginPath();c.moveTo(-r*.7,-r);c.lineTo(-r*.9,-r*1.5);c.moveTo(r*.7,-r);c.lineTo(r*.9,-r*1.5);c.stroke();}
  c.restore();
 }
 function unitDetail(c,x,y,r=18){
  if(detail===1)return;c.save();c.strokeStyle=profile.style==='cartoon'?'#162a3e':'#fff4cf99';c.lineWidth=profile.style==='cartoon'?3:1.5;c.beginPath();c.arc(x-3,y-3,r*.68,Math.PI,Math.PI*1.7);c.stroke();
  c.fillStyle='#152c4477';c.fillRect(x-r*.6,y+r*.1,r*1.2,3);c.restore();
 }
 function habitat(c,x,y,w,h,domain,time=0){
  surface(c,x,y,w,h,domain==='farm'?'soil':'stone');c.save();
  if(domain==='aquarium'){
   const g=c.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'#29748c');g.addColorStop(1,'#123d59');c.fillStyle=g;c.fillRect(x+5,y+5,w-10,h-10);
   c.fillStyle='#b0a17b';c.fillRect(x+5,y+h-25,w-10,20);
   for(let i=0;i<detail*3;i++){const xx=x+12+(i*37)%Math.max(1,w-24);c.strokeStyle=i%2?'#64b5a3':'#368d83';c.lineWidth=3;c.beginPath();c.moveTo(xx,y+h-25);c.quadraticCurveTo(xx-10+Math.sin(time+i)*4,y+h-60,xx+3,y+h-85-(i%3)*10);c.stroke();}
   if(profile.particles){c.strokeStyle='#c8f4fa88';for(let i=0;i<detail*3;i++){c.beginPath();c.arc(x+12+(i*41)%Math.max(1,w-24),y+15+(i*59-time*13+h)%Math.max(1,h-35),2+i%3,0,Math.PI*2);c.stroke();}}
   c.fillStyle='#dbfaff22';c.fillRect(x+9,y+9,Math.min(8,w/10),h-40);
  }else if(domain==='farm'){
   c.strokeStyle=palette.light;c.globalAlpha=.35;for(let row=1;row<7;row++){c.beginPath();c.moveTo(x+7,y+row*h/7);c.lineTo(x+w-7,y+row*h/7);c.stroke();}
  }else{
   c.fillStyle='#99744f';for(let row=1;row<4;row++)c.fillRect(x+5,y+row*h/4,w-10,7);
   c.fillStyle='#b3b9b8';c.fillRect(x+5,y+8,4,h-16);c.fillRect(x+w-9,y+8,4,h-16);
  }c.restore();
 }
 function product(c,x,y,progress,domain,time=0){
  c.save();c.translate(x,y);
  if(domain==='aquarium'){
   const r=12+progress*17;c.fillStyle='#edab5f';c.beginPath();c.moveTo(-r,0);c.lineTo(-r*1.7,-r*.65);c.lineTo(-r*1.7,r*.65);c.closePath();c.fill();
   c.fillStyle='#f6ca78';c.beginPath();c.ellipse(0,0,r,r*.62,0,0,Math.PI*2);c.fill();c.fillStyle='#c57b48';c.fillRect(-r*.4,-r*.45,r*.15,r*.9);dot(c,r*.5,-r*.12,3,'#20354a');
  }else if(domain==='farm'){
   c.strokeStyle='#92be69';c.lineWidth=4;c.beginPath();c.moveTo(0,25);c.lineTo(0,20-progress*75);c.stroke();for(let i=0;i<3;i++){const yy=12-i*progress*20;c.fillStyle=i%2?'#b9d884':'#6aa66d';c.beginPath();c.ellipse(i%2?10:-10,yy,12,5,i%2?-.5:.5,0,Math.PI*2);c.fill();}if(progress>=1)dot(c,0,-55,10,'#e4bf69');
  }else{for(let i=0;i<3;i++){c.fillStyle=['#dca174','#7ca9a7','#b29bc9'][i];c.fillRect(-26+i*20,-20-(i%2)*9,17,32);c.fillStyle='#eee2bf';c.fillRect(-23+i*20,-12-(i%2)*9,11,8);}}
  c.restore();
 }
 function finish(c,w,h){
  stats.finishes++;c.save();
  if(profile.style==='pixel'){
   if(c.canvas?.style)c.canvas.style.imageRendering='pixelated';
   if(!scratch&&typeof document!=='undefined'){scratch=document.createElement('canvas');scratch.width=Math.round(w/2);scratch.height=Math.round(h/2);}
   if(scratch){const s=scratch.getContext('2d');s.imageSmoothingEnabled=false;s.drawImage(c.canvas||document.getElementById('game'),0,0,scratch.width,scratch.height);c.imageSmoothingEnabled=false;c.drawImage(scratch,0,0,w,h);}
  }else{
   const g=c.createRadialGradient(w*.5,h*.45,h*.15,w*.5,h*.5,w*.65);g.addColorStop(0,'#07132300');g.addColorStop(.65,'#07132300');g.addColorStop(1,'#07132355');c.fillStyle=g;c.fillRect(0,0,w,h);
  }
  if(profile.atmosphere!=='day'){c.fillStyle=profile.atmosphere==='night'?'#13285422':'#ffae6516';c.fillRect(0,0,w,h);}
  c.restore();
 }
 function scene(T,renderer,world,software=false){
  if(!world||scenes.has(world))return;scenes.add(world);stats.scenes++;
  const shadows=profile.shadows&&detail>1&&!software;
  if(!software){renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=profile.atmosphere==='night'?1.2:profile.style==='cartoon'?1.15:1.05;
   if(renderer.shadowMap){renderer.shadowMap.enabled=shadows;renderer.shadowMap.type=T.PCFSoftShadowMap;}}
  if(profile.style==='pixel'&&typeof document!=='undefined'){const canvas=document.getElementById('game');if(canvas)canvas.style.imageRendering='pixelated';}
  if(profile.atmosphere!=='day'){
   const tint=new T.Color(profile.atmosphere==='night'?0x0c1730:0xc99583),strength=profile.atmosphere==='night'?.94:.55;
   if(world.background?.isColor)world.background.lerp(tint,strength);
   if(world.fog?.color)world.fog.color.lerp(tint,strength);
  }
  const adjusted=new Set();
  world.traverse(o=>{
   if(o.isDirectionalLight){o.castShadow=shadows;o.color.setHex(profile.atmosphere==='sunset'?0xffb879:profile.atmosphere==='night'?0xa7c6ff:0xffeed4);o.intensity=profile.atmosphere==='night'?1.2:2.2;
    if(o.shadow){o.shadow.mapSize.set(detail===3?2048:1024,detail===3?2048:1024);o.shadow.normalBias=.045;const cam=o.shadow.camera;if(cam){cam.left=Math.min(cam.left,-30);cam.right=Math.max(cam.right,30);cam.top=Math.max(cam.top,30);cam.bottom=Math.min(cam.bottom,-30);cam.far=Math.max(cam.far,110);cam.updateProjectionMatrix();}}
   }
   if(o.isHemisphereLight){o.intensity=profile.atmosphere==='night'?1.2:1.7;o.groundColor?.setHex(profile.atmosphere==='sunset'?0x775151:0x354954);}
   if(!o.isMesh)return;
   // Sombras não adicionam geometria nem mudam colisões; zero novas luzes por quadro.
   o.castShadow=shadows&&!o.material?.transparent;o.receiveShadow=shadows;
   for(let parent=o;parent;parent=parent.parent)if(parent.userData?.gameForgeAsset||parent.userData?.gameForgeImported)return;
   for(const m of (Array.isArray(o.material)?o.material:[o.material])){
    if(!m||adjusted.has(m)||m.isMeshBasicMaterial)continue;adjusted.add(m);stats.materials++;
    if(m.isMeshStandardMaterial){m.roughness=profile.style==='natural'?.72:profile.theme==='neon'?.4:.88;m.metalness=profile.theme==='neon'?.22:.03;
     m.flatShading=profile.style==='lowpoly'||profile.style==='cartoon';m.needsUpdate=true;}
   }
  });
 }
 function pixelRatio(base){return Math.min(base,profile.style==='pixel'?.5:quality==='low'?1:quality==='high'?1.8:1.4);}
 function snapshot(){return {...profile,effectiveQuality:quality,detail,...stats};}
 return {profile,palette,quality,detail,backdrop,surface,actor,unitDetail,habitat,product,finish,scene,pixelRatio,snapshot};
}
root.gameForgeGraphicsFactory=gameForgeGraphicsFactory;
if(typeof module!=='undefined')module.exports=gameForgeGraphicsFactory;
})(typeof globalThis!=='undefined'?globalThis:this);
