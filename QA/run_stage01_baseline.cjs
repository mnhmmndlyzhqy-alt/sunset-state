'use strict';
// SUNSET STATE 20-step city project. Read-only baseline world measurement.
// Run from any directory: node QA/run_stage01_baseline.cjs
const fs=require('fs'),vm=require('vm'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const sha=(data)=>crypto.createHash('sha256').update(data).digest('hex');
const html=fs.readFileSync(path.join(root,'START_GAME.html'),'utf8');
// Audit 2026-11-21: isolate the historic stage from future enhancement wrappers;
// otherwise disabled A/B baseline is invalid after later stage requirements.
const allScripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
const historicEnd=allScripts.indexOf('assets/city20_stage02.js');
if(historicEnd<0)throw Error('Missing boundary for historic acceptance test');
const scripts=allScripts.slice(0,historicEnd);
const tests=[];
function check(id,passed,details={}){tests.push({id,passed:!!passed,details});if(!passed)console.error('FAIL',id,JSON.stringify(details));}
check('has_chosen_reference',fs.existsSync(path.join(root,'REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png')));
const refBuf=fs.readFileSync(path.join(root,'REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png'));
const pngDims={width:refBuf.readUInt32BE(16),height:refBuf.readUInt32BE(20)};
check('reference_is_original_1408x768',pngDims.width===1408&&pngDims.height===768,pngDims);
check('all_external_js_exist',scripts.every(p=>fs.existsSync(path.join(root,p))),{scripts:scripts.length});
check('custom_webgl2_engine_preserved',fs.readFileSync(path.join(root,'engine44.js'),'utf8').includes('WebGL2')&&fs.existsSync(path.join(root,'assets/performance_475.js')));
check('native_1080_mode_intact',fs.readFileSync(path.join(root,'engine44.js'),'utf8').includes("this.graphicsMode = 'native1080'"));
check('performance_tools_present',html.includes('F3')&&html.includes('F4')&&html.includes('F8')&&html.includes('F9'));
const ctx={console,URLSearchParams,Buffer,Uint8Array,Uint32Array,Uint16Array,Float32Array,Float64Array,Int32Array,ArrayBuffer,DataView,TextEncoder,Math,Date,
 performance:{now:()=>Date.now()},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),
 setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{}};
