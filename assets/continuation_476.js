/* SUNSET STATE 4.7.6 — incremental city continuation. All facade changes are
 * non-colliding and performance-gated; the street graph and original geometry
 * remain byte-for-byte the same. Loaded before engine44.js. */
var Heatline = globalThis.Heatline || {};
(function(H){
 'use strict';
 const safe=(v)=>Number.isFinite(v);
 const optional=(w,stage,x,y,z,width,height,depth,color,material='metal',shape='cube',range=240,glow=0)=>{
   if(![x,y,z,width,height,depth].every(safe)||width<=0||height<=0||depth<=0)return null;
   const o=H.box(x,y,z,width,height,depth,color,0,4,glow);
   o.material=material;o.shape=shape;o.stage476Optional=stage;
   o.visibilityCap=range;o.lodMax=range;
   // Intentionally no w.solid(): decoration never obstructs a doorway or car.
   w.add(o);return o;
 };
 const palettes={
   cafe:['#c0a88a','#526e71','#f0d6a2'],gallery:['#adb6b1','#536e7b','#c7dfe0'],
   hotel:['#d9c4a5','#6a817c','#f6dab3'],retail:['#bcae9b','#4e6577','#d7daca'],
   bank:['#b1aea3','#606b74','#c8d5c9'],default:['#b8aaa0','#647a7c','#e6d2aa']
 };
 function buildPilot(w){
   const list=w.retailShops.filter(v=>v.retail&&safe(v.retail.centerX)&&safe(v.retail.frontZ)&&
     safe(v.retail.width)&&v.retail.width>=5&&Math.abs(v.retail.centerX)<205&&
     Math.abs(v.retail.frontZ)<185).sort((a,b)=>Math.hypot(a.x||a.retail.centerX,a.z||a.retail.frontZ)-
                              Math.hypot(b.x||b.retail.centerX,b.z||b.retail.frontZ));
   const counts={shops:0,depthFrames:0,wallLamps:0,overheads:0,tiles:0};
   const used=new Set();
   for(const venue of list){
     if(counts.shops>=8)break;
     const r=venue.retail,x=r.centerX,z=r.frontZ,width=Math.min(9,r.width*.87);
     const id=x.toFixed(2)+':'+z.toFixed(2);if(used.has(id))continue;used.add(id);
     const y=H.outdoorHeight(x,z);
     const theme=palettes[venue.kind]||palettes.default;
     // 3-D shadowed reveal: anchored to the shopfront, not floating across the street.
     const half=width*.5;
     for(const side of [-1,1]){
       const sx=x+side*half;
       optional(w,'pilot',sx,y+2.02,z-.14,.16,3.24,.32,theme[0],'stone','rounded',270);
       optional(w,'pilot',sx-side*.11,y+2.18,z-.19,.055,3.02,.24,theme[1],'metal','cube',265);
       // Wall-mounted luminaires are outside the passage and above head height.
       optional(w,'pilot',sx-side*.12,y+3.38,z-.19,.18,.37,.22,'#4c5454','metal','rounded',255);
       optional(w,'pilot',sx-side*.12,y+3.37,z-.33,.105,.23,.06,theme[2],
         'light_emissive','rounded',260,.20);
       counts.depthFrames+=2;counts.wallLamps++;
     }
     optional(w,'pilot',x,y+3.67,z-.22,width+.18,.18,.38,theme[0],'stone','rounded',320);
     optional(w,'pilot',x,y+3.54,z-.33,width*.73,.10,.06,theme[1],'metal','rounded',310);
     counts.overheads+=2;
     // A shallow porcelain inlay on the threshold, flush with the ground.
     optional(w,'pilot',x,y+.027,z-.68,Math.min(width*.45,3.1),.025,.16,
       '#b5aaa0','paving','cube',135);counts.tiles++;
     counts.shops++;
   }
   return counts;
 }
 function buildDistrict(w){
   const counts={residential:0,hotel:0,office:0,heritage:0,parts:0};
   const seen=new Set();
   const eligible=w.buildings.filter(b=>b&&b.plan463&&safe(b.x+b.z+b.w+b.d+b.h)&&
     b.h>8&&b.w>7&&b.d>6);
   // Deterministic dispersion avoids decorating a whole city block identically.
   for(let n=0;n<eligible.length;n++){
     const b=eligible[n],key=b.x.toFixed(2)+':'+b.z.toFixed(2);
     if(seen.has(key)||n%7!==2)continue;seen.add(key);
     const kind=(b.kind||'').toLowerCase();
     const family=['residential','brick'].includes(kind)?'residential':
       ['hotel'].includes(kind)?'hotel':['heritage'].includes(kind)?'heritage':'office';
     if(counts[family]>=16)continue;
     const y=H.outdoorHeight(b.x,b.z),front=b.z-b.d*.5-.055;
     // 4.7.6 decorations sit on the real wall face, have no collision, and fade
     // before they shrink below a pixel. Building shells stay visible at altitude.
     const accent=family==='residential'?'#978777':family==='hotel'?'#bca67b':
       family==='heritage'?'#9d7967':'#8f9fa2';
     for(const side of [-1,1]){
       const x=b.x+side*b.w*.27;
       const trim=optional(w,'district',x,y+5.45,front-.08,.125,1.17,.16,accent,
         family==='residential'?'wood':'metal','rounded',230);
       if(trim)counts.parts++;
       if(family==='residential'){
         optional(w,'district',x,y+4.70,front-.29,1.26,.16,.36,'#867565','stone','rounded',152);
         optional(w,'district',x,y+4.92,front-.30,1.06,.34,.31,'#608052','foliage','urban_crown',150);
         counts.parts+=2;
       } else if(family==='hotel'){
         optional(w,'district',x,y+5.50,front-.19,.075,.85,.08,'#e5cf9e','light_emissive','cube',210,.13);
         counts.parts++;
       }else{
         optional(w,'district',x,y+5.45,front-.12,.062,.84,.18,'#425f6a','metal','cube',215);
         counts.parts++;
       }
     }
     counts[family]++;
   }
   return counts;
 }
 // Finish the existing city FIRST so late-stage facade cleaners cannot eat
 // the new shop fittings. Nothing moves the map, sidewalks, portals or roads.
 const priorFinish=H.finishReferenceBuildings469;
 if(typeof priorFinish!=='function')throw Error('4.7.6 requires reference_buildings_469.js');
 H.finishReferenceBuildings469=function(world){
   const original=priorFinish.apply(this,arguments);
   const count=world.boxes.length;
   const pilot=buildPilot(world),district=buildDistrict(world);
   world.stage476={pilot,district,decorations:world.boxes.length-count};
   return original;
 };
 // Lobby polish is lazy: it is created only if a floor is visited. The central
 // doorway, lift landing and corridor remain empty; no new collision solids.
 const priorInterior=H.polishInterior461;
 if(typeof priorInterior!=='function')throw Error('4.7.6 requires finish_461.js');
 H.polishInterior461=function(scene,plan,floor){
   const r=priorInterior.apply(this,arguments);
   if(floor!==0||!r?.bounds||!Array.isArray(r.boxes))return r;
   const b=r.bounds,depth=b.zmax-b.zmin,width=b.xmax-b.xmin;
   if(width<7||depth<7)return r;
   const cy=(plan.floorHeight||4.2)*floor;
   const center=(b.xmin+b.xmax)*.5;
   const make=(x,y,z,w,h,d,color,material='metal',glow=0)=>{
     const o=H.box(x,y,z,w,h,d,color,0,4,glow);o.material=material;
     o.stage476Optional='lobby';o.lodMax=165;r.boxes.push(o);return o;
   };
   const modern=plan.materialFamily==='glass'||plan.materialFamily==='tech';
   const metal=modern?'#728b92':'#997c61';
   const light=modern?'#e2e7dc':'#f2dbb6';
   // These inset wall strips read as architectural depth without occluding
   // navigation. No extra real-time light sources are allocated.
   for(const side of [-1,1]){
     const sx=side<0?b.xmin+.14:b.xmax-.14;
     make(sx,cy+2.76,b.zmin+Math.min(depth*.45,4.7),.065,.12,
       Math.min(6.7,depth*.36),metal);
     make(sx,cy+2.95,b.zmin+Math.min(depth*.45,4.7),.082,.10,
       Math.min(6.5,depth*.34),light,'light_emissive',.15);
   }
   make(center,cy+3.66,b.zmin+.17,Math.min(3.35,width*.34),.14,.08,metal);
   make(center,cy+3.48,b.zmin+.21,Math.min(2.72,width*.30),.095,.075,light,'light_emissive',.19);
   r.stage476Lobby={pieces:6,noNewSolids:true};
   return r;
 };
 // An optional connected, replayable vehicle-delivery activity; the underlying
 // theft, pursuit, traffic and legitimate car-selling systems are untouched.
 class MarketRoute476{
   constructor(game){this.g=game;this.state='ready';this.car=null;this.at=-Infinity;
     this.enabled=false;this.lastDistance=null;this.completed=0;this.failed=0;this.previousTarget=null;
     this.panel=document.getElementById('delivery-route476');this.title=document.getElementById('delivery-title476');
     this.copy=document.getElementById('delivery-copy476');
     document.getElementById('delivery-retry476')?.addEventListener('click',()=>this.restart());
   }
   setEnabled(on){this.enabled=on===true;if(!this.enabled){this.panel.hidden=true;}else this.updatePanel();}
   restart(){this.restoreNavigation();this.state='ready';this.car=null;this.at=-Infinity;this.updatePanel();
     this.g.showInfo('מסלול הרכב זמין: קח רכב מהרחוב ונווט למגרש המכירה',4.5);}
   restoreNavigation(){
     const nav=this.g.nav445;
     if(nav?.target?.name==='מסירת רכב · מגרש המכירה'){
       nav.target=this.previousTarget;nav.lastPlan=-100;nav.route=null;
     }
     this.previousTarget=null;
   }
   onEnter(car){
     if(!this.enabled||!car||car.market44!=='stolen')return;
     if(this.state==='delivery'){
       if(this.car===car)return;
       this.fail('החלפת רכב · מתחיל מסלול חדש');
     }
     this.car=car;this.state='delivery';this.at=this.g.seconds;
     const depot=this.g.world.stage44Depot||this.g.world.yard445;
     if(depot&&this.g.nav445){
       // Navigator's existing road graph calculates the actual route.
       this.previousTarget=this.g.nav445.target?.name==='מסירת רכב · מגרש המכירה'?
         this.previousTarget:this.g.nav445.target;
       this.g.nav445.target={x:depot.x,z:depot.z,level:0,name:'מסירת רכב · מגרש המכירה'};
       this.g.nav445.lastPlan=-100;
     }
     this.g.showInfo('🚘 מסלול מסירת רכב החל · סע למגרש המכירה ועצור לפני המסירה',5);
     this.updatePanel();
   }
   onSold(car){
     if(!this.enabled||this.state!=='delivery'||car!==this.car)return;
     this.state='completed';this.completed++;this.car=null;this.restoreNavigation();
     this.g.showInfo('המסלול הושלם! הרכב נמכר דרך מערכת המסחר הקיימת',5);
     this.updatePanel();
   }
   fail(reason){if(this.state!=='delivery')return;
     this.state='failed';this.failed++;this.car=null;this.restoreNavigation();this.g.showInfo(reason,4.0);this.updatePanel();}
   tick(){
     if(!this.enabled||this.state!=='delivery')return;
     if(!this.car||!this.car.alive||this.car.wrecked||this.car.hp<12){
       this.fail('הרכב אינו כשיר למסירה · אפשר לנסות שוב');return;
     }
     const depot=this.g.world.stage44Depot||this.g.world.yard445;
     if(depot){const d=Math.hypot(this.car.x-depot.x,this.car.z-depot.z);
       if(!Number.isFinite(this.lastDistance)||Math.abs(d-this.lastDistance)>20){this.lastDistance=d;this.updatePanel();}}
   }
   updatePanel(){
     if(!this.panel)return;
     const visible=this.enabled&&['delivery','completed','failed'].includes(this.state);
     this.panel.hidden=!visible;if(!visible)return;
     const labels={delivery:'🚘 מסירת רכב',completed:'✅ מסלול הושלם',failed:'↻ נסה שוב'};
     this.title.textContent=labels[this.state];
     this.copy.textContent=this.state==='delivery'?
       'סע למגרש הרכבים, עצור ומכור עם I. התנועה והמשטרה פועלות כרגיל.':
       this.state==='completed'?'המסירה והתגמול בוצעו. אפשר לקחת רכב נוסף.':'נסה עם רכב אחר. ההתקדמות האחרת נשמרה.';
     const button=document.getElementById('delivery-retry476');if(button)button.hidden=this.state==='delivery';
   }
   summary(){return {enabled:this.enabled,state:this.state,completed:this.completed,failed:this.failed};}
 }
 H.MarketRoute476=MarketRoute476;
})(Heatline);
