'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Kit=require('../js/voxel-kit.js');
test('GF-TRAIN-22: chunks de 16, inclusive coordenadas negativas e indices locais',()=>{
 assert.deepEqual(Kit.chunkOf(-1,-17),{cx:-1,cz:-2});
 assert.deepEqual(Kit.chunkOf(15,16),{cx:0,cz:1});
 assert.deepEqual(Kit.chunkOf(16,0),{cx:1,cz:0});
 assert.deepEqual(Kit.localBlock(-1,68,16),{cx:-1,cz:1,lx:15,lz:0,index:(68*16+0)*16+15});
 assert.throws(()=>Kit.chunkOf(Number.NaN,0),/inválida/);
 assert.throws(()=>Kit.localBlock(0,160,0),/inválido/);
});
test('GF-TRAIN-22: geracao por seed e coordenadas globais independe de ordem dos chunks',()=>{
 const a=Kit.generateChunk(1234,0,0),b=Kit.generateChunk(1234,0,0);
 const other=Kit.generateChunk(5678,0,0);
 const west=Kit.generateChunk(1234,-1,0),east=Kit.generateChunk(1234,1,0);
 assert.equal(a.voxels.length,16*16*160);
 assert.deepEqual(a.voxels,b.voxels);
 assert.notDeepEqual(a.voxels,other.voxels);
 const expected=(chunk,x,z)=>{
  let top=-1;for(let y=159;y>=0;y--){if(chunk.voxels[(y*16+z)*16+x]!==0){top=y;break;}}return top;
 };
 for(const [chunk,cx] of [[west,-1],[a,0],[east,1]])for(const x of [0,15])for(const z of [0,15]){
  assert.equal(expected(chunk,x,z),Kit.heightAt(1234,cx*16+x,z));
 }
 assert.notDeepEqual(Kit.generateChunk(1234,-1,0).voxels,a.voxels);
});
test('GF-TRAIN-22: chunks proximos primeiro e ra io mobile limitado',()=>{
 const desktop=Kit.streamRequests({x:0,z:0},'medium',false);
 const phone=Kit.streamRequests({x:0,z:0},'medium',true);
 assert.equal(desktop.radius,4);assert.equal(phone.radius,3);
 assert.equal(phone.wanted[0].distance2,0);
 assert.ok(phone.wanted.length<desktop.wanted.length);
 assert.equal(Kit.streamRequests({x:-.1,z:-16.1},'low',true).center.cx,-1);
 assert.equal(Kit.streamRequests({x:-.1,z:-16.1},'low',true).center.cz,-2);
});
test('GF-TRAIN-22: lote atomico invalida malhas antigas e borda de chunk unloaded',()=>{
 const original={edits:{},revisions:{}};
 const result=Kit.batchEdits(original,[[15,66,2,8],[16,66,2,4]]);
 assert.equal(result.edits['0,0'][Kit.localBlock(15,66,2).index],8);
 assert.equal(result.edits['1,0'][Kit.localBlock(16,66,2).index],4);
 assert.ok(result.revisions['0,0']>=1&&result.revisions['1,0']>=1);
 assert.equal(original.revisions['1,0'],undefined,'não altera estado externo antes de commit');
 assert.equal(Kit.meshJobValid({cx:1,cz:0,rev:0},result),false);
 assert.equal(Kit.meshJobValid({cx:1,cz:0,rev:result.revisions['1,0']},result),true);
 assert.equal(Kit.meshJobValid({cx:1,cz:0,rev:result.revisions['1,0']},result,
  {center:{cx:10,cz:0},radius:2}),false);
 const old=result.edits['1,0'];
 const updated=Kit.batchEdits(result,[[17,66,2,20]]);
 assert.equal(result.edits['1,0'],old,'snapshot anterior fica intacto');
 assert.ok(updated.revisions['1,0']>result.revisions['1,0']);
 assert.equal(Kit.meshJobValid({cx:1,cz:0,rev:result.revisions['1,0']},updated),false);
 assert.throws(()=>Kit.batchEdits(result,[[15,66,2,8],[16,999,2,4]]),/inválida/);
 assert.equal(result.edits['1,0'][Kit.localBlock(16,66,2).index],4,'nenhuma edição parcial');
});
test('GF-TRAIN-22: filtro de receitas preserva indice original por aparelho',()=>{
 const recipes=[
  {station:0,output:{id:8,qty:4},requires:[{id:5,qty:1}]},
  {station:12,output:{id:21,qty:2},requires:[{id:8,qty:2}]},
  {station:14,output:{id:24,qty:1},requires:[{id:9,qty:2}]},
  {station:12,output:{id:25,qty:1},requires:[{id:8,qty:4}]}
 ];
 assert.deepEqual(Kit.recipesAtStation(recipes,12).map(x=>x.index),[1,3]);
 assert.deepEqual(Kit.recipesAtStation(recipes,14).map(x=>x.index),[2]);
 assert.deepEqual(Kit.recipesAtStation(recipes,0).map(x=>x.index),[0]);
 const inv=[{id:5,qty:3},{id:8,qty:5},{id:9,qty:3},null];
 const before=JSON.stringify(inv);
 const wrong=Kit.craft({recipes,recipeIndex:1,station:0,inventory:inv});
 assert.equal(wrong.ok,false);assert.equal(JSON.stringify(inv),before);
 const away=Kit.craft({recipes,recipeIndex:1,station:12,nearStation:false,inventory:inv});
 assert.equal(away.ok,false);assert.equal(JSON.stringify(inv),before);
 const made=Kit.craft({recipes,recipeIndex:1,station:12,inventory:inv});
 assert.equal(made.ok,true);
 assert.equal(made.inventory.find(x=>x?.id===8)?.qty,3);
 assert.equal(made.inventory.find(x=>x?.id===21)?.qty,2);
 assert.equal(JSON.stringify(inv),before,'consumo é atômico; origem nunca sofre mutação');
 const hand=Kit.craft({recipes,recipeIndex:0,station:0,nearStation:false,inventory:inv});
 assert.equal(hand.ok,true,'mochila station 0 dispensa proximidade de máquina');
});
test('GF-TRAIN-22: crafting aborta sem espaço e sem materiais (sem perder itens)',()=>{
 const recipes=[{station:'furnace',output:{id:42,qty:3},requires:[{id:1,qty:2}]}];
 const items=[{id:1,qty:4},{id:5,qty:99}];
 const failed=Kit.craft({recipes,recipeIndex:0,station:'furnace',inventory:items,maxStack:2});
 assert.equal(failed.ok,false);
 assert.deepEqual(items,[{id:1,qty:4},{id:5,qty:99}]);
 const empty=Kit.craft({recipes,recipeIndex:0,station:'furnace',inventory:[{id:1,qty:1},null]});
 assert.equal(empty.ok,false);
 assert.equal(empty.reason,'missing-materials');
 const ok=Kit.craft({recipes,recipeIndex:0,station:'furnace',inventory:[{id:1,qty:2},null],maxStack:3});
 assert.equal(ok.ok,true);
 assert.deepEqual(ok.inventory,[{id:42,qty:3},null]);
});
test('GF-TRAIN-22: compassos mantem norte, leste e rota em linha reta',()=>{
 assert.equal(Kit.compassMarks(0).find(x=>x.label==='N').left,50);
 assert.equal(Kit.compassMarks(Math.PI/2).find(x=>x.label==='L').left,50);
 assert.equal(Kit.compassMarks(-Math.PI/2).find(x=>x.label==='O').left,50);
 const front=Kit.guide({x:0,y:0,z:0,yaw:0},{x:0,y:0,z:-12});
 assert.equal(front.turn,'Em frente');
 const east=Kit.guide({x:0,y:0,z:0,yaw:0},{x:15,y:0,z:0});
 assert.equal(east.turn,'Direita');
 assert.equal(east.kind,'straight-line-not-pathfinding');
 assert.equal(Kit.guide({x:0,y:0,z:0,yaw:0},{x:0,y:7,z:-2}).height,'Suba');
 assert.equal(Kit.guide({x:0,y:0,z:0,yaw:0},{x:0,y:0,z:-3}).arrived,true);
});
test('GF-TRAIN-22: mede FPS medio/1% low/p95 sem considerar aba suspensa',()=>{
 const report=Kit.frameMetrics([.016,.016,.016,.032,.016,Infinity,0,3,NaN]);
 assert.equal(report.samples,5);
 assert.ok(report.averageFPS>50&&report.averageFPS<65);
 assert.ok(report.low1FPS<report.averageFPS);
 assert.equal(report.p95Ms,32);
 assert.equal(Kit.frameMetrics([]).averageFPS,0);
});