ctx.globalThis=ctx;ctx.window=ctx;ctx.location={search:'?qa=city20'};vm.createContext(ctx);
const compileStart=Date.now();
for(const p of scripts){
 const source=fs.readFileSync(path.join(root,p),'utf8');
 const code=new vm.Script(source,{filename:p});
 code.runInContext(ctx,{timeout:40000});
}
const engineSource=fs.readFileSync(path.join(root,'engine44.js'),'utf8');
const engineScript=new vm.Script(engineSource,{filename:'engine44.js'});
engineScript.runInContext(ctx,{timeout:40000});
const H=ctx.Heatline;
check('engine_world_api',!!H&&typeof H.World==='function');
const start=Date.now();
const w=new H.World();
const life=new H.Stage39Life(w);
const worldBuildMs=Date.now()-start;
const coast=w.boxes.shoreMesh463;
const crocodiles=life.wildlife.filter(a=>a.kind==='crocodile').map(a=>({x:a.x,z:a.z,waterDepth:H.reference469.coast(a.x,a.z)}));
let maxGrade=0,samples=0;
for(const r of w.roads461||[]) for(let i=1;i<r.samples.length;i++){
 const a=r.samples[i],b=r.samples[i-1],d=Math.hypot(a.x-b.x,a.z-b.z);
 if(d>.03){maxGrade=Math.max(maxGrade,Math.abs(a.y-b.y)/d);samples++;}
}
check('has_real_roads',w.roads461.length>=50,{roads:w.roads461.length});
check('road_slope_repair_still_active',maxGrade<=.090001,{maxGrade});
check('crocodiles_in_water',crocodiles.length===8&&crocodiles.every(a=>a.waterDepth<-.5),{count:crocodiles.length});
check('no_added_timber_boardwalk',w.stage478Stats?.noTimberPlatformAdded===true);
check('geometry_nonempty',w.buildings.length>0&&w.boxes.length>10000,{buildings:w.buildings.length,meshes:w.boxes.length});
const ref=H.reference469; const refHash=sha(refBuf);
const anchors=[
 {id:'CITY_CENTER_AERIAL',name:'מרכז העיר ממסוק',category:'center',px:[764,365],height:115,offset:[-120,155],radius:200},
 {id:'CITY_CENTER_STREET',name:'רחוב מסחרי מרכזי',category:'center',px:[790,452],height:2.0,offset:[0,16],radius:80},
 {id:'CANAL_NEIGHBORHOODS',name:'שכונות ותעלות במערב',category:'residential',px:[275,463],height:38,offset:[-80,110],radius:170},
 {id:'PORT_WATERFRONT',name:'הנמל הצפון מערבי',category:'port',px:[196,134],height:75,offset:[-90,130],radius:200},
 {id:'STADIUM_AND_BEACH',name:'האצטדיון והחוף המזרחי',category:'east_coast',px:[1122,292],height:72,offset:[-95,105],radius:185},
 {id:'AIRPORT_AND_RUNWAY',name:'שדה התעופה והמסלול בדרום',category:'airport',px:[706,665],height:110,offset:[-105,145],radius:240},
 {id:'NORTH_WETLANDS',name:'הביצות והטבע בצפון',category:'wetlands',px:[973,78],height:62,offset:[-60,75],radius:210},
 {id:'RESORT_AND_ISLANDS',name:'איים וחוף במזרח',category:'islands',px:[1288,190],height:63,offset:[-75,100],radius:150}
];
const refScale={x:ref.width/pngDims.width,z:ref.height/pngDims.height};
for(const a of anchors){
 const rp=[a.px[0]*refScale.x,a.px[1]*refScale.z];
 const target=ref.world(...rp),cx=target.x+a.offset[0],cz=target.z+a.offset[1];
 const near=w.buildings.filter(b=>Math.hypot(b.x-target.x,b.z-target.z)<a.radius).length;
 a.imagePxOriginal=a.px;delete a.px;
 a.worldTarget={x:+target.x.toFixed(2),z:+target.z.toFixed(2)};
 a.camera={x:+cx.toFixed(2),y:a.height,z:+cz.toFixed(2),tx:+target.x.toFixed(2),ty:a.height<5?1.8:5,tz:+target.z.toFixed(2),fov:a.height<5?66:69};
 a.nearbyPrimaryBuildings=near;
 a.terrain=a.category==='wetlands'?'wetland water and raised ground':'inspect visual match to reference';
 delete a.height;delete a.offset;
}
check('eight_camera_anchors_valid',anchors.length===8&&anchors.every(a=>Object.values(a.camera).every(Number.isFinite)));
const inventory={};
for(const p of scripts){const b=fs.readFileSync(path.join(root,p));inventory[p]={bytes:b.length,sha256:sha(b)};}
inventory['START_GAME.html']={bytes:Buffer.byteLength(html),sha256:sha(Buffer.from(html))};
inventory['engine44.js']={bytes:Buffer.byteLength(engineSource),sha256:sha(Buffer.from(engineSource))};
inventory['REFERENCE/CHOSEN_CITY_LAYOUT_ORIGINAL.png']={bytes:refBuf.length,sha256:refHash};
const summary={project:'SUNSET STATE',phase:'20-STAGE CITY REBUILD',stage:1,base:'4.7.9',when:'2026-11-21',gameMechanicsModified:false,
 reference:{name:'CHOSEN_CITY_LAYOUT_ORIGINAL.png',size:pngDims,sha256:refHash,registrationsApproximate:true},
 geometry:{buildings:w.buildings.length,boxes:w.boxes.length,roadRoutes:w.roads461.length,roadSegmentsSampled:samples,maximumRoadSlope:maxGrade,
 coastalVerts:coast.vertices.length/10,coastalTriangles:coast.indices.length/3,crocodilesInWater:crocodiles.length},
 benchmark:{requireInternalPx:[1920,1080],minimumFps:50,liveGpuValidated:false,minimumFpsAchieved:null,reason:'Only code and CPU baseline measured; browser GPU cannot be assumed.'},
 cpuBuildTimingMs:worldBuildMs,compileAndEvalMs:Date.now()-compileStart,benchmarkTimingNotRepresentativeOfGpu:true,
 visualAnchors:anchors,scriptInventory:inventory,checks:tests,passed:tests.filter(x=>x.passed).length,total:tests.length,allPassed:tests.every(x=>x.passed)};
fs.writeFileSync(path.join(root,'QA/CITY20_BASELINE_STAGE01.json'),JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync(path.join(root,'QA/CITY20_VISUAL_ANCHORS.json'),JSON.stringify({sourceReference:summary.reference,cameraInfo:'Fixed viewing targets for visual comparison; camera positioning requires browser/QA controls. Not live screenshots.',scenes:anchors},null,2)+'\n');
console.log(JSON.stringify({passed:summary.passed,total:summary.total,geometry:summary.geometry,reference:summary.reference,anchorNames:anchors.map(x=>x.id),CPUms:worldBuildMs}));
if(!summary.allPassed)process.exitCode=2;
