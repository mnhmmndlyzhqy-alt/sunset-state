/* Stage53: public island harbours, walkable piers, helipads and local life. */
(function(H) {
  'use strict';
  const RC=H.realism39;
  if(!RC?.enabled||new URLSearchParams(location.search).has('islands53Off'))return;
  const worlds=new WeakMap(),clamp=H.clamp,mix=H.lerp;
  let active=null;
  const specifications=[
    {id:'shell',name:'אי הצדפים',shore:[-1083,838],end:[-1083,855],color:'#317c86'},
    {id:'reef',name:'אי השונית',shore:[-635,891],end:[-635,905],color:'#467ba2'},
    {id:'sunset',name:'אי השקיעה',shore:[1036.1,-617.05],end:[1024.4,-611.2],color:'#b1714a'},
    {id:'dolphin',name:'אי הדולפינים',shore:[1085,-192],end:[1085,-170],color:'#55866f'},
    {id:'palms',name:'אי הדקלים',shore:[-1193.4,-63.8],end:[-1206.2,-73.4],color:'#748847'}
  ];
  const rawGround=H.outdoorHeight;
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const segment=(a,b,p)=>{
    const dx=b.x-a.x,dz=b.z-a.z,ll=dx*dx+dz*dz;
    const t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(ll||1),0,1);
    return {t,d:Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t)};
  };
  const supportSize=48, feather=3.5, walkWidth=3;
  const supportKey=(i,j)=>i*65536+j;
  function indexSupports(state) {
    const cells=new Map();
    const insert=(kind,part,left,right,top,bottom)=>{
      for(let i=Math.floor(left/supportSize);i<=Math.floor(right/supportSize);i++)
        for(let j=Math.floor(top/supportSize);j<=Math.floor(bottom/supportSize);j++) {
          const key=supportKey(i,j);
          let bucket=cells.get(key);
          if(!bucket){bucket={pads:[],piers:[],paths:[]};cells.set(key,bucket);}
          bucket[kind].push(part);
        }
    };
    for(const p of state.pads) {
      const hw=p.w/2+feather, hd=p.d/2+feather;
      insert('pads',p,p.x-hw,p.x+hw,p.z-hd,p.z+hd);
    }
    for(const p of state.piers) insert('piers',p,p.minX,p.maxX,p.minZ,p.maxZ);
    for(const {path} of state.ports) for(let i=1;i<path.length;i++) {
      const a=path[i-1],b=path[i];
      insert('paths',{a,b},Math.min(a.x,b.x)-walkWidth,Math.max(a.x,b.x)+walkWidth,
        Math.min(a.z,b.z)-walkWidth,Math.max(a.z,b.z)+walkWidth);
    }
    return cells;
  }
  function supportAt(x,z) {
    if(!active?.supportCells) return active;
    return active.supportCells.get(supportKey(Math.floor(x/supportSize),Math.floor(z/supportSize)));
  }
  function floorIn(surface,x,z) {
    if(!surface)return null;
    for(const p of surface.pads) {
      const edge=Math.max(Math.abs(x-p.x)-p.w/2,Math.abs(z-p.z)-p.d/2);
      if(edge<=feather)return edge<=0?p.y:mix(p.y,rawGround(x,z),edge/feather);
    }
    for(const p of surface.piers) {
      if(x<p.minX||x>p.maxX||z<p.minZ||z>p.maxZ)continue;
      const s=segment(p.a,p.b,{x,z});if(s.d<=p.width/2)return mix(p.a.y,p.b.y,s.t);
    }
    return null;
  }
  function floorAt(x,z) {return floorIn(supportAt(x,z),x,z);}
  H.outdoorHeight=(x,z)=>floorAt(x,z)??rawGround(x,z);
  const prepare=H.prepareCoast461;
  H.prepareCoast461=function(world){active=null;return prepare(world);};
  const coastWater=H.installCoastWater461;
  function installWalking() {
    const walk=H.marinaWalk444,swim=H.canSwim445;
    H.marinaWalk444=(x,z)=>floorAt(x,z)!==null||walk(x,z);
    H.canSwim445=(x,z)=>floorAt(x,z)===null&&swim(x,z);
  }
  installWalking();
  H.installCoastWater461=function(...args) {
    const result=coastWater(...args);installWalking();return result;
  };
  const floor=H.walkerGround473;
  H.walkerGround473=a=>!a.deck443&&!a.coastDeck461?(floorAt(a.x,a.z)??floor(a)):floor(a);
  function add(w,x,y,z,sx,sy,sz,color,material='wood',shape='cube',yaw=0,cap=600) {
    const o=H.box(x,y,z,sx,sy,sz,color,yaw,4);o.material=material;o.shape=shape;o.visibilityCap=cap;o.island53=true;w.add(o);return o;
  }
  function clear(solids,x,z,r=1.3) {
    return !solids.some(s=>Math.abs(s.x-x)<s.hw+r&&Math.abs(s.z-z)<s.hd+r);
  }
  function pathFor(start,end,solid,reserved) {
    const step=3,bounds={x0:Math.min(start.x,end.x)-55,x1:Math.max(start.x,end.x)+55,z0:Math.min(start.z,end.z)-55,z1:Math.max(start.z,end.z)+55};
    const ok=(x,z)=>H.coast461.coast(x,z)>0&&clear(solid,x,z,1.65)&&
      reserved.every(p=>!(Math.abs(x-(p.x-2))<12&&Math.abs(z-(p.z-1))<10));
    const direct=(a,b)=>{
      const n=Math.max(1,Math.ceil(dist(a,b)/1.5));
      for(let i=0;i<=n;i++)if(!ok(mix(a.x,b.x,i/n),mix(a.z,b.z,i/n)))return false;
      return true;
    };
    if(direct(start,end))return [start,end];
    const nodes=new Map(),open=[],closed=new Set(),key=(i,j)=>i+','+j;
    const get=(i,j)=>{const k=key(i,j);let n=nodes.get(k);if(!n){n={i,j,k,x:start.x+i*step,z:start.z+j*step,g:Infinity,f:Infinity,parent:null};nodes.set(k,n);}return n;};
    const first=get(0,0);first.g=0;first.f=dist(first,end);open.push(first);
    for(let tries=0;open.length&&tries<10000;tries++) {
      let best=0;for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;
      const cur=open.splice(best,1)[0];if(closed.has(cur.k))continue;closed.add(cur.k);
      if(dist(cur,end)<5&&direct(cur,end)) {
        const points=[end];for(let p=cur;p;p=p.parent)points.push({x:p.x,z:p.z});points.reverse();
        const simple=[points[0]];let i=0;
        while(i<points.length-1){let j=points.length-1;while(j>i+1&&!direct(points[i],points[j]))j--;simple.push(points[j]);i=j;}
        return simple;
      }
      for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++) {
        if(!di&&!dj)continue;const n=get(cur.i+di,cur.j+dj);
        if(closed.has(n.k)||n.x<bounds.x0||n.x>bounds.x1||n.z<bounds.z0||n.z>bounds.z1||!direct(cur,n))continue;
        const cost=cur.g+step*Math.hypot(di,dj)+Math.abs(rawGround(cur.x,cur.z)-rawGround(n.x,n.z))*.7;
        if(cost>=n.g)continue;n.g=cost;n.f=cost+dist(n,end);n.parent=cur;open.push(n);
      }
    }
    return null;
  }
  function groundPath(w,points,width=2.9) {
    for(let i=1;i<points.length;i++) {
      const a=points[i-1],b=points[i],len=dist(a,b),n=Math.max(1,Math.ceil(len/3));
      const nx=(b.z-a.z)/len,nz=-(b.x-a.x)/len,rows=[];
      for(let j=0;j<=n;j++) {
        const x=mix(a.x,b.x,j/n),z=mix(a.z,b.z,j/n);
        rows.push([-1,1].map(s=>{const xx=x+nx*s*width/2,zz=z+nz*s*width/2;return [xx,H.outdoorHeight(xx,zz)+.028,zz];}));
      }
      H.addRibbon444(w,rows,{color:'#c7b993',material:'paving',visibility:600,layer:3});
    }
  }
  function helipad(w,state,x,z,name,id,size=16) {
    const h=Math.max(...[-size/2,0,size/2].flatMap(dx=>[-size/2,0,size/2].map(dz=>rawGround(x+dx,z+dz))))+.08;
    const p={id,portalId:-1,name,x,z,y:h,w:size,d:size,entryX:x,entryZ:z+size/2+3};state.pads.push(p);
    add(w,x,h-.12,z,size,.24,size,'#566a68','concrete');
    // Four shallow ramps give the raised pad a continuous walk surface.
    const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
    for(let i=0;i<4;i++) {
      const a=corners[i],b=corners[(i+1)%4],rows=[];
      for(let j=0;j<=6;j++) {
        const dx=mix(a[0],b[0],j/6),dz=mix(a[1],b[1],j/6),inside=[x+dx*size/2,h-.005,z+dz*size/2],xx=x+dx*(size/2+3.5),zz=z+dz*(size/2+3.5);
        rows.push([inside,[xx,rawGround(xx,zz)+.015,zz]]);
      }
      H.addRibbon444(w,rows,{color:'#a8a28b',material:'concrete',visibility:700,layer:3});
    }
    for(const side of [-1,1]) {
      add(w,x+side*1.55,h+.021,z,.42,.025,4.6,'#f0d8a3','paint');
      add(w,x+side*(size/2-.6),h+.021,z,.13,.022,size-1.2,'#e8d8ad','paint');
      add(w,x,h+.021,z+side*(size/2-.6),size-1.2,.022,.13,'#e8d8ad','paint');
    }
    add(w,x,h+.021,z,3.35,.025,.42,'#f0d8a3','paint');
    for(const dx of [-1,1])for(const dz of [-1,1])add(w,x+dx*(size/2-.5),h+.09,z+dz*(size/2-.5),.24,.14,.24,'#e9d49e','light_emissive','rounded',0,160);
    return p;
  }
  function pier(w,state,spec) {
    const a={x:spec.shore[0],z:spec.shore[1],y:rawGround(...spec.shore)+.035},b={x:spec.end[0],z:spec.end[1],y:.76};
    const len=dist(a,b),dx=(b.x-a.x)/len,dz=(b.z-a.z)/len,nx=dz,nz=-dx,width=3.6,yaw=Math.atan2(dx,dz);
    const p={a,b,width,minX:Math.min(a.x,b.x)-3,maxX:Math.max(a.x,b.x)+3,minZ:Math.min(a.z,b.z)-3,maxZ:Math.max(a.z,b.z)+3};state.piers.push(p);
    const rows=[];for(let i=0;i<=Math.ceil(len/2);i++){const t=i/Math.ceil(len/2),x=mix(a.x,b.x,t),z=mix(a.z,b.z,t),h=mix(a.y,b.y,t);rows.push([[-1,1].map(side=>[x+nx*side*width/2,h,z+nz*side*width/2])][0]);}
    H.addRibbon444(w,rows,{color:'#b7a483',material:'wood',visibility:850,layer:4});
    for(let t=0;t<=len;t+=2.8) {
      const x=a.x+dx*t,z=a.z+dz*t,h=mix(a.y,b.y,t/len);
      add(w,x,h-.05,z,width,.09,.065,'#84715c','wood','cube',yaw,400);
      for(const side of [-1,1]) {
        if(t>len-3.2)continue;
        add(w,x+nx*side*1.72,h+.36,z+nz*side*1.72,.12,.76,.12,'#655f50','wood');
        w.solid(x+nx*side*1.72,z+nz*side*1.72,.15,.15,true);
      }
    }
    for(let t=2;t<len;t+=5.6)for(const side of [-1,1]) {
      const x=a.x+dx*t+nx*side*1.48,z=a.z+dz*t+nz*side*1.48,h=mix(a.y,b.y,t/len);
      add(w,x,(h-1.3)/2,z,.26,h+1.3,.26,'#615b4e','wood','cylinder');
    }
    add(w,b.x,b.y-.16,b.z,4.3,.28,4.3,'#8f806a','wood');
    state.piers.push({a:{...b,x:b.x-.1},b:{...b,x:b.x+.1},width:4.3,minX:b.x-2.15,maxX:b.x+2.15,minZ:b.z-2.15,maxZ:b.z+2.15});
    return {id:spec.id,x:b.x+nx*4.8,z:b.z+nz*4.8,boardX:b.x,boardZ:b.z,yaw:Math.atan2(-dx,-dz),name:spec.name};
  }
  function palm(w,x,z,seed) {
    const y=H.outdoorHeight(x,z),h=5.9+(seed%4)*.42,lean=.18*Math.sin(seed);
    const trunk=add(w,x,y+h/2,z,.27,h,.28,'#8c7150','bark','cylinder',0,550);trunk.roll=lean;
    for(let i=0;i<7;i++) {
      const a=i*Math.PI*2/7+seed*.8;
      for(let j=0;j<2;j++) {
        const r=1.0+j*1.45,o=add(w,x+Math.sin(a)*r,y+h+.22-j*.58,z+Math.cos(a)*r,.65-j*.16,.11,2.15,'#5a7f49','foliage','wedge',a,550);o.pitch=.12+j*.23;
      }
    }
    for(let i=0;i<3;i++)add(w,x+Math.sin(i*2.1)*.22,y+h-.35,z+Math.cos(i*2.1)*.22,.21,.29,.21,'#6e7041','bark','sphere',0,100);
    w.solid(x,z,.4,.4,true);
  }
  function pavilion(w,x,z,color) {
    const y=H.outdoorHeight(x,z),top=y+2.75;
    for(const dx of [-2.6,2.6])for(const dz of [-2,2]) {
      add(w,x+dx,y+1.4,z+dz,.18,2.8,.18,'#8f7657','wood');w.solid(x+dx,z+dz,.22,.22,true);
    }
    const canopy=add(w,x,top+.14,z,6.2,.25,5.0,color,'fabric','wedge');canopy.pitch=.04;
    add(w,x,top-.08,z,6,.16,.16,'#75634d','wood');
    add(w,x,y+.48,z-1.25,3.4,.96,.68,'#ba9b74','wood');w.solid(x,z-1.25,3.4,.68,true);
    add(w,x,y+1.01,z-1.25,3.58,.10,.84,'#ded2b7','concrete');
    for(const i of [-1,0,1]) {
      add(w,x+i*.63,y+1.21,z-1.25,.18,.27,.18,['#e3b273','#8cac79','#b8c9cb'][i+1],'paint','cylinder',0,150);
      add(w,x+i*1.05,y+.43,z+.74,.46,.09,.46,'#876f52','wood','rounded');
      add(w,x+i*1.05,y+.21,z+.74,.13,.43,.13,'#40504b','metal','cylinder');w.solid(x+i*1.05,z+.74,.48,.48,true);
    }
  }
  function sign(w,p,name,caption,color,yaw=0) {
    const y=H.outdoorHeight(p.x,p.z);
    add(w,p.x,y+1.18,p.z,.12,2.36,.12,'#786a54','wood');
    add(w,p.x,y+2.08,p.z,3.7,.80,.15,color,'paint','rounded',yaw,440);
    add(w,p.x,y+2.08,p.z+.085,3.3,.055,.022,'#f4ddab','paint','cube',yaw,440);
    w.solid(p.x,p.z,.15,.15,true);
    H.stage53Shops?.registerSign(w,{id:'island53-'+name,x:p.x,y:y+2.12,z:p.z,name,caption,color:'#f5e4bc',reach:80});
  }
  function nearPath(paths,p,r=4) {return paths.some(path=>path.slice(1).some((b,i)=>segment(path[i],b,p).d<r));}
  function decorate(w,state,port,isl,plots,localSolids,index) {
    const reserved=p=>plots.some(q=>Math.abs(p.x-(q.x-2))<14&&Math.abs(p.z-(q.z-1))<12)||dist(p,port.pad)<16||nearPath([port.path],p,4.2);
    let trees=0,cafe=null;
    for(let i=0;i<88;i++) {
      const angle=i*2.399963,rad=20+(i%8)*7,p={x:isl.arrival.x+Math.cos(angle)*rad,z:isl.arrival.z+Math.sin(angle)*rad};
      if(reserved(p)||H.coast461.coast(p.x,p.z)<10||!clear(localSolids,p.x,p.z,4))continue;
      if(!cafe&&H.coast461.coast(p.x,p.z)>16&&clear(localSolids,p.x,p.z,5)) {
        const corners=[[-3,-2.5],[3,-2.5],[-3,2.5],[3,2.5]].map(([dx,dz])=>rawGround(p.x+dx,p.z+dz));
        if(Math.max(...corners)-Math.min(...corners)<.65) {
          pavilion(w,p.x,p.z,port.color);cafe=p;localSolids.push({x:p.x,z:p.z,hw:4.2,hd:3.6});continue;
        }
      }
      if(trees<8){palm(w,p.x,p.z,i+index*17);trees++;localSolids.push({x:p.x,z:p.z,hw:.5,hd:.5});}
      if(trees===8&&cafe)break;
    }
    // Low benches and picnic furniture stay clear of the public path and plots.
    const landing=port.path[Math.min(1,port.path.length-1)];
    state.actors.push(...Array.from({length:4},(_,i)=>({...H.createWalker(port.path[0].x,port.path[0].z,0,i),x:port.path[0].x,z:port.path[0].z,y:H.outdoorHeight(port.path[0].x,port.path[0].z),
      id:'islander53-'+port.id+'-'+i,appearance:(37811+index*47863+i*7967)>>>0,style:i,injuryState:'walking',yaw:0,vx:0,vz:0,speed:0,gait:i,phase:i,
      path:port.path,index:Math.min(i,port.path.length-1),dir:1,delay:i*3.3,portId:port.id,role:i===3?'host':'visitor'})));
    port.cafe=cafe;port.palms=trees;
    const sx=landing.x+4.5,sz=landing.z;
    if(!reserved({x:sx,z:sz})&&clear(localSolids,sx,sz,2)&&H.coast461.coast(sx,sz)>4) {
      const y=H.outdoorHeight(sx,sz);add(w,sx,y+.45,sz,2.4,.12,.67,'#a78a60','wood');add(w,sx,y+.76,sz+.27,2.4,.52,.1,'#a78a60','wood');w.solid(sx,sz,2.5,.72,true);
    }
  }
  function setup(g) {
    const w=g.world;if(worlds.has(w)){active=worlds.get(w);return active;}
    RC.property48.setupWorld(g);
    const reserved=RC.property48.ISLANDS.map(i=>({isl:i,plots:RC.property48.plotsFor(w,i).map(p=>({...p}))}));
    const state={world:w,pads:[],piers:[],actors:[],ports:[],errors:[],boxesBefore:w.boxes.length,solidsBefore:w.solids.length+w.propSolids.length};worlds.set(w,state);active=state;
    for(const [index,spec]of specifications.entries()) {
      const {isl,plots}=reserved.find(q=>q.isl.id===spec.id),near=[...w.solids,...w.propSolids].filter(s=>Math.abs(s.x-isl.cx)<200&&Math.abs(s.z-isl.cz)<200);
      const pad=helipad(w,state,isl.arrival.x,isl.arrival.z,spec.name,'island53-'+spec.id);
      const berth=pier(w,state,spec);
      const start={x:pad.entryX,z:pad.entryZ},end={x:spec.shore[0],z:spec.shore[1]};
      const path=pathFor(start,end,near,plots);
      if(!path){state.errors.push('No clear public path: '+spec.id);continue;}
      groundPath(w,path);
      const port={id:spec.id,name:spec.name,color:spec.color,berth,pad,path};state.ports.push(port);
      decorate(w,state,port,isl,plots,near,index);
      sign(w,{x:pad.x+11.8,z:pad.z+5},spec.name,'מנחת · טיסות לאיים · B',spec.color);
      sign(w,{x:spec.shore[0]+3.2,z:spec.shore[1]},spec.name+' · רציף','סירה · הפלגות · B',spec.color);
      const hub={id:5300+index,x:berth.boardX,z:berth.boardZ,label:spec.name+' · רציף ומנחת',kind:'marina'};
      w.explorationHubs.push(hub);
    }
    state.airportPad=helipad(w,state,-84,556,'מסוקי האיים','airport53',18);
    w.airportPad53=state.airportPad;w.islandPorts53=state.ports;
    sign(w,{x:-71,z:566},'מסוקי האיים','בחר יעד לטיסה · B', '#356e79');
    w.explorationHubs.push({id:5306,x:-84,z:568,label:'טיסות לאיים · מנחת מסוקים',kind:'airport'});
    state.supportCells=indexSupports(state);
    state.staticParts=w.boxes.length-state.boxesBefore;state.staticSolids=w.solids.length+w.propSolids.length-state.solidsBefore;
    w.nearbyRegions473?.clear();
    return state;
  }
  function tick(g,dt) {
    const s=setup(g);if(!g.running||g.paused||g.over||g.inside||g.missionBoardOpen||g.showFullMap)return;
    const focus=g.flight51?.pilot?g.flight51.plane:g.avatar;
    for(const a of s.actors) {
      if(Math.abs(a.x-focus.x)>230||Math.abs(a.z-focus.z)>230)continue;
      if(RC.chat48?.active?.who===a){a.speed=a.vx=a.vz=0;continue;}
      if(a.delay>0){a.delay-=dt;a.speed=0;a.vx=a.vz=0;continue;}
      let target=a.path[a.index],d=dist(a,target);
      if(d<.35){a.index+=a.dir;if(a.index>=a.path.length||a.index<0){a.dir*=-1;a.index=clamp(a.index,0,a.path.length-1);a.delay=3.5+a.phase;a.speed=0;continue;}target=a.path[a.index];d=dist(a,target);}
      const speed=Math.min(1.12+a.phase*.07,d/Math.max(.001,dt)),dx=(target.x-a.x)/(d||1),dz=(target.z-a.z)/(d||1);
      a.vx=dx*speed;a.vz=dz*speed;a.speed=speed;a.x+=a.vx*dt;a.z+=a.vz*dt;a.y=H.outdoorHeight(a.x,a.z);a.yaw=Math.atan2(-dx,-dz);a.gait+=dt*speed*3.7;a.stride+=dt*speed*3.7;a.gaitScale=speed;a.phase+=dt*speed*3.7;
    }
  }
  RC.installers.push(Game=>{
    const P=Game.prototype,update=P.update,build=P.buildDynamic,restart=P.restart;
    P.update=function(dt){setup(this);const r=update.call(this,dt);tick(this,Math.min(.1,Math.max(0,dt)));return r;};
    P.restart=function(...args){const r=restart.apply(this,args);setup(this);return r;};
    P.buildDynamic=function(){const out=build.call(this);if(this.inside)return out;const s=setup(this);
      for(const a of s.actors){const d=Math.hypot(a.x-this.cam.x,a.z-this.cam.z);if(d<130)H.streetCharacterPose32(a,out,this.seconds,false,d,!!this.renderer.gl||!!this.renderer.rcCharacters);}
      return out;};
  });
  H.islands53={setup,floorAt,states:worlds,specifications,walkExtension(x,z){
    const surface=supportAt(x,z);
    if(!surface)return false;
    if(floorIn(surface,x,z)!==null)return true;
    const p={x,z};
    if(!active.supportCells)
      return H.coast461.coast(x,z)>0&&active.ports.some(port=>nearPath([port.path],p,walkWidth));
    return surface.paths.some(({a,b})=>segment(a,b,p).d<walkWidth)&&H.coast461.coast(x,z)>0;
  },ownedBase(w,isl){
    const p=isl.arrival,y=H.outdoorHeight(p.x+12,p.z-11);add(w,p.x+12,y+2.5,p.z-11,.10,5,.10,'#c9d0ca','metal','cylinder');
    add(w,p.x+12.65,y+4.55,p.z-11,1.3,.7,.035,'#3d8e98','fabric');return true;
  }};
})(Heatline);
