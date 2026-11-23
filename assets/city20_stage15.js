/* CITY20 stage15: street-level frontage details. Visual-only; no route or portal mutation. */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
const prior=H.finishReferenceBuildings469;
if(typeof prior!=='function')throw Error('Stage15 requires stage14');
const disabled=()=>globalThis.__SUNSET_CITY20_DISABLE_STAGE15===true||(typeof location!=='undefined'&&new URLSearchParams(location.search).has('city20streetOff'));
function enhance(w){
 if(w.city20Stage15Stats)return w.city20Stage15Stats;
 if(!w.city20Stage14Stats||!Array.isArray(w.entrancePortals))throw Error('Stage15 requires stage14');
 const original={boxes:w.boxes.length,solids:w.solids.length,portals:w.entrancePortals.length,roads:w.roads461.length};
 const stats={stage:15,portalsScanned:0,frontagesDetailed:0,planters:0,bollards:0,lightPosts:0,curbEdges:0,geometryAdded:0,collisionsAdded:0,roadRoutesChanged:0,portalsChanged:0,gpuFpsVerified:false};
 function add(p,kind,x,y,z,width,height,depth,color,material,range){
  if(![x,y,z,width,height,depth].every(Number.isFinite)||Math.min(width,height,depth)<=0)throw Error('Stage15 invalid geometry');
  const b=H.box(x,y,z,width,height,depth,color,0,4,0);b.shape='reference_slab469';b.material=material;b.visibilityCap=range;b.lodMax=range;b.city20Stage15=true;b.city20Stage15Portal=p.id;b.city20Stage15Kind=kind;w.boxes.push(b);
 }
 for(const p of w.entrancePortals){
  stats.portalsScanned++;
  if(![p.x,p.z,p.width].every(Number.isFinite)||p.width<1.1)continue;
  const ground=typeof H.outdoorHeight==='function'?H.outdoorHeight(p.x,p.z):0;
  if(!Number.isFinite(ground))continue;
  const face=['north','south','east','west'].includes(p.facing)?p.facing:'north';
  const axisX=face==='east'||face==='west',sign=face==='south'||face==='east'?1:-1;
  const lateral=Math.max(2.25,Math.min(4.4,p.width*.5+1.05));
  const loc=(side,forward)=>({x:p.x+(axisX?sign*forward:side),z:p.z+(axisX?side:sign*forward)});
  // All elements stay on the flanks, leaving a clear central access corridor.
  for(const side of [-1,1]){
   const a=loc(side*lateral,1.45);
   add(p,'planter-base',a.x,ground+.24,a.z,.64,.48,.64,'#8d8b7e','stone',165);
   add(p,'plant-canopy',a.x,ground+.83,a.z,.55,.68,.55,side===1?'#58754c':'#607d51','foliage',135);
   stats.planters++;
   const b=loc(side*(lateral+.95),1.65);
   add(p,'safety-bollard',b.x,ground+.43,b.z,.17,.86,.17,'#686e70','metal',140);stats.bollards++;
  }
  const c=loc(0,2.65);
  // Thin curb accent is a short frontage element, not a new road or crossing.
  add(p,'curb-accent',c.x,ground+.09,c.z,axisX?.20:Math.max(2.4,p.width+.7),.18,axisX?Math.max(2.4,p.width+.7):.20,'#a4a39b','stone',185);stats.curbEdges++;
  if(stats.portalsScanned%3===0){
   const l=loc(lateral+1.55,2.1);
   add(p,'streetlamp-post',l.x,ground+1.62,l.z,.14,3.24,.14,'#555d61','metal',215);
   add(p,'streetlamp-head',l.x,ground+3.24,l.z,.56,.18,.56,'#e4d6a6','glass',215);
   stats.lightPosts++;
  }
  stats.frontagesDetailed++;
 }
 stats.geometryAdded=w.boxes.length-original.boxes;
 if(w.solids.length!==original.solids||w.roads461.length!==original.roads||w.entrancePortals.length!==original.portals)throw Error('Stage15 mutated gameplay geometry');
 w.city20Stage15Stats=stats;return stats;
}
H.finishReferenceBuildings469=function stage15Finish(w){const r=prior(w);if(!disabled())enhance(w);return r;};
H.city20Stage15={enhance,disabled};
})(Heatline);
