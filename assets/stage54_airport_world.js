/* SUNSET STATE 54 — walk-in airport terminal, furnishings and public routes. */
(function (H) {
  'use strict';
  if (new URLSearchParams(location.search).has('airport54Off')) return;

  const RC = H.realism39;
  const groundBeforeTerminal = H.outdoorHeight;
  const clamp = H.clamp;
  const clearance = .56;
  const palette = {
    stone: '#d7c9ae', shell: '#c1bfb0', edge: '#e8ded0', metal: '#657e80', glass: '#8fbdc2',
    fixture: '#d2d3c1', dark: '#263b47', teal: '#3f7375', green: '#579489', gold: '#e2b46e',
    amberLight: '#ffe3a9', whiteLight: '#eaf6ee', wood: '#aa7e58'
  };
  let active = null;

  function layout({ x, z, base, width, depth, entry }) {
    const floorY = base + .29, hw = width / 2, hd = depth / 2;
    const front = -hd, rear = hd, main = entry.x - x, arrivals = -63.15;
    const frontDoors = [{ u: main, width: 9.4, id: 'departures' }, { u: arrivals, width: 7.6, id: 'arrivals' }];
    const gateDoors = [{ u: -51.4, width: 6.0, id: 'A' }, { u: 51.7, width: 6.0, id: 'B' }];
    const raw = (u, v) => groundBeforeTerminal(x + u, z + v);
    // The existing forecourt starts 17.2 m ahead of the front wall. Match its grade.
    const ramps = [...frontDoors.map(door => ({ ...door, a:front-19.25, mid:front-17.2, b:front, elevation:.126 })),
      ...gateDoors.map(door => ({ ...door, a:rear+11.6, mid:rear+8.8, b:rear, elevation:.081 }))];
    function contains(xx, zz, inset = 0) {
      return Math.abs(xx - x) <= hw - inset && Math.abs(zz - z) <= hd - inset;
    }
    function floorAt(xx, zz) {
      const u = xx - x, v = zz - z;
      if (contains(xx, zz)) return floorY;
      for (const r of ramps) {
        if (Math.abs(u - r.u) > (r.width + .7) / 2 || v < Math.min(r.a, r.b) || v > Math.max(r.a, r.b)) continue;
        const start = raw(u,r.a), landing = raw(u,r.mid)+r.elevation;
        const beforeLanding = (v-r.mid)*(r.a-r.mid)>0;
        if (beforeLanding) return H.lerp(start,landing,(v-r.a)/(r.mid-r.a));
        return H.lerp(landing,floorY,(v-r.mid)/(r.b-r.mid));
      }
      return null;
    }
    const point = (u, v, yaw) => ({ x: x + u, z: z + v, y: floorAt(x + u, z + v) ?? raw(u, v), yaw });
    const bounds = { west: x - hw, east: x + hw, north: z + front, south: z + rear };
    const entryPoints = { outside: point(main, entry.z - z, Math.PI), threshold: point(main, front, Math.PI),
      inside: point(main, front + 5.9, Math.PI) };
    const zones = {
      arrivals: [-hw, -33, front, 9], checkIn: [-33, 20, front, 5], lobby: [20, 64, front, -5],
      security: [20, 63, -5, 6], cafe: [64, hw, front, 7], concourse: [-hw, hw, 6, 14],
      gateA: [-hw, 0, 14, rear], gateB: [0, hw, 14, rear]
    };
    const rooms = Object.fromEntries(Object.entries(zones).map(([id, [u0,u1,v0,v1]]) => [id,
      { id, west: x + u0, east: x + u1, north: z + v0, south: z + v1, y: floorY }]));
    return { x,z,base,width,depth,hw,hd,front,rear,main,arrivals,floorY,point,contains,floorAt,bounds,ramps,
      frontDoors,gateDoors,entry: entryPoints,rooms,zones: rooms, walls: [], obstacles: [], seats: [], queues: [],
      gates: [], staff: [], lights: [], signs: [], stats: { pieces: 0, wallPieces: 0, cameraWalls: 0 } };
  }

  function box(w, s, u, v, h, width, height, depth, color, material, cap = 145, shape = 'cube', level = 4, glow = 0) {
    const a = H.box(s.x + u, s.floorY + h, s.z + v, width, height, depth, color, 0, level, glow);
    a.material = material;
    a.shape = shape;
    a.visibilityCap = cap;
    a.airport54 = true;
    w.add(a);
    s.stats.pieces++;
    return a;
  }

  function solid(w, s, u, v, width, depth, id, lowSight = true) {
    const a = { id, x: s.x + u, z: s.z + v, hw: width / 2, hd: depth / 2 };
    s.obstacles.push(a);
    w.solid(a.x, a.z, width, depth, false);
    if (lowSight) w.solids.at(-1).lowSight472 = true;
    return a;
  }

  function camera(w, s, u, v, width, height, depth, h = height / 2) {
    const a = { x: s.x + u, y: s.floorY + h, z: s.z + v, w: width, h: height, d: depth, padding: .12 };
    w.cameraOccluders.push(a);
    s.stats.cameraWalls++;
    const cell = H.BLOCK;
    for (let i = Math.floor((a.x - width / 2) / cell); i <= Math.floor((a.x + width / 2) / cell); i++) {
      for (let j = Math.floor((a.z - depth / 2) / cell); j <= Math.floor((a.z + depth / 2) / cell); j++) {
        const key = `${i},${j}`, list = w.cameraCells.get(key) || [];
        list.push(a);
        w.cameraCells.set(key, list);
      }
    }
  }

  function wall(w, s, u, v, width, height, depth, id) {
    const a = solid(w, s, u, v, width, depth, id, false);
    s.walls.push({ ...a, width, depth, height, y: s.floorY });
    s.stats.wallPieces++;
    camera(w, s, u, v, width, height, depth);
  }

  function flat(w, s, u, v, width, depth, color, material = 'paint', h = .021, cap = 220) {
    return box(w, s, u, v, h - .015, width, .03, depth, color, material, cap, 'cube', 3);
  }

  function light(w, s, u, v, h, radius, warm = false) {
    const a = { x:s.x + u, y:s.floorY + h, z:s.z + v, radius, r:warm ? 1.42 : 1.18,
      g:warm ? 1.12 : 1.29, b:warm ? .78 : 1.30, airport54:true };
    s.lights.push(a);
    w.lights.push(a);
  }

  function board(w, s, id, name, caption, u, v, h, width, normalZ = -1, reach = 37, finish = palette.green) {
    box(w,s,u,v,h,width,.75,.26,palette.dark,'metal',reach + 46,'rounded');
    box(w,s,u,v + .141 * normalZ,h - .30,width - .17,.054,.035,finish,'light_emissive',reach + 32,'cube',5,.36);
    const sign = { id:`airport54-${id}`, name, caption, x:s.x + u, z:s.z + v + .17 * normalZ, y:s.floorY + h,
      reach, normalZ, color:'#f8dfb0' };
    s.signs.push(sign);
    H.stage53Shops?.registerSign(w, sign);
  }

  function buildSurfaces(w, s) {
    const { hw,hd,front,rear,ramps } = s;
    box(w,s,0,0,-.17,s.width,.34,s.depth,palette.stone,'travertine471',1250,'cube',3);
    flat(w,s,0,-16,s.width - .65,19,'#d6cbb4','paving',.008,450);
    flat(w,s,0,10,s.width - 1,7,'#9faeac','paving',.009,450);
    flat(w,s,0,21.8,s.width - 1,14.1,'#a5b6b2','paving',.008,450);
    for (const v of [6.52,13.48]) flat(w,s,0,v,s.width - 1.5,.11,'#f5e4b9','paint',.019,350);
    for (let u = -hw + 9; u < hw - 7; u += 9.2) {
      flat(w,s,u,10,.055,6.9,'#889d9a','paint',.016,180);
      flat(w,s,u,-16,.055,18.9,'#beb29a','paint',.016,180);
    }
    for (const r of ramps) {
      const lowZ = Math.min(r.a,r.b), highZ = Math.max(r.a,r.b);
      const section = v => [-1,1].map(side => {
        const u = r.u + side * (r.width + .65) / 2, b = s.point(u,v);
        return [b.x,b.y + .006,b.z];
      });
      const before = w.boxes.length;
      H.addRibbon444(w,[section(lowZ),section(r.mid),section(highZ)],{ color:'#bcb5a4', material:'paving', visibility:450, layer:3, thickness:.12 });
      for (const a of w.boxes.slice(before)) { a.airport54 = true; s.stats.pieces++; }
      flat(w,s,r.u,r.b + (r.b === front ? 1.3 : -1.3),r.width - .4,2.04,'#526365','rubber',.027,260);
      for (let n = -2; n <= 2; n++) flat(w,s,r.u + n * r.width / 5.5,r.b + (r.b === front ? .32 : -.32),.39,.13,palette.gold,'paint',.038,160);
    }
    const roofLine = 12.95;
    for (const v of [front,rear])
      box(w,s,0,v,roofLine,s.width + .57,.63,.85,'#8a9597','anodized471',1750,'rounded');
    for (const u of [-hw,hw])
      box(w,s,u,0,roofLine,.85,.63,s.depth + .54,'#8a9597','anodized471',1750,'rounded');
  }

  function buildFacade(w, s) {
    const { front,rear,hw,hd } = s;
    const cap = 900, fullHeight = 12.73;
    for (const [v, doors] of [[front,s.frontDoors],[rear,s.gateDoors]]) {
      const spans = [...doors].sort((a,b) => a.u-b.u);
      let cursor = -hw;
      const panel = (lo, hi) => {
        const mid = (lo+hi)/2, span = hi-lo;
        wall(w,s,mid,v,span,fullHeight,.36,'facade');
        box(w,s,mid,v,.37,span,.74,.39,palette.shell,'travertine471',cap);
        box(w,s,mid,v,4.65,span - .09,7.88,.115,palette.glass,'clear_glass472',cap);
        box(w,s,mid,v,10.6,span - .09,4.02,.142,'#83a2a5','translucent_glass',cap);
        for (const h of [.78,3.65,8.64])
          box(w,s,mid,v,h,span,.16,.24,h === 3.65 ? '#c9b192' : palette.metal,'anodized471',cap);
        const panels = Math.ceil(span / 5.35);
        for (let i = 0; i <= panels; i++) {
          const u = lo + i * span / panels;
          box(w,s,u,v,6.77,.13,11.95,.28,palette.metal,'anodized471',cap);
          if (i % 3 === 1) box(w,s,u,v,2.48,.40,3.50,.32,'#becbc9','metal',430,'rounded');
        }
      };
      for (const door of spans) {
        const left = door.u - door.width / 2, right = door.u + door.width / 2;
        panel(cursor,left);
        cursor = right;
        box(w,s,door.u,v,8.57,door.width,8.16,.13,palette.glass,'clear_glass472',cap);
        box(w,s,door.u,v,4.21,door.width + .61,.29,.81,palette.dark,'metal',720,'rounded');
        box(w,s,door.u,v,4.02,door.width - .25,.061,.22,palette.amberLight,'light_emissive',420,'cube',5,.56);
        for (const side of [-1,1]) {
          box(w,s,door.u+side*(door.width/2+.14),v,2.10,.28,4.2,.58,palette.metal,'anodized471',720);
          box(w,s,door.u+side*(door.width/2-.46),v+.37,1.79,.82,3.56,.075,'#a3cacc','clear_glass472',380);
          box(w,s,door.u+side*(door.width/2-.47),v+.38,1.04,.79,.069,.085,palette.gold,'paint',235);
        }
        camera(w,s,door.u,v,door.width,8.78,.36,8.55);
      }
      panel(cursor,hw);
    }
    for (const u of [-hw,hw]) {
      wall(w,s,u,0,.55,fullHeight,s.depth,'end-wall');
      box(w,s,u,0,3.52,.38,7.05,s.depth,palette.shell,'masonry',1000);
      box(w,s,u,0,9.8,.25,5.70,s.depth - .17,'#7eaaaf','translucent_glass',850);
      box(w,s,u,0,7.10,.51,.21,s.depth,palette.metal,'anodized471',850);
      for (let v = -hd + 4; v < hd; v += 5.4) box(w,s,u,v,6.36,.52,12.72,.28,palette.edge,'masonry',850);
    }
    board(w,s,'entrance','נמל התעופה סאנסט','Sunset International · Departures',s.main,front - .67,4.81,13.95,-1,68);
    board(w,s,'arrivals-door','נחיתות · איסוף נוסעים','Arrivals · Passenger pick-up',s.arrivals,front - .67,4.79,10,-1,53);
    board(w,s,'exit','יציאה לעיר','Exit · Ground transport',s.main,front + .67,4.77,9,1,36);
  }

  function counter(w,s,u,v,width,depth,{ color=palette.teal, surface=palette.edge, id='counter' }={}) {
    box(w,s,u,v,.54,width,1.08,depth,color,'masonry',175,'rounded');
    box(w,s,u,v,1.08,width+.12,.108,depth+.12,surface,'travertine471',165,'rounded');
    box(w,s,u,v - depth / 2 - .03,.74,width-.24,.085,.06,palette.gold,'anodized471',130);
    solid(w,s,u,v,width+.12,depth+.12,id);
  }

  function planters(w,s,u,v,kind) {
    box(w,s,u,v,.35,1.44,.70,1.44,kind === 'cafe' ? '#a59983' : '#bebbae','travertine471',140,'cylinder');
    box(w,s,u,v,1.12,1.06,1.65,1.06,'#395c4d','foliage',142,'urban_crown');
    box(w,s,u+.23,v-.14,1.62,.97,1.21,1.03,'#627a53','foliage',118,'urban_crown');
    solid(w,s,u,v,1.44,1.44,'planter',false);
  }

  function fixture(w,s,u,v,large,warm) {
    const h = large ? 6.22 : 4.66, width = large ? 5.05 : 2.8;
    for (const dx of [-width * .32,width * .32]) box(w,s,u+dx,v,h + 1.62,.057,3.14,.057,palette.metal,'metal',150);
    box(w,s,u,v,h,width,.22,.83,palette.fixture,'metal',183,'rounded');
    box(w,s,u,v,h-.14,width-.28,.087,.64,warm ? palette.amberLight : palette.whiteLight,'light_emissive',185,'rounded',5,.62);
    light(w,s,u,v,h-.34,large ? 13.8 : 10,warm);
  }

  function stanchions(w,s,u,v0,v1,side,id) {
    const length = v1 - v0;
    for (const v of [v0,v0 + length/2,v1]) {
      box(w,s,u,v,.43,.075,.86,.075,'#728586','metal',97,'cylinder');
      box(w,s,u,v,.045,.24,.078,.24,'#657376','metal',90,'cylinder');
    }
    box(w,s,u,(v0+v1)/2,.77,.061,.103,length,'#3b666d','fabric',115);
    solid(w,s,u,(v0+v1)/2,.14,length+.14,`queue-${id}-${side}`);
  }

  function buildCheckIn(w,s) {
    const counters = [-24,-17.1,-10.2,-3.3,3.6,10.5];
    flat(w,s,-6.85,-10.5,42,13.25,'#acbaba','paving',.018,290);
    board(w,s,'check-in','צ׳ק-אין · מסירת כבודה','Check-in and bag drop',-6.85,-7.31,4.65,14.25,-1,43);
    for (const [i,u] of counters.entries()) {
      const id = `checkin-${i+1}`, queueStart = -14.4, service = s.point(u,-6.46,Math.PI);
      counter(w,s,u,-4.72,3.94,1.57,{ id });
      box(w,s,u-1.21,-4.22,1.33,.54,.32,.12,'#375762','metal',100,'rounded');
      box(w,s,u-1.21,-4.295,1.35,.43,.24,.038,'#9cdbd2','light_emissive',91,'cube',5,.34);
      box(w,s,u+1.10,-3.39,.38,1.04,.74,2.07,'#424c50','rubber',103,'rounded');
      solid(w,s,u+1.10,-3.39,1.04,2.07,'bag-drop');
      board(w,s,id,`${i+1}`,'CHECK-IN',u,-4.84,2.75,2.10,-1,18);
      for (const side of [-1,1]) stanchions(w,s,u+side*1.06,queueStart,-8.1,side,id);
      s.queues.push({ id, zone:'checkIn', entry:s.point(u,-16.5), service, exit:s.point(u+2.61,-7.07),
        points:[queueStart+.31,-12.31,-10.42,-8.52].map(v => s.point(u,v,Math.PI)) });
      s.staff.push({ id, role:'check-in', point:s.point(u-.42,-3.15,0), yaw:0 });
    }
  }

  function buildSecurity(w,s) {
    const lanes = [s.main, s.main + 10.8];
    let cursor = 20.8;
    board(w,s,'security','בידוק ביטחוני','Security screening · Gates A and B',s.main+.1,-.78,4.68,14.3,-1,39);
    flat(w,s,39.2,0,33.5,10,'#b1c1bb','paving',.019,246);
    for (const [i,u] of lanes.entries()) {
      const left = u - 1.62, right = u + 1.62;
      const wallU = (cursor+left)/2, wallW = left - cursor;
      box(w,s,wallU,0,2.06,wallW,4.12,.48,'#718b8c','masonry',235,'rounded');
      wall(w,s,wallU,0,wallW,4.12,.48,'screening');
      for (const side of [-1,1]) {
        box(w,s,u+side*1.49,.13,1.34,.28,2.68,.46,'#6e8586','anodized471',140,'rounded');
        box(w,s,u+side*1.36,-.11,2.06,.055,.35,.038,'#93e3b7','light_emissive',105,'cube',5,.44);
      }
      box(w,s,u,.12,2.72,3.22,.26,.49,'#909b96','metal',160,'rounded');
      camera(w,s,u,.12,3.22,.24,.49,2.72);
      flat(w,s,u,-1.13,2.28,1.43,'#526f74','rubber',.038,150);
      const id = `security-${i+1}`;
      for (const side of [-1,1]) stanchions(w,s,u+side*1.23,-6.62,-1.92,side,id);
      s.queues.push({ id, zone:'screening', entry:s.point(u,-8.05), service:s.point(u,.32,Math.PI),
        exit:s.point(u,5.1), points:[-6.26,-4.92,-3.56,-2.19].map(v=>s.point(u,v,Math.PI)) });
      cursor = right;
    }
    const wallU = (cursor+62.6)/2;
    box(w,s,wallU,0,2.06,62.6-cursor,4.12,.48,'#718b8c','masonry',235,'rounded');
    wall(w,s,wallU,0,62.6-cursor,4.12,.48,'screening');
    counter(w,s,56.4,2.68,4.95,2.61,{ color:'#53656d', id:'x-ray' });
    box(w,s,56.69,2.68,1.51,2.10,.81,1.52,'#869896','metal',145,'rounded');
    box(w,s,55.62,2.68,1.39,.06,.46,1.04,'#223540','rubber',105);
    s.staff.push({ id:'screening-1', role:'screening', point:s.point(s.main+2.6,2.05,-Math.PI/2), yaw:-Math.PI/2 },
      { id:'screening-2', role:'screening', point:s.point(51,3.9,-Math.PI/2), yaw:-Math.PI/2 });
  }

  function bench(w,s,u,v,zone,color) {
    box(w,s,u,v+.06,.34,3.55,.11,.43,palette.metal,'anodized471',119,'rounded');
    for (const du of [-1.31,1.31]) box(w,s,u+du,v+.06,.19,.16,.37,.57,palette.metal,'metal',104,'rounded');
    box(w,s,u,v+.33,.70,3.55,.63,.17,color,'fabric',142,'rounded');
    for (let i=0;i<4;i++) {
      const px = u + (i - 1.5) * .84;
      box(w,s,px,v-.10,.445,.76,.13,.61,color,'fabric',135,'rounded');
      s.seats.push({ id:`${zone}-${s.seats.length}`, zone, point:s.point(px,v-.14,0), seatY:s.floorY+.51,
        approach:s.point(px,v-1.23,Math.PI), yaw:0 });
    }
    solid(w,s,u,v-.035,3.55,.91,'bench');
  }

  function coveredGate(w,s,door,index) {
    const { u,id } = door, v = s.rear, side = index ? -1 : 1;
    box(w,s,u,v+3.74,3.54,6.47,.24,7.4,palette.metal,'anodized471',680,'rounded');
    box(w,s,u,v+3.73,3.39,6.13,.068,6.98,palette.whiteLight,'light_emissive',303,'cube',5,.39);
    for (const dx of [-3.04,3.04]) {
      for (const dz of [1.18,6.88]) {
        box(w,s,u+dx,v+dz,1.79,.24,3.54,.30,palette.metal,'anodized471',440);
        solid(w,s,u+dx,v+dz,.25,.31,'boarding-canopy');
      }
      box(w,s,u+dx,v+4.42,.47,.17,1.00,5.08,'#6b8588','anodized471',245,'rounded');
      solid(w,s,u+dx,v+4.42,.17,5.08,'boarding-guide');
    }
    // The final turn follows a shielded ground service spur alongside the original jetway.
    const shieldZ = v+10.0;
    box(w,s,u+side*4.10,shieldZ,1.49,3.6,2.97,.25,'#809396','masonry',325);
    wall(w,s,u+side*4.10,shieldZ,3.6,2.97,.25,'boarding-screen');
    box(w,s,u+side*6.03,shieldZ+1.34,1.49,.25,2.97,2.92,'#aeb4a6','masonry',325);
    wall(w,s,u+side*6.03,shieldZ+1.34,.25,2.97,2.92,'boarding-screen');
    const route = [s.point(u,v-3.3,Math.PI),s.point(u,v+3.55),s.point(u,v+11.45),s.point(u+side*4.52,v+11.45)];
    board(w,s,`boarding-${id}`,`שער ${id} · יציאה לרחבה`,`Gate ${id} · Apron access`,u,v-.61,3.58,5.35,-1,28);
    return route;
  }

  function buildGates(w,s) {
    const groups = [[-100,-89,-78,-68,-34,-23,-12], [8,19,30,66,77,88,100]];
    for (const [i,door] of s.gateDoors.entries()) {
      const {u,id} = door, zone = `gate${id}`, deskU = u + 7.42;
      const boarding = s.point(u,s.rear-3.3,Math.PI), desk = s.point(deskU,21.52,Math.PI);
      const boardRoute = coveredGate(w,s,door,i);
      counter(w,s,deskU,23.4,4.22,1.68,{ color:i ? '#4b7579' : '#527b70', id:`desk-${id}` });
      box(w,s,deskU+.82,23.64,1.39,.58,.36,.11,'#293e51','metal',108,'rounded');
      box(w,s,deskU+.82,23.573,1.39,.48,.27,.025,'#9fcdce','light_emissive',87,'cube',5,.55);
      board(w,s,`gate-${id}`,`שער ${id}`,`Gate ${id} · Departures`,deskU,23.4,4.62,7.45,-1,38);
      box(w,s,deskU-.28,25.89,2.42,4.61,1.46,.23,'#293b47','metal',179,'rounded');
      for(const h of [2.14,2.45,2.76]) {
        box(w,s,deskU-1.26,25.757,h,1.40,.055,.026,'#b9c6c6','light_emissive',100,'cube',5,.34);
        box(w,s,deskU+.84,25.755,h,1.38,.057,.026,h>2.45?'#e4bf7f':'#82b8a9','light_emissive',100,'cube',5,.34);
      }
      const queue = [15.76,17.54,19.31,20.72].map(v=>s.point(deskU,v,Math.PI));
      for (const side of [-1,1]) stanchions(w,s,deskU+side*1.03,15.45,20,side,id);
      s.queues.push({ id:`boarding-${id}`, zone, entry:s.point(deskU,14.35), service:desk,
        exit:s.point(deskU-2.32,21.55), points:queue });
      s.gates.push({ id, label:`שער ${id}`, point:desk, desk, boarding, exit:boardRoute.at(-1), queue, board:boardRoute });
      s.staff.push({ id:`gate-${id}`, role:'gate', gate:id, point:s.point(deskU,24.87,0), yaw:0 });
      for (const [k,bu] of groups[i].entries()) {
        for (const v of [17.62,24.66]) bench(w,s,bu,v,zone,['#487377','#567d76','#526b78'][k%3]);
      }
      for (const bu of [u-9.45,u+12.4]) planters(w,s,bu,27.02,'gate');
    }
  }

  function carousel(w,s,u,v,id) {
    const sgn = id === 1 ? -1 : 1;
    box(w,s,u,v,.29,22.4,.58,7.06,'#717e7e','anodized471',192,'rounded_smooth');
    box(w,s,u,v,.61,22.2,.16,6.91,'#36474b','rubber',190,'rounded_smooth');
    box(w,s,u,v,.71,14.9,.30,3.24,'#89988e','metal',162,'rounded_smooth');
    box(w,s,u,v,.89,13.1,.085,2.44,'#b4c0b2','anodized471',157,'rounded_smooth');
    for(const side of [-1,1]) {
      for(let dx=-8.4;dx<8.7;dx+=.72) box(w,s,u+dx,v+side*2.60,.699,.028,.025,1.54,'#607477','rubber',77);
    }
    for (const [dx,dz,color] of [[-7.5,-2.65,'#786052'],[-3.65,2.69,'#425e70'],[5.19,-2.63,'#94694c'],[8.59,2.10,'#80917f']]) {
      box(w,s,u+dx*sgn,v+dz,.855,.61,.32,.48,color,'fabric',132,'rounded');
      box(w,s,u+dx*sgn,v+dz,.994,.28,.072,.09,'#2d464c','metal',76,'rounded');
      box(w,s,u+dx*sgn,v+dz-.244,.86,.43,.052,.026,'#d2ad79','metal',83);
    }
    solid(w,s,u,v,22.4,7.06,'carousel');
  }

  function buildAmenities(w,s) {
    for (const [i,u] of [-90,-59].entries()) {
      flat(w,s,u,-3.73,26.25,10.25,'#beb8a4','paving',.018,225);
      carousel(w,s,u,-3.25,i+1);
      board(w,s,`claim-${i+1}`,`מסוע ${i+1}`,`Bag reclaim ${i+1}`,u,-5.24,4.18,7.14,-1,29);
    }
    board(w,s,'baggage','איסוף כבודה','Baggage reclaim · Arrivals',-74.5,-11.15,4.56,12.2,-1,43);
    counter(w,s,-98,-16.6,4.67,1.38,{ id:'baggage-service',color:'#636d6a' });
    s.staff.push({ id:'baggage', role:'claim', point:s.point(-98,-14.98,0), yaw:0 });
    for (const u of [-103,-92,-81,-72,-48,-38]) bench(w,s,u,-23.32,'arrivals','#697870');
    for (const [u,v] of [[-105,-13.2],[-101,4.5],[-38,-22.2],[62.75,-21],[99.45,-23.4],[101.12,-5.5],[-16,5.25],[18.7,4.32]])
      planters(w,s,u,v,'amenity');

    flat(w,s,20.9,-20.29,10.5,7.47,'#abb8af','paving',.014,220);
    counter(w,s,20.9,-22.04,6.12,1.68,{ id:'information',color:'#3e666c' });
    for(const side of [-1,1]) {
      box(w,s,20.9+side*1.44,-22.25,1.35,.49,.34,.28,'#536e76','metal',104,'rounded');
      box(w,s,20.9+side*1.44,-22.104,1.37,.40,.24,.035,'#a1d4d4','light_emissive',78,'cube',5,.37);
    }
    board(w,s,'info','מודיעין · טיסות','Information · Flight status',20.9,-22.31,3.81,7.41,1,26);
    s.staff.push({ id:'information', role:'information', point:s.point(20.9,-23.56,Math.PI), yaw:Math.PI });
    box(w,s,49.15,-24.5,1.23,.54,2.45,1.34,'#567780','metal',142,'rounded');
    box(w,s,49.48,-24.5,1.57,.13,1.30,1.10,'#142f41','plastic',134,'rounded');
    for(let n=0;n<6;n++) box(w,s,49.552,-24.52,1.95-n*.16,.04,.027,.80,n<2?'#f0c280':'#83b9b1','light_emissive',127,'cube',5,.35);
    solid(w,s,49.15,-24.5,.58,1.42,'flight-directory');

    flat(w,s,84,-14.8,32.2,23.3,'#ad9680','wood',.017,235);
    counter(w,s,83.8,-24.23,15.8,2.13,{ id:'cafe',color:'#5d736b',surface:'#d3b292' });
    box(w,s,83.8,-27.51,2.50,16.15,4.98,.29,'#998572','wood',185,'rounded');
    wall(w,s,83.8,-27.51,16.15,4.98,.29,'cafe-backbar');
    for(const u of [77.6,82.2,86.7,91.1]) {
      box(w,s,u,-26.95,1.64,3.68,.126,1.18,'#b69572','wood',126);
      box(w,s,u,-26.95,2.33,3.68,.126,1.18,'#a8896c','wood',121);
      box(w,s,u,-26.75,2.54,.51,.34,.49,'#d8c8a3','plastic',104,'rounded');
      box(w,s,u+.56,-26.78,1.95,.32,.49,.42,'#527c79','metal',105,'cylinder');
    }
    box(w,s,85.48,-24.56,1.48,1.49,.70,.78,'#7e8a88','metal',107,'rounded');
    box(w,s,79.15,-24.26,1.36,2.20,.49,.83,'#a0c7c6','clear_glass472',126,'rounded');
    board(w,s,'cafe','קפה מסלול','Runway Café',83.8,-24.6,4.5,8.89,-1,33,palette.gold);
    s.staff.push({ id:'cafe', role:'cafe', point:s.point(83.8,-26.26,Math.PI), yaw:Math.PI });
    for (const u of [72.5,82.4,92.2]) for (const v of [-16.6,-8.6]) {
      box(w,s,u,v,.38,.15,.74,.15,palette.metal,'metal',106,'cylinder');
      box(w,s,u,v,.75,1.76,.13,1.30,palette.wood,'wood',129,'rounded_smooth');
      box(w,s,u+.42,v-.13,.86,.17,.12,.17,'#efe3c2','plastic',79,'cylinder');
      solid(w,s,u,v,1.76,1.30,'cafe-table');
      for (const side of [-1,1]) {
        const vz = v + side * 1.17;
        box(w,s,u,vz,.239,.64,.48,.64,'#6b7e6e','metal',99,'rounded');
        box(w,s,u,vz+side*.27,.71,.59,.62,.14,'#456862','fabric',103,'rounded');
        solid(w,s,u,vz,.65,.78,'cafe-chair');
        s.seats.push({ id:`cafe-${s.seats.length}`, zone:'cafe', point:s.point(u,vz), seatY:s.floorY+.48,
          approach:s.point(u + 1.62,vz), yaw:side>0 ? 0 : Math.PI });
      }
    }
  }

  function buildCeiling(w,s) {
    for(let u=-101;u<=103;u+=13.45) {
      box(w,s,u,0,10.71,.37,.31,s.depth-.72,'#829298','anodized471',440,'rounded');
      box(w,s,u,0,10.50,.075,.099,s.depth-.88,'#ebd6a5','light_emissive',320,'cube',5,.35);
    }
    for (const u of [-93,-72,-50,-29,-7,14,35,55,76,97]) {
      fixture(w,s,u,-16,true,u===76||u===97);
      fixture(w,s,u,11,true,false);
    }
    for (const [u,v,warm] of [[-92,-3,0],[-61,-3,0],[-9,-4,0],[35,-3,0],[56,1,0],[83,-22,1],[83,-8,1],[-52,22,0],[52,22,0]])
      fixture(w,s,u,v,false,!!warm);
  }

  function makeWalkRoutes(w,s) {
    const q = s.point, main = s.main, front = s.front;
    const hub = q(main,-14.15), concourse = q(main,10), infoDesk = q(20.9,-20.43,0), cafe = q(83.8,-21.84,0);
    const baggage = q(-74.5,-9.05,Math.PI), security = q(main,-8.05,Math.PI), checkIn = q(-6.85,-17.15,Math.PI);
    const arrival = q(main+17.2,front-14.7);
    const screenU = main+10.7, screenV = front-13.55;
    box(w,s,screenU,screenV,1.36,.32,2.97,7.95,'#b2ada0','travertine471',435,'rounded');
    wall(w,s,screenU,screenV,.32,2.97,7.95,'curbside-screen');
    box(w,s,screenU+.05,screenV,2.86,.59,.13,8.18,palette.metal,'anodized471',391,'rounded');
    box(w,s,screenU+3.81,front-17.55,1.36,7.60,2.97,.32,'#b2ada0','travertine471',435,'rounded');
    wall(w,s,screenU+3.81,front-17.55,7.60,2.97,.32,'curbside-screen');
    const entry = [s.entry.outside,s.entry.threshold,s.entry.inside,hub];
    s.offstage = { arrival, entry:[arrival,q(main+17.2,front-7.55),q(main,front-7.55),s.entry.threshold,s.entry.inside,hub],
      gateA:s.gates[0].exit, gateB:s.gates[1].exit };
    s.positions = { hub, checkIn, screening:security, security, concourse, cafe, claim:baggage, baggage,
      info:infoDesk, infoDesk, exit:s.entry.inside, arrivals:q(s.arrivals,front+5.9) };
    s.routes = {
      entry, checkIn:[hub,q(main,-17.15),checkIn], screening:[hub,security,q(main,.32),q(main,5.10),concourse],
      gateA:[concourse,q(s.gates[0].desk.x-s.x,10),q(s.gates[0].desk.x-s.x,14.35)],
      gateB:[concourse,q(s.gates[1].desk.x-s.x,10),q(s.gates[1].desk.x-s.x,14.35)],
      cafe:[hub,q(64.7,-17.6),q(66.4,-21.84),cafe],
      claim:[hub,q(main,-17.15),q(-74.5,-17.15),baggage], info:[hub,q(24.65,-18.74),infoDesk]
    };

    // Route connectors follow the open lanes between actual fixture footprints.
    const queueLinks = s.queues.flatMap(a=>[a.entry,a.service,a.exit,...a.points]);
    const nodes = [...Object.values(s.routes).flat(), ...s.offstage.entry, ...s.gates.flatMap(g=>g.board), ...queueLinks,
      ...s.seats.map(a=>a.approach), ...s.staff.map(a=>a.point), q(s.arrivals,front-8.12), q(s.arrivals,front+5.9),
      ...[-103,-95,-79,-64,-47,-30,-15,5,19,32,45,60,68,80,92,102].flatMap(u=>[q(u,-19.05),q(u,10),q(u,20.79),q(u,27.92)]),
      ...[67.5,77.5,87.33,97.17].flatMap(u=>[q(u,-21.5),q(u,-12.9),q(u,-5.85)]),
      q(-106,5.9),q(-105,-9.25),q(-75,4.81),q(-43,5.9),q(-102.4,-19.01),q(-94.4,-14.8),q(-99,-14.8)];
    for (const p of s.gates) {
      const u = p.boarding.x-s.x;
      nodes.push(q(u,10),q(u,20.67),q(u,25.9));
    }
    prepareRoutes(s,nodes);
  }

  function prepareRoutes(s,points) {
    function walkable(a,b=a,pad=clearance) {
      const dx=b.x-a.x, dz=b.z-a.z;
      const left=Math.min(a.x,b.x), right=Math.max(a.x,b.x), north=Math.min(a.z,b.z), south=Math.max(a.z,b.z);
      for (const o of s.obstacles) {
        const x0=o.x-o.hw-pad, x1=o.x+o.hw+pad, z0=o.z-o.hd-pad, z1=o.z+o.hd+pad;
        if (left>x1 || right<x0 || north>z1 || south<z0) continue;
        if (!dx || !dz) return false;
        const ax=(x0-a.x)/dx, bx=(x1-a.x)/dx, az=(z0-a.z)/dz, bz=(z1-a.z)/dz;
        if (Math.max(0,Math.min(ax,bx),Math.min(az,bz))<=Math.min(1,Math.max(ax,bx),Math.max(az,bz))) return false;
      }
      return true;
    }
    const nodes = [...new Map(points.filter(p=>walkable(p)).map(p=>[`${p.x.toFixed(3)},${p.z.toFixed(3)}`,p])).values()];
    const edges = nodes.map(()=>[]);
    const dist = (a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
    for (const [i,a] of nodes.entries()) for (let j=i+1;j<nodes.length;j++) {
      const b=nodes[j], d=dist(a,b);
      if (d>31 || !walkable(a,b)) continue;
      edges[i].push([j,d]);
      edges[j].push([i,d]);
    }
    s.segmentClear = walkable;
    s.path = (from,to) => {
      if (!from || !to || !walkable(from) || !walkable(to)) return [];
      if (walkable(from,to)) return [from,to];
      const n=nodes.length, best=new Float64Array(n).fill(Infinity), previous=new Int32Array(n).fill(-1), done=new Uint8Array(n);
      const finish = new Float64Array(n).fill(Infinity);
      for (const [i,p] of nodes.entries()) {
        if (dist(from,p)<35 && walkable(from,p)) best[i]=dist(from,p);
        if (dist(to,p)<35 && walkable(to,p)) finish[i]=dist(to,p);
      }
      let winner=-1, cost=Infinity;
      for (let visit=0;visit<n;visit++) {
        let selected=-1, shortest=cost;
        for (let i=0;i<n;i++) if (!done[i] && best[i]<shortest) { selected=i; shortest=best[i]; }
        if (selected<0) break;
        done[selected]=1;
        if (shortest+finish[selected]<cost) { cost=shortest+finish[selected]; winner=selected; }
        for (const [j,d] of edges[selected]) if (!done[j] && shortest+d<best[j]) {
          best[j]=shortest+d;
          previous[j]=selected;
        }
      }
      if (winner<0) return [];
      const route=[to];
      for (let i=winner;i>=0;i=previous[i]) route.push(nodes[i]);
      route.push(from);
      return route.reverse().filter((p,i,a)=>i===0||dist(p,a[i-1])>.005);
    };
    s.stats.routeNodes=nodes.length;
  }

  function decorate(w, params) {
    const s = layout(params);
    buildSurfaces(w,s);
    buildFacade(w,s);
    buildCheckIn(w,s);
    buildSecurity(w,s);
    buildGates(w,s);
    buildAmenities(w,s);
    buildCeiling(w,s);
    for (const {u,v,height} of params.columns) wall(w,s,u,v,.42,height,.52,'canopy-column');
    for (const u of [-75,-46,48,75]) solid(w,s,u,s.front-10,4.6,3.5,'forecourt-planter');
    makeWalkRoutes(w,s);
    w.airport54 = active = s;
    return s;
  }

  function indoorSite(game) {
    const s=game.world?.airport54, a=game.avatar;
    if (!s || !a || game.inside || game.inVehicle || game.onBus>=0 || game.onTram>=0 || game.roofVisit || game.boat444 ||
        game.flight51?.pilot || a.swim445 || a.y>s.floorY+3.7 || !s.contains(a.x,a.z)) return null;
    return s;
  }

  function install(Game) {
    const P=Game.prototype, updateCamera=P.updateCamera, sceneLights=P.sceneLights;
    P.updateCamera=function(dt) {
      const result=updateCamera.call(this,dt), s=indoorSite(this);
      if (!s) return result;
      const a=this.avatar, c=this.cam, b=s.bounds, u=a.x-s.x, v=a.z-s.z;
      const byDoor = (doors,wallZ)=>Math.abs(v-wallZ)<5.8 && doors.some(d=>Math.abs(u-d.u)<d.width/2-.34);
      c.x=clamp(c.x,b.west+.36,b.east-.36);
      c.z=clamp(c.z,b.north+(byDoor(s.frontDoors,s.front)?-5.8:.34),b.south+(byDoor(s.gateDoors,s.rear)?5.8:-.34));
      c.y=clamp(c.y,s.floorY+1.28,s.floorY+10.2);
      c.tx=clamp(c.tx,b.west+.14,b.east-.14);
      c.tz=clamp(c.tz,b.north-(byDoor(s.frontDoors,s.front)?2:0),b.south+(byDoor(s.gateDoors,s.rear)?2:0));
      c.ty=clamp(c.ty,s.floorY+1.15,s.floorY+10.2);
      return result;
    };
    P.sceneLights=function() {
      const result=sceneLights.call(this), s=indoorSite(this);
      if (!s) return result;
      const a=this.avatar, distance=l=>(l.x-a.x)**2+(l.z-a.z)**2;
      const local=s.lights.filter(l=>distance(l)<(l.radius+8)**2).sort((a,b)=>distance(a)-distance(b)).slice(0,8);
      return [...local,...result.filter(l=>!l.airport54)].slice(0,12);
    };
  }

  const walkerBeforeTerminal=H.walkerGround473;
  H.outdoorHeight=(x,z)=>active?.floorAt(x,z)??groundBeforeTerminal(x,z);
  H.walkerGround473=a=>!a.deck443&&!a.coastDeck461 ? (active?.floorAt(a.x,a.z)??walkerBeforeTerminal(a)) : walkerBeforeTerminal(a);
  H.airport54World = { decorate, setup:game=>game?.world?.airport54??null,
    contains:(x,z)=>active?.contains(x,z)??false, floorAt:(x,z)=>active?.floorAt(x,z)??null,
    get entry() { return active?.entry??null; }, get floorY() { return active?.floorY??null; } };
  RC.installers.push(install);
})(Heatline);
