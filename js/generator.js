(function(root){
  'use strict';
  function safeText(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  const BASE_CSS = `:root{color-scheme:dark;font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;background:#0a1320;color:#ecf5ff}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#0c1422;display:flex;align-items:center;justify-content:center}.shell{width:min(100%,1200px);padding:12px}.head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 12px;border:1px solid #2b4058;background:#152337;border-radius:12px 12px 0 0}.head h1{font-size:16px;margin:0}.stats{display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:12px;color:#c4d9e8}.stat b{color:white;font-size:13px}.world{position:relative;background:#101b2a;border:1px solid #314c66;overflow:hidden}canvas{width:100%;height:auto;max-height:75vh;display:block;touch-action:none;outline:0;aspect-ratio:16/9}.overlay{position:absolute;inset:0;background:linear-gradient(#0b1627d9,#0b1721ea);display:flex;align-items:center;justify-content:center;text-align:center}.overlay.hidden{display:none}.dialog{padding:24px;max-width:480px}.dialog h2{font-size:clamp(24px,5vw,44px);margin:0 0 10px}.dialog p{line-height:1.5;color:#acc1d5}button{background:#62e0b8;color:#052c26;font-weight:800;border:0;border-radius:8px;padding:10px 17px;cursor:pointer}button:hover{filter:brightness(1.08)}.floating{position:absolute;left:50%;top:68px;transform:translateX(-50%);text-align:center;pointer-events:none;background:#0b1b30cc;border:1px solid #6dcbae54;border-radius:9px;padding:8px 16px;font-weight:700;transition:opacity .35s}footer{display:flex;justify-content:space-between;gap:12px;padding:10px;font-size:12px;color:#acbfd1}.buttons{display:flex;flex-wrap:wrap;gap:8px}.buttons button{font-size:11px;padding:6px 10px;background:#25394c;color:#cde9e7}.touch{display:flex;gap:8px;justify-content:space-between;margin:10px auto 0;max-width:600px}.pad{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.touch button{width:50px;height:38px;background:#283a50;color:#fff;touch-action:none;user-select:none}.touch .action{align-self:center;width:90px;height:62px;background:#edbd65;color:#161c2c}@media(min-width:900px) and (pointer:fine){.touch{display:none}}@media(max-width:600px){.shell{padding:3px}.stats{gap:6px}.head{flex-wrap:wrap}.head h1{width:100%}.stat{font-size:10px}footer{flex-wrap:wrap}.dialog{padding:10px}}`;
  function assetPrelude(files){
    const legacy=String(files['ASSET_CENARIO.b64']||'');
    let script='';
    if(legacy){
      if(!/^[A-Za-z0-9+/]+={0,2}$/.test(legacy)||legacy.length>1_600_000)throw Error('Asset GLB antigo nao e base64 valido.');
      let settings;try{settings=JSON.parse(files['ASSET_CENARIO.json']||'{}');}catch{throw Error('Posicao do GLB antigo invalida.');}
      const safe=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
      script+='const GF_SCENE_GLB_BASE64='+JSON.stringify(legacy)+';\nconst GF_SCENE_GLB_OPTIONS='+JSON.stringify({
        x:safe(settings.x,-35,35,5),z:safe(settings.z,-35,35,5),scale:safe(settings.scale,.2,4,1)
      })+';\n';
    }
    if(files['ASSET_LIBRARY.json']){
      const library=root.GameForgeAssetLibrary;
      if(!library)throw Error('Modulo Asset Library nao carregado.');
      const manifest=library.parse(files['ASSET_LIBRARY.json']);
      const assets=manifest.assets.map(a=>{
        const bytes=files['assets/'+a.id+'.glb'];
        if(!(bytes instanceof Uint8Array))throw Error('GLB binario ausente para '+a.name+'. Reimporte backup ZIP completo.');
        if(bytes.length!==a.bytes)throw Error('GLB binario diferente do manifesto: '+a.name);
        return {id:a.id,role:a.role,base64:library.base64(bytes),...a.placement};
      });
      if(assets.length)script+='const GF_SCENE_ASSETS='+JSON.stringify(assets)+';\n';
    }
    if(script){
      if(!root.GameForgeGLB?.decode)throw Error('Leitor GLB nao carregado no Studio.');
      script+='const gameForgeDecodeGLB='+root.GameForgeGLB.decode.toString()+';\n';
    }
    return script;
  }
  function shell(title, css, script, preview=false, files={}){
    const safeTitle = safeText(title);
    const embeddedAsset=assetPrelude(files);
    const head = `<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><title>${safeTitle}</title>`;
    const content = `<div class="shell"><header class="head"><h1 id="title">${safeTitle}</h1><div class="stats"><span class="stat">❤️ <b id="health">100</b></span><span class="stat">🎯 <b id="score">0</b></span><span class="stat">🎒 <b id="ammo">40</b></span><span class="stat">🗺️ <b id="level">1</b></span><span class="stat" id="timer-pill">⏱️ <b id="timer">0s</b></span></div></header><main class="world"><canvas id="game" tabindex="0" aria-label="Área do jogo"></canvas><div id="message" class="floating">Pronto</div><section id="overlay" class="overlay"><div class="dialog"><h2 id="overlay-title">${safeTitle}</h2><p id="overlay-sub">Jogo criado a partir do GDD</p><button id="start" type="button">Jogar agora</button></div></section></main><footer><span><b id="mission">Aguardando início</b> · <span id="control-help">WASD / setas / espaço</span></span><div class="buttons"><button id="pause" type="button">Pausar</button><button id="restart" type="button">Reiniciar</button></div></footer><nav class="touch" aria-label="Controles touch"><div class="pad"><span></span><button data-control="up" aria-label="Cima">▲</button><span></span><button data-control="left" aria-label="Esquerda">◀</button><button data-control="down" aria-label="Baixo">▼</button><button data-control="right" aria-label="Direita">▶</button></div><button class="action" data-control="fire">AÇÃO</button></nav></div>`;
    if(preview){
      const cleanCss=String(css||'').replace(/<\/style/gi,'<\\/style');
      const cleanScript=(String(files['engine-3d.js']||'')+'\n'+embeddedAsset+'\n'+String(script||'')).replace(/<\/script/gi,'<\\/script');
      return head+`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; media-src data: blob:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'">`+`<style>${cleanCss}</style></head><body>${content}`+
        `<script>window.addEventListener('error',e=>parent.postMessage({kind:'gameforge-error',message:String(e.message).slice(0,500)},'*'));window.addEventListener('unhandledrejection',e=>parent.postMessage({kind:'gameforge-error',message:String(e.reason).slice(0,500)},'*'));</script>`+
        `<script>${root.GameForgeQABridge ? '('+root.GameForgeQABridge.install.toString()+')();' : ''}</script>`+
        `<script>${cleanScript}</script></body></html>`;
    }
    return head+`<link rel="stylesheet" href="style.css"></head><body>${content}${files['engine-3d.js']?'<script src="engine-3d.js" defer></script>':''}${embeddedAsset?'<script>'+embeddedAsset+'</script>':''}<script src="game.js" defer></script></body></html>`;
  }
  function generationReport(spec){
    const mechanics={rpg:'Mapa de 2400 × 1600 com câmera, combate, XP, poções, inventário, guardião e relíquias para liberar o portal.','tower-defense':'Construção de torres por grade, dois tipos de torre, melhorias, ondas, recursos e defesa da base.','lane-defense':'Cinco linhas, quatro unidades originais, economia geradora, inimigos atacando unidades, chefes, ondas e dispositivos de emergência por linha.','block-td':'Campo em blocos, três alturas, quatro tipos de torre/extrator, bônus de altura, escolhas permanentes entre ondas e chefes.',fps:'Câmera em primeira pessoa, movimento, mira por teclado/toque, tiros e recarga.',arena:'Exploração, combate, coleta e saída por objetivos.',racing:'Direção, obstáculos e progressão.',platform:'Movimento, saltos e progressão.'};
    const understood=(spec.implementation?.applied||[]).map(x=>'- '+x.description+' ('+x.where+')').join('\\n');
    const stillNeeded=(spec.implementation?.pending||[]).map(x=>'- '+x.description+' ('+x.where+')').join('\\n');
    return `# Relatório da geração\\n\\n- Título: ${spec.title}\n- Estilo: ${spec.genre}\n- Dimensão: ${spec.dimension||'2d'}\n- Fases: ${spec.stages.join(' / ')}\n- Motor: ${spec.dimension==='3d'?'Three.js r180 local, personagens e ambientes procedurais; uma fase carregada por vez':'Canvas 2D local'}\n- Modelo: ${mechanics[spec.genre]||'Shoot’em up com ondas, melhorias e chefes.'}\n\n${spec.genre==='lane-defense'?'## Recursos do motor por linhas implementados\n\n- Tabuleiro 5x9, coleta manual de recursos, cards com custo e recarga.\n- Ondas reproduzíveis, dano na mesma faixa, proteção de uso único e derrota por segundo vazamento.\n- Até 40 títulos de fases importados. O conteúdo e habilidades próprios de cada fase ainda precisam de programação.\n\n## Fora do motor genérico\n\n- Catálogo completo, chefes roteirizados, minigames, atlas animados, PWA e testes em dispositivos reais não foram criados automaticamente.\n\n':''}## Interpretação da ideia ou GDD\n\n${spec.detected.map(x=>'- '+x).join('\n')}\n\n## Traduzido para o código do jogo\n\n${understood||'- Configuração padrão do motor'}\n\n## Ainda precisa de programação\n\n${stillNeeded||'- Nenhum requisito adicional sinalizado'}\n\n## Limites\n\n${spec.limitations.map(x=>'- '+x).join('\n')}\n\n## Como jogar e publicar\n\nAbra index.html e mantenha todos os arquivos do ZIP juntos. No 3D, engine-3d.js e sua licença acompanham o projeto. O motor de nave 3D possui ondas, chefes, tiros inimigos, power-ups e HUD próprios; o RPG 3D tem progressão básica. O HTML único também inclui a biblioteca; não baixa código de CDN. As regras livres do GDD não são implementadas automaticamente pelo modo sem IA.\n`;
  }
  function generate(spec, gdd) {
    if(spec?.engineAvailability?.status==='blocked')throw Error(spec.engineAvailability.reason);
    if(spec?.designIR?.blocked?.length)
      throw Error('GDD incompatível com o motor: '+spec.designIR.blocked.map(x=>x.label).join(', ')+'. Ajuste a instrução ou escolha um motor compatível.');
    if(spec?.genre==='urban-action'&&spec.dimension!=='3d')throw Error('URB-01 exige o motor Three.js 3D.');
    const capabilityApi=root.GameForgeCapabilities||(typeof require==='function'?require('./game-capabilities'):null);
    if(capabilityApi){
      const errors=capabilityApi.check(spec);
      if(errors.length)throw Error('GAME_SPEC incompatível: '+errors.join('; '));
    }
    const three=spec.dimension==='3d';
    if(!three && typeof gameForgeBoot !== 'function')throw new Error('Modelo básico não carregado');
    if(spec.genre==='shooter' && !three && typeof gameForgeShooterBoot !== 'function')throw new Error('Motor de nave não carregado');
    const data=JSON.stringify(spec).replace(/<\//g,'<\\/');
    const expanded=!three&&['rpg','tower-defense'].includes(spec.genre);
    const advanced=!three&&['lane-defense','block-td'].includes(spec.genre);
    const runtime=three?(spec.genre==='urban-action'?(spec.urbanMissions?.length?root.gameForgeUrbanMissionBoot:root.gameForgeUrban3DBoot):spec.genre==='shooter'?root.gameForgeShooter3DBoot:root.gameForgeThreeBoot):advanced?root.gameForgeAdvancedTDBoot:expanded?root.gameForgeExpanded2DBoot:spec.genre==='shooter'?gameForgeShooterBoot:gameForgeBoot;
    if(typeof runtime!=='function')throw Error('Motor '+spec.genre+' '+(spec.dimension||'2d')+' não carregado. Atualize o Studio.');
    if(three&&!root.GameForgeThreeSource)throw Error('Biblioteca 3D local ausente. Atualize o Studio.');
    if(advanced&&typeof root.gameForgeTDRulesFactory!=='function')throw Error('Motor de regras Tower Defense não carregado. Atualize o Studio.');
    const urbanInputFactory=root.gameForgeUrbanInputFactory||(typeof require==='function'?require('./urban-input'):null);
    if(three&&spec.genre==='urban-action'&&typeof urbanInputFactory!=='function')throw Error('Controle urbano offline ausente. Atualize o Studio.');
    const actorFactory=root.gameForgeActorAnimationsFactory||(typeof require==='function'?require('./actor-animations'):null);
    if(three&&spec.genre==='urban-action'&&typeof actorFactory!=='function')throw Error('Reprodutor de clips GLB ausente. Atualize o Studio.');
    const urbanSaveFactory=root.gameForgeUrbanSaveFactory||(typeof require==='function'?require('./urban-save'):null);
    if(three&&spec.genre==='urban-action'&&typeof urbanSaveFactory!=='function')throw Error('Modulo de salvamento urbano offline ausente. Atualize o Studio.');
    const shooterSaveFactory=root.gameForgeShooterCampaignSaveFactory||
      (typeof require==='function'?require('./shooter-campaign-save'):null);
    if(three&&spec.genre==='shooter'&&
       (typeof shooterSaveFactory!=='function'||typeof urbanSaveFactory!=='function'))
      throw Error('Módulo de checkpoint de campanha 3D ausente. Atualize o Studio.');
    const rules=three?'const gameForgeWorldRules = '+root.gameForgeWorldRules.toString()+';\nconst gameForgeSoftwareRenderer = '+root.gameForgeSoftwareRenderer.toString()+';\n'+(spec.genre==='urban-action'?'const GameForgeUrbanRules = ('+root.gameForgeUrbanRulesFactory.toString()+')();\nconst GameForgeUrbanInput = ('+urbanInputFactory.toString()+')();\nconst GameForgeUrbanSave = ('+urbanSaveFactory.toString()+')();\nconst GameForgeActorAnimations = ('+actorFactory.toString()+')();\n'+(spec.urbanMissions?.length?'const GameForgeUrbanMissionFlow = ('+root.gameForgeUrbanMissionFlowFactory.toString()+')();\n':''):''):advanced?'const GameForgeTDRules = ('+root.gameForgeTDRulesFactory.toString()+')();\n':expanded?'const GameForgeStrategyRules = ('+root.gameForgeStrategyRulesFactory.toString()+')();\n':'';
    // Incluído no FPS para permitir loja por comandos futuros sem reconstruir o motor.
    if(spec.genre==='urban-action'&&typeof root.gameForgeUrbanRulesFactory!=='function')throw Error('Regras urbanas URB-01 não carregadas. Atualize o Studio.');
    if(spec.genre==='urban-action'&&spec.urbanMissions?.length&&typeof root.gameForgeUrbanMissionFlowFactory!=='function')throw Error('Regras das missões não carregadas. Atualize o Studio.');
    const combatFactory=root.gameForgeCombatEconomyFactory||
      (typeof require==='function'?require('./combat-economy'):null);
    if(three&&spec.genre==='fps'&&typeof combatFactory!=='function')
      throw Error('Módulo de economia de combate não carregado. Atualize o Studio.');
    const combatModule=three&&spec.genre==='fps'
      ?'const gameForgeCombatEconomyFactory = '+combatFactory.toString()+';\n':'';
    const branchFactory=root.gameForgeStageBranchesFactory||(typeof require==='function'?require('./stage-branches'):null);
    if(three&&spec.genre==='shooter'&&spec.stageBranches?.enabled&&typeof branchFactory!=='function')
      throw Error('Modulo de rotas alternadas nao carregado. Atualize o Studio.');
    const branchModule=three&&spec.genre==='shooter'&&spec.stageBranches?.enabled
      ?'const GameForgeStageBranches = ('+branchFactory.toString()+')();\n':'';
    const shooterSaveModule=three&&spec.genre==='shooter'
      ?'const GameForgeUrbanSave = ('+urbanSaveFactory.toString()+')();\n'
       +'const GameForgeShooterCampaignSave = ('+shooterSaveFactory.toString()+')();\n':'';

    const code='/* Jogo criado no modo sem IA. Código editável. */\nconst GAME_SPEC = '+data+';\n'+rules+combatModule+branchModule+shooterSaveModule+'('+runtime.toString()+')();\n';
    const css=BASE_CSS;
    const dependencies=three?{'engine-3d.js':root.GameForgeThreeSource,'THREE-LICENSE.txt':root.GameForgeThreeLicense}:{};
    const shooterManifest=spec.genre==='shooter' ? {'MANIFESTO_SHMUP.md':
      '# Estrutura do shoot em up\n\nTema: '+spec.shooterOptions.theme+'\n\n'+spec.stages.map((name,i)=>
      '## '+name+'\n- Formação: '+['line','v','zigzag','escort','cross','swarm'][i%6]+
      '\n- Inimigos por fase: '+(7+i*3)+'\n- Vida do chefe: '+(24+i*14)+'\n').join('\n')+
      '\n## Referências técnicas\n- navinha-arcade: fases e padrões de tiro.\n- Neon-Sky-Force: registros e formações por fase.\n- Dragon-Fury: comportamento de chefes e limites de partículas.\n\nA configuração executável fica no arquivo game.js; este manifesto é documentação, não um arquivo de configurações carregado pelo jogo.\n'
    }:{};
    const urbanSlice=spec.genre==='urban-action'?{
      'SLICE_URBAN_3D.md':'# URB-01 — Primeiro bairro jogável em Three.js\n\n'+
       '**É um protótipo parcial e não a conversão do GDD inteiro.**\n\n'+
       '- Jogável: personagem 3D com câmera terceira pessoa, ruas e colisões em XZ, pistola/recarga, um guarda, uma porta capturável, uma missão e salvamento local.\n'+
       '- Controles: WASD/setas mover, espaço atirar, R recarregar, E capturar perto da porta, P pausar; reiniciar começa nova demonstração. Gamepad padrão: analógico esquerdo mover, direito mirar, RT atirar, A interagir, X recarga e Menu pausa.\n'+
       '- Recompensa única de exemplo: $450. Este valor não altera a economia dos GDDs originais.\n'+
       '- Salve versionado em chave gameforge-urban-v1-<titulo>, separado dos saves do Godfather 2D.\n'+
       '- Pendente: carros dirigíveis, polícia, guardas com IA avançada, interiores, 18 distritos, 36 negócios, 24 missões, 3 chefes, GLB animado, compatibilidade com campanhas antigas e testes físicos mobile.\n'+
       '- Código do motor em game.js, sem dependências de rede; Three.js incluído em engine-3d.js.\n'+
       (spec.urbanMissions?.length?'- Missões estruturadas pelo GDD: '+spec.urbanMissions.map(m=>m.title+' ['+m.steps.map(s=>s.action+' '+s.quantity+' '+s.target).join(' → ')+']').join('; ')+'\n':'')
    }:{}; 
    return {
      ...urbanSlice,
      ...shooterManifest,
      ...dependencies,
      'index.html':shell(spec.title,css,code,false,dependencies),
      'style.css':css,
      'game.js':code,
      'GDD_original.md':String(gdd||''),
      ...(spec.actionModel?{'MODELO_ACOES.json':JSON.stringify(spec.actionModel,null,2),
        'PLANO_ACOES.md':(root.GameForgeMissionSemantics||(typeof require==='function'?require('./mission-semantics'):null))?.report(spec.actionModel)||''}:{}),
      'RELATORIO_GERACAO.md':generationReport(spec),
      ...(root.GameForgeDesignIR?{'PLANO_REQUISITOS.md':root.GameForgeDesignIR.report(spec.designIR)}:{}),
      ...(capabilityApi?{
        'CONTRATO_CAPACIDADES.md':capabilityApi.report(spec),
        'CAPACIDADES.json':JSON.stringify(spec.implementation?.audit||{version:1,items:[],counts:{}},null,2)
      }:{})
    };
  }
  root.GameForgeGenerator={generate,shell,BASE_CSS};
  if(typeof module!=='undefined')module.exports=root.GameForgeGenerator;
})(typeof globalThis!=='undefined'?globalThis:this);
