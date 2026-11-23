/* Visual quality recovery 1/7: facade depth cues, material variation and restrained architectural details.
   Visual-only, deterministic and reversible: ?visualRecovery1Off=1 */
var Heatline=globalThis.Heatline||{};
(function(H){'use strict';
const prior=H.finishReferenceBuildings469;
if(typeof prior!=='function')throw Error('Visual recovery 1 requires CITY20');
const disabled=()=>globalThis.__SUNSET_VISUAL_RECOVERY1_OFF===true||(typeof location!=='undefined'&&new URLSearchParams(location.search).has('visualRecovery1Off'));
function enhance(w){
 if(w.visualRecovery1Stats)return w.visualRecovery1Stats;
 if(!w.city20Stage09Stats||!Array.isArray(w.boxes)||!Array.isArray(w.city20DistrictBuildings))throw Error('Missing CITY20 facades');
 const initial={boxes:w.boxes.length,solids:w.solids.length,roads:w.roads461.length,portals:w.entrancePortals.length};
 const stats={phase:1,buildings:0,windows:0,reveals:0,spandrels:0,cornerDetails:0,added:0,collidersAdded:0,roadsChanged:0,portalsChanged:0,actualWallCutouts:false,gpuVerified:false};
 const owners=new Map(w.city20DistrictBuildings.map(s=>[s.id,s]));
 const windows=w.boxes.filter(b=>b.city20Stage09Kind==='glazing'&&owners.has(b.city20Stage09Owner));
 function add(owner,kind,x,y,z,dx,dy,dz,color,material,range){
  if(![x,y,z,dx,dy,dz].every(Number.isFinite)||Math.min(dx,dy,dz)<=0)throw Error('Invalid visual recovery geometry');
  const b=H.box(x,y,z,dx,dy,dz,color,0,4,0);
  b.shape='reference_slab469';b.material=material;b.visibilityCap=range;b.lodMax=range;
  b.visualRecovery1=true;b.visualRecovery1Kind=kind;b.visualRecovery1Owner=owner;
  w.boxes.push(b);return b;
 }
 for(const panel of windows){
  const owner=owners.get(panel.city20Stage09Owner);
  if(!owner)continue;
  const width=panel.w??panel.width, height=panel.h??panel.height;
  // H.box may expose dimensions as sx/sy/sz. Use known stage09 layout instead of relying on renderer internals.
  const tall=owner.kind==='tower'||owner.kind==='midrise';
  const industrial=owner.kind==='warehouse'||owner.kind==='service';
  const cols=tall?4:industrial?3:2,levels=tall?5:industrial?2:3;
  const pw=Math.max(.55,Math.min(2.15,owner.width/(cols*2.0)));
  const ph=Math.max(.55,Math.min(1.7,owner.height/(levels*2.65)));
  const z=owner.z+owner.depth*.5+.055;
  const range=tall?1150:industrial?750:520;
  // Shallow dark reveals sit behind a brighter rim. This is a depth cue, not a real wall opening.
  const px=panel.x,py=panel.y;
  if(!Number.isFinite(px)||!Number.isFinite(py))continue;
  const frameColor=industrial?'#6e7778':tall?'#a3a6a4':'#9d9487';
  add(owner.id,'left-reveal',px-pw*.51,py,z+.095,.09,ph+.14,.16,'#333f45','concrete',range);
  add(owner.id,'right-reveal',px+pw*.51,py,z+.095,.09,ph+.14,.16,'#333f45','concrete',range);
  add(owner.id,'bottom-sill',px,py-ph*.53,z+.15,pw+.18,.11,.30,frameColor,'concrete',range);
  add(owner.id,'glass-highlight',px-pw*.28,py+ph*.09,z+.115,.035,ph*.62,.025,'#9cb6b7','glass',Math.min(range,340));
  stats.windows++;stats.reveals+=4;
 }
 for(const owner of w.city20DistrictBuildings){
  if(![owner.x,owner.z,owner.width,owner.depth,owner.baseY,owner.height].every(Number.isFinite))continue;
  const tall=owner.kind==='tower'||owner.kind==='midrise';
  const industrial=owner.kind==='warehouse'||owner.kind==='service';
  const levels=tall?5:industrial?2:3;
  const z=owner.z+owner.depth*.5+.095;
  const range=tall?900:industrial?600:440;
  const tone=(((owner.id.length+Math.round(owner.x))%3)+3)%3; // Stage39: negative x produced index -1 -> undefined colour -> draw crash (pink screen)
  const stone=['#898a84','#9b988e','#787f81'][tone];
  for(let i=1;i<levels;i++){
   const y=owner.baseY+owner.height*(.23+.65*i/levels);
   add(owner.id,'floor-spandrel',owner.x,y,z,owner.width*.79,.12,.16,stone,'concrete',range);
   stats.spandrels++;
  }
  if(tall){
   for(const side of [-1,1]){
    add(owner.id,'corner-pier',owner.x+side*owner.width*.46,owner.baseY+owner.height*.53,z,.20,owner.height*.79,.20,stone,'concrete',range);
    stats.cornerDetails++;
   }
  }
  stats.buildings++;
 }
 stats.added=w.boxes.length-initial.boxes;
 if(w.solids.length!==initial.solids||w.roads461.length!==initial.roads||w.entrancePortals.length!==initial.portals)throw Error('Visual recovery modified gameplay geometry');
 w.visualRecovery1Stats=stats;return stats;
}
H.finishReferenceBuildings469=function visualRecovery1Finish(w){const result=prior(w);if(!disabled())enhance(w);return result;};
H.visualRecovery1={enhance,disabled};
})(Heatline);
