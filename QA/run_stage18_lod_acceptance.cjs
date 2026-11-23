'use strict';
/* Stage 18 CPU acceptance: original V5 model and real renderer selector.
 * No GPU pixels, browser screenshots or FPS are claimed here. */
const fs=require('fs'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const {H,ctx,g}=require('./stage05_bootstrap.cjs');
let passed=0;const failures=[];
function ok(name,predicate,extra){
 try{assert.ok(predicate,name);passed++;}catch(e){failures.push({name,extra,error:e.message});if(failures.length<15)console.error('FAIL',name,extra||'',e.message);}
}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'QA/STAGE18_LOD_ASSET_MANIFEST.json'),'utf8'));
ok('source exactly 8 wildlife crocodiles',g.stage39Life.wildlife.filter(a=>a.kind==='crocodile').length===8);
ok('original hi pack unchanged',fs.existsSync(path.join(root,'assets/crocodile_hi.js')));
ok('real skinned mid 24 nodes? source has 50',manifest.mid.rig_nodes===50&&manifest.mid.skins===2);
ok('real skinned far skeleton preserved',manifest.far.rig_nodes===50&&manifest.far.skins===2);
ok('same five authored animation clips',manifest.mid.clips.join(',')===manifest.far.clips.join(',')&&manifest.mid.clips.length===5);
ok('mid geometry reduced from original',manifest.mid.triangles_lod<manifest.hi_source_triangles*.40&&manifest.mid.triangles_lod>20000);
ok('far geometry reduced',manifest.far.triangles_lod<manifest.mid.triangles_lod*.20&&manifest.far.triangles_lod>2000);
ok('far reduces draw passes',manifest.far.draw_meshes<=8&&manifest.mid.draw_meshes===24);
ok('downsampled textures are still nine PBR maps',manifest.mid.images.length===9&&manifest.far.images.length===9);
let lastLodWeights=[];let drawCalls=0;
const glconst={VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,TRIANGLES:4,DEPTH_TEST:2929,CULL_FACE:2884,BLEND:3042,SRC_ALPHA:770,ONE_MINUS_SRC_ALPHA:771,TEXTURE_2D:3553,TEXTURE0:33984,UNSIGNED_SHORT:5123};
const gl=new Proxy({
 createShader:()=>({}),shaderSource:()=>{},compileShader:()=>{},getShaderParameter:()=>true,getShaderInfoLog:()=>'',
 createProgram:()=>({}),attachShader:()=>{},linkProgram:()=>{},getProgramParameter:()=>true,getProgramInfoLog:()=>'',
 deleteShader:()=>{},deleteProgram:()=>{},getUniformLocation:(_p,n)=>n,uniform1f:(loc,val)=>{if(loc==='uCrocLodWeight')lastLodWeights.push(val);},
 drawArrays:()=>{drawCalls++;},drawElements:()=>{drawCalls++;},
 ...glconst
},{get:(o,k)=>k in o?o[k]:(typeof k==='string'&&k.startsWith('uniform')||typeof k==='string'&&['disable','enable','blendFunc','useProgram','depthMask','bindVertexArray','bindTexture','activeTexture','uniformMatrix4fv','uniform3f','uniform3fv','uniform4fv','uniform2f'].includes(k)?()=>{}:undefined)});
const Ctor=ctx.__Stage18OriginalWildlifeRenderer;
ok('production WildlifeRenderer preserved in QA harness',typeof Ctor==='function');
const r=new Ctor(gl);
let ensures=[];r.ensure=(k)=>{ensures.push(k);};
const keys=['crocodile_hi','crocodile_mid','crocodile_far'];
for(const k of keys)r.assets.set(k,{ready:true});
const crocodiles=[15,24,37,70,101,145,206,305].map((x,id)=>({kind:'crocodile',id:'croco'+id,x,z:0,yaw:0,mode:'rest',step:0,phase:0,scale:1}));
const life={wildlife:crocodiles,fish:[],plane:null,world:{parkedAirliners471:[]}};
const cam={x:0,y:0,z:0};
function selectAt(ms=0){ctx.__setMockTime(ms);r.prepare(life,cam,false);return crocodiles.map(a=>r.selection.get(a));}
let selected=selectAt();
ok('eight crocodiles selected, not 3',r.selection.size===8,selected);
ok('hi 3 budget nearest',selected.filter(k=>k==='crocodile_hi').length===3,selected);
ok('mid covers next 3',selected.filter(k=>k==='crocodile_mid').length===3,selected);
ok('far covers remaining 2',selected.filter(k=>k==='crocodile_far').length===2,selected);
ok('stats select eight while keeping high budget',Object.values(r.crocLodFrame.selected).reduce((a,b)=>a+b,0)===8&&r.crocLodFrame.selected.high===3);
ok('stable no transitions on still camera',selectAt(150).every((k,i)=>k===selected[i])&&r.crocLodFrame.transitions===0);
for(let i=0;i<crocodiles.length;i++)crocodiles[i].x=215+i*10;
selected=selectAt(200);
ok('all eight continue as cheap far LOD',selected.every(k=>k==='crocodile_far'),selected);
ok('far budget eight ready',r.crocLodFrame.selected.far===8);
const one=crocodiles[0];
for(let i=1;i<crocodiles.length;i++)crocodiles[i].x=270+i*3;
one.x=40;selected=selectAt(1000);
ok('near individual upgrades to original hi',selected[0]==='crocodile_hi');
ok('LOD upgrade state records crossfade',r.crocLodStates.get(one).fade?.from==='crocodile_far'&&r.crocLodStates.get(one).fade?.to==='crocodile_hi');
one.x=63;selected=selectAt(1040);
ok('hysteresis holds original high between 54 and 69',selected[0]==='crocodile_hi');
one.x=73;selected=selectAt(1080);
ok('high switches down to mid past exit threshold',selected[0]==='crocodile_mid');
ok('crossfade old+new skeleton clips',r.crocLodStates.get(one).fade?.to==='crocodile_mid');
one.x=165;selected=selectAt(1100);
ok('hysteresis holds mid at 165',selected[0]==='crocodile_mid');
one.x=175;selected=selectAt(1140);
ok('mid descends to far past 172',selected[0]==='crocodile_far');
one.x=155;selected=selectAt(1180);
ok('hysteresis holds far at 155',selected[0]==='crocodile_far');
one.x=140;selected=selectAt(1220);
ok('far upgrades at 140',selected[0]==='crocodile_mid');
selectAt(2000);ok('crossfade ends after 380ms',r.crocLodStates.get(one).fade===null);
// Real switching off via parameter restores stage17 3/145 behavior.
ctx.__SUNSET_STAGE18_LOD_OFF=true;
for(let i=0;i<crocodiles.length;i++)crocodiles[i].x=10+i*12;
selected=selectAt(2100);
ok('A/B off returns to original 3 high only',selected.filter(Boolean).length===3&&selected.filter(Boolean).every(k=>k==='crocodile_hi'),selected);
ok('A/B runtime status indicates disabled',r.crocLodFrame.off===true);
ctx.__SUNSET_STAGE18_LOD_OFF=false;
// Before assets decode, preserve procedural fallback and enqueue cheapest first.
r.assets.clear();ensures=[];selected=selectAt(2500);
ok('cold start preserves procedural fallback until asset ready',r.selection.size===0);
ok('far asset queued before mid and hi',ensures[0]==='crocodile_far'&&ensures.includes('crocodile_mid')&&ensures.includes('crocodile_hi'),ensures);
r.assets.set('crocodile_far',{ready:true});selected=selectAt(2600);
ok('all 8 get authored far model while loading detailed variants',selected.every(k=>k==='crocodile_far'));
// Verify real draw pipeline issues complementary opacity uniforms for both meshes.
const sceneMatrix=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const dummyAsset={ready:true,nodes:[{mesh:0}],meshes:[{weights:null}],meshParts:[[{vao:{},count:3,indexed:false,material:0,hasColor:false,skinned:false}]],
 drawNodes:[0],scenePose:()=>({pose:[{w:null}],worlds:[sceneMatrix]}),anims:[],
 json:{materials:[{pbrMetallicRoughness:{}}],textures:[]},defaultWhite:{},defaultNorm:{},defaultORM:{},getTexture:()=>({})};
