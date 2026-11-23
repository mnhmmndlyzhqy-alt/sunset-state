'use strict';
/* SUNSET STATE Stage17 integration and regression, real Game and world data.
 * Render backend / HUD canvas mocked; NOT WebGL or native FPS validation. */
const fs=require('fs'),assert=require('assert');
const {H,g}=require('./stage05_bootstrap.cjs'),w=g.world;
let tests=0,passed=0;const failed=[];
const ok=(name,success,extra)=>{
 tests++;if(success)passed++;else {failed.push({name,extra});if(failed.length<18)console.error('FAIL',name,JSON.stringify(extra)?.slice(0,240));}
};
const mode=w.stage17RetailStats;const contracts=w.stage17VenueContracts||[];
ok('module loaded',!!H.stage17Retail&&!H.stage17Retail.off());
ok('contract stat exists',!!mode&&mode.stage===17&&mode.issue==='S01-RT-01');
ok('60 recorded storefronts',contracts.length===60&&mode?.recoveredVenues===60);
ok('342 audited pieces retained',mode?.existingAuditedStorefrontMeshes===342);
ok('54 audited walk-in stores',mode?.interiorStoresAmongRecovered===54);
ok('6 audited outdoor-only service venues',mode?.outdoorServicesAmongRecovered===6);
ok('5 independent shops retained',mode?.independentIndoorStores===5);
ok('all 59 indoor retail venues retained',w.retailShops.length===59&&mode?.totalWalkInShops===59);
ok('66 street venues retained',w.streetVenues.length===66);
ok('legacy Stage14 failure still transparent',mode?.baselineStage14OriginalStillInactive===true&&w.city20Stage14Stats?.commercialFronts===0);
ok('original repaired facade retained',w.city20DeepAuditRepairStats?.commercialVenues===60&&w.city20DeepAuditRepairStats?.storefrontDetailsAdded===342);
ok('road and building entries unchanged',w.roads461.length===52&&w.entrancePortals.length===429&&w.entrancePortals.filter(p=>p.interiorReady).length===214);
ok('no collision changes',w.solids.length===3230&&w.propSolids.length===796);
ok('no world geometry changes',w.boxes.length===194555&&mode.geometryAdded===0&&mode.collisionAdded===0);
ok('existing breakable glass retained',w.glassPanels.length===988&&w.stage16GlassStats?.selectedGlass===864);
ok('existing lamp and furniture upgrade loaded',!!H.stage14Lighting?.installed&&!!H.stage15Interior?.installed);
ok('no portal changes',mode.portalChanges===0&&mode.roadChanges===0&&mode.shopListChanges===0);
const html=fs.readFileSync('START_GAME.html','utf8');
ok('stage17 script after stage16',html.indexOf('assets/stage17_retail_contracts.js')>html.indexOf('assets/stage16_facade_glass.js'));
const byID=new Map(w.streetVenues.map(v=>[v.id,v]));
const shopIDs=new Set(w.retailShops.map(v=>v.id));
const parents=new Map(w.entrancePortals.filter(p=>p.interiorReady).map(p=>[p.buildingX+','+p.buildingZ,p]));
const partCounts=new Map();const kinds=new Map();
for(const b of w.boxes)if(b.city20AuditKind?.startsWith('venue-')){
 partCounts.set(b.city20AuditOwner,(partCounts.get(b.city20AuditOwner)||0)+1);
 let a=kinds.get(b.city20AuditOwner);if(!a){a=new Set();kinds.set(b.city20AuditOwner,a);}a.add(b.city20AuditKind);
}
let retainedMeshes=0,indoor=0,outdoor=0;
for(const c of contracts){
 const v=byID.get(c.id),building=w.buildings[c.buildingId],portal=building&&parents.get(building.x+','+building.z);
 ok('contract-live-venue:'+c.id,!!v&&v.buildingId===c.buildingId&&v.kind===c.kind);
 ok('contract-active-lobby:'+c.id,!!portal&&portal.id===c.lobbyPortalId);
 ok('original-frontage-location:'+c.id,!!v&&v.frontageX===c.frontage.x&&v.frontageZ===c.frontage.z);
 const pieces=partCounts.get(c.id)||0;retainedMeshes+=pieces;
 ok('all-facade-pieces:'+c.id,pieces===c.storefrontParts&&(pieces===3||pieces===6));
 ok('durable-signs-and-canopy:'+c.id,['venue-signband','venue-sign-trim','venue-door-canopy'].every(k=>kinds.get(c.id)?.has(k)));
 if(shopIDs.has(c.id)){
  indoor++;
  ok('real-store-contract:'+c.id,c.mode==='interior-counter'&&!!v.retail&&pieces===6);
  ok('retail-door-position:'+c.id,c.door?.x===v.retail.doorX&&c.door?.z===v.retail.doorZ);
 }else{
  outdoor++;
  ok('outdoor-service-no-false-interior:'+c.id,c.mode==='street-service'&&c.door===null&&!v.retail);
 }
}
ok('contract-counts-and-retained-originals',indoor===54&&outdoor===6&&retainedMeshes===342&&partCounts.size===60);
// Real game button path and retailer/counter access. The canvas-based HUD map
// is intentionally stubbed: this CPU DOM harness doesn't implement canvas.ellipse.
// Game.toggleVehicle, H.makeRetailScene, Game.buyCityItem30 and Game.exitRetail
// remain UNMODIFIED and are all exercised below.
g.updateHUD=()=>{};
g.running=true;g.paused=false;g.over=false;g.missionBoardOpen=false;g.garageOpen=false;
g.profile.credits=100000;
const reset=()=>{g.retailVisit=null;g.indoor=null;g.roofVisit=null;g.vehicleEntry=null;g.inVehicle=false;g.onTram=-1;g.onBus=-1;};
let visited=0,purchased=0,exited=0,freeDoors=0,counterReach=0,bank=0;
const available=(scene,x,z,r)=>scene.solids.every(s=>Math.abs(s.x-x)>=s.hw+r||Math.abs(s.z-z)>=s.hd+r);
function walkableCounter(scene){
 const {xmin,xmax,zmin,zmax}=scene.bounds;const step=.39,r=.26;
 const nx=Math.max(1,Math.floor((xmax-xmin)/step)),nz=Math.max(1,Math.floor((zmax-zmin)/step));
 const grid=(x,z)=>[Math.round((x-xmin)/step),Math.round((z-zmin)/step)];
 const [sx,sz]=grid(scene.entrance.x,scene.entrance.z+1.28),[tx,tz]=grid(scene.counter.x,scene.counter.z);
 const safe=(a,b)=>a>=0&&b>=0&&a<=nx&&b<=nz&&available(scene,xmin+a*step,zmin+b*step,r);
 if(!safe(sx,sz)||!safe(tx,tz))return false;
 const q=[[sx,sz]],used=new Set([sx+','+sz]);
 for(let at=0;at<q.length&&q.length<3500;at++){
   const [i,j]=q[at];if(Math.abs(i-tx)<=1&&Math.abs(j-tz)<=1)return true;
   for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){
     const a=i+di,b=j+dj,k=a+','+b;
     if(!used.has(k)&&safe(a,b)){used.add(k);q.push([a,b]);}
   }
 }
 return false;
}
for(const v of w.retailShops){
 reset();const d=v.retail;g.avatar=H.createWalker(d.doorX,d.frontZ-1.38,0,1);
 const door=g.nearestRetailDoor(),lobby=g.nearestEntrance(),chosen=g.preferredRetailDoor(lobby);
 ok('real-nearest-door:'+v.id,door?.id===v.id&&chosen?.id===v.id);
 const free=g.walkerPositionFree(d.doorX,d.frontZ-2.08);
 ok('street-side-exit-free:'+v.id,free);
 freeDoors+=+free;
 let scene=null;
 try{g.toggleVehicle();scene=g.retailVisit?.scene;
   ok('real-E-enters-shop:'+v.id,g.retailVisit?.venue.id===v.id&&!!scene?.counter);}
 catch(err){ok('real-E-enters-shop:'+v.id,false,String(err));}
 if(!scene){reset();continue;}
 visited++;
 ok('retail-clerk-and-scene:'+v.id,!!scene.clerk&&scene.solids.length>=4&&scene.boxes.length>=50);
 const reachable=walkableCounter(scene);counterReach+=+reachable;
 ok('walkable-aisle-to-counter:'+v.id,reachable);
 g.avatar.x=scene.counter.x;g.avatar.z=scene.counter.z;
 ok('shop-counter-E-in-range:'+v.id,g.nearestShopCounter()?.id===v.id);
 const item=H.availableCityShop30(v),before=g.profile.credits;
 if(item){let result=false;try{result=g.buyCityItem30();}catch(err){ok('purchase-no-error:'+v.id,false,String(err));}
   const bought=result&&g.profile.credits===before-item.cost;
   purchased+=+bought;ok('real-shop-purchase:'+v.id,bought);
 }else{bank++;ok('non-retail-bank-counter-not-fake-sale:'+v.id,!!v.bank44&&v.kind==='bank');}
 g.avatar.x=scene.entrance.x;g.avatar.z=scene.entrance.z;
 try{g.toggleVehicle();}catch(err){ok('real-E-exits-shop:'+v.id,false,String(err));}
 const done=!g.retailVisit;exited+=+done;ok('real-E-exits-shop:'+v.id,done);
}
let serviceVisits=0,servicePurchases=0;
for(const c of contracts.filter(v=>v.mode==='street-service')){
 reset();const v=byID.get(c.id);g.avatar=H.createWalker(v.x,v.z,0,1);
 ok('outdoor-E-locates-service:'+v.id,g.nearestStreetVenue()?.id===v.id);
 const reward='street19:'+v.id;
 try{g.toggleVehicle();}catch(err){ok('outdoor-E-service-error:'+v.id,false,String(err));}
 const visitedNow=g.visitRewards.has(reward)&&!g.retailVisit&&!g.indoor;
 serviceVisits+=+visitedNow;ok('outdoor-E-visits-service:'+v.id,visitedNow);
 const item=H.availableCityShop30(v),prev=g.profile.credits;
 let bought=false;try{bought=g.buyCityItem30();}catch(err){ok('outdoor-service-buy-error:'+v.id,false,String(err));}
 const real=bought&&!!item&&g.profile.credits===prev-item.cost;
 servicePurchases+=+real;ok('outdoor-O-purchase:'+v.id,real);
}
ok('all-entry-and-exit-summary',visited===59&&exited===59&&freeDoors===59);
ok('all-purchase-summary',purchased===58&&bank===1);
ok('six-services-enter-and-purchase',serviceVisits===6&&servicePurchases===6);
ok('all-counters-have-walkable-path',counterReach===59);
const report={stage:17,issue:'S01-RT-01',checks:tests,passed,failed,counts:{contracted:contracts.length,decoratedPieces:retainedMeshes,
 indoorStoresOn60:indoor,outdoorServicesOn60:outdoor,extraIndoorStores:5,
 realEEntered:visited,realEExited:exited,freeStreetDoors:freeDoors,
 aislesToCounterReachable:counterReach,purchases:purchased,bankServices:bank,
 realStreetServiceE:serviceVisits,realStreetPurchases:servicePurchases},
 claims:{cpuGameTest:true,domHudMocked:true,realWebGLValidated:false,native1080pFpsValidated:false}};
fs.writeFileSync('QA/STAGE17_OF35_ACCEPTANCE.json',JSON.stringify(report,null,2)+'\n');
console.log('Stage17:',passed+'/'+tests,'passed; stores',visited,'exits',exited,'purchases',purchased,'outdoor',serviceVisits,'errors',failed.length);
if(failed.length)process.exitCode=1;
