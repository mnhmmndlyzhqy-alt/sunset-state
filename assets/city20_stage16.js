/* CITY20 stage16: low-cost public greenery; visual only, preserves navigation geometry. */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
const prior=H.finishReferenceBuildings469;
if(typeof prior!=='function')throw Error('Stage16 requires stage15');
const disabled=()=>globalThis.__SUNSET_CITY20_DISABLE_STAGE16===true||(typeof location!=='undefined'&&new URLSearchParams(location.search).has('city20greenOff'));
function enhance(w){
 if(w.city20Stage16Stats)return w.city20Stage16Stats;
 if(!w.city20Stage15Stats||!Array.isArray(w.entrancePortals))throw Error('Stage16 requires stage15');
 const start={boxes:w.boxes.length,solids:w.solids.length,roads:w.roads461.length,portals:w.entrancePortals.length};
 const stats={stage:16,treeClusters:0,trees:0,shrubs:0,planterGreens:0,geometryAdded:0,collisionsAdded:0,roadsChanged:0,portalsChanged:0,gpuFpsVerified:false};
 const add=(kind,x,y,z,width,height,depth,color,material,range,portalId=null)=>{
  if(![x,y,z,width,height,depth].every(Number.isFinite)||Math.min(width,height,depth)<=0)throw Error('Stage16 invalid geometry');
  const b=H.box(x,y,z,width,height,depth,color,0,4,0);b.shape='reference_slab469';b.material=material;b.visibilityCap=range;b.lodMax=range;b.city20Stage16=true;b.city20Stage16Kind=kind;if(portalId!==null)b.city20Stage16Portal=portalId;w.boxes.push(b);
 };
 const h=(x,z)=>typeof H.outdoorHeight==='function'?H.outdoorHeight(x,z):0;
 // Small plant variety at existing entrance-side planters. Never occupies the center walkway.
 for(let i=0;i<w.entrancePortals.length;i++){
  const p=w.entrancePortals[i];if(![p.x,p.z,p.width].every(Number.isFinite)||p.width<1.1)continue;
  const face=['north','south','east','west'].includes(p.facing)?p.facing:'north',axisX=face==='east'||face==='west',sign=face==='south'||face==='east'?1:-1;
  const lateral=Math.max(2.25,Math.min(4.4,p.width*.5+1.05));
  for(const side of [-1,1]){
   const x=p.x+(axisX?sign*1.45:side*lateral),z=p.z+(axisX?side*lateral:sign*1.45),y=h(x,z);
   if(!Number.isFinite(y))continue;
   const variant=(i*7+(side+1)*3)%5;
   add('planter-shrub',x,y+.94,z,.34+variant*.04,.42+variant*.08,.34+variant*.04,['#456e3f','#65804b','#4b7450','#6a8248','#527547'][variant],'foliage',110,p.id);stats.planterGreens++;
  }
 }
 // Public garden hubs already present in the world; avoid adding colliders or changing paths.
 const hubs=Array.isArray(w.explorationHubs)?w.explorationHubs.filter(p=>p&&['garden','park','nature','scenic'].includes(p.kind)&&Number.isFinite(p.x)&&Number.isFinite(p.z)).slice(0,24):[];
 for(let i=0;i<hubs.length;i++){
  const p=hubs[i];stats.treeClusters++;
  for(let j=0;j<4;j++){
   const angle=(j*2.399963+i*1.618),r=9+j*2.2,x=p.x+Math.cos(angle)*r,z=p.z+Math.sin(angle)*r,y=h(x,z);
   if(!Number.isFinite(y))continue;
   const scale=.82+((i*13+j*7)%7)*.09;
   add('tree-trunk',x,y+1.45*scale,z,.34*scale,2.9*scale,.34*scale,'#685444','wood',180);
   add('tree-crown',x,y+3.35*scale,z,2.6*scale,2.6*scale,2.6*scale,['#426d40','#567c4b','#65844d','#4c7450'][j],'foliage',175);
   stats.trees++;
  }
  for(let j=0;j<5;j++){
   const a=j*1.256637+i*.8,x=p.x+Math.cos(a)*5.6,z=p.z+Math.sin(a)*5.6,y=h(x,z);
   if(!Number.isFinite(y))continue;
   add('garden-shrub',x,y+.48,z,.85,.96,.85,j%2?'#5c7c4d':'#4e744a','foliage',120);stats.shrubs++;
  }
 }
 stats.geometryAdded=w.boxes.length-start.boxes;
 if(w.solids.length!==start.solids||w.roads461.length!==start.roads||w.entrancePortals.length!==start.portals)throw Error('Stage16 mutated gameplay geometry');
 w.city20Stage16Stats=stats;return stats;
}
H.finishReferenceBuildings469=function stage16Finish(w){const r=prior(w);if(!disabled())enhance(w);return r;};
H.city20Stage16={enhance,disabled};
})(Heatline);
