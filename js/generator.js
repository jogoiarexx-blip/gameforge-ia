(function(root){
  'use strict';
  function safeText(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  const BASE_CSS = `:root{color-scheme:dark;font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;background:#0a1320;color:#ecf5ff}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#0c1422;display:flex;align-items:center;justify-content:center}.shell{width:min(100%,1200px);padding:12px}.head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 12px;border:1px solid #2b4058;background:#152337;border-radius:12px 12px 0 0}.head h1{font-size:16px;margin:0}.stats{display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:12px;color:#c4d9e8}.stat b{color:white;font-size:13px}.world{position:relative;background:#101b2a;border:1px solid #314c66;overflow:hidden}canvas{width:100%;height:auto;max-height:75vh;display:block;touch-action:none;outline:0;aspect-ratio:16/9}.overlay{position:absolute;inset:0;background:linear-gradient(#0b1627d9,#0b1721ea);display:flex;align-items:center;justify-content:center;text-align:center}.overlay.hidden{display:none}.dialog{padding:24px;max-width:480px}.dialog h2{font-size:clamp(24px,5vw,44px);margin:0 0 10px}.dialog p{line-height:1.5;color:#acc1d5}button{background:#62e0b8;color:#052c26;font-weight:800;border:0;border-radius:8px;padding:10px 17px;cursor:pointer}button:hover{filter:brightness(1.08)}.floating{position:absolute;left:50%;top:68px;transform:translateX(-50%);text-align:center;pointer-events:none;background:#0b1b30cc;border:1px solid #6dcbae54;border-radius:9px;padding:8px 16px;font-weight:700;transition:opacity .35s}footer{display:flex;justify-content:space-between;gap:12px;padding:10px;font-size:12px;color:#acbfd1}.buttons{display:flex;gap:8px}.buttons button{font-size:11px;padding:6px 10px;background:#25394c;color:#cde9e7}.touch{display:flex;gap:8px;justify-content:space-between;margin:10px auto 0;max-width:600px}.pad{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.touch button{width:50px;height:38px;background:#283a50;color:#fff;touch-action:none;user-select:none}.touch .action{align-self:center;width:90px;height:62px;background:#edbd65;color:#161c2c}@media(min-width:900px) and (pointer:fine){.touch{display:none}}@media(max-width:600px){.shell{padding:3px}.stats{gap:6px}.head{flex-wrap:wrap}.head h1{width:100%}.stat{font-size:10px}footer{flex-wrap:wrap}.dialog{padding:10px}}`;
  function shell(title, css, script, preview=false){
    const safeTitle = safeText(title);
    const head = `<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><title>${safeTitle}</title>`;
    const content = `<div class="shell"><header class="head"><h1 id="title">${safeTitle}</h1><div class="stats"><span class="stat">❤️ <b id="health">100</b></span><span class="stat">🎯 <b id="score">0</b></span><span class="stat">🎒 <b id="ammo">40</b></span><span class="stat">🗺️ <b id="level">1</b></span><span class="stat" id="timer-pill">⏱️ <b id="timer">0s</b></span></div></header><main class="world"><canvas id="game" tabindex="0" aria-label="Área do jogo"></canvas><div id="message" class="floating">Pronto</div><section id="overlay" class="overlay"><div class="dialog"><h2 id="overlay-title">${safeTitle}</h2><p id="overlay-sub">Jogo criado a partir do GDD</p><button id="start" type="button">Jogar agora</button></div></section></main><footer><span><b id="mission">Aguardando início</b> · <span id="control-help">WASD / setas / espaço</span></span><div class="buttons"><button id="pause" type="button">Pausar</button><button id="restart" type="button">Reiniciar</button></div></footer><nav class="touch" aria-label="Controles touch"><div class="pad"><span></span><button data-control="up" aria-label="Cima">▲</button><span></span><button data-control="left" aria-label="Esquerda">◀</button><button data-control="down" aria-label="Baixo">▼</button><button data-control="right" aria-label="Direita">▶</button></div><button class="action" data-control="fire">AÇÃO</button></nav></div>`;
    if(preview){
      const cleanCss=String(css||'').replace(/<\/style/gi,'<\\/style');
      const cleanScript=String(script||'').replace(/<\/script/gi,'<\\/script');
      return head+`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; media-src data: blob:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'">`+`<style>${cleanCss}</style></head><body>${content}`+
        `<script>window.addEventListener('error',e=>parent.postMessage({kind:'gameforge-error',message:String(e.message).slice(0,500)},'*'));window.addEventListener('unhandledrejection',e=>parent.postMessage({kind:'gameforge-error',message:String(e.reason).slice(0,500)},'*'));</script>`+
        `<script>${root.GameForgeQABridge ? '('+root.GameForgeQABridge.install.toString()+')();' : ''}</script>`+
        `<script>${cleanScript}</script></body></html>`;
    }
    return head+`<link rel="stylesheet" href="style.css"></head><body>${content}<script src="game.js" defer></script></body></html>`;
  }
  function generationReport(spec){
    return `# Relatório da geração\n\n## Dados interpretados\n\n- Título: ${spec.title}\n- Estilo: ${spec.genre}\n${spec.genre === 'shooter' ? '- Tema: '+spec.shooterOptions.theme+'\n- Motor: Canvas 2D procedural com ondas e chefes\n' : ''}- Fases: ${spec.stages.join(' / ')}\n- Inimigos reconhecidos: ${spec.enemyNames.join(', ')||'não nomeados'}\n\n## Funcionalidades inferidas\n\n${spec.detected.map(x=>'- '+x).join('\n')}\n\n## Limitações do modo sem IA\n\n${spec.limitations.map(x=>'- '+x).join('\n')}\n\n## Como jogar\n\nAbra index.html no navegador. Você pode publicar os 3 arquivos de jogo em hospedagem estática como GitHub Pages.\n`;
  }
  function generate(spec, gdd) {
    if (typeof gameForgeBoot !== 'function')throw new Error('Modelo básico não carregado');
    if(spec.genre==='shooter' && typeof gameForgeShooterBoot !== 'function')throw new Error('Motor de nave não carregado');
    const data=JSON.stringify(spec).replace(/<\//g,'<\\/');
    const runtime=spec.genre==='shooter'?gameForgeShooterBoot:gameForgeBoot;
    const code='/* Jogo criado no modo sem IA. Código editável. */\nconst GAME_SPEC = '+data+';\n('+runtime.toString()+')();\n';
    const css=BASE_CSS;
    const shooterManifest=spec.genre==='shooter' ? {'MANIFESTO_SHMUP.md':
      '# Estrutura do shoot em up\n\nTema: '+spec.shooterOptions.theme+'\n\n'+spec.stages.map((name,i)=>
      '## '+name+'\n- Formação: '+['line','v','zigzag','escort','cross','swarm'][i%6]+
      '\n- Inimigos por fase: '+(7+i*3)+'\n- Vida do chefe: '+(24+i*14)+'\n').join('\n')+
      '\n## Referências técnicas\n- navinha-arcade: fases e padrões de tiro.\n- Neon-Sky-Force: registros e formações por fase.\n- Dragon-Fury: comportamento de chefes e limites de partículas.\n\nA configuração executável fica no arquivo game.js; este manifesto é documentação, não um arquivo de configurações carregado pelo jogo.\n'
    }:{};
    return {
      ...shooterManifest,
      'index.html':shell(spec.title,css,code,false),
      'style.css':css,
      'game.js':code,
      'GDD_original.md':String(gdd||''),
      'RELATORIO_GERACAO.md':generationReport(spec)
    };
  }
  root.GameForgeGenerator={generate,shell,BASE_CSS};
  if(typeof module!=='undefined')module.exports=root.GameForgeGenerator;
})(typeof globalThis!=='undefined'?globalThis:this);
