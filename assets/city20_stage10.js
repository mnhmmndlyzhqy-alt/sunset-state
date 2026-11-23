/* CITY20 stage10: render-only doorway architectural detailing around existing portals.
   No changes to door state, interior readiness, collisions or traversal.
   A/B ?city20entriesOff=1 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
const prior=H.finishReferenceBuildings469;
if(typeof prior!=='function')throw Error('Stage10 requires previous building pipeline');
const disabled=()=>globalThis.__SUNSET_CITY20_DISABLE_STAGE10===true||(typeof location!=='undefined'&&new URLSearchParams(location.search).has('city20entriesOff'));
function enhance(w){
 if(w.city20Stage10Stats)return w.city20Stage10Stats;
 if(!w.city20Stage09Stats||!Array.isArray(w.entrancePortals))throw Error('Stage10 requires stage09 and portals');
 const before={boxes:w.boxes.length,solids:w.solids.length,roads:w.roads461.length,portals:w.entrancePortals.length};
 const stats={stage:10,portalsDetailed:0,readyPortals:0,unreadyPortals:0,frames:0,canopies:0,thresholds:0,lamps:0,geometryAdded:0,collisionsAdded:0,gpuFpsVerified:false};
 function part(p,kind,x,y,z,ww,hh,dd,color,material,range){
  if(![x,y,z,ww,hh,dd].every(Number.isFinite)||Math.min(ww,hh,dd)<=0)throw Error('Stage10 invalid geometry');
  const b=H.box(x,y,z,ww,hh,dd,color,0,4,0);b.shape='reference_slab469';b.material=material;b.visibilityCap=range;b.lodMax=range;
  b.city20Stage10=true;b.city20Stage10Portal=p.id;b.city20Stage10Kind=kind;w.boxes.push(b);
 }
 for(const p of w.entrancePortals){
  if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||!Number.isFinite(p.width)||p.width<=0)continue;
  const ground=typeof H.outdoorHeight==='function'?H.outdoorHeight(p.x,p.z):0;
  if(!Number.isFinite(ground))continue;
  const half=Math.min(2.6,Math.max(.6,p.width*.5));
  const isNorth=p.facing==='north'||!p.facing;
  const isSouth=p.facing==='south';
  const axisX=!isNorth&&!isSouth;
  const sign=isSouth?1:(isNorth?-1:(p.facing==='east'?1:-1));
  const dx=axisX?sign:0,dz=axisX?0:sign;
  const side=(v)=>axisX?{x:p.x,z:p.z+v}:{x:p.x+v,z:p.z};
  const forward=(dist)=>({x:p.x+dx*dist,z:p.z+dz*dist});
  const ready=p.interiorReady===true;
  const trim=ready?'#b8b9b0':'#879398';
  // Thin exterior jambs flank the existing opening; center is deliberately clear.
  for(const s of [-1,1]){
   const pt=side(s*(half+.14));
   part(p,'jamb',pt.x,ground+1.55,pt.z,axisX?.24:.19,3.05,axisX?.19:.24,trim,'anodized471',440);stats.frames++;
  }
  const header=forward(.10);
  part(p,'lintel',header.x,ground+3.17,header.z,axisX?.28:half*2+.42,.25,axisX?half*2+.42:.28,trim,'concrete',530);stats.frames++;
  const canopy=forward(.50);
  part(p,'canopy',canopy.x,ground+3.49,canopy.z,axisX?1.25:half*2+.8,.19,axisX?half*2+.8:1.25,'#aeb9b8','metal',430);stats.canopies++;
  const step=forward(.62);
  part(p,'threshold',step.x,ground+.055,step.z,axisX?.72:half*1.75,.11,axisX?half*1.75:.72,'#a3a7a0','concrete',320);stats.thresholds++;
  // Emissive-looking fixture is visual only: does not introduce a real light source.
  if(ready){const fixture=side(half+.42),f={x:fixture.x+dx*.18,z:fixture.z+dz*.18};
   part(p,'sconce',f.x,ground+2.58,f.z,.20,.33,.20,'#d7c6a0','light_emissive',300);stats.lamps++;stats.readyPortals++;
  }else stats.unreadyPortals++;
  stats.portalsDetailed++;
 }
 stats.geometryAdded=w.boxes.length-before.boxes;
 if(w.solids.length!==before.solids||w.roads461.length!==before.roads||w.entrancePortals.length!==before.portals)throw Error('Stage10 modified traversal systems');
 w.city20Stage10Stats=stats;return stats;
}
H.finishReferenceBuildings469=function stage10Finish(w){const result=prior(w);if(!disabled())enhance(w);return result;};
H.city20Stage10={enhance,disabled};
})(Heatline);
