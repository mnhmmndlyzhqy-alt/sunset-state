/* CITY20 stage09: window bays, inset-looking glazing, facade frames and night tint.
   Render-only geometry, no collision, no portals/roads/mapped positions altered.
   A/B: ?city20facadesOff=1 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
const previous=H.finishReferenceBuildings469;
if(typeof previous!=='function')throw Error('Stage09 requires stage07 pipeline');
function disabled(){return globalThis.__SUNSET_CITY20_DISABLE_STAGE09===true||(typeof location!=='undefined'&&new URLSearchParams(location.search).has('city20facadesOff'));}
function enhance(w){
 if(w.city20Stage09Stats)return w.city20Stage09Stats;
 const buildings=w.city20DistrictBuildings;
 if(!Array.isArray(buildings)||buildings.length!==130||!w.city20Stage07Stats)throw Error('Stage09 requires full Stage07 architecture');
 const before={roads:w.roads461.length,portals:w.entrancePortals.length,solids:w.solids.length,boxes:w.boxes.length};
 const stats={stage:9,buildings:0,windowPanels:0,frames:0,nightLitPanels:0,geometryAdded:0,collisionAdded:0,gpuFpsVerified:false};
 function add(s,kind,x,y,z,width,height,depth,color,material,range){
  if(![x,y,z,width,height,depth].every(Number.isFinite)||Math.min(width,height,depth)<=0)throw Error('Invalid stage09 geometry');
  const b=H.box(x,y,z,width,height,depth,color,0,4,0);
  b.material=material;b.shape='reference_slab469';b.visibilityCap=range;b.lodMax=range;
  b.city20Stage09=true;b.city20Stage09Owner=s.id;b.city20Stage09Kind=kind;
  w.boxes.push(b);
 }
 for(const s of buildings){
  const k=s.kind, tall=k==='tower'||k==='midrise', industrial=k==='warehouse'||k==='service';
  const levels=tall?5:(industrial?2:3);
  const cols=tall?4:(industrial?3:2);
  const facadeZ=s.z+s.depth*.5+.055;
  const panelW=Math.max(.55,Math.min(2.15,s.width/(cols*2.0)));
  const panelH=Math.max(.55,Math.min(1.7,s.height/(levels*2.65)));
  const range=tall?1700:industrial?900:640;
  for(let row=0;row<levels;row++){
   const yy=s.baseY+s.height*(.23+.65*(row+.5)/levels);
   for(let col=0;col<cols;col++){
    const xx=s.x+s.width*((col+.5)/cols-.5)*.77;
    const lit=((row*11+col*7+s.id.length*3)%7)<2;
    const tint=lit?'#a9a18a':(industrial?'#536c72':'#547e90');
    add(s,'glazing',xx,yy,facadeZ,panelW,panelH,.09,tint,'glass',range);
    add(s,'window_header',xx,yy+panelH*.55,facadeZ+.025,panelW+.19,.11,.13,'#a6a6a1','anodized471',range);
    stats.windowPanels++;stats.frames++;if(lit)stats.nightLitPanels++;
   }
  }
  // Structural vertical mullions at the outer edges of the primary facade.
  if(tall){for(const side of [-1,1]){
   add(s,'facade_mullion',s.x+side*s.width*.385,s.baseY+s.height*.56,facadeZ+.04,.13,s.height*.69,.15,'#737e85','anodized471',range);
   stats.frames++;
  }}
  stats.buildings++;
 }
 stats.geometryAdded=w.boxes.length-before.boxes;
 if(w.roads461.length!==before.roads||w.entrancePortals.length!==before.portals||w.solids.length!==before.solids)throw Error('Stage09 changed gameplay geometry');
 w.city20Stage09Stats=stats;return stats;
}
H.finishReferenceBuildings469=function stage09Finish(w){const result=previous(w);if(!disabled())enhance(w);return result;};
H.city20Stage09={enhance,disabled};
})(Heatline);
