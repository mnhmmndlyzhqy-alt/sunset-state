/* SUNSET STATE CITY20 - STAGE 03: Real terrain / coast profile / building terrain tie-in.
 * Uses the SAME custom WebGL2 renderer and the EXACT selected reference plan.
 * Topographic displacement is evaluated by the shared terrain-height API,
 * so the shore mesh, walking height and prop ground agree. Existing roads,
 * airport, downtown and authored building footprints are protected.
 * Model/texture/GPU assets and save data are not modified.
 */
var Heatline=globalThis.Heatline||{};
(function(H){
'use strict';
// Read-only QA A/B switch: ?city20terrainOff=1, never used in normal play.
if(typeof URLSearchParams==='function'&&typeof location!=='undefined'&&
   new URLSearchParams(location.search).has('city20terrainOff'))
   globalThis.__SUNSET_CITY20_DISABLE_STAGE03=true;
const G=H.coast461,R=H.reference469;
const original=G.surface,finish=H.finishReferenceBuildings469;
if(typeof original!=='function'||typeof finish!=='function'||!H.city20Stage02Areas)
  throw Error('CITY20 stage03 requires full stage02 city and terrain sources');
const smooth=(a,b,v)=>{let t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const CELL=64;
const padData=[[-184.119,-289.206,21.43,22.48,2.192],[246.218,163.736,19.33,22.32,1.705],[-82.741,168.087,17.76,22.38,6.724],[-245.807,-150.572,21.15,23.96,6.079],[-822.401,230.937,16.16,9.38,2.391],[-881.822,340.914,13.78,11.38,3.095],[-673.181,0.234,15.4,9.82,3.32],[-521.494,-2.384,14.18,13.2,3.483],[-912.293,383.999,15.5,10.16,3.867],[-533.673,416.702,16.21,10.74,2.386],[-533.25,118.34,16.96,12.16,4.455],[-878.525,258.613,12.36,13.63,2.238],[-839.015,263.748,14.28,9.61,2.492],[-520.351,262.192,16.98,12.2,2.452],[-840.839,1.895,13.57,11,0.857],[-508.227,149.602,14.12,11.45,3.434],[-522.41,230.03,13.63,9.03,2.845],[-653.887,31.912,14.98,14.12,4.557],[-671.389,113.868,11.79,9,4.924],[-819.733,190.906,13.66,10.79,2.241],[-780.444,306.113,15.67,13.73,3.158],[-842.966,226.239,11.87,13.97,2.292],[-880.181,308.235,14.04,14.56,2.588],[-723.183,527.959,15.43,12.39,7.303],[-537.564,77.166,13.91,11.91,4.609],[-508.241,192.246,15.5,12.41,3.004],[-764.675,593.779,15.38,14.29,8.058],[-739.421,557.982,11.37,12.09,7.745],[-881.563,583.776,11.46,14.55,12.816],[-719.152,553.896,16.7,12.76,7.191],[-999.681,301.048,15.18,9.77,1.739],[-953.895,681.746,15.05,12.72,5.987],[-506.871,32.124,12.79,12.82,3.565],[-983.606,258.013,13.58,13.02,1.713],[-534.815,341.597,16.74,14.65,2.21],[-861.521,-7.324,11.17,12.5,1.562],[-897.745,592.445,12.4,14.15,12.331],[-878.918,714.492,15.93,11.6,5.737],[-535.379,383.378,11.32,9.01,2.264],[-762.248,460.476,12.28,9.18,6.963],[-520.656,309.267,16.4,9.35,2.129],[-780.845,270.084,15.31,13.03,2.854],[-877.079,228.963,11.95,14.46,2.171],[-507.399,341.643,14.73,14.24,1.953],[-745.108,583.971,11.44,10.76,7.61],[-858.394,305.879,14.79,10.97,2.741],[-741.481,441.088,16.34,13.19,6.107],[-672.182,71.875,15.79,12.93,4.567],[-856.85,339.571,11.1,13.15,3.307],[-839.137,301.847,15.59,11.63,2.837],[-700.483,559.022,13.58,10.43,6.651],[-533.483,149.106,13.42,12.21,4.225],[-857.921,156.289,13.52,12.12,2.156],[-744.141,418.797,13.15,10.2,5.541],[-838.66,190.44,13.01,9.66,2.205],[-678.758,40.435,14.36,10.6,3.839],[-699.611,521.607,13.58,13.58,6.652],[-861.636,187.552,16.25,14.09,2.17],[-860.149,226.722,11.58,9.7,2.23],[-507.081,382.037,16.7,13.14,2.001],[-999.705,336.644,16.27,12.51,1.874],[-649.179,-3.118,14.07,9.29,3.883],[-506.283,77.808,13.67,14.56,3.738],[-505.287,107.736,11.24,12.59,3.732],[-822.038,-179.974,11.93,9.08,2.15],[-680.882,-220.023,14.52,10.67,2.512],[-744.285,-186.044,11.77,13.05,2.207],[-898.396,-452.881,12.09,13.36,1.973],[-843.134,-107.455,11.66,10.31,2.08],[-759.919,-575.941,14.55,11.88,2.057],[-863.053,-416.916,14.86,12.04,0.653],[-761.153,-601.959,14.41,13.82,1.918],[-763.662,-621.029,11.17,12.5,1.839],[-780.296,-224.007,15.38,9.55,2.381],[-745.035,-215.583,11.68,9.84,2.413],[-720.569,-217.424,13.77,9.48,2.463],[-840.119,-138.672,14.78,13.49,2.098],[-927.94,-343.514,15.18,9.77,1.672],[-782.691,-621.036,16.29,12.05,1.849],[-900.031,-323.427,16.23,12.07,1.847],[-804.159,-142.874,15.13,14.18,2.039],[-826.356,-211.876,16.78,12.29,2.213],[-803.937,-98.539,14.86,12.56,0.896],[-859.211,-72.167,13.02,14.34,2.15],[-824.384,-98.848,13.41,11.82,1.677],[-720.183,-174.722,13.55,10.02,1.325],[-786.066,-603.039,15.05,12.19,1.913],[-677.461,-257.58,12.27,11.38,2.872],[-843.442,-179.645,15.33,13.29,2.141],[-801.811,-217.483,15.82,13.29,2.292],[-806.048,-176.975,11.05,12.37,2.148],[-699.338,-211.584,13.55,11.19,2.442],[-882.44,-408.878,12.89,9.68,1.934],[369.728,-541.145,18.85,17.34,1.084],[284.381,-479.222,21.94,18.03,2.098],[74.995,-505.172,19.78,20.06,2.055],[72.575,-480.132,19.74,17.83,1.955],[253.005,-507.872,18.7,19.8,1.162],[252.118,-479.003,22.34,23.08,2.014],[72.949,-539.41,23.22,19.1,2.202],[371.737,-511.985,17.42,18.49,1.124],[162.549,-481.412,15.46,23.5,1.888],[387.394,361.013,17.75,20.38,0.307],[509.393,-179.256,17.57,19.2,4.256],[-777.869,-648.603,20.06,22.28,1.767],[-751.132,-689.734,20.74,18.82,1.679],[-873.643,-731.232,16.56,24.4,2.254],[-722.172,-645.927,22.8,20.94,1.917],[-943.296,-522.496,24.41,17.07,1.77],[-808.252,-768.85,24.38,18.19,1.845],[-778.15,-811.205,24.64,19.64,1.76],[-921.501,-771.998,21.93,17.1,1.77],[-750.383,-647.584,20.19,24.06,1.769],[-812.945,-649.832,22.56,19.17,1.889],[-721.858,-688.146,17.42,13.96,1.803],[-717.981,-568.724,17.75,23.93,2.328],[-809.403,-809.746,22.63,17.18,1.713],[-781.725,-688.125,26.84,17.73,1.702],[427.247,635.051,19.96,16.14,2.04],[1038.506,-392.158,11.17,10.08,3.262],[1081.141,-596.174,11.11,14.1,1.885],[1099.619,-620.288,14.17,13.6,1.906],[1040.88,-327.497,15.61,12.51,4.046],[1082.318,-328.223,14.13,11.43,6.072],[1080.786,-644.968,13.13,13.67,1.768],[1061.55,-333.491,12.24,14.03,5.093],[1059.362,-624.223,16.62,14.17,1.723],[1060.524,-643.457,14.01,13.47,1.675],[1121.728,-322.384,11.09,10.09,5.644],[1079.02,-616.118,13.67,11.5,1.822]];
const padCells=new Map(),roadCells=new Map();
const key=(x,z)=>Math.floor(x/CELL)+','+Math.floor(z/CELL);
function insert(cells,obj,x0,x1,z0,z1){
 for(let i=Math.floor(x0/CELL);i<=Math.floor(x1/CELL);i++)
  for(let j=Math.floor(z0/CELL);j<=Math.floor(z1/CELL);j++){
   const k=i+','+j;let arr=cells.get(k);if(!arr){arr=[];cells.set(k,arr);}arr.push(obj);
  }
}
for(let i=0;i<padData.length;i++){
 const p=padData[i],x=p[0],z=p[1],rx=p[2]*.5+14,rz=p[3]*.5+14;
 insert(padCells,p,x-rx,x+rx,z-rz,z+rz);
}
let roadSegmentCount=0;
for(const road of G.roads){
 if(!road.points||road.points.length<2)continue;
 const pts=road.points,half=road.width*.5,margin=half+24;
 for(let i=1;i<pts.length;i++){
  const a=pts[i-1],b=pts[i],dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz;
  if(len2<.01)continue;
  const o={ax:a.x,az:a.z,dx,dz,len2,half};
  insert(roadCells,o,Math.min(a.x,b.x)-margin,Math.max(a.x,b.x)+margin,
    Math.min(a.z,b.z)-margin,Math.max(a.z,b.z)+margin);
  roadSegmentCount++;
 }
}
const EMPTY=[];
let samplingOriginalFootprints=false;
function roadProtection(x,z){
 let distance=Infinity;
 const near=roadCells.get(key(x,z))||EMPTY;
 for(let i=0;i<near.length;i++){
  const r=near[i],t=clamp(((x-r.ax)*r.dx+(z-r.az)*r.dz)/r.len2,0,1);
  const d=Math.hypot(x-r.ax-t*r.dx,z-r.az-t*r.dz)-r.half;
  if(d<distance)distance=d;
 }
 // Do not lift or lower a drivable road, bridge ramp or immediate shoulder.
 return smooth(11,34,distance);
}
function foundationBlend(x,z,originalY){
 const near=padCells.get(key(x,z))||EMPTY;
 let best=0,target=originalY;
 for(let i=0;i<near.length;i++){
  const p=near[i],dx=Math.max(0,Math.abs(x-p[0])-p[2]*.5),dz=Math.max(0,Math.abs(z-p[1])-p[3]*.5);
  const d=Math.hypot(dx,dz),w=1-smooth(0,13,d);
  if(w>best){best=w;target=p[4];}
 }
 return {weight:best,target};
}
const stats={stage:3,footprintPads:padData.length,roadReferenceSegments:roadSegmentCount,
 additionalTerrainVertices:0,terrainTriangleCountChanged:false,newShaderTextureSamples:0,
 newPerFrameTerrainDrawCalls:0,waterlineNotChanged:true,roadsAndBridgesNotMoved:true};
function surveyedTerrain(x,z,legacy){
 const old=original(x,z,legacy);
 if(globalThis.__SUNSET_CITY20_DISABLE_STAGE03===true||samplingOriginalFootprints)return old;
 if(G.keepLegacy(x,z)||G.keepMarina(x,z)||G.flattenAir(x,z)||
    H.onCorePavement463?.(x,z))return old;
 const shore=R.coast(x,z);
 if(shore<=0.30)return old; // never displace submerged ground / waterline
 const road=roadProtection(x,z);
 if(road<.00001)return old;
 const nearbyPads=padCells.get(key(x,z))||EMPTY;
 let padWeight=0,padTarget=old;
 for(let i=0;i<nearbyPads.length;i++){
  const p=nearbyPads[i];
  const dx=Math.max(0,Math.abs(x-p[0])-p[2]*.5);
  const dz=Math.max(0,Math.abs(z-p[1])-p[3]*.5);
  const weight=1-smooth(0,13,Math.hypot(dx,dz));
  if(weight>padWeight){padWeight=weight;padTarget=p[4];}
 }
 // Reference-following bank and low hill profiles. These remain small and
 // smooth near the shoreline, and vanish outside their intended contour band.
 const wet=x>170&&x<710&&z< -480;
 const beach=R.sandAt(x,z,shore)>.52;
 const canal=x< -480&&z> -530&&z<790;
 const biome=beach?.23:wet?.70:canal?.80:1.0;
 const shoreRise=smooth(.8,26,shore)*(1-smooth(69,143,shore));
 const longRelief=Math.sin(x*.013+z*.005)*Math.cos(z*.014-x*.002)*.73+
     Math.sin(z*.025-x*.006)*.24+Math.cos((x+z)*.009)*.21;
 const undulation=(.30+.25*Math.sin(x*.008-z*.007)) *
     smooth(11,40,shore)*(1-smooth(150,236,shore));
 const natural=(.36*shoreRise+longRelief*undulation)*biome;
 const terrain=old+clamp(natural,-.57,.66)*road*(1-padWeight);
 // A locally level, smoothly feathered foundation platform. Preserve the
 // exact original elevation at the site center and avoid changing roads.
 const flattened=terrain+(padTarget-terrain)*padWeight*road;
 return clamp(flattened,old-1.50,old+1.50);
}
G.surface=surveyedTerrain;
function addFootings(w){
 if(w.city20Stage03Stats)return w.city20Stage03Stats;
 if(!Array.isArray(w.city20DistrictBuildings)||w.city20DistrictBuildings.length!==padData.length)
   throw Error('CITY20 stage03 requires all 130 original Stage 02 footprints, got '+(w.city20DistrictBuildings?.length));
 let placed=0,deepest=0,oversize=0;
 const pal={villa:'#a8a59b',tower:'#737d7c',warehouse:'#8b8983',civic:'#a5aba5',
   midrise:'#9ca49e',resort:'#c4bca8',service:'#9a9e9a'};
 for(const spec of w.city20DistrictBuildings){
  const x=spec.x,z=spec.z,hw=spec.width*.46,hd=spec.depth*.46;
  let min=Infinity,max=-Infinity;
  for(const [dx,dz] of [[0,0],[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd],[hw,0],[-hw,0],[0,hd],[0,-hd]]){
   const y=H.outdoorHeight(x+dx,z+dz);min=Math.min(min,y);max=Math.max(max,y);
  }
  const top=spec.baseY+.19;
  // The pier is visually flush with the existing building shell, while its
  // bottom is buried even on gently sloping banks. Not a new collision solid.
  const bottom=Math.min(min-.26,top-.30);
  const h=top-bottom;
  const b=H.box(x,(top+bottom)*.5,z,spec.width+.24,h,spec.depth+.24,pal[spec.kind]||'#969c91',0,4,0);
  b.material='masonry';b.visibilityCap=1350;b.city20Stage03Footing=true;
  b.city20Stage03Owner=spec.id;
  w.add(b);placed++;deepest=Math.max(deepest,h);
  if(max-min>1.55)oversize++;
 }
 const result={...stats,newFoundations:placed,foundationMaximumDepth:+deepest.toFixed(3),
   steepFootprints:oversize,stage02OriginalBuildings:w.city20DistrictBuildings.length,
   originalPortals:w.entrancePortals.length,originalRoads:w.roads461.length,
   originalLegacyBuildings:w.buildings.length,sameMapLayout:true};
 w.city20Stage03Stats=result;
 return result;
}
H.finishReferenceBuildings469=function finishCity20Stage03(w){
 let r;
 samplingOriginalFootprints=true;
 try { r=finish(w); } finally { samplingOriginalFootprints=false; }
 if(globalThis.__SUNSET_CITY20_DISABLE_STAGE03!==true&&globalThis.__SUNSET_CITY20_DISABLE_STAGE02!==true)addFootings(w);
 return r;
};
H.city20Stage03={stats,roadProtection,foundationBlend,surface:surveyedTerrain};
})(Heatline);
