'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),M=require('../js/voxel-mesher.js')();
const K=require('../js/voxel-kit.js'),L=require('../js/voxel-landscape.js'),W=require('../js/voxel-world.js')(K),G=require('../js/voxel-terrain.js')(K,L);
test('halo de luz preserva edições vizinhas e equivale ao mundo',()=>{
 const w=W.create(12345,[],{size:512,landscape:true,lighting:true});
 assert.ok(w.edit(-7,110,0,30));assert.ok(w.edit(22,110,0,3));
 const j=w.terrainJob(0,0,8),p=G.snapshot(j),at=(x,y,z)=>p[(y*32+z+8)*32+x+8];
 assert.equal(p.length,32*32*160);assert.equal(at(-7,110,0),30);assert.equal(at(22,110,0),3);
 assert.equal(at(3,50,2),w.get(3,50,2));
});
test('tocha ilumina superfície coberta sem atravessar parede',()=>{
 const p=new Uint8Array(32*32*160),put=(x,y,z,id)=>p[(y*32+z+8)*32+x+8]=id;
 put(4,40,4,3);put(4,42,4,3);put(4,41,3,30);
 function top(mesh){let max=0;for(let i=0;i<mesh.positions.length;i+=18){const q=mesh.positions.slice(i,i+18);if([1,4,7,10,13,16].every(j=>q[j]===41)&&Math.min(...[0,3,6,9,12,15].map(j=>q[j]))===4&&Math.min(...[2,5,8,11,14,17].map(j=>q[j]))===4)max=Math.max(max,...mesh.colors.slice(i,i+18));}return max;}
 const open=top(M.build(p,0,0,true,true,8));for(let y=33;y<=49;y++)for(let x=-3;x<=11;x++)put(x,y,3,3);put(4,41,2,30);
 const closed=top(M.build(p,0,0,true,true,8));assert.ok(open>closed);assert.ok(closed<=.33);
});
test('greedy antigo preservado e água usa tile distinto',()=>{
 const p=new Uint8Array(18*18*160),set=(x,y,z,id)=>p[(y*18+z+1)*18+x+1]=id;
 for(let x=0;x<16;x++)for(let z=0;z<16;z++)set(x,1,z,3);
 assert.equal(M.build(p,0,0,true).faces,6);set(3,2,3,28);assert.ok(M.build(p,0,0,true).tiles.includes(26));
});
