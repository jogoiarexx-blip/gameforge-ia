/* GameForge TD v0.15 — deterministic, independent gameplay rules.
   Two original games: garden lane defense and elevated block tower defense. */
function gameForgeTDRulesFactory(){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const config={
  lane:{bolt:{cost:100,hp:120,damage:20,range:9,rate:1.5,cardCooldown:6},income:{cost:50,hp:100,damage:0,range:0,rate:22,cardCooldown:7},wall:{cost:50,hp:650,damage:0,range:0,rate:0,cardCooldown:18},frost:{cost:125,hp:110,damage:14,range:9,rate:1.1,cardCooldown:7}},
  blocks:{bolt:{cost:85,hp:120,damage:21,range:2.7,rate:.65},frost:{cost:115,hp:120,damage:10,range:2.6,rate:.95},cannon:{cost:185,hp:120,damage:43,range:2.35,rate:1.5},miner:{cost:75,hp:110,damage:0,range:0,rate:6.8}}
 };
 const routePoints=[[0,3],[2,3],[2,1],[5,1],[5,5],[8,5],[8,3],[11,3]];
 function route(){
  const path=[];for(let k=0;k<routePoints.length-1;k++){
   let x=routePoints[k][0],y=routePoints[k][1],nx=routePoints[k+1][0],ny=routePoints[k+1][1];
   while(x!==nx||y!==ny){path.push({x,y});x+=Math.sign(nx-x);y+=Math.sign(ny-y);}
  }path.push({x:11,y:3});return path;
 }
 function rng(d){d.seed=(Math.imul(1664525,d.seed)+1013904223)>>>0;return d.seed/4294967296;}
 function laneWavePlan(stage,waves,seed,script){
  const allowed=['grunt','runner','armored','boss'];
  if(Array.isArray(script)&&script.length===waves&&script.every(w=>Array.isArray(w)&&w.length>0&&w.length<=45&&w.every(e=>e&&allowed.includes(e.kind)&&Number.isInteger(e.lane)&&e.lane>=0&&e.lane<5)))return script.map(w=>w.map(e=>({kind:e.kind,lane:e.lane})));
  let s=(seed+stage*977)>>>0;const random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
  return Array.from({length:waves},(_,wave)=>{
   const count=Math.min(28,Math.max(2,2+wave*2+Math.floor(stage/3)));
   const activeLanes=stage<2?2:stage<6?3:5;
   const lanes=Array.from({length:activeLanes},(_,i)=>Math.floor(i*5/activeLanes));
   return Array.from({length:count},(_,i)=>({
    kind:stage%8===7&&wave===waves-1&&i===count-1?'boss':stage>4&&i%5===4?'armored':stage>2&&i%4===3?'runner':'grunt',
    lane:lanes[Math.floor(random()*lanes.length)]
   }));
  });
 }
 function create(mode,stage=0,tuning={},options={}){
  if(!config[mode])throw Error('Modo de defesa inválido');
  const path=mode==='blocks'?route():[];
  const waves=clamp(Math.floor(options.waves||3+Math.min(stage,5)),1,12);
  const money=mode==='lane'?clamp(Number(options.startingGlow)||150,0,1000):280;
  return {mode,stage,cols:mode==='lane'?9:12,rows:mode==='lane'?5:8,path,tiles:Array.from({length:mode==='lane'?45:96},()=>0),
   towers:[],enemies:[],fx:[],money,base:100,score:0,kills:0,
   mowers:[true,true,true,true,true],wave:0,waves,
   active:false,awaitingChoice:false,over:false,victory:false,spawned:0,amount:0,spawnClock:0,time:0,
   seed:(Number(options.seed)||72317)+stage*719,bonuses:{damage:1,range:1,energy:1},perks:[],
   cardCooldowns:{bolt:0,income:0,wall:0,frost:0},drops:[],dropClock:6,nextWaveAt:10,
   lanePlan:mode==='lane'?laneWavePlan(stage,waves,Number(options.seed)||72317,options.wavePlan):[],
   tuning:{difficulty:clamp(Number(tuning.difficulty)||1,.4,3),enemyMultiplier:clamp(Number(tuning.enemyMultiplier)||1,.4,3),bossMultiplier:clamp(Number(tuning.bossMultiplier)||1,.4,4),fireRateMultiplier:clamp(Number(tuning.fireRateMultiplier)||1,.4,3)}
  };
 }
 const idx=(d,x,y)=>y*d.cols+x;
 const valid=(d,x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<d.cols&&y>=0&&y<d.rows;
 const isPath=(d,x,y)=>d.mode==='blocks'&&d.path.some(p=>p.x===x&&p.y===y);
 function buildBlock(d,x,y){
  if(d.mode!=='blocks'||d.over)return {ok:false,reason:'Construção não disponível'};
  if(!valid(d,x,y)||isPath(d,x,y))return {ok:false,reason:'Não pode bloquear a estrada'};
  const height=d.tiles[idx(d,x,y)];
  if(height>=3)return {ok:false,reason:'Altura máxima de 3 blocos'};
  const cost=30+height*35;
  if(d.money<cost)return {ok:false,reason:'Recursos insuficientes'};
  d.money-=cost;d.tiles[idx(d,x,y)]++;return {ok:true,height:height+1,cost};
 }
 function place(d,x,y,type='bolt'){
  if(d.over)return {ok:false,reason:'Partida encerrada'};
  if(!valid(d,x,y))return {ok:false,reason:'Fora do tabuleiro'};
  if(!config[d.mode][type])return {ok:false,reason:'Unidade incompatível'};
  if(isPath(d,x,y))return {ok:false,reason:'O caminho deve ficar livre'};
  if(d.towers.some(t=>t.gx===x&&t.gy===y))return {ok:false,reason:'Posição ocupada'};
  if(d.mode==='lane'&&(d.cardCooldowns[type]||0)>0)return {ok:false,reason:'Carta recarregando'};
  if(d.mode==='blocks'&&d.tiles[idx(d,x,y)]<1)return {ok:false,reason:'Construa um bloco de base primeiro'};
  if(d.towers.length>=60)return {ok:false,reason:'Limite de unidades atingido'};
  const c=config[d.mode][type];if(d.money<c.cost)return {ok:false,reason:'Energia insuficiente'};
  d.money-=c.cost;
  const tower={gx:x,gy:y,x:x+.5,y:y+.5,type,level:1,hp:c.hp,maxHp:c.hp,damage:c.damage,range:c.range,
   rate:c.rate,cooldown:type==='income'||type==='miner'?c.rate:0,xp:0,height:d.mode==='blocks'?d.tiles[idx(d,x,y)]:0};
  d.towers.push(tower);if(d.mode==='lane')d.cardCooldowns[type]=c.cardCooldown||0;return {ok:true,tower};
 }
 function upgrade(d,t){
  if(!t||!d.towers.includes(t)||d.over||t.level>=3)return {ok:false,reason:'Nível máximo'};
  const cost=60+t.level*65;if(d.money<cost)return {ok:false,reason:'Recursos insuficientes'};
  d.money-=cost;t.level++;t.damage=Math.round(t.damage*1.55);t.range+=t.damage?(.35):0;
  t.maxHp=Math.round(t.maxHp*1.45);t.hp=Math.min(t.maxHp,t.hp+Math.round(t.maxHp*.5));t.rate*=.88;
  return {ok:true,tower:t};
 }
 function sell(d,t){
  if(!t||!d.towers.includes(t)||d.over)return {ok:false,reason:'Nenhuma torre selecionada'};
  d.towers.splice(d.towers.indexOf(t),1);const amount=Math.round(config[d.mode][t.type].cost*.55+(t.level-1)*45);
  d.money+=amount;return {ok:true,amount};
 }
 function begin(d){
  if(d.over||d.active||d.awaitingChoice||d.wave>=d.waves)return false;
  d.wave++;d.active=true;d.spawned=0;d.spawnClock=.6;
  d.amount=d.mode==='lane'?d.lanePlan[d.wave-1].length:Math.min(45,Math.max(5,Math.round((5+d.wave*3+d.stage*1.6)*d.tuning.enemyMultiplier)));
  return true;
 }
 function enemy(d){
  const n=d.spawned++,boss=d.wave===d.waves&&n===d.amount-1;
  const entry=d.mode==='lane'?d.lanePlan[d.wave-1][n]:null;
  const kind=entry?.kind||(boss?'boss':n%6===3?'armored':n%5===2?'runner':'grunt');
  const lane=d.mode==='lane'?entry.lane:0,realBoss=kind==='boss';
  const hp=Math.round((d.mode==='lane'?(realBoss?1800:kind==='armored'?230:kind==='runner'?85:100):(realBoss?300:kind==='armored'?105:kind==='runner'?37:68))*(1+d.stage*.055+(d.wave-1)*.16)*d.tuning.difficulty*(realBoss?d.tuning.bossMultiplier:1));
  const speed=(d.mode==='lane'?(realBoss?.20:kind==='runner'?.44:kind==='armored'?.25:.30):(kind==='runner'?.9:realBoss?.28:kind==='armored'?.37:.51))*(1+d.stage*.02);
  const e={kind,boss:realBoss,hp,maxHp:hp,speed,slow:0,damage:realBoss?22:kind==='armored'?16:10,r:realBoss?.36:.27,
   lane,x:d.mode==='lane'?d.cols+.55:d.path[0].x+.5,y:d.mode==='lane'?lane+.5:d.path[0].y+.5,progress:0,dead:false};
  d.enemies.push(e);return e;
 }
 function kill(d,e,t){
  if(e.dead)return;
  e.dead=true;d.kills++;d.score+=e.boss?500:100;if(d.mode==='blocks')d.money+=Math.round((e.boss?125:kindReward(e.kind))*d.bonuses.energy);
  if(t)t.xp+=e.boss?60:15;
  if(d.fx.length<110)d.fx.push({x:e.x,y:e.y,tx:e.x,ty:e.y,life:.24,type:'burst'});
 }
 function kindReward(kind){return kind==='armored'?28:kind==='runner'?20:17;}
 function damageEnemy(d,e,amount,t,splash=false){
  if(e.dead)return;e.hp-=Math.max(1,amount);
  if(e.hp<=0)kill(d,e,t);
  if(splash){for(const other of d.enemies)if(other!==e&&!other.dead&&Math.hypot(e.x-other.x,e.y-other.y)<.9){
    other.hp-=Math.max(2,Math.round(amount*.4));if(other.hp<=0)kill(d,other,t);
  }}
 }
 function leak(d,e){
  e.dead=true;
  if(d.mode==='lane'&&d.mowers[e.lane]){
   d.mowers[e.lane]=false;
   for(const other of d.enemies)if(other.lane===e.lane)other.dead=true;
   if(d.fx.length<110)d.fx.push({x:.25,y:e.lane+.5,tx:d.cols,ty:e.lane+.5,life:.5,type:'mower'});
  }else{d.base=d.mode==='lane'?0:Math.max(0,d.base-(e.boss?35:20));}
 }
 function collectDrop(d,x,y){
  if(d.mode!=='lane'||d.over)return {ok:false,reason:'Sem recurso'};
  const star=d.drops.find(p=>Math.hypot((p.x-x)*88,(p.y-y)*72)<=32);
  if(!star)return {ok:false,reason:'Sem recurso nessa posição'};
  d.drops.splice(d.drops.indexOf(star),1);d.money=Math.min(9999,d.money+star.value);
  return {ok:true,value:star.value};
 }
 function selectPerk(d,key){
  if(!d.awaitingChoice||!d.perks.includes(key))return false;
  if(key==='damage')d.bonuses.damage=Math.min(3,d.bonuses.damage*1.22);
  if(key==='range')d.bonuses.range=Math.min(2,d.bonuses.range*1.17);
  if(key==='energy')d.bonuses.energy=Math.min(3,d.bonuses.energy*1.25);
  if(key==='repair')d.base=Math.min(100,d.base+30);
  d.awaitingChoice=false;d.perks=[];return true;
 }
 function step(d,dt){
  if(d.over)return;dt=clamp(Number(dt)||0,0,.05);if(!dt)return;
  d.time+=dt;
  if(d.mode==='lane'){
   for(const k of Object.keys(d.cardCooldowns))d.cardCooldowns[k]=Math.max(0,d.cardCooldowns[k]-dt);
   d.drops=d.drops.filter(p=>(p.life-=dt)>0);
   d.dropClock-=dt;
   if(d.dropClock<=0){
    if(d.drops.length<8)d.drops.push({x:.7+rng(d)*(d.cols-1.4),y:.5+rng(d)*(d.rows-1),value:25,life:8});
    d.dropClock+=9+rng(d)*4;
   }
   if(!d.active&&d.wave<d.waves&&d.time>=d.nextWaveAt)begin(d);
  }
  for(const t of d.towers){
   if(t.type==='income'||t.type==='miner'){
    t.cooldown-=dt;if(t.cooldown<=0){d.money=Math.min(9999,d.money+(t.type==='income'?25:31)*d.bonuses.energy);t.cooldown+=t.rate;}
   }
  }
  d.fx=d.fx.filter(f=>(f.life-=dt)>0);
  if(!d.active)return;
  d.spawnClock-=dt;
  if(d.spawned<d.amount&&d.spawnClock<=0&&d.enemies.length<64){
   enemy(d);d.spawnClock=Math.max(.32,1.05-d.wave*.045);
  }
  // Move lane attackers or follow the winding road. Defender units can block and be damaged.
  for(const e of d.enemies){
   if(e.dead)continue;e.slow=Math.max(0,e.slow-dt);
   const speed=e.speed*(e.slow>0?.52:1)*dt;
   if(d.mode==='lane'){
    const obstacle=d.towers.filter(t=>t.gy===e.lane&&t.x<e.x+.55&&t.x>=e.x-.67).sort((a,b)=>b.x-a.x)[0];
    if(obstacle){obstacle.hp-=e.damage*dt;e.x=Math.max(e.x,obstacle.x+.47);}
    else e.x-=speed;
    if(e.x<.1)leak(d,e);
   }else{
    e.progress+=speed;
    if(e.progress>=d.path.length-1){leak(d,e);continue;}
    const i=Math.floor(e.progress),fraction=e.progress-i,a=d.path[i],b=d.path[i+1];
    e.x=a.x+.5+(b.x-a.x)*fraction;e.y=a.y+.5+(b.y-a.y)*fraction;
   }
  }
  d.towers=d.towers.filter(t=>t.hp>0);
  for(const t of d.towers){
   if(!t.damage)continue;
   t.cooldown-=dt;if(t.cooldown>0)continue;
   const heightBonus=d.mode==='blocks'?t.height*.55:0;
   const range=(t.range+heightBonus)*d.bonuses.range;
   const possible=d.enemies.filter(e=>!e.dead&&(d.mode==='lane'
    ?e.lane===t.gy&&e.x>t.x&&e.x-t.x<=range
    :Math.hypot(t.x-e.x,t.y-e.y)<=range));
   const target=possible.sort((a,b)=>d.mode==='lane'?a.x-b.x:b.progress-a.progress)[0];
   if(!target)continue;
   t.cooldown+=Math.max(.2,t.rate/d.tuning.fireRateMultiplier);
   const damage=Math.round(t.damage*d.bonuses.damage*(d.mode==='blocks'?1+t.height*.15:1));
   if(t.type==='frost')target.slow=2;
   damageEnemy(d,target,damage,t,t.type==='cannon');
   if(d.fx.length<110)d.fx.push({x:t.x,y:t.y,tx:target.x,ty:target.y,life:.18,type:t.type});
  }
  d.enemies=d.enemies.filter(e=>!e.dead);
  if(d.base<=0){d.base=0;d.over=true;d.active=false;d.victory=false;return;}
  if(d.spawned>=d.amount&&d.enemies.length===0){
   d.active=false;if(d.mode==='blocks')d.money=Math.min(9999,d.money+55+d.wave*12);
   if(d.wave>=d.waves){d.over=true;d.victory=true;}
   else if(d.mode==='lane')d.nextWaveAt=d.time+12;
   else if(d.mode==='blocks'){d.awaitingChoice=true;d.perks=d.base<75?['damage','energy','repair']:['damage','range','energy'];}
  }
 }
 return {create,config,place,buildBlock,upgrade,sell,begin,step,selectPerk,isPath,collectDrop,laneWavePlan};
}
if(typeof globalThis!=='undefined'){globalThis.gameForgeTDRulesFactory=gameForgeTDRulesFactory;globalThis.GameForgeTDRules=gameForgeTDRulesFactory();}
if(typeof module!=='undefined')module.exports=gameForgeTDRulesFactory();
