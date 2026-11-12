/* Pure rules shared by the standalone RPG and tower-defense runtimes. */
function gameForgeStrategyRulesFactory() {
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const circleRect=(a,b)=>Math.hypot(a.x-clamp(a.x,b.x,b.x+b.w),a.y-clamp(a.y,b.y,b.y+b.h))<a.r;
  function moveActor(a,dx,dy,speed,dt,world,obstacles){
    const length=Math.hypot(dx,dy);if(!length)return;
    const distance=Math.max(0,speed*dt),steps=Math.max(1,Math.ceil(distance/Math.max(2,a.r*.65)));
    const sx=dx/length*distance/steps,sy=dy/length*distance/steps;
    for(let i=0;i<steps;i++){
      const oldX=a.x;a.x=clamp(a.x+sx,a.r,world.width-a.r);
      if(obstacles.some(o=>circleRect(a,o)))a.x=oldX;
      const oldY=a.y;a.y=clamp(a.y+sy,a.r,world.height-a.r);
      if(obstacles.some(o=>circleRect(a,o)))a.y=oldY;
    }
  }
  function gainXP(p,amount){
    p.xp+=Math.max(0,amount);let levels=0;
    while(p.xp>=p.level*30+30){p.xp-=p.level*30+30;p.level++;p.maxHp+=12;p.hp=Math.min(p.maxHp,p.hp+12);p.attack+=3;levels++;}
    return levels;
  }
  function checkpoint(p){const s={};for(const k of ['hp','maxHp','attack','level','xp','coins','potions','armor','upgrades'])s[k]=p[k];return s;}
  function restore(p,s){Object.assign(p,s);p.invulnerable=1.4;return p;}
  function damage(p,n){if(p.invulnerable>0||p.hp<=0)return false;p.hp=Math.max(0,p.hp-Math.max(1,n-(p.armor||0)));p.invulnerable=.85;return true;}
  function portalReady(collected,bossDefeated){return collected>=3&&bossDefeated===true;}
  function potion(p){if(p.potions<1||p.hp>=p.maxHp)return false;p.potions--;p.hp=Math.min(p.maxHp,p.hp+55);return true;}
  const waypoints=[{x:0,y:3},{x:3,y:3},{x:3,y:5},{x:7,y:5},{x:7,y:2},{x:12,y:2},{x:12,y:5},{x:15,y:5}];
  function createDefense(stage,tuning){
    const path=[];
    for(let i=0;i<waypoints.length-1;i++){
      let {x,y}=waypoints[i];const end=waypoints[i+1];
      while(x!==end.x||y!==end.y){path.push({x,y});x+=Math.sign(end.x-x);y+=Math.sign(end.y-y);}
    }
    path.push({...waypoints[waypoints.length-1]});
    return {stage,cell:54,cols:16,rows:8,path,towers:[],enemies:[],shots:[],coins:220+stage*15,base:100,wave:0,waves:3+Math.min(stage,5),active:false,spawned:0,spawnClock:0,kills:0,escaped:0,over:false,victory:false,tuning:{difficulty:1,enemyMultiplier:1,bossMultiplier:1,fireRateMultiplier:1,...tuning}};
  }
  function placeTower(d,x,y,type='bolt'){
    if(d.over)return {ok:false,reason:'Partida encerrada'};
    if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=d.cols||y>=d.rows)return {ok:false,reason:'Escolha uma célula do campo'};
    if(d.path.some(p=>p.x===x&&p.y===y))return {ok:false,reason:'O caminho deve ficar livre'};
    if(d.towers.some(t=>t.gx===x&&t.gy===y))return {ok:false,reason:'Torre já instalada'};
    const cost=type==='frost'?75:60;
    if(d.coins<cost)return {ok:false,reason:'Ouro insuficiente'};
    if(d.towers.length>=90)return {ok:false,reason:'Limite de torres'};
    d.coins-=cost;const tower={gx:x,gy:y,x:x*d.cell+d.cell/2,y:y*d.cell+d.cell/2,level:1,type,cooldown:0,damage:type==='frost'?12:18,range:type==='frost'?135:150,rate:type==='frost'?.7:.58,angle:0};
    d.towers.push(tower);return {ok:true,tower};
  }
  function upgradeTower(d,t){
    if(d.over||!d.towers.includes(t)||t.level>=3)return {ok:false,reason:'Torre no nível máximo'};
    const cost=t.level*65;if(d.coins<cost)return {ok:false,reason:'Ouro insuficiente: '+cost};
    d.coins-=cost;t.level++;t.damage+=14;t.range+=22;t.rate*=.83;return {ok:true};
  }
  function startWave(d){
    if(d.over||d.active||d.wave>=d.waves)return false;
    d.wave++;d.active=true;d.spawned=0;d.spawnClock=0;
    d.amount=Math.min(55,Math.max(5,Math.round((5+d.wave*2+d.stage)*d.tuning.enemyMultiplier)));
    return true;
  }
  function stepDefense(d,dt){
    dt=clamp(dt,0,.05);d.shots=d.shots.filter(s=>(s.life-=dt)>0);
    if(d.over||!d.active)return;
    d.spawnClock-=dt;
    if(d.spawned<d.amount&&d.spawnClock<=0&&d.enemies.length<70){
      const n=d.spawned++,boss=d.wave===d.waves&&n===d.amount-1,kind=boss?'boss':n%4===2?'runner':n%4===3?'armored':'grunt';
      const hp=(boss?280+d.stage*40:kind==='armored'?86:kind==='runner'?34:52)*(1+(d.wave-1)*.22)*d.tuning.difficulty*(boss?d.tuning.bossMultiplier:1);
      const p=d.path[0];d.enemies.push({x:p.x*d.cell+d.cell/2,y:p.y*d.cell+d.cell/2,segment:0,hp,maxHp:hp,kind,speed:(kind==='runner'?85:boss?38:53)*(1+d.stage*.025),slow:0,r:boss?20:12,dead:false});
      d.spawnClock=Math.max(.34,.85-d.stage*.025);
    }
    for(const e of d.enemies){
      if(e.dead)continue;
      e.slow=Math.max(0,e.slow-dt);let distance=e.speed*(e.slow>0?.48:1)*dt;
      while(distance>0&&!e.dead){
        const next=d.path[e.segment+1];
        if(!next){e.dead=true;d.base=Math.max(0,d.base-(e.kind==='boss'?30:10));d.escaped++;break;}
        const nx=next.x*d.cell+d.cell/2,ny=next.y*d.cell+d.cell/2,dx=nx-e.x,dy=ny-e.y,length=Math.hypot(dx,dy);
        if(length<=distance){e.x=nx;e.y=ny;e.segment++;distance-=length;}
        else{e.x+=dx/length*distance;e.y+=dy/length*distance;distance=0;}
      }
    }
    for(const t of d.towers){
      t.cooldown-=dt;if(t.cooldown>0)continue;
      const target=d.enemies.filter(e=>!e.dead&&Math.hypot(e.x-t.x,e.y-t.y)<=t.range).sort((a,b)=>b.segment-a.segment)[0];
      if(!target)continue;
      t.angle=Math.atan2(target.y-t.y,target.x-t.x);target.hp-=Math.max(1,t.damage-(target.kind==='armored'?4:0));
      if(t.type==='frost')target.slow=1.5;t.cooldown=t.rate/Math.max(.3,d.tuning.fireRateMultiplier);
      if(d.shots.length<160)d.shots.push({x:t.x,y:t.y,tx:target.x,ty:target.y,life:.14,type:t.type});
      if(target.hp<=0){target.dead=true;d.kills++;d.coins+=target.kind==='boss'?70:14;}
    }
    d.enemies=d.enemies.filter(e=>!e.dead);
    if(d.base<=0){d.over=true;d.active=false;return;}
    if(d.spawned>=d.amount&&d.enemies.length===0){d.active=false;d.coins+=35+d.wave*10;if(d.wave>=d.waves){d.over=true;d.victory=true;}}
  }
  return {moveActor,gainXP,checkpoint,restore,damage,potion,portalReady,createDefense,placeTower,upgradeTower,startWave,stepDefense};
}
if(typeof globalThis!=='undefined'){globalThis.gameForgeStrategyRulesFactory=gameForgeStrategyRulesFactory;globalThis.GameForgeStrategyRules=gameForgeStrategyRulesFactory();}
if(typeof module!=='undefined')module.exports=gameForgeStrategyRulesFactory();
