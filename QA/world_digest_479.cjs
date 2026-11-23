'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),crypto=require('crypto');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const html=fs.readFileSync(path.join(root,'START_GAME.html'),'utf8');
const paths=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
const c={console,Buffer,Uint8Array,Uint32Array,Uint16Array,Float32Array,Float64Array,Int32Array,ArrayBuffer,DataView,TextEncoder,Math,Date,performance:{now:()=>Date.now()},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{}};
c.globalThis=c;c.window=c;c.location={search:'?qa=479'};vm.createContext(c);
for(const p of paths)vm.runInContext(fs.readFileSync(path.join(root,p),'utf8'),c,{filename:p,timeout:40000});
const H=c.Heatline,world=new H.World(),life=new H.Stage39Life(world);const shade=crypto.createHash('sha256'),geom=crypto.createHash('sha256'),coast=crypto.createHash('sha256'),coastGeometry=crypto.createHash('sha256');
for(const b of world.boxes){geom.update([b.x,b.y,b.z,b.w,b.h,b.d,b.yaw||0,b.layer||0,b.lodMin||0,b.lodMax||0,b.visibilityCap||0,b.material||'',b.shape||''].join('/')+'\n');shade.update(b.color||'');}
const vs=world.boxes.shoreMesh463.vertices;for(let i=0;i<vs.length;i+=10){for(let k=0;k<6;k++)coastGeometry.update(String(vs[i+k])+',');for(let k=6;k<10;k++)coast.update(String(vs[i+k])+',');}
const animals=life.wildlife.filter(w=>w.kind==='crocodile').map(a=>({x:a.x,z:a.z,water:H.coast461.coast(a.x,a.z)}));
let grade=0;for(const road of world.roads461||[])for(let i=1;i<road.samples.length;i++){const a=road.samples[i],b=road.samples[i-1],d=Math.hypot(a.x-b.x,a.z-b.z);if(d>.03)grade=Math.max(grade,Math.abs(a.y-b.y)/d);}
const result={root,scriptCount:paths.length,buildings:world.buildings.length,boxes:world.boxes.length,terrainVertices:vs.length/10,terrainTriangles:world.boxes.shoreMesh463.indices.length/3,geometryHash:geom.digest('hex'),objectColorsHash:shade.digest('hex'),terrainGeometryHash:coastGeometry.digest('hex'),terrainColorsHash:coast.digest('hex'),roads:world.roads461.length,grade,crocodiles:animals,retainedTintedFarVolumes:world.boxes.filter(o=>o.sunset479Coherent).length,stage479Coast:world.stage479CoastStats||null,stage479Skyline:world.stage479SkylineStats||null,stage478:world.stage478Stats||null};
console.log(JSON.stringify(result));
