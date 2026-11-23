'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const files=[...read('START_GAME.html').matchAll(/<script src="([^"\n]+\.js)"/g)].map(x=>x[1]);
const ctx={console,URLSearchParams,Buffer,Uint8Array,Uint16Array,Uint32Array,Float32Array,Float64Array,Int32Array,ArrayBuffer,DataView,TextEncoder,Math,Date,performance:{now:()=>0},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:''},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64')};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const file of files){let s=read(file);if(file==='engine44.js')s=s.replace('if (typeof Heatline.installPhysicsRecovery4', 'globalThis.__STAGE21_GAME=Game; if (typeof Heatline.installPhysicsRecovery4');new vm.Script(s,{filename:file}).runInContext(ctx,{timeout:60000});}
const H=ctx.Heatline,C=ctx.__STAGE21_GAME;
function fakeGame(solids=[]){const g=Object.create(C.prototype);g.weather={rain:0};g.world={nearby:()=>solids,impactNearby:()=>[],panesNearby:()=>[]};g.railGates=[];g.breakGlassOnCarContact=()=>{};g.crashVehicle=(c,s,nx,nz,k)=>{g.impacts.push({s,nx,nz,k});return null;};g.impacts=[];g.synth={impact(){},cue(){}};g.bulletScars=[];g.impactDebris=()=>{};g.reportOffense=()=>{};g.buildingHitPoint=(c,s,nx,nz)=>({x:s.x,z:s.z});return g;}
const result=[];
for(const speed of [34,80,118,180,250,360,500])for(const dt of [.016,.04,.055,.075,.1])for(const yaw of [0,Math.PI/2]){
 const c=H.makeCar('player',0,18,yaw);c.x=yaw===0?0:18;c.z=yaw===0?18:0;c.speed=speed;c.vx=yaw===0?0:-speed;c.vz=yaw===0?-speed:0;
 const wall=yaw===0?{x:0,z:8,hw:3,hd:.065}:{x:8,z:0,hw:.065,hd:3};
 const g=fakeGame([wall]);const initial={x:c.x,z:c.z};
 try{g.moveCar(c,dt,{gas:0,steer:0,brake:false,nitro:false});}catch(e){result.push({speed,dt,yaw,error:String(e)});continue;}
 const passed=yaw===0?c.z<wall.z-wall.hd-2:c.x<wall.x-wall.hw-2;
 if(passed)result.push({speed,dt,yaw:Math.round(yaw*100)/100,initial,after:{x:c.x,z:c.z,vx:c.vx,vz:c.vz,sp:c.speed},wall,impacts:g.impacts.length});
}
console.log(JSON.stringify({totalCases:7*5*2,passThroughs:result.length,first:result.slice(0,35)},null,2));
fs.writeFileSync(root+'/QA/STAGE21_BASELINE_TUNNELLING.json',JSON.stringify({cases:7*5*2,tunnels:result},null,2));
