/* SUNSET STATE 53 — private island terrain, transport surfaces and paid plots. */
(function (H) {
  'use strict';
  const RC = H.realism39;
  const clamp = H.clamp, mix = H.lerp, TAU = Math.PI * 2;
  const center = { x: 1780, z: 300 }, rx = 430, rz = 365;
  const bounds = { west: 1288, east: 2260, north: -104, south: 713 };
  const flightBounds = { west: -1238, east: 2320, north: -1238, south: 1238 };
  const mapBounds = { west: -1270, east: 2290, north: -1260, south: 1260 };
  const runway = { west: 1460, east: 2100, north: 225, south: 255, z: 240, y: 4.2, elevation: 4.2 };
  const apron = { west: 1620, east: 1960, north: 274, south: 386, y: 4.2 };
  const hangar = { x: 1885, z: 391, y: 4.2, entryX: 1885, entryZ: 391 };
  const village = { west: 1680, east: 1986, north: 441, south: 556, y: 5.45 };
  const padRect = { west: 1380, east: 1400, north: 308, south: 328, y: 2.65 };
  const pier = { west: 1297, east: 1390, z: 345, half: 3.05 };
  const point = (x, z) => ({ x, z });
  const path = (...pairs) => pairs.map(([x, z]) => point(x, z));
  const main = path([1390,345],[1455,345],[1528,378],[1616,397],[1664,413],[1691,456],[1735,463],[1768,465],[1770,491],[1980,491]);
  const airport = path([1664,413],[1664,380],[1664,300],[1664,254]);
  const ridge = path([1974,491],[2014,473],[2040,433],[2049,399]);
  const harborWalk = path([1300,345],[1390,345],[1390,329]);
  const garageWalk = path([1735,463],[1735,491],[1704,491]);
  const roads = [main, airport, ridge, garageWalk];
  const roadSegments = roads.flatMap(route=>route.slice(1).map((end,j)=>[route[j],end]));
  const worlds = new WeakMap();
  const smooth = (lo, hi, n) => { const t = clamp((n - lo) / (hi - lo), 0, 1); return t * t * (3 - 2 * t); };
  const rectDist = (r, x, z) => Math.hypot(Math.max(0, r.west - x, x - r.east), Math.max(0, r.north - z, z - r.south));
  const hill = (x, z, a, b, wide, deep) => Math.exp(-(((x - a) / wide) ** 2 + ((z - b) / deep) ** 2));
  function edge(angle) {
    return 1 + .025 * Math.sin(3 * angle + 1.2) + .021 * Math.cos(5 * angle - .24) + .012 * Math.sin(7 * angle + .60);
  }
  function outline(t, ratio = 1) {
    const f = ratio * edge(t);
    return { x: center.x + rx * f * Math.cos(t), z: center.z + rz * f * Math.sin(t) };
  }
  function coast(x, z) {
    const u = (x - center.x) / rx, v = (z - center.z) / rz;
    const a = Math.atan2(v, u), k = Math.hypot(u, v) / edge(a);
    return (1 - k) * rz;
  }
  function contains(x, z, margin = 0) {
    return x > 1305 - margin && x < 2260 + margin && z > -104 - margin && z < 713 + margin && coast(x, z) >= -margin;
  }
  function deckHeight(x, z) {
    if (x < pier.west || x > pier.east || Math.abs(z - pier.z) > pier.half) return null;
    return mix(.78, 2.65, smooth(1335, 1390, x));
  }
  function terrain(x, z) {
    const shore = coast(x, z);
    if (shore < 0) return Math.max(-5, shore * .087);
    const h = 2.4 + 1.8 * hill(x, z, 1520, 368, 105, 95) + 15.8 * hill(x, z, 2050, 428, 118, 110) +
      14.8 * hill(x, z, 1800, 79, 154, 100) + 11.6 * hill(x, z, 1950, 584, 166, 83) +
      1.25 * Math.sin((x - 1600) / 81) * Math.cos(z / 59);
    const ground = h * smooth(0, 63, shore);
    const field = Math.max(1 - smooth(31, 67, rectDist(runway, x, z)), 1 - smooth(26, 56, rectDist(apron, x, z)));
    const local = mix(ground, runway.elevation, field);
    const settled = mix(local, village.y, 1 - smooth(4, 34, rectDist(village, x, z)));
    const dockBase = { west: 1375, east: 1430, north: 312, south: 352 };
    return mix(settled, padRect.y, 1 - smooth(9, 31, rectDist(dockBase, x, z)));
  }
  const rings = [0,.07,.15,.23,.31,.39,.47,.55,.63,.70,.77,.83,.88,.92,.95,.975,1,1.035];
  const rays = 68;
  function terrainRay(i) {
    return rings.map(r => {
      const p = outline(i / rays * TAU, r);
      return [p.x,terrain(p.x,p.z),p.z];
    });
  }
  const mesh = Array.from({length:rays},(_,i)=>{
    const left=terrainRay(i), right=terrainRay(i+1), triangles=[];
    const index = (a,b,c) => {
      const bx=b[0]-a[0], bz=b[2]-a[2], cx=c[0]-a[0], cz=c[2]-a[2], det=bx*cz-cx*bz;
      if(Math.abs(det)>.002) triangles.push({x:a[0],z:a[2],y:a[1],u0:cz/det,u1:-cx/det,v0:-bz/det,v1:bx/det,
        dy1:b[1]-a[1],dy2:c[1]-a[1]});
    };
    for(let j=1;j<rings.length;j++) {
      index(left[j-1],left[j],right[j]);
      index(left[j-1],right[j],right[j-1]);
    }
    return {left,right,triangles};
  });
  function height(x, z) {
    const surface = deckHeight(x,z);
    let ground;
    if (rectDist(runway,x,z)<=11 || rectDist(apron,x,z)<=4) ground=runway.elevation;
    else if (rectDist(padRect,x,z)<=2) ground=padRect.y;
    else {
      const angle = (Math.atan2((z-center.z)/rz,(x-center.x)/rx)+TAU)%TAU;
      const wedge = mesh[Math.floor(angle/TAU*rays)%rays];
      for(const t of wedge.triangles) {
        const dx=x-t.x, dz=z-t.z, u=dx*t.u0+dz*t.u1, v=dx*t.v0+dz*t.v1;
        if(u>=-.00001&&v>=-.00001&&u+v<=1.00001) { ground=t.y+u*t.dy1+v*t.dy2; break; }
      }
      ground ??= terrain(x,z);
    }
    return surface===null ? ground : Math.max(surface,ground);
  }
  function walkable(x, z) { return deckHeight(x, z) !== null || contains(x, z, -.20); }
  function drivable(x, z) { return contains(x, z, -1.25); }
  const at = (x, z) => ({ x, z, y: height(x, z) });

  const slots = {
    plane: [1658,1723,1788,1853,1918].map(x => ({ x, z: 343, y: 4.2, yaw: Math.PI })),
    car: [1708,1714,1720,1726,1732].map(x => ({ ...at(x, 494), yaw: Math.PI })),
    boat: [1300,1309,1318,1327,1336].map(x => ({ x, z: 351, y: .33, boardX: x, boardZ: 345, yaw: -Math.PI / 2 }))
  };
  slots.airplane = slots.plane;
  const port = {
    id: 'estate', name: 'האי הפרטי', color: '#d8aa65',
    berth: { ...slots.boat[0], name: 'רציף האי הפרטי' },
    pad: { id: 'estate53-pad', portalId: -1, name: 'מנחת האי הפרטי', x: 1390, y: padRect.y, z: 318, w: 20, d: 20, entryX: 1390, entryZ: 329 },
    carDrop: { ...at(1409, 345), yaw: -Math.PI / 2 }, path: harborWalk
  };
  const office = { ...at(1750,480), door: at(1750,480), x: 1750, z: 480, name: 'משרד האי' };
  const plots = [1797, 1868, 1939].map((x, i) => {
    const id = 'abc'[i], z = 524, door = at(x, z - 7.9);
    const units = [-1, 1].map((side, j) => {
      const u = x + side * 5.08, gate = at(u, z - 7.4);
      return { id: id + (j + 1), x: u, z: gate.z, y: gate.y, door: gate, interior: at(u,z+1.27),
        walk: [gate, at(u, 507), at(x + side * 8.8, 499), at(x + side * 14, 497)] };
    });
    return { id, x, z, y: height(x, z), door, walk: [door, at(x, 510), at(x, 498)], units,
      colors: ['#b7a78d','#a5b1a3','#c6ac91'] };
  });

  function add(w, x, y, z, sx, sy, sz, color, material = 'masonry', shape = 'cube', yaw = 0, cap = 1000, glow = 0, layer = 4) {
    const o = H.box(x, y, z, sx, sy, sz, color, yaw, layer, glow);
    Object.assign(o, { material, shape, visibilityCap: cap, estate53: true });
    w.add(o);
    return o;
  }
  function flat(w, x, z, width, depth, y, color, material = 'paving', cap = 1400) {
    return add(w, x, y - .035, z, width, .07, depth, color, material, 'cube', 0, cap, 0, 3);
  }
  function strip(w, points, width, color, material, rise = .04, cap = 1050) {
    for (let i = 1; i < points.length; i++) {
      const a = points[i-1], b = points[i], len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len < .025) continue;
      const nx = (b.z - a.z) / len, nz = (a.x - b.x) / len, count = Math.ceil(len / 5);
      const rows = Array.from({ length: count + 1 }, (_, j) => [-1,1].map(side => {
        const x = mix(a.x,b.x,j/count) + nx * width * .5 * side;
        const z = mix(a.z,b.z,j/count) + nz * width * .5 * side;
        return [x,height(x,z) + rise,z];
      }));
      H.addRibbon444(w,rows,{color,material,visibility:cap,layer:3,thickness:.16});
    }
  }
  function islandMesh(w) {
    for(const [j,sector] of mesh.entries()) for(let i=1;i<rings.length;i++) {
      const r=rings[i], shoreline=r>.92, wet=r>1;
      const rows=[[sector.left[i-1],sector.left[i]],[sector.right[i-1],sector.right[i]]];
      const tone = wet ? '#b7a67c' : shoreline ? ['#cabc95','#c3b28b'][(j/7|0)%2] :
        ['#647a50','#60734d','#657a54','#697f53'][(i*17+(j/5|0)*11)%4];
      H.addRibbon444(w,rows,{color:tone,material:shoreline?'sand':'lawn443',visibility:2450,layer:1,thickness:.34});
    }
  }
  function lamp(w, x, z, base = height(x,z), style = 0) {
    add(w,x,base+2.1,z,.14,4.15,.14,'#3d5354','metal','cylinder',0,530);
    add(w,x,base+4.18,z,.82,.18,.52,'#4b5b5c','metal','rounded',0,500);
    add(w,x,base+4.08,z,.66,.075,.36,style?'#c8e5ee':'#ffdea3','light_emissive','rounded',0,470,.57);
  }
  function distanceTo(p, a, b) {
    const dx=b.x-a.x, dz=b.z-a.z, t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz),0,1);
    return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);
  }
  function paved(x,z) {
    if (!contains(x,z)) return false;
    if (rectDist(runway,x,z)<4 || rectDist(apron,x,z)<.5) return true;
    const p=point(x,z);
    return roadSegments.some(([start,end])=>distanceTo(p,start,end)<4.25);
  }
  function landscape(w) {
    const rng = new H.RNG(530384);
    for (let i = 0; i < 118; i++) {
      const a = rng.range(0,TAU), r = rng.range(.50,.95), p = outline(a,r);
      if (rectDist(runway,p.x,p.z)<27 || rectDist(apron,p.x,p.z)<26 || rectDist(village,p.x,p.z)<18 ||
          roadSegments.some(([start,end])=>distanceTo(p,start,end)<9.6) ||
          p.x < 1450 && p.z > 298 && p.z < 365 || p.z < 280 && p.z > 210) continue;
      const y = height(p.x,p.z), s = rng.range(3.25,7.9);
      add(w,p.x,y+s*.39,p.z,.12+s*.034,s*.78,.13+s*.033,'#6d6551','bark','cylinder',0,830);
      for (let k = 0; k < 3; k++)
        add(w,p.x+rng.range(-.8,.8),y+s*(.79+k*.09),p.z+rng.range(-.8,.8),s*.54,s*.49,s*.56,
          ['#576c47','#526743','#738451'][(i+k)%3], 'foliage','urban_crown',a+k,830);
      w.solid(p.x,p.z,.38,.38,true);
    }
    for (let i=0;i<34;i++) {
      const p=outline(i/34*TAU+.035,.934+.038*Math.sin(i*13));
      if (Math.abs(p.z-pier.z)<20 && p.x<1450) continue;
      const s=1.3+1.2*(i%5)/4;
      add(w,p.x,height(p.x,p.z)+.27,p.z,s,.85,s*.7,i%2?'#807b69':'#969083','stone','rounded',i*1.75,560);
    }
  }
  function airfield(w) {
    const h = runway.y;
    flat(w,1780,runway.z,660,38,h+.025,'#747a77','concrete');
    flat(w,1780,runway.z,640,30,h+.058,'#424b4e','asphalt');
    flat(w,1790,330,340,112,h+.054,'#686d69','concrete');
    flat(w,1664,264,13,32,h+.057,'#5c6361','asphalt');
    flat(w,1868,266,13,34,h+.057,'#5c6361','asphalt');
    for (const side of [-1,1]) {
      flat(w,1780,runway.z+side*14.22,636,.18,h+.071,'#eeead4','paint',1000);
      for (let i=0;i<20;i++)
        add(w,1469+i*32.6,h+.105,runway.z+side*16,.24,.16,.24,'#c0d4d4','light_emissive','rounded',0,470,.48);
      for (let i=0;i<5;i++) {
        const xx = side < 0 ? runway.west + 13 : runway.east - 13;
        flat(w,xx,runway.z+(i-2)*4.1,10,1.08,h+.072,'#eeead4','paint',1050);
      }
    }
    for (let i = 0; i < 19; i++)
      flat(w,1482+i*32.9,runway.z,13,.28,h+.073,'#e6e3d0','paint',1000);
    for (const s of slots.plane) {
      flat(w,s.x,s.z,43,42,h+.069,'#717a76','concrete');
      for (const side of [-1,1]) {
        flat(w,s.x+side*20.4,s.z,.14,41,h+.083,'#d6ba73','paint',620);
        flat(w,s.x,s.z+side*20.3,40.9,.14,h+.083,'#d6ba73','paint',620);
      }
      flat(w,s.x,s.z-23,.17,48,h+.08,'#e3be68','paint',650);
    }
    for (const x of [1630,1725,1844,1949]) lamp(w,x,380,h,1);
    for (const x of [1883.7,1886.3])
      add(w,x,h+1.25,hangar.z,.23,2.5,.25,'#c2bc9c','metal','rounded',0,350);
    add(w,1885,h+2.44,hangar.z,2.82,.42,.25,'#3a5760','metal','rounded',0,450);
  }
  function dock(w) {
    const rows = [];
    for (let x = pier.west; x <= pier.east; x += 3)
      rows.push([1,-1].map(side => [x,deckHeight(x,pier.z),pier.z+side*pier.half]));
    H.addRibbon444(w,rows,{color:'#ab9b80',material:'wood',visibility:1200,layer:4,thickness:.36});
    for (let x=1298.5;x<1389;x+=3.7) {
      const h=deckHeight(x,pier.z);
      add(w,x,h+.015,pier.z,.12,.035,5.98,'#7d7463','wood','cube',0,580);
      add(w,x,h-1.12,pier.z-2.6,.34,2.30,.34,'#605749','wood','cylinder',0,650);
      add(w,x,h-1.12,pier.z+2.6,.34,2.30,.34,'#605749','wood','cylinder',0,650);
    }
    for (const x of [1298,1314,1330,1346,1362,1378]) {
      const h=deckHeight(x,pier.z);
      lamp(w,x,pier.z-2.52,h);
      w.solid(x,pier.z-2.52,.23,.23,true);
    }
    for (const berth of slots.boat) {
      add(w,berth.boardX,deckHeight(berth.boardX,pier.z)+.17,pier.z+2.5,.28,.34,.26,'#c7c7ad','metal','cylinder',0,420);
      add(w,berth.boardX,deckHeight(berth.boardX,pier.z)+.04,pier.z+1.6,2.65,.05,.16,'#4e7a78','paint','cube',0,250);
    }
    const p = port.pad;
    flat(w,p.x,p.z,p.w,p.d,p.y+.045,'#515e5f','concrete');
    for(const side of [-1,1]) {
      flat(w,p.x+side*1.44,p.z,.30,4.34,p.y+.057,'#f2d79b','paint',530);
      flat(w,p.x+side*9.3,p.z,.14,18.6,p.y+.059,'#e1c899','paint',530);
      flat(w,p.x,p.z+side*9.3,18.6,.14,p.y+.059,'#e1c899','paint',530);
    }
    flat(w,p.x,p.z,3.12,.30,p.y+.057,'#f2d79b','paint',530);
    strip(w,path([1390,329],[1390,345]),2.7,'#caba9d','paving',.071);
  }
  function wall(w,x,y,z,width,depth,h) {
    w.solid(x,z,width,depth,false);
    const q={x,y,z,w:width,d:depth,h,padding:.1}, cell=H.BLOCK;
    w.cameraOccluders.push(q);
    for(let i=Math.floor((x-width*.5)/cell);i<=Math.floor((x+width*.5)/cell);i++)
      for(let j=Math.floor((z-depth*.5)/cell);j<=Math.floor((z+depth*.5)/cell);j++) {
        const id=i+','+j, block=w.cameraCells.get(id);
        if(block) block.push(q);
        else w.cameraCells.set(id,[q]);
      }
  }
  function building(w, x, z, level, width, depth, color, trim, units = []) {
    const h = 4.35, front = z - depth/2;
    flat(w,x,front-1.18,width+1.5,3,level+.08,'#b5b2a2');
    add(w,x,level+h/2,z,width,h,depth,color,'masonry','rounded_smooth',0,930);
    add(w,x,level+h+.07,z,width+.8,.25,depth+.84,'#e7d8b8','concrete','rounded',0,990);
    add(w,x,level+h+.26,z,width-1.5,.18,depth-1.26,trim,'metal','rounded',0,770);
    add(w,x,level+2.92,front-.79,width+.72,.16,1.65,'#e2cc9f','metal','rounded',0,740);
    const doors = units.length ? units : [{ x }];
    for (const d of doors) {
      const px = d.x;
      add(w,px,level+1.20,front-.12,1.35,2.39,.20,'#e6d3b3','wood','rounded',0,630);
      add(w,px,level+1.17,front-.24,1.10,2.24,.13,trim,'wood','rounded',0,590);
      add(w,px+.35,level+1.09,front-.327,.12,.06,.08,'#d4b67a','metal','rounded',0,250);
      add(w,px+2.05,level+1.93,front-.10,2.54,1.52,.19,'#d7d6bc','masonry','rounded',0,670);
      add(w,px+2.05,level+1.95,front-.209,2.28,1.27,.075,'#557985','building_window','rounded',0,660);
      add(w,px+2.05,level+1.95,front-.261,.073,1.24,.045,'#e8d5b4','metal','cube',0,420);
      add(w,px,level+2.72,front-.29,.27,.14,.17,'#edcd87','light_emissive','rounded',0,400,.42);
    }
    for (const side of [-1,1]) {
      add(w,x+side*(width/2+.046),level+2.04,z, .08,1.22,3.34,'#617d82','building_window','rounded',0,750);
      add(w,x+side*(width/2+.06),level+.32,z,.19,.58,depth,'#9a917a','masonry','rounded',0,730);
    }
    wall(w,x,level+h/2,z,width,depth,h);
  }
  function plotShell(w, p) {
    const {x,z,y}=p, front=z-6.15, back=z+6.15, west=x-11.35, east=x+11.35;
    const ceiling=4.35, gate=1.69, color=p.colors['abc'.indexOf(p.id)], trim='#496b6f';
    const block=(xx,zz,width,depth)=>{
      add(w,xx,y+ceiling/2,zz,width,ceiling,depth,color,'masonry','cube',0,865);
      wall(w,xx,y+ceiling/2,zz,width,depth,ceiling);
    };
    block(west,z,.26,12.3);
    block(x,z,.26,12.3);
    block(east,z,.26,12.3);
    block(x,back,22.7,.25);
    const [left,right]=p.units;
    const frontSpans=[[west,left.x-gate/2],[left.x+gate/2,right.x-gate/2],[right.x+gate/2,east]];
    for(const [a,b] of frontSpans) {
      const width=b-a, xx=(a+b)/2;
      for(const [py,hh] of [[.61,1.22],[3.52,1.66]])
        add(w,xx,y+py,front,width,hh,.26,color,'masonry','cube',0,855);
      add(w,xx,y+1.96,front,width-.18,1.47,.105,'#8cabb0','translucent_glass','cube',0,690);
      for(const dx of [-width/2+.10,0,width/2-.1])
        add(w,xx+dx,y+1.96,front-.035,.11,1.49,.20,trim,'metal','cube',0,640);
      wall(w,xx,y+ceiling/2,front,width,.26,ceiling);
    }
    flat(w,x,z,22.44,12.15,y+.020,'#b69c77','wood',890);
    add(w,x,y+ceiling+.10,z,23.42,.28,13.06,'#e7d8b8','concrete','rounded',0,970);
    add(w,x,y+ceiling+.28,z,21.3,.18,11.04,trim,'metal','rounded',0,830);
    add(w,x,y+2.92,front-.74,23.3,.15,1.5,'#e2cc9f','metal','rounded',0,740);
    for (const [i,u] of p.units.entries()) {
      flat(w,u.x,u.door.z,3.1,2.65,y+.026,'#c6b795','paving',500);
      add(w,u.x-1.48,y+.25,u.door.z+.1,.45,.54,.46,'#887863','stone','rounded',0,430);
      add(w,u.x-1.48,y+.61,u.door.z+.1,.59,.52,.58,'#72895b','foliage','urban_crown',0,415);
      add(w,u.x,y+(2.59+ceiling)/2,front,gate,ceiling-2.59,.26,color,'masonry','cube',0,755);
      for(const side of [-1,1]) add(w,u.x+side*(gate/2+.032),y+1.27,front-.034,.11,2.54,.28,trim,'metal','rounded',0,620);
      add(w,u.x,y+2.588,front-.049,gate+.18,.135,.22,trim,'metal','rounded',0,620);
      add(w,u.x,y+2.72,front-.296,.27,.14,.17,'#edcd87','light_emissive','rounded',0,420,.42);
      const divider=i===0?x-.13:x+.13, edge=i===0?west+.13:east-.13;
      const room={ id:u.id,u,x:(edge+divider)/2,y,z,front,back:back-.13,
        west:Math.min(edge,divider),east:Math.max(edge,divider),gate,ceiling,open:0,hold:0,updated:-1,
        light:{ x:u.x,y:y+3.94,z:z+.5,radius:10,r:1.10,g:.90,b:.64 } };
      w.estate53.rooms.set(u.id,room);
      add(w,u.x,y+ceiling-.14,z,1.72,.08,.30,'#f3dfba','light_emissive','rounded',0,180,.53);
      add(w,u.x,y+.036,front+1.58,1.36,.021,1.39,'#a69779','fabric','rounded',0,160);
      const cabinX=edge+(i===0?1:-1)*.75;
      add(w,cabinX,y+.48,back-1.79,1.1,.95,2.36,'#9b927a','wood','rounded',0,190);
      add(w,cabinX,y+.985,back-1.79,1.15,.10,2.40,'#c9bc9e','stone','rounded',0,190);
      w.solid(cabinX,back-1.79,1.1,2.36,false);
    }
  }
  function villageBase(w) {
    building(w,1750,488,village.y,14,12,'#c7bba5','#3a6271');
    for (const s of slots.car) {
      flat(w,s.x,s.z,4.6,7.0,s.y+.046,'#68706a','paving',620);
      for (const side of [-1,1]) flat(w,s.x+side*2.1,s.z,.12,6.6,s.y+.060,'#d7c08a','paint',440);
    }
    for (const p of plots) {
      strip(w,p.walk,2.35,'#bdb696','paving',.045,710);
      for (const unit of p.units) strip(w,unit.walk,1.34,'#b8ad8c','paving',.043,665);
      lamp(w,p.x,497);
      add(w,p.x+13,p.y+.29,518,1.25,.58,.8,'#a0977d','stone','rounded',0,390);
      add(w,p.x+13,p.y+.76,518,1.31,.64,.86,'#637c51','foliage','urban_crown',0,385);
    }
    lamp(w,1741,477);
    lamp(w,1760,474);
    add(w,1744,village.y+1.15,477,.17,2.3,.17,'#698077','wood','rounded',0,390);
    add(w,1744,village.y+2.13,477,2.75,.71,.17,'#406874','wood','rounded',0,440);
  }
  function airShelter(w, level) {
    const h=apron.y, depth=24, zz=410, xs=level === 1 ? [1857,1903] : level === 2 ? [1765,1811] : [1673,1719];
    const xx=(xs[0]+xs[1])/2;
    add(w,xx,h+8.10,zz,47,.44,depth,'#a0a49a','metal','rounded_smooth',0,990);
    add(w,xx,h+3.90,zz+11.8,46,7.78,.52,'#899187','metal','rounded',0,955);
    wall(w,xx,h+3.9,zz+11.8,46,.52,7.78);
    for (const x of xs) {
      add(w,x,h+3.90,zz,.6,7.8,depth,'#818d89','metal','rounded',0,980);
      wall(w,x,h+3.9,zz,.6,depth,7.8);
    }
    for (const x of [xx-13,xx,xx+13]) {
      add(w,x,h+7.76,zz-11.5,8,.18,.30,'#ded6b2','light_emissive','rounded',0,620,.39);
      add(w,x,h+2.50,zz+11.48,6,2.4,.16,'#617c81','building_window','rounded',0,550);
    }
  }
  function floraBed(w, x, z, i) {
    const y=height(x,z);
    add(w,x,y+.24,z,5.5,.49,2.26,'#a69a81','stone','rounded_smooth',0,570);
    add(w,x,y+.50,z,5.05,.11,1.9,'#776451','sand','rounded',0,510);
    for (let k=0;k<4;k++)
      add(w,x+(k-1.5)*1.20,y+.77,z+.11*Math.sin(k*11),.95,.49,.84,
        ['#638b5a','#768f5b','#a58e63','#78916b'][(i+k)%4],'foliage','urban_crown',k,490);
    w.solid(x,z,5.5,2.26,true);
  }
  const upgrades = {
    housing(w, level) { if (plots[level-1]) plotShell(w,plots[level-1]); },
    furniture(w, level) {
      for(const [i,p] of plots.entries()) if ((w.estate53.improvements.housing || 0) > i) furnishPlot(w,p,level);
    },
    water(w, level) {
      const x = 1767+level*3.5, z=545, y=height(x,z);
      add(w,x,y+1.08,z,2.22,2.08,2.22,'#8daba9','metal','cylinder',0,780);
      add(w,x,y+1.08,z,2.30,.16,2.30,'#5f8688','metal','cylinder',0,740);
      w.solid(x,z,2.2,2.2,true);
    },
    power(w, level) {
      const x=1747+level*6.7,z=541,y=height(x,z);
      add(w,x,y+.75,z,.22,1.5,.22,'#59655f','metal','cylinder',0,550);
      const p=add(w,x,y+1.51,z,4.8,.14,2.9,'#3d657b','metal','rounded',0,620);
      p.pitch=-.28;
      for(const side of [-1,1]) add(w,x+side*2.42,y+1.54,z,.064,.05,2.86,'#a1afa7','metal','cube',0,600);
      w.solid(x,z,.24,.24,true);
    },
    garden(w, level) {
      for (let i=0;i<3;i++) floraBed(w,1758+i*7.5,506+level*4.3,i+level);
      if (level===1) {
        strip(w,path([1762,491],[1762,519]),2.3,'#beaf92','paving',.056,660);
        for (const p of plots) for (const sign of [-1,1]) {
          const x=p.x+sign*14;
          strip(w,path([x,497],[x,510]),1.6,'#b9ad8c','paving',.05,470);
          floraBed(w,x+sign*.8,513.4,(p.x+sign)%7);
        }
      }
    },
    cafe(w, level) {
      const x = 1692-level*2.2, z=466, y=height(x,z);
      if(level===1) building(w,x,z,y,8.3,6.3,'#baaa93','#56766b');
      for(let j=0;j<2;j++) {
        const a=x+j*3.1, b=z+5.2+level*1.4;
        add(w,a,y+.84,b,1.13,.15,1.13,'#a99c79','wood','cylinder',0,560);
        add(w,a,y+.40,b,.14,.8,.14,'#6c7568','metal','cylinder',0,505);
        add(w,a,y+2.28,b,2.1,.12,2.07,'#af7960','fabric','cone',0,520);
      }
    },
    harbor(w, level) {
      const x=1360+level*5.8, y=height(x,345);
      add(w,x,y+1.18,348.55,1.70,2.24,.27,'#728880','metal','rounded',0,520);
      add(w,x,y+2.22,348.68,1.5,.17,.15,'#ddbd7c','light_emissive','rounded',0,490,.45);
    },
    garage(w, level) {
      const s=slots.car[Math.min(slots.car.length-1,(level-1)*2)], y=s.y;
      add(w,s.x+2.8,y+3.14,s.z,8.5,.18,6.9,'#959986','metal','rounded',0,680);
      for (const dx of [-1.4,7.1]) {
        add(w,s.x+dx,y+1.61,s.z+3.11,.16,3.22,.17,'#5c7171','metal','cylinder',0,600);
        w.solid(s.x+dx,s.z+3.11,.16,.17,true);
      }
    },
    hangar: airShelter,
    security(w, level) {
      for(const x of [1749+level*7,1761+level*8]) lamp(w,x,464+level*2,undefined,1);
    }
  };

  function furnishPlot(w, p, level) {
    for (const [i,u] of p.units.entries()) {
      const r=w.estate53.rooms.get(u.id), side=i===0 ? 1 : -1;
      const tint=i===0 ? '#66817a' : '#a77866';
      if(level===1) {
        const x=r.x+side*3.86,z=r.z+.10;
        add(w,x,r.y+.38,z,1.01,.65,2.16,tint,'fabric','rounded',0,155);
        add(w,x+side*.36,r.y+.82,z,.33,.67,2.20,'#8c8e7c','fabric','rounded',0,150);
        for(const wing of [-1,1]) add(w,x-side*.16,r.y+.67,z+wing*.86,.62,.37,.36,tint,'fabric','rounded',0,145);
        w.solid(x,z,1.01,2.16,false);
        const bedX=r.x-side*2.82,bedZ=r.back-1.99;
        add(w,bedX,r.y+.38,bedZ,2.19,.68,2.03,'#9c896f','wood','rounded',0,155);
        add(w,bedX,r.y+.75,bedZ,2.1,.18,1.97,'#d1c5ae','fabric','rounded',0,155);
        add(w,bedX,r.y+.87,bedZ-.33,2.07,.10,1.12,tint,'fabric','rounded',0,145);
        for(const dx of [-.49,.49]) add(w,bedX+dx,r.y+.90,bedZ+.63,.62,.15,.44,'#e3d8c1','fabric','rounded',0,130);
        w.solid(bedX,bedZ,2.19,2.03,false);
      } else {
        const x=r.x-side*2.62,z=r.front+2.36;
        add(w,x,r.y+.76,z,1.33,.13,1.25,'#aa8f69','wood','rounded',0,165);
        add(w,x,r.y+.37,z,.16,.72,.16,'#5c6b62','metal','cylinder',0,155);
        w.solid(x,z,1.33,1.25,false);
        add(w,x-side*1.15,r.y+.77,z,.53,.51,.59,tint,'fabric','rounded',0,140);
        add(w,x,r.y+.86,z,.25,.17,.22,'#aa9067','masonry','rounded',0,145);
        add(w,x,r.y+.99,z,.29,.24,.3,'#6d8a5c','foliage','urban_crown',0,145);
        flat(w,r.x+side*2.45,r.z,2.46,3.15,r.y+.047,'#b28569','fabric',135);
      }
    }
  }
  function applyUpgrade(w, key, level) {
    const state = w.estate53, builder = upgrades[key];
    if (!state || typeof builder !== 'function') return false;
    const from = state.improvements[key] || 0, to = clamp(Math.floor(Number(level) || 0),0,3);
    if (from >= to) return false;
    const start = Object.keys(state.paid).map(name=>[name,w[name].length]);
    for (let n=from+1; n<=to; n++) {
      if (key === 'housing') {
        builder(w,n);
        if (plots[n-1]) for(let f=1; f<=(state.improvements.furniture || 0); f++) furnishPlot(w,plots[n-1],f);
      } else builder(w,n);
      state.improvements[key] = n;
    }
    for(const [name,index] of start)
      for(let i=index;i<w[name].length;i++) state.paid[name].add(w[name][i]);
    w.nearbyRegions473?.clear();
    return true;
  }
  function updatePorts(w) {
    if (!w.islandPorts53?.includes(port)) w.islandPorts53 = [...(w.islandPorts53 || []),port];
  }
  function setup(g) {
    const w=g?.world;
    if(!w) return null;
    if (worlds.has(w)) { updatePorts(w); return worlds.get(w); }
    H.islands53?.setup(g);
    const state = { center, bounds, runway, apron, hangar, slots, office, port, roads, plots, units: plots.flatMap(p=>p.units),
      improvements:Object.create(null), actors:new Map(), rooms:new Map(), localTime:0,
      paid:{boxes:new Set(),solids:new Set(),propSolids:new Set(),cameraOccluders:new Set()} };
    worlds.set(w,state);
    w.estate53 = state;
    w.estatePort53 = port;
    updatePorts(w);
    const before = w.boxes.length;
    islandMesh(w);
    state.terrainParts = w.boxes.length - before;
    for (const road of roads) strip(w,road,8.5,'#62686a','asphalt',.04,1260);
    for (const road of [main,ridge]) strip(w,road,.16,'#d5ccaa','paint',.052,900);
    airfield(w);
    dock(w);
    villageBase(w);
    landscape(w);
    w.explorationHubs.push({ id:5340,x:office.x,z:office.z,label:office.name,kind:'property' });
    w.explorationHubs.push({ id:5341,x:port.pad.x,z:port.pad.z,label:port.name,kind:'marina' });
    w.nearbyRegions473?.clear();
    if(g.nav445?.world===w) { g.nav445.network=null; g.nav445.base?.clear(); }
    return state;
  }
  function resetPaid(w,state) {
    for(const [name,items] of Object.entries(state.paid)) {
      if(items.size) w[name]=w[name].filter(o=>!items.has(o));
    }
    const removeIndexed = (cells, missing) => {
      for(const [id,items] of cells) {
        if(!items.some(missing)) continue;
        const remaining=items.filter(o=>!missing(o));
        if(remaining.length) cells.set(id,remaining);
        else cells.delete(id);
      }
    };
    removeIndexed(w.spatial,o=>state.paid.solids.has(o)||state.paid.propSolids.has(o));
    removeIndexed(w.cameraCells,o=>state.paid.cameraOccluders.has(o));
    for(const items of Object.values(state.paid)) items.clear();
    state.improvements=Object.create(null);
    state.rooms.clear();
    w.nearbyRegions473?.clear();
  }
  function sync(g) {
    const state=setup(g);
    if(!state) return null;
    const management=H.estate53 || RC?.estate53;
    const records=management?.snapshot?.(g);
    const levels=records?.upgrades || {};
    if(records && Object.entries(state.improvements).some(([key,level])=>(levels[key] || 0)<level)) resetPaid(g.world,state);
    for (const [key, level] of Object.entries(levels)) applyUpgrade(g.world,key,level);
    const claimed = new Set();
    for (const resident of management?.residents?.(g) || []) {
      const unit = state.units.find(u=>u.id===resident.unit);
      if (!unit) continue;
      claimed.add(resident.id);
      const current=state.actors.get(resident.id);
      if (current?.estateUnit === unit) continue;
      const a=H.createWalker(unit.door.x,unit.door.z,0,Number(resident.appearance)||53+claimed.size);
      Object.assign(a,{y:unit.door.y,appearance:Number(resident.appearance)>>>0,estateUnit:unit,estateResident:resident.id,estateName:resident.name,
        estateRoute:[unit.interior,...unit.walk],estateIndex:2,estateDirection:1,estateRest:1.8+claimed.size*.4,
        estateTrip:'stroll',estateCycle:0,estateActivity53:'stroll',estateGreetingAt:-20,estateInRange:false,estateLookUntil:0});
      state.actors.set(resident.id,a);
    }
    for(const id of state.actors.keys()) if(!claimed.has(id)) state.actors.delete(id);
    return state;
  }
  function face(a,target,dt) {
    const yaw=Math.atan2(a.x-target.x,a.z-target.z);
    a.yaw+=H.angleDiff(a.yaw,yaw)*(1-Math.exp(-dt*9));
  }
  function rest(a, activity, pose='walk') {
    a.vx=a.vz=0;
    a.estateActivity53=activity;
    a.navActivity=pose;
  }
  function voice(g,a,kind,options) {
    if(H.residentAI53?.voice) H.residentAI53.voice(g,a,kind,options);
    else RC?.sayReaction53?.(g,a,kind,options);
  }
  function nearPlayer(g,a) {
    if(!foot(g)||Math.abs(a.y-g.avatar.y)>1.4) return false;
    const distance=Math.hypot(a.x-g.avatar.x,a.z-g.avatar.z);
    return distance<5.2&&H.officerSightClear(g.avatar.x,g.avatar.z,a.x,a.z,g.world.nearby(a.x,a.z));
  }
  function localCars(g) {
    return [g.player,...g.parked,...g.civilian,...g.police,...g.wrecks].filter(c=>
      c&&c.x>1748&&c.x<1986&&c.z>466&&c.z<556);
  }
  function clearFoot(solids,cars,x,z,radius=.37) {
    if(!walkable(x,z)) return false;
    for(const q of solids) {
      const dx=x-clamp(x,q.x-q.hw,q.x+q.hw), dz=z-clamp(z,q.z-q.hd,q.z+q.hd);
      if(dx*dx+dz*dz<radius*radius) return false;
    }
    return !cars.some(c=>Math.abs(x-c.x)<5.5&&Math.abs(z-c.z)<5.5&&H.carWalkerContact(c,x,z,radius));
  }
  function threatAt(a,cars) {
    for(const c of cars) {
      const dx=a.x-c.x,dz=a.z-c.z;
      if(Math.abs(dx)>22||Math.abs(dz)>22||c.rollover||c.wrecked) continue;
      const speed=Math.hypot(c.vx||0,c.vz||0);
      if(speed<2.5) continue;
      const nx=c.vx/speed,nz=c.vz/speed, lead=dx*nx+dz*nz, sidelong=dx*nz-dz*nx;
      if(lead>-.75&&lead<Math.min(20,speed*1.12+2.35)&&Math.abs(sidelong)<2.24) return {car:c,nx,nz};
    }
    return null;
  }
  function escapeAt(actor,threat,solids,cars) {
    const {car,nx,nz}=threat, side=Math.sign((actor.x-car.x)*nz-(actor.z-car.z)*nx)||1;
    for(const [direction,away] of [[side,2.85],[-side,2.85],[side,1.85],[-side,1.85]]) {
      const x=actor.x+direction*nz*away, z=actor.z-direction*nx*away;
      let clear=true;
      for(let i=1;i<=7;i++) {
        if(!clearFoot(solids,cars,mix(actor.x,x,i/7),mix(actor.z,z,i/7))) { clear=false; break; }
      }
      if(clear) return point(x,z);
    }
    return {x:actor.x,z:actor.z};
  }
  function moveResident(a,target,pace,dt,solids,cars) {
    const dx=target.x-a.x,dz=target.z-a.z,d=Math.hypot(dx,dz);
    if(d<.12) { a.vx=a.vz=0; return true; }
    const paceAt=Math.min(pace,d/dt), vx=dx/d*paceAt,vz=dz/d*paceAt,x=a.x+vx*dt,z=a.z+vz*dt;
    if(!clearFoot(solids,cars,x,z)) { a.vx=a.vz=0; return false; }
    a.vx=vx; a.vz=vz; a.x=x; a.z=z; a.y=height(x,z); a.grounded=true;
    a.yaw+=H.angleDiff(a.yaw,Math.atan2(-dx,-dz))*(1-Math.exp(-dt*9));
    return false;
  }
  function beginTrip(a,state) {
    const u=a.estateUnit, end=u.walk.at(-1), p=plots.find(p=>p.units.includes(u));
    const profile=H.residentAI53?.mindOf?.(a)?.profile;
    const choices=state.improvements.garden ? ['stroll','garden','social'] : ['stroll','social'];
    const bias=profile==='social'?2:profile==='practical'?1:0;
    a.estateTrip=choices[(a.estateCycle+++(a.appearance>>>8)+bias)%choices.length];
    a.estateRoute=[u.interior,...u.walk];
    if(a.estateTrip==='garden') a.estateRoute.push(at(end.x,505.4),at(end.x,509.0));
    if(a.estateTrip==='social') {
      const side=Math.sign(u.x-p.x), x=p.x+side*1.08;
      a.estateRoute.push(at(x,497.2),at(x,499));
    }
    a.estateIndex=1; a.estateDirection=1;
    a.estateRest=6.6+(a.appearance%7)*.74;
  }
  function avoidVehicle(g,a,threat,solids,cars) {
    a.estateAvoid={ origin:point(a.x,a.z), destination:escapeAt(a,threat,solids,cars), safeAt:0, car:threat.car };
    a.panic=1.5;
    voice(g,a,'warning',{priority:2,mood:'scared'});
  }
  function stepResident(g,state,a,dt,cars) {
    const now=state.localTime, solids=g.world.nearby(a.x,a.z);
    const threat=threatAt(a,cars);
    if (threat&&!a.estateAvoid) avoidVehicle(g,a,threat,solids,cars);
    if (a.estateAvoid) {
      const q=a.estateAvoid;
      rest(a,'alert');
      if(threat) q.safeAt=now+1.2;
      a.panic=.45;
      if(now<q.safeAt) {
        if(moveResident(a,q.destination,3.35,dt,solids,cars)) face(a,q.car,dt);
      } else if(moveResident(a,q.origin,1.52,dt,solids,cars)) {
        a.estateAvoid=null; a.panic=0;
      }
      return;
    }
    const chatting=RC?.chat48?.active?.who===a&&RC.chat48.canContinue(g,a);
    if(chatting) {
      rest(a,'conversation','talk');
      face(a,g.avatar,dt);
      return;
    }
    if (!a.estateInRange&&nearPlayer(g,a)) {
      a.estateInRange=true;
      if(now-a.estateGreetingAt>17) {
        a.estateGreetingAt=now; a.estateLookUntil=now+1.22;
        voice(g,a,'greet',{priority:0,mood:'happy'});
      }
    } else if(a.estateInRange&&(!foot(g)||Math.hypot(g.avatar.x-a.x,g.avatar.z-a.z)>6.8)) a.estateInRange=false;
    if(a.estateLookUntil>now&&foot(g)) {
      rest(a,'greeting','talk'); face(a,g.avatar,dt);
      return;
    }
    const route=a.estateRoute, target=route[a.estateIndex];
    if (a.estateRest>0) {
      a.estateRest-=dt;
      const home=a.estateDirection===1&&a.estateIndex===1;
      const activity=home?'home':a.estateTrip;
      rest(a,activity,activity==='home'&&a.appearance%3===0?'phone':'walk');
      a.pause=a.navActivity==='phone'?.6:0;
      if(activity==='social') {
        const other=Array.from(state.actors.values()).find(w=>w!==a&&w.estateActivity53==='social'&&Math.hypot(w.x-a.x,w.z-a.z)<5);
        if(other) face(a,other,dt);
      }
      return;
    }
    a.navActivity='walk';a.pause=0;
    a.estateActivity53=a.estateDirection<0?'goingHome':a.estateTrip;
    if(!moveResident(a,target,1.22+(a.appearance%6)*.035,dt,solids,cars)) return;
    if(a.estateIndex===0) {
      beginTrip(a,state);
      return;
    }
    if(a.estateIndex===route.length-1&&a.estateDirection>0) {
      a.estateDirection=-1;
      a.estateRest=a.estateTrip==='garden'?5.4+(a.appearance%4):a.estateTrip==='social'?8.2:3.1;
    }
    a.estateIndex+=a.estateDirection;
  }
  function stepResidents(g,state,dt) {
    if(!state?.actors.size||dt<=0) return;
    const cars=localCars(g);
    state.localTime+=dt;
    for(const a of state.actors.values()) stepResident(g,state,a,dt,cars);
  }

  function foot(g) {
    return g.running&&!g.paused&&!g.over&&!g.showFullMap&&!g.missionBoardOpen&&!g.garageOpen&&!g.inside&&!g.inVehicle&&
      !g.boat444&&!g.roofVisit&&!g.flight51?.pilot&&!g.avatar.swim445&&g.onBus<0&&g.onTram<0&&
      !g.entryTransition&&!g.exitTransition&&!g.vehicleEntry;
  }
  function roomAt(rooms,a) {
    for(const r of rooms.values())
      if(a.x>r.west&&a.x<r.east&&a.z>r.front&&a.z<r.back&&a.y<r.y+r.ceiling) return r;
    return null;
  }
  function nearbyDoor(g) {
    if (!g?.world?.estate53||!foot(g)||g.avatar.x<1776||g.avatar.x>1960) return null;
    const a=g.avatar;
    for (const r of g.world.estate53.rooms.values())
      if (Math.hypot(a.x-r.u.x,a.z-r.front)<2.6&&Math.abs(a.y-r.y)<1.5) return r;
    return null;
  }
  function ownsInteraction(g) { return !!nearbyDoor(g); }
  function drawDoors(g, state, out) {
    for (const r of state.rooms.values()) {
      if(Math.hypot(r.u.x-g.cam.x,r.front-g.cam.z)>143) continue;
      const approach=a=>Math.abs(a.x-r.u.x)<2.45&&Math.abs(a.z-r.front)<3.4&&Math.abs(a.y-r.y)<1.6;
      const opening=(foot(g)&&approach(g.avatar))||r.hold>g.seconds||
        [...state.actors.values()].some(a=>a.estateUnit.id===r.id&&approach(a));
      const dt=r.updated<0 ? .16 : clamp(g.seconds-r.updated,0,.2);
      r.updated=g.seconds;
      r.open=clamp(r.open+(opening?1:-1)*dt*6.3,0,1);
      const x=r.u.x+1.72*r.open,z=r.front+.044;
      const door=H.box(x,r.y+1.22,z,r.gate-.03,2.42,.112,'#537477',0,4);
      door.material='wood'; door.shape='rounded'; door.estateDoor53=r.id;
      const glass=H.box(x,r.y+1.60,z-.061,r.gate*.59,.84,.032,'#a0bdc3',0,4);
      glass.material='translucent_glass'; glass.shape='rounded';
      const handle=H.box(x-r.gate*.29,r.y+1.09,z-.064,.075,.18,.047,'#dfbf83',0,4);
      handle.material='metal'; handle.shape='rounded';
      out.push(door,glass,handle);
    }
  }

  function paintMap(ctx, world, transform) {
    const project=typeof transform==='function' ? transform : (x,z)=>[x,z];
    const plotted = (x,z) => { const p=project(x,z); return Array.isArray(p) ? p : [p.x,p.y??p.z]; };
    const line = (points,color,width,closed=false) => {
      ctx.beginPath();
      points.forEach((p,i)=>{ const [x,y]=plotted(p.x,p.z); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
      if (closed) { ctx.closePath(); ctx.fillStyle=color; ctx.fill(); }
      else { ctx.strokeStyle=color; ctx.lineWidth=width; ctx.stroke(); }
    };
    ctx.save();
    line(Array.from({length:56},(_,i)=>outline(i*TAU/56)),'#839269',0,true);
    line(path([runway.west,runway.north],[runway.east,runway.north],[runway.east,runway.south],[runway.west,runway.south]),'#4d6569',0,true);
    line(main,'#697775',1.4);
    line(airport,'#697775',1.2);
    line(harborWalk,'#b1986d',1.25);
    if (world?.estate53) {
      const [x,y]=plotted(office.x,office.z);
      ctx.fillStyle=port.color; ctx.beginPath(); ctx.arc(x,y,3,0,TAU); ctx.fill();
    }
    ctx.restore();
  }

  function extendSurface() {
    const ground=H.outdoorHeight, foot=H.walkerGround473, walk=H.marinaWalk444, swim=H.canSwim445, boat=H.boatWater444;
    H.outdoorHeight=(x,z)=>walkable(x,z) ? height(x,z) : ground(x,z);
    H.walkerGround473=a=>!a.deck443&&!a.coastDeck461&&walkable(a.x,a.z) ? height(a.x,a.z) : foot(a);
    H.marinaWalk444=(x,z)=>walkable(x,z)||walk(x,z);
    H.canSwim445=(x,z)=>!walkable(x,z)&&(swim(x,z)||x>1288&&x<2280&&z>-135&&z<743);
    H.boatWater444=(x,z)=>!walkable(x,z)&&boat(x,z);
    const road=H.isAsphalt;
    H.isAsphalt=(x,z)=>paved(x,z)||road(x,z);
  }
  extendSurface();

  H.estate53World = H.estateWorld53 = { bounds, mapBounds, flightBounds, contains, containsLand:contains, coast, height, walkable, drivable, pierAt:deckHeight, paved,
    center, runway, apron, hangar, slots, plots, port, office, setup, sync, applyUpgrade, paintMap, ownsInteraction };
  RC?.installers.push(Game=>{
    const P=Game.prototype, update=P.update, dynamic=P.buildDynamic, restart=P.restart, attach=P.attachImportedModels441;
    P.attachImportedModels441=function(...args) { sync(this); return attach.apply(this,args); };
    P.restart=function(...args) { const r=restart.apply(this,args); sync(this); return r; };
    const interact=P.toggleVehicle, updateCamera=P.updateCamera, sceneLights=P.sceneLights, updateHUD=P.updateHUD;
    P.toggleVehicle=function(...args) {
      const r=nearbyDoor(this);
      if(!r) return interact.apply(this,args);
      r.hold=this.seconds+4;
      this.showInfo('דלת הדירה נפתחת · '+r.id.toUpperCase(),1.7);
    };
    P.updateCamera=function(dt) {
      const result=updateCamera.call(this,dt), state=this.world.estate53;
      const r=state&&foot(this)&&roomAt(state.rooms,this.avatar);
      if (r) {
        const c=this.cam;
        c.x=clamp(c.x,r.west+.32,r.east-.32); c.z=clamp(c.z,r.front+.22,r.back-.32);
        c.y=clamp(c.y,r.y+1.28,r.y+r.ceiling-.21);
        c.tx=clamp(c.tx,r.west+.40,r.east-.40); c.tz=clamp(c.tz,r.front+.18,r.back-.4);
      }
      return result;
    };
    P.sceneLights=function() {
      const out=sceneLights.call(this), state=this.world.estate53;
      const r=state&&foot(this)&&roomAt(state.rooms,this.avatar);
      return r ? [r.light,...out.slice(0,11)] : out;
    };
    P.updateHUD=function() {
      const out=updateHUD.call(this), r=nearbyDoor(this);
      if (r) {
        const hint=document.getElementById('interact-hint');
        if(hint) { hint.textContent='דירה '+r.id.toUpperCase()+' · E לפתיחת הדלת'; hint.classList.remove('hidden'); }
      }
      return out;
    };
    P.update=function(dt) {
      const state=setup(this), result=update.call(this,dt);
      const a=this.flight51?.pilot?this.flight51.plane:this.inVehicle?this.player:this.avatar;
      if(this.running&&!this.paused&&!this.over&&!this.inside&&a?.x>1510&&a.x<2110&&a.z>365&&a.z<655&&
        a.y<32&&!this.showFullMap&&!this.missionBoardOpen&&!this.garageOpen&&!document.hidden)
        stepResidents(this,state,clamp(dt,0,.08));
      return result;
    };
    P.buildDynamic=function() {
      const out=dynamic.call(this), state=setup(this);
      if(this.inside||this.cam.x<1510||this.cam.x>2110) return out;
      drawDoors(this,state,out);
      for(const a of state.actors.values()) {
        const d=Math.hypot(a.x-this.cam.x,a.z-this.cam.z);
        if(d<135) H.streetCharacterPose32(a,out,this.seconds,false,d,this.renderer instanceof H.GLRenderer);
      }
      return out;
    };
  });
})(Heatline);