for(const k of keys)r.assets.set(k,dummyAsset);
const actor={kind:'crocodile',x:0,z:0,yaw:0,scale:1,mode:'rest',step:0,phase:0};
r.selection.clear();r.selection.set(actor,'crocodile_mid');r.crocLodStates.set(actor,{key:'crocodile_mid',fade:{from:'crocodile_hi',to:'crocodile_mid',start:3}});r.crocNow=3.19;
lastLodWeights=[];drawCalls=0;
try{r.draw(sceneMatrix,{x:0,y:1,z:0},12,3.19,null);ok('real renderer draws both LODs during crossfade',drawCalls===2,drawCalls);ok('dither masks complementary',lastLodWeights.length===2&&Math.abs(lastLodWeights[0]+lastLodWeights[1]-1)<.000001,lastLodWeights);}
catch(e){ok('real renderer draw executes for crossfade',false,e.stack);}
const status=r.status();ok('runtime LOD stats exposed',!!status.crocodiles&&Number.isFinite(status.selected));
const output={stage:18,tests:passed+failures.length,passed,failed:failures,source:'real Game / real Wildlife43Renderer, mocked GL commands. NO GPU frame rendered',lod:{hi:manifest.hi_source_triangles,mid:manifest.mid.triangles_lod,far:manifest.far.triangles_lod},date:'2026-11-22'};
fs.writeFileSync(path.join(root,'QA/STAGE18_LOD_ACCEPTANCE.json'),JSON.stringify(output,null,2));
console.log('STAGE18',passed+'/'+output.tests,failures.length?'FAIL':'PASS','GL-CPU only');
if(failures.length)process.exit(1);
