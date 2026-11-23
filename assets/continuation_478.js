/* SUNSET STATE 4.7.8: targeted follow-up to the 4.7.7 repair checkpoint.
   All added environmental detail is non-colliding, optional, and distance capped.
   No map, original mesh, gameplay/save schema, canvas scaling or mission state is replaced. */
var Heatline=globalThis.Heatline||{};
(function(H){
'use strict';
const G=H.coast461;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const baseControl=H.trafficControl477;
if(typeof baseControl!=='function')throw Error('SUNSET 4.7.8 expects 4.7.7 road-control layer');

// Side-road NPCs must respect *actual relative velocity*, not just car spacing.
// Road-level check prevents phantom braking for cars travelling beneath an overpass.
H.trafficControl477=function saferTraffic478(game,c,conditions){
  const out=baseControl(game,c,conditions);
  if(!c?.route477||c.route477.finished||!game)return out;
  const headingX=-Math.sin(c.yaw),headingZ=-Math.cos(c.yaw);
  const rightX=-headingZ,rightZ=headingX;
  const velocity=Math.max(0,c.speed||0);
  const stopGap=5.9+velocity*.94;
  let nearest=Infinity;
  for(const collection of [game.civilian,game.police,game.parked]){
    if(!collection)continue;
    for(const other of collection){
      if(!other||other===c||other.wrecked||other.alive===false)continue;
      const dx=other.x-c.x,dz=other.z-c.z;
      if(Math.abs(dx)>32||Math.abs(dz)>32)continue;
      const ahead=dx*headingX+dz*headingZ;
      if(ahead<-.6||ahead>30)continue;
      const sideways=Math.abs(dx*rightX+dz*rightZ);
      if(sideways>3.15)continue;
      if(H.deckGround443&&Math.abs(H.deckGround443(other)-H.deckGround443(c))>2.4)continue;
      const forwardOther=(other.vx||0)*headingX+(other.vz||0)*headingZ;
      const closing=velocity-forwardOther;
      const timeToImpact=closing>.2?(ahead-4.5)/closing:Infinity;
      // A gradual stop for queued traffic, and an immediate reaction to a new hazard.
      if(ahead<stopGap || (closing>1.5&&timeToImpact<1.8))nearest=Math.min(nearest,ahead);
    }
  }
  if(game.player&&game.player!==c&&game.player.alive!==false&&!game.player.wrecked){
    const other=game.player,dx=other.x-c.x,dz=other.z-c.z;
    if(Math.abs(dx)<32&&Math.abs(dz)<32){
      const ahead=dx*headingX+dz*headingZ,sideways=Math.abs(dx*rightX+dz*rightZ);
      if(ahead>0&&ahead<stopGap&&sideways<3.1&&
        (!H.deckGround443||Math.abs(H.deckGround443(other)-H.deckGround443(c))<2.4))
        nearest=Math.min(nearest,ahead);
    }
  }
  if(Number.isFinite(nearest)){
    const gap=nearest-4.3;
    const emergency=gap<Math.max(2.4,velocity*.39);
    out.gas=0;
    out.brake=out.brake||emergency||velocity>clamp(gap*.65,0,11);
    c.trafficYield478=(c.trafficYield478||0)+1;
  }
  return out;
};

// Local ecological landscaping: these are true low-poly 3D details, not a wooden
// platform, a painted fake pond or a new crocodile spawn point.
H.buildLandscaping478=function(world){
  const rand=new H.RNG(47821);
  const placed=[];
  let reeds=0,bankStones=0,streetBeds=0;
  const emit=(x,z,w,h,d,color,material,shape,cap)=>{
    if(!Number.isFinite(x+z+w+h+d))return false;
    if(G.coast(x,z)<.55 || G.roadAt(x,z))return false;
    const y=H.outdoorHeight(x,z);
    if(!Number.isFinite(y))return false;
    const prop=H.box(x,y+h*.50,z,w,h,d,color,rand.range(-3.14,3.14),4);
    prop.material=material;prop.shape=shape;
    prop.stage475Optional=true;prop.detailCap475=cap;
    prop.visibilityCap=cap;prop.lodMax=cap;
    prop.sunset478=true;
    world.add(prop);placed.push({x,z,coast:G.coast(x,z),cap});
    return true;
  };
  // Scan *actual* dry banks near the relocated, wetland-water crocodiles.
  // Widely spaced, deterministic clumps preserve visibility and frame budget.
  for(const [cx,cz] of H.CROC_SITES477||[]){
    for(let n=0;n<40&&reeds<55;n++){
      const angle=rand.range(0,Math.PI*2),r=rand.range(12,43);
      const x=cx+Math.cos(angle)*r,z=cz+Math.sin(angle)*r;
      if(placed.some(p=>Math.hypot(p.x-x,p.z-z)<3.2))continue;
      const depth=G.coast(x,z);
      if(depth<.6||depth>6.2)continue;
      if(emit(x,z,.16,rand.range(.60,1.32),.19,rand.next()>.5?'#748665':'#647b5c','foliage','wedge',180))reeds++;
    }
  }
  // Stone scatter in small numbers: different silhouette from fake repeated turf.
  for(const [cx,cz] of (H.CROC_SITES477||[]).slice(0,5)){
    for(let n=0;n<20&&bankStones<18;n++){
      const theta=rand.range(0,Math.PI*2),r=rand.range(15,52);
      const x=cx+Math.cos(theta)*r,z=cz+Math.sin(theta)*r;
      if(placed.some(p=>Math.hypot(p.x-x,p.z-z)<4))continue;
      if(G.coast(x,z)>7||G.coast(x,z)<.8)continue;
      if(emit(x,z,rand.range(.38,.78),rand.range(.17,.31),rand.range(.33,.65),'#847d6c','stone','rounded_smooth',140))bankStones++;
    }
  }
  // Add a few low non-colliding flowerbeds to existing central park areas only.
  // Nothing touches a storefront door, a road lane, or a mission trigger.
  for(const park of (world.parkCenters||[])){
    if(streetBeds>=12)break;
    if(Math.abs(park.x)>350||Math.abs(park.z)>350)continue;
    for(let i=0;i<2;i++){
      if(streetBeds>=12)break;
      const x=park.x+8+i*4.1,z=park.z+8.2;
      if(G.coast(x,z)<2||G.roadAt(x,z))continue;
      if(world.nearby?.(x,z)?.some(s=>Math.abs(x-s.x)<s.hw+2.5&&Math.abs(z-s.z)<s.hd+2.5))continue;
      if(emit(x,z,1.06,.24,.92,'#968d7c','stone','rounded_smooth',170)){
        emit(x,z,.86,.43,.80,i%2?'#638665':'#769367','foliage','urban_crown',170);
        streetBeds++;
      }
    }
  }
  world.stage478Stats={reeds,bankStones,streetBeds,optionalMeshes:placed.length,
    allOnLand:placed.every(p=>p.coast>.5),noTimberPlatformAdded:true,
    maxViewDistance:180,usesPerformanceGuard475:true};
  return world.stage478Stats;
};
// Versioned FPS report: the 4.7.8 props share the *existing* optional 4.7.5
// A/B group. If GPU FPS drops, the existing performance guard hides them at
// fixed native pixels; gameplay and original structures remain untouched.
const ParentGuard=H.PerformanceGuard475;
if(typeof ParentGuard==='function'){
  H.PerformanceGuard475=class PerformanceGuard478 extends ParentGuard{
    constructor(game){super(game);this.build='4.7.8';}
    report(){const r=super.report();return {...r,build:'4.7.8',
      newLandscaping478:this.g.world?.stage478Stats||null,
      nativePixelsPreservedBy478:true,
      newDetailsControlledByStage:'4.7.5 detail phase / F9',
      note478:'New props are optional and never reduce native canvas resolution. FPS depends on actual GPU and must be measured in-game.'};}
    download(){
      const data=JSON.stringify(this.report(),null,2),blob=new Blob([data],{type:'application/json'});
      const url=URL.createObjectURL(blob),anchor=document.createElement('a');
      anchor.download='SUNSET_STATE_478_FPS_AND_RESOLUTION.json';anchor.href=url;
      document.body.appendChild(anchor);anchor.click();anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1200);
    }
  };
}
const originalLandmarks=H.buildLandmarks461;
if(typeof originalLandmarks!=='function')throw Error('SUNSET 4.7.8 expects real landmark builder');
H.buildLandmarks461=function improvedLandmarks478(world){
  const result=originalLandmarks(world);
  H.buildLandscaping478(world);
  return result;
};
})(Heatline);
