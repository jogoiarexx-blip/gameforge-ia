/* QA visual local: coleta snapshots do jogo, verifica movimento, renderizacao e regressao. */
(function(root){
 'use strict';
 const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 function transport(frame){
   let serial=0;
   const pending=new Map();
   const listener=event=>{
     if(event.source!==frame.contentWindow||event.data?.kind!=='gameforge-qa-response')return;
     const data=event.data, item=pending.get(data.id);
     if(!item)return;
     pending.delete(data.id);clearTimeout(item.timeout);
     if(data.ok)item.resolve(data.data);else item.reject(Error(data.error||'Erro no teste visual'));
   };
   root.addEventListener('message',listener);
   return {
     send(action,params={}){
       const id=++serial;
       return new Promise((resolve,reject)=>{
         const timeout=setTimeout(()=>{pending.delete(id);reject(Error('Prévia não respondeu ('+action+').'));},5000);
         pending.set(id,{resolve,reject,timeout});
         frame.contentWindow.postMessage({kind:'gameforge-qa-request',id,action,...params},'*');
       });
     },
     close(){root.removeEventListener('message',listener);for(const item of pending.values()){clearTimeout(item.timeout);item.reject(Error('Teste interrompido'));}pending.clear();}
   };
 }
 function compareTelemetry(a,b){
   if(!a?.player||!b?.player)return null;
   if(!Number.isFinite(a.player.x)||!Number.isFinite(b.player.x))return null;
   return Math.hypot(b.player.x-a.player.x,(b.player.y||0)-(a.player.y||0));
 }
 function checkBasic(before,after,genre){
   const issues=[],passes=[],notes=[];
   if(!before.image||!after.image)issues.push({type:'capture',severity:'error',message:'Uma captura de tela falhou.'});
   const errors=[...(before.errors||[]),...(after.errors||[])];
   if(errors.length)issues.push({type:'runtime',severity:'error',message:'Erros JavaScript: '+[...new Set(errors)].slice(0,3).join(' | ')});
   else passes.push('Nenhum erro JavaScript comunicado pelo jogo durante a inspeção.');
   if(after.width>0&&after.height>0)passes.push('Canvas encontrado: '+after.width+' × '+after.height+'.');
   else issues.push({type:'canvas',severity:'error',message:'Canvas sem dimensões válidas.'});
   const first=before.telemetry,last=after.telemetry;
   if(first&&last){
     if(last.frames<=first.frames)issues.push({type:'freeze',severity:'error',message:'O contador de quadros não avançou.'});
     else passes.push('Loop de renderização avançou '+(last.frames-first.frames)+' quadros.');
     if(last.state==='defeat')notes.push('O jogador morreu durante o cenário de teste; avaliar dificuldade e colisões.');
     const distance=compareTelemetry(first,last);
     if(distance!==null){
       if(distance<12)issues.push({type:'movement',severity:'warning',message:'O personagem percorreu apenas '+distance.toFixed(1)+' unidades ao pressionar a direção.'});
       else passes.push('Movimentação detectada: '+distance.toFixed(1)+' unidades.');
     }
     const p=last.player;
     if(p&&last.state==='play'&&genre!=='platform'&&genre!=='racing'&&
       (p.screenX < -p.radius||p.screenX>after.width+p.radius||p.screenY < -p.radius||p.screenY>after.height+p.radius)){
       issues.push({type:'bounds',severity:'error',message:'Jogador fora da área visível do canvas.'});
     }
   }else notes.push('Jogo com código próprio: posição, orientação e FPS internos não foram instrumentados; teste de movimento inconclusivo.');
   notes.push('Este teste não comprova anatomia, pose, direção dos ossos nem qualidade artística dos personagens 3D.');
   return {issues,passes,notes,scenario:'início + tecla direita por 850 ms',genre:genre||'desconhecido',at:new Date().toISOString()};
 }
 async function run(frame,genre,onUpdate=()=>{}){
   const t=transport(frame);
   try{
     onUpdate('Conectando ao jogo...');
     await t.send('ping');
     await t.send('reset');await sleep(240);
     const before=await t.send('capture');
     onUpdate('Executando movimentação de teste...');
     await t.send('press',{key:'ArrowRight'});
     await sleep(850);
     await t.send('release',{key:'ArrowRight'});
     await sleep(110);
     const after=await t.send('capture');
     const report=checkBasic(before,after,genre);
     const pixels=await pixelDiff(before.image,after.image);
     report.pixels=pixels;
     if(pixels.blackPct>96 && pixels.meanBrightness<9){
       report.issues.push({type:'blank',severity:'warning',message:'Prévia possivelmente preta/vazia: '+pixels.blackPct+'% de pixels pretos.'});
     }
     const movement=compareTelemetry(before.telemetry,after.telemetry);
     if(movement!==null&&movement>18&&pixels.changedPct<0.1){
       report.issues.push({type:'render-freeze',severity:'warning',message:'O personagem se moveu internamente, mas a imagem mudou menos de 0,1%.'});
     }
     report.passes.push('Comparação temporal: '+pixels.changedPct+'% dos pixels mudaram durante o comando.');
     if(genre==='shooter'){
       onUpdate('Testando disparos da nave...');
       await t.send('press',{key:' '});
       await sleep(380);
       const shot=await t.send('capture');
       await t.send('release',{key:' '});
       report.shot=shot;
       const shots=shot.telemetry?.playerBullets;
       if(typeof shots==='number'){
         if(shots>0)report.passes.push('Disparos testados: '+shots+' projétil(is) da nave durante o comando.');
         else report.issues.push({type:'shooter-fire',severity:'warning',message:'Espaço pressionado, mas nenhum projétil de nave foi observado.'});
       }else report.notes.push('Jogo de nave sem telemetria de projéteis: disparos não puderam ser confirmados.');
     }
     onUpdate('Inspeção finalizada.');
     return {...report,before,after};
   }finally{
     try{await t.send('release',{key:'ArrowRight'});}catch(e){}
     t.close();
   }
 }
 function pixelDiff(imgA,imgB){
   return Promise.all([imgA,imgB].map(src=>new Promise((res,rej)=>{
     const image=new Image();image.onload=()=>res(image);image.onerror=()=>rej(Error('Imagem de comparação inválida'));image.src=src;
   }))).then(([a,b])=>{
     const w=Math.min(a.width,b.width),h=Math.min(a.height,b.height);
     const cv=document.createElement('canvas');cv.width=w;cv.height=h;
     const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(a,0,0,w,h);const va=ctx.getImageData(0,0,w,h).data;
     ctx.clearRect(0,0,w,h);ctx.drawImage(b,0,0,w,h);const vb=ctx.getImageData(0,0,w,h).data;
     let changed=0,black=0,brightness=0;
     for(let i=0;i<va.length;i+=4){
       const d=Math.abs(va[i]-vb[i])+Math.abs(va[i+1]-vb[i+1])+Math.abs(va[i+2]-vb[i+2]);
       if(d>42)changed++;
       brightness+=vb[i]+vb[i+1]+vb[i+2];
       if(vb[i]<9&&vb[i+1]<9&&vb[i+2]<9)black++;
     }
     const px=w*h;
     return {changedPct:Math.round(changed/px*1000)/10,blackPct:Math.round(black/px*1000)/10,
             meanBrightness:Math.round(brightness/(px*3)),width:w,height:h};
   });
 }
 root.GameForgeVisualQA={transport,checkBasic,run,pixelDiff};
 if(typeof module!=='undefined')module.exports=root.GameForgeVisualQA;
})(typeof globalThis!=='undefined'?globalThis:this);
