/* Stage53: one junction geometry for roads, markings, bridge rails and driving. */
(function (H) {
  'use strict';
  if (!H.coast461 || new URLSearchParams(location.search).has('roads53Off')) return;
  const G = H.coast461, clamp = (v,a,b)=>Math.max(a,Math.min(b,v)), size = 24;
  const cells = new Map(), byId = new Map();
  let crossings = [], stats = {};
  // This short, surveyed clear corridor reconnects the private neighbourhood.
  // All 52 existing routes and their authored anchors remain in place.
  G.roads.push({id:'privateConnector53',width:7.4,points:[{x:-921,z:0},{x:-884,z:0}]});
  const key=(x,z)=>Math.floor(x/size)+','+Math.floor(z/size);
  const mix=(a,b,t)=>a+(b-a)*t;
  function segments(roads) {
    const result=[];
    for(const road of roads) for(let i=1;i<road.samples.length;i++) {
      const a=road.samples[i-1],b=road.samples[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
      if(len>.001)result.push({a,b,road,i,dx,dz,len,id:result.length,cuts:[]});
    }
    return result;
  }
  function index(list,margin) {
    const grid=new Map();
    for(const s of list) {
      const h=margin?s.road.width/2+2:0;
      for(let x=Math.floor((Math.min(s.a.x,s.b.x)-h)/size);x<=Math.floor((Math.max(s.a.x,s.b.x)+h)/size);x++)
        for(let z=Math.floor((Math.min(s.a.z,s.b.z)-h)/size);z<=Math.floor((Math.max(s.a.z,s.b.z)+h)/size);z++) {
          const k=x+','+z;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(s);
        }
    }
    return grid;
  }
  function splitCrossings(roads) {
    const list=segments(roads),grid=index(list,false),seen=new Set(),locations=new Map();
    let preserved=0;
    for(const bucket of grid.values()) for(let i=0;i<bucket.length;i++) for(let j=i+1;j<bucket.length;j++) {
      const a=bucket[i],b=bucket[j];if(a.road===b.road)continue;
      const pair=Math.min(a.id,b.id)+','+Math.max(a.id,b.id);if(seen.has(pair))continue;seen.add(pair);
      const det=a.dx*b.dz-a.dz*b.dx;if(Math.abs(det)<1e-8)continue;
      const dx=b.a.x-a.a.x,dz=b.a.z-a.a.z;
      let t=(dx*b.dz-dz*b.dx)/det,u=(dx*a.dz-dz*a.dx)/det;
      if(t<-.000001||t>1.000001||u<-.000001||u>1.000001)continue;
      t=clamp(t,0,1);u=clamp(u,0,1);
      const x=mix(a.a.x,a.b.x,t),z=mix(a.a.z,a.b.z,t);
      const ay=mix(a.a.y,a.b.y,t),by=mix(b.a.y,b.b.y,u);
      if((a.road.id==='westExpress'||b.road.id==='westExpress') && Math.abs(z+432)<34 && Math.abs(ay-by)>1.5) {preserved++;continue;}
      const k=Math.round(x*10000)+','+Math.round(z*10000);
      let p=locations.get(k);if(!p){p={x,z,roads:new Set()};locations.set(k,p);}
      p.roads.add(a.road.id);p.roads.add(b.road.id);
      for(const [s,v] of [[a,t],[b,u]])s.cuts.push({t:v,p});
    }
    const perRoad=new Map(roads.map(r=>[r,[]]));let inserted=0;
    for(const s of list) {
      const out=perRoad.get(s.road);
      if(!out.length)out.push(s.a);
      for(const {t,p} of s.cuts.sort((a,b)=>a.t-b.t)) {
        if(t<.00001){s.a.junction=true;continue;}
        if(t> .99999){s.b.junction=true;continue;}
        if(Math.hypot(out.at(-1).x-p.x,out.at(-1).z-p.z)<.001)continue;
        const q={...s.a,x:p.x,z:p.z,junction:true};
        for(const f of ['y','g','shore','nx','nz','above'])q[f]=mix(s.a[f],s.b[f],t);
        q.water=G.coast(q.x,q.z)<-.45;out.push(q);inserted++;
      }
      out.push(s.b);
    }
    for(const r of roads) r.samples=perRoad.get(r);
    crossings=[...locations.values()].map(p=>({...p,roads:[...p.roads]}));
    stats={stage:53,roads:roads.length,connectedCrossings:crossings.length,insertedSamples:inserted,preservedGradeSeparations:preserved,clippedTrimSegments:0,railOpenings:0,guardPassages:0};
  }
  const previousReconcile=H.reconcileRoadProfiles477;
  H.reconcileRoadProfiles477=function(roads) {
    splitCrossings(roads);
    const result=previousReconcile(roads);
    cells.clear();byId.clear();
    for(const r of roads){byId.set(r.id,r);for(const p of r.samples)p.route53=r.id;}
    for(const [k,v]of index(segments(roads),true))cells.set(k,v);
    stats.maxSharedSeam=0;
    for(const c of crossings) {
      const ys=c.roads.map(id=>byId.get(id).samples.find(p=>Math.hypot(p.x-c.x,p.z-c.z)<.002)?.y).filter(Number.isFinite);
      if(ys.length>1)stats.maxSharedSeam=Math.max(stats.maxSharedSeam,Math.max(...ys)-Math.min(...ys));
    }
    return result;
  };
  function otherRoad(id,x,z,y,margin=.25) {
    for(const s of cells.get(key(x,z))||[]) {
      if(s.road.id===id)continue;
      const t=clamp(((x-s.a.x)*s.dx+(z-s.a.z)*s.dz)/(s.len*s.len),0,1);
      if(Math.hypot(x-s.a.x-s.dx*t,z-s.a.z-s.dz*t)>s.road.width/2+margin)continue;
      if(Math.abs(y-mix(s.a.y,s.b.y,t))<.36)return true;
    }
    return false;
  }
  function nearOther(id,a,b) {
    return (cells.get(key((a.x+b.x)/2,(a.z+b.z)/2))||[]).some(s=>s.road.id!==id);
  }
  function row(p,l,r,y) {return [[p.x+p.nx*l,p.y+y,p.z+p.nz*l],[p.x+p.nx*r,p.y+y,p.z+p.nz*r]];}
  function interpolate(a,b,t) {return {x:mix(a.x,b.x,t),z:mix(a.z,b.z,t),y:mix(a.y,b.y,t),nx:mix(a.nx,b.nx,t),nz:mix(a.nz,b.nz,t)};}
  function ribbon(world,run,l,r,y,color,material,layer,visibility) {
    if(material!=='paint'&&!(material==='concrete'&&Math.abs(r-l)<.3)) {
      H.addRibbon444(world,run.map(p=>row(p,l,r,y)),{color,material,layer,visibility});return;
    }
    const id=run[0].route53,off=(l+r)/2;
    let keep=[];
    const flush=()=>{if(keep.length>1)H.addRibbon444(world,keep,{color,material,layer,visibility});keep=[];};
    for(let i=1;i<run.length;i++) {
      const a=run[i-1],b=run[i],n=nearOther(id,a,b)?Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/1.6)):1;
      let openPart=false;
      for(let j=0;j<n;j++) {
        const p=interpolate(a,b,j/n),q=interpolate(a,b,(j+1)/n),m=interpolate(p,q,.5);
        if(otherRoad(id,m.x+m.nx*off,m.z+m.nz*off,m.y,.55)){flush();openPart=false;stats.clippedTrimSegments++;continue;}
        if(!keep.length)keep.push(row(p,l,r,y));
        if(openPart)keep[keep.length-1]=row(q,l,r,y);else keep.push(row(q,l,r,y));
        openPart=true;
      }
    }
    flush();
  }
  function railRuns(road,run,side) {
    const result=[];let keep=[];
    const flush=()=>{if(keep.length>1)result.push(keep);keep=[];};
    const off=side*road.width/2;
    for(let i=1;i<run.length;i++) {
      const a=run[i-1],b=run[i],n=nearOther(road.id,a,b)?Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/1.6)):1;
      let openPart=false;
      for(let j=0;j<n;j++) {
        const p={...a,...interpolate(a,b,j/n)},q={...b,...interpolate(a,b,(j+1)/n)},m=interpolate(p,q,.5);
        if(otherRoad(road.id,m.x+m.nx*off,m.z+m.nz*off,m.y,1.1)){flush();openPart=false;stats.railOpenings++;continue;}
        if(!keep.length)keep.push(p);
        if(openPart)keep[keep.length-1]=q;else keep.push(q);
        openPart=true;
      }
    }
    flush();return result;
  }
  const priorGuard=H.guardBridgeRails477;
  H.guardBridgeRails477=function(car,oldX,oldZ) {
    if(car&&!car.deck443) {
      const bridge=H.closestBridge477(car.x,car.z);
      if(bridge&&otherRoad(bridge.road.id,car.x,car.z,mix(bridge.a.y,bridge.b.y,clamp(Math.hypot(bridge.x-bridge.a.x,bridge.z-bridge.a.z)/bridge.len,0,1)),.2)) {
        stats.guardPassages++;return false;
      }
    }
    return priorGuard(car,oldX,oldZ);
  };
  H.roads53={ribbon,railRuns,otherRoad,stats:()=>stats,crossings:()=>crossings};
})(Heatline);
