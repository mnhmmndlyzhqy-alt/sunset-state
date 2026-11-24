/* SUNSET STATE — Stage 39 Realism Core: characters and physics.
 *  - Skinned procedural humanoid (17-bone skeleton, GPU skinning, linear PBR,
 *    sun shadows) with anatomical proportions, face, hair, clothing.
 *    The hero keeps his kippah and tzitzit; nearby citizens get varied builds.
 *  - Procedural locomotion: idle breathing, walk/jog/sprint gait with knee and
 *    ankle curves, pelvis bob/rotation, counter-swinging arms, turn lean, jump.
 *  - Player car: dynamic bicycle model, magic-formula tyres, load transfer,
 *    friction ellipse, power-limited engine, ABS brakes, handbrake drift.
 *  - On foot: momentum, acceleration and turn-rate limits; realistic speeds.
 */
var Heatline = globalThis.Heatline || {};
(function (H) {
  'use strict';
  const RC = H.realism39 = H.realism39 || {};
  RC.installers = RC.installers || [];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const params = new URLSearchParams(globalThis.location ? location.search : '');

  H.installRealismCore = function (Game) {
    if (!RC.enabled) return;
    if (typeof RC.installGame === 'function') RC.installGame(Game);
    for (const install of RC.installers) {
      try { install(Game); } catch (error) { console.warn('[Realism39] installer failed', error); }
    }
  };
  if (!RC.enabled) return;

  /* ================================================================== */
  /*  Math                                                               */
  /* ================================================================== */
  const M4 = {
    ident: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
    mul(a, b, o = new Float32Array(16)) {
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      return o;
    },
    // Translation * Ry(yaw) * Rx(pitch) * Rz(roll)
    trs(tx, ty, tz, pitch, yaw, roll, s = 1) {
      const cx = Math.cos(pitch), sx = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw), cz = Math.cos(roll), sz = Math.sin(roll);
      // R = Ry * Rx * Rz
      const m00 = cy * cz + sy * sx * sz, m01 = -cy * sz + sy * sx * cz, m02 = sy * cx;
      const m10 = cx * sz, m11 = cx * cz, m12 = -sx;
      const m20 = -sy * cz + cy * sx * sz, m21 = sy * sz + cy * sx * cz, m22 = cy * cx;
      return new Float32Array([m00 * s, m10 * s, m20 * s, 0, m01 * s, m11 * s, m21 * s, 0, m02 * s, m12 * s, m22 * s, 0, tx, ty, tz, 1]);
    }
  };

  /* ================================================================== */
  /*  Skeleton + procedural mesh                                         */
  /* ================================================================== */
  // name, parent, rest joint position (model space, metres, facing -z)
  const BONES = [
    ['pelvis', -1, [0, .98, 0]], ['spine', 0, [0, 1.09, 0]], ['chest', 1, [0, 1.30, 0]], ['neck', 2, [0, 1.50, 0]], ['head', 3, [0, 1.585, 0]],
    ['armL', 2, [-.185, 1.435, 0]], ['foreL', 5, [-.215, 1.150, .01]], ['handL', 6, [-.228, .905, -.01]],
    ['armR', 2, [.185, 1.435, 0]], ['foreR', 8, [.215, 1.150, .01]], ['handR', 9, [.228, .905, -.01]],
    ['thighL', 0, [-.094, .94, 0]], ['shinL', 11, [-.100, .515, .005]], ['footL', 12, [-.104, .085, .02]],
    ['thighR', 0, [.094, .94, 0]], ['shinR', 14, [.100, .515, .005]], ['footR', 15, [.104, .085, .02]]
  ];
  const B = Object.fromEntries(BONES.map((b, i) => [b[0], i]));
  const NB = BONES.length;

  function hexLin(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  class MeshBuilder {
    constructor() { this.v = []; this.i = []; }
    vert(p, n, col, rough, b0, b1, w) {
      this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], col[0], col[1], col[2], rough, b0, b1, w);
      return this.v.length / 13 - 1;
    }
    grid(rows, cols, at) {
      // at(r,c) -> [pos, normal, color, rough, b0, b1, w]; cols wrap around.
      const base = this.v.length / 13;
      for (let r = 0; r <= rows; r++) for (let c = 0; c < cols; c++) this.vert(...at(r / rows, c / cols));
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const a = base + r * cols + c, b = base + r * cols + (c + 1) % cols, d = a + cols, e = b + cols;
        this.i.push(a, d, b, b, d, e);
      }
    }
    // Lofted limb along a bone: elliptical sections with a radius profile.
    limb(bone, child, p0, p1, prof, colorAt, rough, rows = 10, cols = 16, ends = true) {
      const dir = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], len = Math.hypot(...dir);
      const d = dir.map(x => x / len);
      let ax = Math.abs(d[1]) > .9 ? [1, 0, 0] : [0, 1, 0];
      const u = norm(cross(d, ax)), w = norm(cross(u, d));
      this.grid(rows, cols, (t, s) => {
        const [rx, rz] = prof(t);
        const ang = s * Math.PI * 2;
        const cu = Math.cos(ang), sw = Math.sin(ang);
        const c = [p0[0] + dir[0] * t, p0[1] + dir[1] * t, p0[2] + dir[2] * t];
        const pos = [c[0] + u[0] * rx * cu + w[0] * rz * sw, c[1] + u[1] * rx * cu + w[1] * rz * sw, c[2] + u[2] * rx * cu + w[2] * rz * sw];
        const nn = norm([u[0] * cu / rx + w[0] * sw / rz, u[1] * cu / rx + w[1] * sw / rz, u[2] * cu / rx + w[2] * sw / rz]);
        const wt = child >= 0 ? clamp((t - .72) / .28, 0, 1) * .5 : 0;
        const startBlend = clamp((.18 - t) / .18, 0, 1) * .35;
        return [pos, nn, colorAt(t, s), rough, bone, child >= 0 ? child : (BONES[bone][1] >= 0 ? BONES[bone][1] : bone), child >= 0 ? 1 - wt : 1 - startBlend];
      });
      if (ends) {
        this.ellipsoid(bone, bone, p0, prof(0)[0], prof(0)[0], prof(0)[1], colorAt(0, 0), rough, 6, 10);
      }
    }
    ellipsoid(bone, bone2, c, rx, ry, rz, col, rough, rows = 10, cols = 16, w = 1, shape = null) {
      this.grid(rows, cols, (t, s) => {
        const th = t * Math.PI, ph = s * Math.PI * 2;
        let x = Math.sin(th) * Math.cos(ph), y = Math.cos(th), z = Math.sin(th) * Math.sin(ph);
        let k = shape ? shape(x, y, z) : 1;
        const pos = [c[0] + x * rx * k, c[1] + y * ry * k, c[2] + z * rz * k];
        const n = norm([x / rx, y / ry, z / rz]);
        return [pos, n, typeof col === 'function' ? col(x, y, z) : col, rough, bone, bone2, w];
      });
      // Close the poles (grid rows include them at t=0,1 with degenerate rings: fine).
    }
  }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { const d = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / d, a[1] / d, a[2] / d]; }
  function jp(name) { return BONES[B[name]][2]; }

  // Outfit: colours in sRGB hex. build: shoulder/hip width multipliers.
  function buildCharacter(o) {
    const mb = new MeshBuilder();
    const skin = hexLin(o.skin), shirt = hexLin(o.shirt), pants = hexLin(o.pants), shoe = hexLin(o.shoes), hair = hexLin(o.hair);
    const sw = o.shoulders || 1, hw = o.hips || 1, bulk = o.bulk || 1;
    // Torso: pelvis to neck, anatomical profile (waist, ribcage, shoulders).
    const torsoProf = t => {
      const waist = .5 + .5 * Math.cos(Math.PI * clamp((t - .32) / .32, -1, 1));
      const chest = Math.exp(-(((t - .68) / .2) ** 2));
      const rx = (.155 * hw * (1 - t) + .150 * sw * t) * (1 - .14 * waist) + .02 * chest * sw;
      const rz = (.110 + .018 * chest) * bulk * (1 - .08 * waist);
      return [rx * bulk, rz];
    };
    const shirtCol = (t, s) => (o.jacketTrim && Math.abs(Math.cos(s * Math.PI * 2)) < .06 && Math.sin(s * Math.PI * 2) < 0 ? hexLin(o.jacketTrim) : shirt);
    // Pelvis block (pants) + torso (shirt).
    mb.limb(B.pelvis, -1, [0, .84, 0], [0, 1.02, 0], t => [(.158 * hw) * bulk, .112 * bulk], () => pants, .85, 4, 18, false);
    mb.ellipsoid(B.pelvis, B.pelvis, [0, .86, 0], .155 * hw * bulk, .07, .108 * bulk, pants, .85, 6, 18);
    mb.limb(B.spine, B.chest, [0, 1.00, 0], [0, 1.47, 0], torsoProf, shirtCol, .82, 12, 24, false);
    // Shoulder caps.
    for (const side of [-1, 1]) mb.ellipsoid(B.chest, side < 0 ? B.armL : B.armR, [side * .165 * sw, 1.425, 0], .075 * bulk, .062, .075 * bulk, shirt, .82, 7, 12, .7);
    // Neck & head.
    mb.limb(B.neck, B.head, [0, 1.44, .012], [0, 1.60, -.002], t => [.064 - .006 * t, .066 - .004 * t], () => skin, .5, 5, 16, false);
    // Trapezius slope from neck to shoulders.
    for (const side of [-1, 1]) mb.limb(B.chest, B.neck, [side * .03, 1.47, .02], [side * .14 * sw, 1.43, .01], t => [.045 - .01 * t, .05], () => shirt, .82, 4, 12, false);
    const headC = [0, 1.665, -.012];
    mb.ellipsoid(B.head, B.head, headC, .088, .112, .102, (x, y, z) => skin, .48, 14, 20, 1, (x, y, z) => {
      // Jaw narrows, back of skull fuller, slight chin.
      let k = 1;
      if (y < -.2) k *= 1 - .18 * (-y - .2);
      if (z > .3) k *= 1.03;
      return k;
    });
    // Nose, ears, eyes, brows, lips.
    mb.ellipsoid(B.head, B.head, [0, 1.655, -.112], .016, .03, .024, skin, .45, 5, 8);
    for (const side of [-1, 1]) {
      mb.ellipsoid(B.head, B.head, [side * .089, 1.665, .0], .012, .028, .02, skin, .5, 5, 8);
      mb.ellipsoid(B.head, B.head, [side * .033, 1.69, -.1045], .0145, .0095, .0085, [.88, .86, .82], .2, 6, 10);
      mb.ellipsoid(B.head, B.head, [side * .033, 1.69, -.1118], .0068, .0068, .0022, hexLin(o.iris || '#4a3a2c'), .1, 5, 10);
      mb.ellipsoid(B.head, B.head, [side * .033, 1.69, -.1132], .003, .003, .001, [.04, .04, .04], .1, 4, 8);
      mb.ellipsoid(B.head, B.head, [side * .035, 1.708, -.1075], .019, .0035, .006, hair, .7, 4, 8);
    }
    mb.ellipsoid(B.head, B.head, [0, 1.62, -.1015], .019, .0055, .007, hexLin(o.lips || '#a8766a'), .45, 5, 10);
    // Hair: shell over the scalp, shorter at the front; optional beard.
    // Cap of hair clear of the scalp (no shared surface -> no z-fighting); it sinks
    // smoothly inside the head over the face and below the ears, so it never covers the face.
    mb.ellipsoid(B.head, B.head, [0, 1.692, .008], .0975, .0935, .1085, hair, .78, 14, 24, 1, (x, y, z) => {
      // Hairline: the cap only exists above the forehead (front) and above the ears (sides);
      // elsewhere it sinks far inside the skull, crossing the skin exactly at the hairline.
      const front = Math.min(1, Math.max(0, (-z - .05) / .12)) * Math.min(1, Math.max(0, (.50 - y) / .07));
      const low = Math.min(1, Math.max(0, (-.02 - y) / .07));
      return 1 - .32 * Math.max(front, low);
    });
    if (o.beard) mb.ellipsoid(B.head, B.head, [0, 1.6, -.05], .084, .055, .07, hair, .85, 7, 14, 1, (x, y, z) => (z > .2 ? .85 : 1));
    if (o.kippah) mb.ellipsoid(B.head, B.head, [0, 1.7895, .024], .064, .011, .064, hexLin(o.kippah), .7, 5, 18);
    // Arms (sleeves to the wrist), hands.
    for (const side of [-1, 1]) {
      const L = side < 0 ? 'L' : 'R';
      const sh = jp('arm' + L), el = jp('fore' + L), wr = jp('hand' + L);
      mb.limb(B['arm' + L], B['fore' + L], [sh[0] * sw, sh[1], sh[2]], el, t => [(.052 - .010 * t) * bulk, (.056 - .010 * t) * bulk], () => shirt, .82, 8, 12);
      mb.limb(B['fore' + L], B['hand' + L], el, [wr[0], wr[1] + .02, wr[2]], t => [(.044 - .012 * t) * bulk, (.042 - .008 * t) * bulk], t => (t > .9 ? (o.shortSleeve ? skin : shirt) : (o.shortSleeve && t > .05 ? skin : shirt)), .8, 8, 12);
      // Palm + fingers block, thumb.
      mb.ellipsoid(B['hand' + L], B['hand' + L], [wr[0], wr[1] - .055, wr[2] - .005], .022, .058, .042, skin, .5, 7, 12);
      mb.ellipsoid(B['hand' + L], B['hand' + L], [wr[0] - side * .004, wr[1] - .03, wr[2] - .04], .011, .03, .012, skin, .5, 5, 8);
    }
    // Legs, shoes.
    for (const side of [-1, 1]) {
      const L = side < 0 ? 'L' : 'R';
      const hp = jp('thigh' + L), kn = jp('shin' + L), an = jp('foot' + L);
      mb.limb(B['thigh' + L], B['shin' + L], [hp[0] * hw, hp[1] + .02, hp[2]], kn, t => [(.096 - .036 * t) * bulk * hw, (.102 - .036 * t) * bulk], () => pants, .85, 9, 14);
      mb.limb(B['shin' + L], B['foot' + L], kn, [an[0], an[1] + .03, an[2]], t => {
        const calf = Math.exp(-(((t - .3) / .22) ** 2));
        return [(.056 + .014 * calf - .012 * t) * bulk, (.058 + .024 * calf - .012 * t) * bulk];
      }, () => pants, .85, 9, 14);
      mb.ellipsoid(B['foot' + L], B['foot' + L], [an[0], .055, an[2] - .055], .048, .05, .125, shoe, .55, 7, 14, 1, (x, y, z) => (y < -.3 ? 1 : 1));
      mb.ellipsoid(B['foot' + L], B['foot' + L], [an[0], .018, an[2] - .055], .05, .018, .128, hexLin(o.sole || '#e6e2da'), .9, 4, 12);
    }
    // Tzitzit: white fringes hanging from the hips (two each side).
    if (o.tzitzit) {
      for (const side of [-1, 1]) for (const fz of [-1, 1]) {
        for (let k = 0; k < 2; k++) {
          const x = side * (.150 * hw + .004 * k), z = fz * .075 + k * .008;
          mb.limb(B.pelvis, side < 0 ? B.thighL : B.thighR, [x, .90, z], [x + side * .006, .60 - k * .04, z], t => [.0045, .0045], () => [.95, .93, .88], .9, 3, 5, false);
        }
      }
    }
    // Backpack for the hero.
    if (o.backpack) {
      mb.ellipsoid(B.chest, B.chest, [0, 1.25, .16], .15, .2, .075, hexLin(o.backpack), .75, 8, 14, 1, (x, y, z) => 1 / Math.max(.75, Math.pow(Math.abs(x) ** 4 + Math.abs(y) ** 4 + Math.abs(z) ** 4, .25)));
      for (const side of [-1, 1]) mb.limb(B.chest, B.chest, [side * .1, 1.43, .02], [side * .11, 1.12, -.03], t => [.018, .006], () => hexLin('#3a2a22'), .7, 4, 6, false);
    }
    // Detail pass: collar, belt + buckle, fingers, watch, sneaker toe caps.
    for (const side of [-1, 1]) mb.ellipsoid(B.chest, B.neck, [side * .045, 1.455, -.07], .05, .018, .035, shirt, .8, 4, 10, .8);
    mb.limb(B.pelvis, -1, [0, .975, 0], [0, 1.012, 0], t => [(.162 * hw) * bulk, .118 * bulk], () => hexLin(o.belt || '#2a211c'), .55, 2, 20, false);
    mb.ellipsoid(B.pelvis, B.pelvis, [0, .993, -.118 * bulk], .03, .02, .008, [.75, .68, .5], .25, 4, 8);
    for (const side of [-1, 1]) {
      const L = side < 0 ? 'L' : 'R', wr = jp('hand' + L), hb = B['hand' + L];
      for (let f = 0; f < 4; f++) {
        const fz = wr[2] - .03 + f * .016 - .02;
        mb.limb(hb, hb, [wr[0], wr[1] - .1, fz], [wr[0] + side * .004, wr[1] - .165 + Math.abs(f - 1.5) * .008, fz - .006], t => [.0085, .0085], () => skin, .5, 3, 6, false);
      }
      if (side < 0) mb.limb(hb, hb, [wr[0], wr[1] + .025, wr[2]], [wr[0], wr[1] + .005, wr[2]], t => [.03, .03], () => hexLin(o.watch || '#c9c3b8'), .2, 2, 10, false);
      const an = jp('foot' + L);
      mb.ellipsoid(B['foot' + L], B['foot' + L], [an[0], .04, an[2] - .15], .045, .03, .04, hexLin(o.sole || '#e6e2da'), .8, 4, 10);
    }
    return { vertices: new Float32Array(mb.v), indices: new Uint16Array(mb.i) };
  }

  /* ================================================================== */
  /*  Procedural animation                                               */
  /* ================================================================== */
  function animate(a, st, dt) {
    // a: actor; st: persistent anim state; returns per-bone local Euler [pitch,yaw,roll] + root offsets
    const speed = Math.hypot(a.vx || 0, a.vz || 0);
    st.speed = st.speed == null ? speed : st.speed + (speed - st.speed) * (1 - Math.exp(-dt * 8));
    const v = st.speed;
    const run = clamp((v - 2.4) / 2.6, 0, 1), sprint = clamp((v - 5.4) / 2, 0, 1);
    const moving = clamp(v / 1.2, 0, 1);
    // Gait cycle length (m per two steps) from human gait data; cadence = v / cycle.
    const cycleLen = .6 + .78 * Math.max(v, .3) - .022 * Math.max(v, .3) * Math.max(v, .3);
    const cadence = v < .08 ? 0 : v / cycleLen;
    st.phase = (st.phase || 0) + cadence * dt * Math.PI * 2;
    const ph = st.phase;
    st.t = (st.t || 0) + dt;
    const yawRate = st.lastYaw == null ? 0 : H.angleDiff(st.lastYaw, a.yaw) / Math.max(dt, 1e-3);
    st.lastYaw = a.yaw;
    st.turn = (st.turn || 0) + (clamp(yawRate, -6, 6) - (st.turn || 0)) * (1 - Math.exp(-dt * 6));
    const air = a.grounded === false;
    st.air = (st.air || 0) + ((air ? 1 : 0) - (st.air || 0)) * (1 - Math.exp(-dt * 12));
    if (st.wasAir && !air) st.land = 1;
    st.wasAir = air;
    st.land = Math.max(0, (st.land || 0) - dt * 3.2);
    const R = Array.from({ length: NB }, () => [0, 0, 0]);
    let rootY = 0, rootX = 0;
    // ---- Foot-planted locomotion (2-bone IK per leg, sagittal plane) ----
    const L1 = .425, L2 = .43, LMAX = .848, ANKLE = .085, HIP = .94;
    const S = cycleLen * moving;                                    // distance travelled per cycle
    const beta = clamp(.95 / Math.max(S, .01), .24, .62) * (1 - run) + clamp(.95 / Math.max(S, .01), .2, .38) * run; // stance fraction
    const Ls = S * beta;                                           // stance length = ground travel while planted (no sliding)
    const front = Ls * (.5 - .12 * run), back = Ls - front;
    const cyc = ph / (Math.PI * 2);
    const legs = {};
    for (const side of [-1, 1]) {
      const u = ((cyc + (side < 0 ? 0 : .5)) % 1 + 1) % 1;
      let f, lift, toe;
      if (u < beta) {                                              // stance: heel strike -> toe off
        const k = u / beta;
        f = front - Ls * k; lift = 0;
        toe = .22 * Math.max(0, 1 - k * 4) - .45 * Math.max(0, (k - .7) / .3) * (.6 + .4 * run);
        lift += .06 * Math.max(0, (k - .75) / .25) * (1 + run);      // heel rises before toe-off
      } else {                                                     // swing: arc forward
        const k = (u - beta) / (1 - beta), e = k * k * (3 - 2 * k);
        f = -back + (front + back) * e;
        lift = (.09 + .26 * run + .1 * sprint) * Math.pow(Math.sin(Math.PI * Math.pow(k, .75)), .9);
        toe = -.35 * (1 - k) * (1 - k) + .18 * Math.max(0, k - .7) / .3;
      }
      legs[side] = { f, lift, toe, stance: u < beta };
    }
    // Hip height: walking keeps the stance leg nearly straight (pelvis dips at
    // heel strike); running bounces with a flight phase.
    let hipWalk = HIP;
    for (const side of [-1, 1]) if (legs[side].stance) hipWalk = Math.min(hipWalk, ANKLE + legs[side].lift + Math.sqrt(Math.max(.01, LMAX * LMAX - legs[side].f * legs[side].f)));
    const hipRun = HIP - .07 - .035 * Math.cos(cyc * Math.PI * 4);
    const hipY = (HIP - .012) * (1 - moving) + (hipWalk * (1 - run) + hipRun * run) * moving;
    rootY = hipY - HIP;
    for (const side of [-1, 1]) {
      const g = legs[side], L = side < 0 ? 'L' : 'R';
      const fwd = g.f, dy = Math.max(.2, hipY - (ANKLE + g.lift));
      const D = clamp(Math.hypot(fwd, dy), .3, (L1 + L2) * .999);
      const a1 = Math.acos(clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1));
      const kin = Math.acos(clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1));
      const thigh = Math.atan2(fwd, dy) + a1, knee = -(Math.PI - kin);
      const ankle = g.toe * moving - (thigh + knee);
      R[B['thigh' + L]] = [thigh, 0, side * -.025];
      R[B['shin' + L]] = [knee, 0, 0];
      R[B['foot' + L]] = [ankle, 0, 0];
      // Arms counter-swing with the same-side leg; elbows bend more when running.
      const opp = Math.atan2(legs[side].f, .8);
      const arm = -opp * (.75 + .35 * run) * moving;
      R[B['arm' + L]] = [arm + .06 * run, 0, side * (.06 + .06 * run)];
      R[B['fore' + L]] = [.22 + 1.15 * run + .35 * Math.max(0, arm) * (1 - run), 0, 0];
    }
    const pelvisYaw = .11 * Math.sin(ph) * moving * (1 - .4 * run);
    rootX = .018 * Math.sin(ph) * moving * (1 - run);
    const lean = (.05 * moving + .16 * run + .08 * sprint);
    const turnLean = clamp(-st.turn * v * .018, -.28, .28);
    R[B.pelvis] = [0, pelvisYaw, turnLean * .6 + .04 * Math.sin(ph) * moving * (1 - run)];
    // Idle: breathing and weight shift.
    const idle = 1 - moving;
    const breath = Math.sin(st.t * 1.6);
    R[B.spine] = [-lean * .55 - .012 * breath * idle, -pelvisYaw * .5, turnLean * .3];
    R[B.chest] = [-lean * .35 - .018 * breath * idle, -pelvisYaw * .9, 0];
    R[B.neck] = [lean * .45, 0, 0];
    R[B.head] = [lean * .35 - .02 * Math.sin(st.t * .5) * idle, .12 * Math.sin(st.t * .31) * idle, -turnLean * .4];
    if (idle > .01) {
      rootX += .012 * Math.sin(st.t * .4) * idle;
      R[B.armL][1] = 0; R[B.armL][2] += .04 * idle; R[B.armR][2] -= .04 * idle;
      R[B.foreL][0] += .12 * idle; R[B.foreR][0] += .12 * idle;
    }
    // Airborne tuck and landing absorb.
    const ai = st.air;
    if (ai > .01) {
      for (const L of ['L', 'R']) {
        const k = L === 'L' ? 1 : .6;
        R[B['thigh' + L]][0] = R[B['thigh' + L]][0] * (1 - ai) + .55 * k * ai;
        R[B['shin' + L]][0] = R[B['shin' + L]][0] * (1 - ai) - 1.0 * k * ai;
        R[B['arm' + L]][0] = R[B['arm' + L]][0] * (1 - ai) + .35 * ai;
        R[B['arm' + L]][2] += (L === 'L' ? .3 : -.3) * ai;
      }
    }
    if (st.land > 0) {
      const k = Math.sin(st.land * Math.PI) * .9;
      rootY -= .12 * k;
      for (const L of ['L', 'R']) { R[B['thigh' + L]][0] += .45 * k; R[B['shin' + L]][0] -= .8 * k; R[B['foot' + L]][0] += .35 * k; }
      R[B.spine][0] -= .2 * k;
    }
    // Social poses for citizens.
    if (a.socialPose === 'photo' || (a.navActivity === 'phone' && a.pause > 0)) {
      R[B.armR] = [1.0, 0, -.25]; R[B.foreR] = [1.3, 0, 0];
      if (a.socialPose === 'photo') { R[B.armL] = [1.0, 0, .25]; R[B.foreL] = [1.3, 0, 0]; }
    }
    return { R, rootY, rootX };
  }
  // Car entry / seating overlay (matches the original entry timings).
  function seatOverlay(pose, entryTime) {
    if (entryTime == null || entryTime < 0) return 0;
    const reach = H.entryEase(entryTime, .02, .23) * (1 - H.entryEase(entryTime, .41, .72));
    const seat = H.entryEase(entryTime, .49, 1.19);
    const R = pose.R;
    R[B.armR] = [reach * 1.2 + seat * .7, 0, -.1]; R[B.foreR] = [.3 + seat * .5, 0, 0];
    R[B.armL][0] += seat * .6; R[B.foreL][0] += seat * .5;
    for (const L of ['L', 'R']) { R[B['thigh' + L]][0] = seat * 1.45; R[B['shin' + L]][0] = -seat * 1.45; R[B['foot' + L]][0] = seat * .1; }
    R[B.spine][0] -= seat * .12;
    pose.rootY -= seat * .38;
    return seat;
  }
  function boneMatrices(pose, world, out) {
    const globals = new Array(NB);
    for (let i = 0; i < NB; i++) {
      const [name, parent, rest] = BONES[i];
      const r = pose.R[i];
      const pr = parent >= 0 ? BONES[parent][2] : [0, 0, 0];
      const local = parent >= 0 ? M4.trs(rest[0] - pr[0], rest[1] - pr[1], rest[2] - pr[2], r[0], r[1], r[2])
        : M4.trs(rest[0] + pose.rootX, rest[1] + pose.rootY, rest[2], r[0], r[1], r[2]);
      globals[i] = parent >= 0 ? M4.mul(globals[parent], local) : M4.mul(world, local);
      const invBind = M4.trs(-rest[0], -rest[1], -rest[2], 0, 0, 0);
      out.set(M4.mul(globals[i], invBind), i * 16);
      void name;
    }
    return out;
  }

  /* ================================================================== */
  /*  GPU: skinned character renderer                                    */
  /* ================================================================== */
  const SKIN_VS = `#version 300 es
// RC-NATIVE
precision highp float;
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNrm;layout(location=2) in vec4 aCol;layout(location=3) in vec3 aSkin;
uniform mat4 uBones[${NB}];uniform mat4 uVP;
out vec3 vP;out vec3 vN;out vec4 vC;
void main(){
  mat4 m=uBones[int(aSkin.x)]*aSkin.z+uBones[int(aSkin.y)]*(1.0-aSkin.z);
  vec4 p=m*vec4(aPos,1.0);
  vP=p.xyz;vN=normalize(mat3(m)*aNrm);vC=aCol;
  gl_Position=uVP*p;
}`;
  const SHADOW_FS = `#version 300 es
// RC-NATIVE
precision highp float;
void main(){}`;
  function skinFS(hdr) {
    return `#version 300 es
// RC-NATIVE
#define RC_HDR ${hdr ? 1 : 0}
precision highp float;precision highp sampler2DShadow;
in vec3 vP;in vec3 vN;in vec4 vC;
uniform sampler2DShadow uShadow;uniform mat4 uSunViewProjection;uniform int uShadowsActive;uniform vec3 uTint;
uniform vec4 uLightData[12];uniform vec3 uLightRGB[12];uniform int uLightCount;
${RC.GLSL.uniforms}
uniform float rcShadowTexel;
${RC.GLSL.funcs}
out vec4 o;
float shadowAt(vec3 p,vec3 n,float NoL){
  if(uShadowsActive==0)return 1.0;
  vec4 q=uSunViewProjection*vec4(p+n*rcShadowTexel*2.6+rcSunDir*rcShadowTexel*.8,1.0);
  vec3 uv=q.xyz/q.w*.5+.5;
  if(max(abs(uv.x-.5),abs(uv.y-.5))>.497)return 1.0;
  float r=1.5*rcShadowTexel/260.0,ref=uv.z-.00035-.0007*(1.0-NoL),s=0.0;
  s+=texture(uShadow,vec3(uv.xy+vec2(-r,-r),ref));s+=texture(uShadow,vec3(uv.xy+vec2(r,-r),ref));
  s+=texture(uShadow,vec3(uv.xy+vec2(-r,r),ref));s+=texture(uShadow,vec3(uv.xy+vec2(r,r),ref));
  return s*.25;
}
void main(){
  vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;
  vec3 v=normalize(rcCam-vP);
  vec3 albedo=rcToLinear(vC.rgb*uTint);
  float rough=vC.a;
  vec3 sun=rcSunDir;
  float NoL=dot(n,sun),NoV=max(dot(n,v),.02);
  float sunUp=smoothstep(-.035,.06,sun.y)*(1.0-rcExposure.z);
  float vis=NoL>0.0?shadowAt(vP,n,NoL):0.0;
  vis=mix(vis,1.0,rcFog.z*.55);
  vec3 col=albedo*rcAmbient(n)*.92;
  float isSkin=step(rough,.52)*step(.4,rough);
  if(NoL>0.0){
    vec3 h=normalize(sun+v);
    float a=rough*rough;
    float spec=rcGGX(max(dot(n,h),0.0),a*a)*rcVis(NoL,NoV,rough)*(.04+.96*pow(1.0-max(dot(v,h),0.0),5.0))*3.14159;
    col+=(albedo+spec)*rcSunColor*sunUp*NoL*vis;
  }
  float wrap=max(0.0,(NoL+.45)/1.45)-max(NoL,0.0);
  col+=albedo*vec3(1.0,.45,.32)*rcSunColor*sunUp*wrap*.7*isSkin*mix(.4,1.0,vis);
  vec3 R=reflect(-v,n);vec2 AB=rcEnvBRDF(rough,NoV);
  col+=rcEnvRadiance(R,rough)*(.04*AB.x+AB.y)*.8;
  for(int i=0;i<12;i++){
    if(i>=uLightCount)break;
    vec3 tl=uLightData[i].xyz-vP;float d=length(tl);
    float w=clamp(1.0-pow(d/uLightData[i].w,4.0),0.0,1.0);
    col+=albedo*uLightRGB[i]*1.6*w*w/(1.0+d*d*.22)*(max(dot(n,tl/max(d,.001)),0.0)*.9+.1);
  }
  col=rcFogApply(col,vP)*rcExposure.x;
  o=vec4(rcEmit(col),1.0);
}`;
  }

  // Appearance palette for citizens (modest everyday clothing).
  const PAL = {
    skin: ['#e8c3a8', '#d9a98a', '#c48a6a', '#a8714f', '#8a5a3c', '#f0cdb4', '#b98264', '#6e452f'],
    shirt: ['#2f5d7a', '#7b2f3a', '#e8e4da', '#3d6b4f', '#6b5b8a', '#c9a24a', '#2b2f36', '#9aa7b4', '#b5654a', '#4a7f8c', '#d8cdb8', '#5c6e3c'],
    pants: ['#2b3442', '#3a3a3e', '#5a5048', '#1f2733', '#6e665a', '#344a5e', '#47423a'],
    hair: ['#1d1714', '#3a2a20', '#5e4430', '#7d6250', '#2a2522', '#a8a29a', '#8a5a34'],
    shoes: ['#1e1e22', '#e9e6e0', '#5a4434', '#2d3a4a', '#7a6a5a']
  };
  const HERO = { skin: '#c58c6c', shirt: '#2f5f93', jacketTrim: '#8aaecc', pants: '#343b46', shoes: '#26282c', sole: '#3a3a3c',
    hair: '#241f1e', kippah: '#1c294a', tzitzit: true, backpack: '#5a3f30', iris: '#3d2f24', beard: false, shoulders: 1.06, hips: 1, bulk: 1.02 };

  class CharacterRenderer {
    constructor(gl, hdr) {
      this.gl = gl;
      this.prog = RC.makeProgram(gl, SKIN_VS, skinFS(hdr), 'rc-skin');
      this.shadowProg = RC.makeProgram(gl, SKIN_VS, SHADOW_FS, 'rc-skin-shadow');
      const L = n => gl.getUniformLocation(this.prog, n);
      this.loc = { bones: L('uBones'), vp: L('uVP'), shadow: L('uShadow'), sm: L('uSunViewProjection'), sa: L('uShadowsActive'), tint: L('uTint'),
        ld: L('uLightData[0]'), lc: L('uLightRGB[0]'), ln: L('uLightCount') };
      this.sloc = { bones: gl.getUniformLocation(this.shadowProg, 'uBones'), vp: gl.getUniformLocation(this.shadowProg, 'uVP') };
      this.meshes = new Map();
      this.boneBuf = new Float32Array(NB * 16);
    }
    mesh(key, outfit) {
      let m = this.meshes.get(key);
      if (m) return m;
      const g = this.gl, data = buildCharacter(outfit);
      const vao = g.createVertexArray(), vb = g.createBuffer(), ib = g.createBuffer();
      g.bindVertexArray(vao);
      g.bindBuffer(g.ARRAY_BUFFER, vb); g.bufferData(g.ARRAY_BUFFER, data.vertices, g.STATIC_DRAW);
      const S = 52;
      g.enableVertexAttribArray(0); g.vertexAttribPointer(0, 3, g.FLOAT, false, S, 0);
      g.enableVertexAttribArray(1); g.vertexAttribPointer(1, 3, g.FLOAT, false, S, 12);
      g.enableVertexAttribArray(2); g.vertexAttribPointer(2, 4, g.FLOAT, false, S, 24);
      g.enableVertexAttribArray(3); g.vertexAttribPointer(3, 3, g.FLOAT, false, S, 40);
      for (let i = 4; i < 8; i++) g.disableVertexAttribArray(i);
      g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, ib); g.bufferData(g.ELEMENT_ARRAY_BUFFER, data.indices, g.STATIC_DRAW);
      g.bindVertexArray(null);
      m = { vao, count: data.indices.length, tris: data.indices.length / 3 };
      this.meshes.set(key, m);
      if (this.meshes.size > 40) { const first = this.meshes.keys().next().value; if (first !== 'hero') this.meshes.delete(first); }
      return m;
    }
    prepare(items) {
      for (const it of items) {
        it.meshRef = this.mesh(it.key, it.outfit);
        boneMatrices(it.pose, it.world, it.bones || (it.bones = new Float32Array(NB * 16)));
      }
    }
    draw(renderer, frame, items) {
      if (!items.length) return;
      const g = this.gl;
      this.prepare(items);
      g.useProgram(this.prog);
      RC.applyUniforms(g, this.prog);
      g.uniformMatrix4fv(this.loc.vp, false, frame.viewProjection);
      g.uniform1i(this.loc.shadow, 7);
      g.uniformMatrix4fv(this.loc.sm, false, renderer.shadowMatrix);
      g.uniform1i(this.loc.sa, frame.shadowMode && frame.shadowMode !== 3 ? 1 : 0);
      g.uniform3f(this.loc.tint, 1, 1, 1);
      const lights = RC.frame.lights || [];
      g.uniform1i(this.loc.ln, Math.min(12, lights.length));
      g.uniform4fv(this.loc.ld, renderer.lightData);
      g.uniform3fv(this.loc.lc, renderer.lightColors);
      // Procedural meshes mix winding orders: draw double-sided (shader flips back-face normals).
      g.disable(g.CULL_FACE); g.enable(g.DEPTH_TEST); g.depthMask(true);
      for (const it of items) {
        g.uniformMatrix4fv(this.loc.bones, false, it.bones);
        g.bindVertexArray(it.meshRef.vao);
        g.drawElements(g.TRIANGLES, it.meshRef.count, g.UNSIGNED_SHORT, 0);
      }
      g.bindVertexArray(null);
      g.enable(g.CULL_FACE);
    }
    drawShadow(matrix, items) {
      if (!items.length) return;
      const g = this.gl;
      this.prepare(items);
      g.useProgram(this.shadowProg);
      g.uniformMatrix4fv(this.sloc.vp, false, matrix);
      g.disable(g.CULL_FACE);
      for (const it of items) {
        g.uniformMatrix4fv(this.sloc.bones, false, it.bones);
        g.bindVertexArray(it.meshRef.vao);
        g.drawElements(g.TRIANGLES, it.meshRef.count, g.UNSIGNED_SHORT, 0);
      }
      g.bindVertexArray(null);
      g.enable(g.CULL_FACE);
    }
  }

  /* ================================================================== */
  /*  Integration: replace rigid character parts with skinned actors     */
  /* ================================================================== */
  const queue = [];
  const animStates = new WeakMap();
  let lastBuild = performance.now();
  RC.characterQueue = queue;
  function outfitFor(w) {
    const a = w.appearance >>> 0;
    const pick = (arr, shift) => arr[(a >>> shift) % arr.length];
    const female = ((a >>> 9) & 3) === 1;
    return {
      key: 'c' + ((a >>> 2) % 36),
      outfit: { skin: pick(PAL.skin, 3), shirt: pick(PAL.shirt, 6), pants: pick(PAL.pants, 11), hair: pick(PAL.hair, 15), shoes: pick(PAL.shoes, 19),
        shoulders: female ? .9 : 1 + ((a >>> 23) % 3) * .04, hips: female ? 1.08 : .98, bulk: .94 + ((a >>> 25) % 4) * .045,
        beard: !female && ((a >>> 27) % 4 === 0), kippah: H.stage32HasKippah?.(w, false) ? (w.style % 2 ? '#1b273b' : '#e4e2d7') : null,
        tzitzit: false, shortSleeve: ((a >>> 28) % 3) === 0, iris: pick(['#3d2f24', '#4a6a7a', '#5a4a2a', '#2a2420'], 29) },
      scale: female ? .955 + ((a >>> 13) % 4) * .012 : .99 + ((a >>> 13) % 5) * .014
    };
  }
  function enqueue(w, player, seconds, entryTime) {
    const now = performance.now();
    let st = animStates.get(w);
    if (!st) { st = {}; animStates.set(w, st); }
    const dt = clamp((now - (st.lastMs || now - 16)) / 1000, 0, .1);
    st.lastMs = now;
    const pose = animate(w, st, dt);
    // Talking: head and jaw-line nod with the speech loudness envelope.
    const talk = RC.speechLoudness ? RC.speechLoudness(w) : 0;
    if (talk > .02) { pose.R[B.head][0] += -.10 * talk * (.6 + .4 * Math.sin(st.t * 17)); pose.R[B.neck][0] += .04 * talk; pose.R[B.head][1] += .05 * Math.sin(st.t * 3.1) * talk; }
    seatOverlay(pose, entryTime);
    let key, outfit, scale;
    if (player) { key = 'hero'; outfit = HERO; scale = 1.04; }
    else ({ key, outfit, scale } = outfitFor(w));
    // Knocked down: tumble onto the back, lie on the ground, then get back up.
    let pitch = 0, lift = 0;
    if (w.injuryState === 'down') {
      st.down = Math.min(1, (st.down || 0) + dt * 2.6);
      const rising = w.injuryClock < 1.3 ? clamp(1 - w.injuryClock / 1.3, 0, 1) : 0;
      const d = st.down * (1 - rising * rising * (3 - 2 * rising));
      pitch = d * Math.PI / 2; lift = .13 * d;
      const R = pose.R;
      R[B.armL] = [.4 * d, 0, .9 * d]; R[B.armR] = [-.2 * d, 0, -1.1 * d];
      R[B.foreL] = [.6 * d, 0, 0]; R[B.foreR] = [.3 * d, 0, 0];
      R[B.thighL] = [.5 * d, 0, .12 * d]; R[B.shinL] = [-.9 * d, 0, 0];
      R[B.thighR] = [.08 * d, 0, -.1 * d]; R[B.shinR] = [-.15 * d, 0, 0];
      R[B.head] = [-.25 * d, .5 * d, 0]; R[B.spine] = [0, 0, 0]; R[B.chest] = [0, 0, 0];
      pose.rootY = 0; pose.rootX = 0;
    } else st.down = 0;
    const world = M4.trs(w.x, (w.y || 0) + lift, w.z, pitch, w.yaw || 0, 0, scale);
    queue.push({ key, outfit, pose, world, x: w.x, z: w.z, player });
  }

  RC.installers.push(function installCharacters(Game) {
    if (params.has('realismCharacterOff')) return;
    const legacyPose = H.streetCharacterPose32;
    if (typeof legacyPose !== 'function') return;
    H.streetCharacterPose32 = function realismCharacter(w, out, seconds, player = false, distance = 0, webgl = true, entryTime) {
      const r = RC.renderer;
      if (webgl && r && r.rcCharacters && w && (w.injuryState === 'walking' || w.injuryState === 'down') && !w.swim445 &&
        !(w.socialPose === 'sit' && !player) && (player || (distance < 46 && queue.length < 26))) {
        enqueue(w, player, seconds, entryTime);
        return;
      }
      return legacyPose.call(this, w, out, seconds, player, distance, webgl, entryTime);
    };
    const build = Game.prototype.buildDynamic;
    Game.prototype.buildDynamic = function () { queue.length = 0; lastBuild = performance.now(); return build.call(this); };
    const attach = Game.prototype.attachImportedModels441;
    Game.prototype.attachImportedModels441 = function () {
      const result = attach.call(this);
      const r = this.renderer;
      if (r && r.atmosphere && !r.rcCharacters) {
        try { r.rcCharacters = new CharacterRenderer(r.gl, r.rcHdr); }
        catch (error) { console.warn('[Realism39] characters unavailable', error); r.rcCharacters = null; }
      }
      return result;
    };
    RC.passes.opaque.push((renderer, frame) => { if (renderer.rcCharacters) renderer.rcCharacters.draw(renderer, frame, queue); });
    RC.passes.shadow.push((renderer, matrix) => { if (renderer.rcCharacters) renderer.rcCharacters.drawShadow(matrix, queue.filter(q => q.player || (q.x - (RC.frame.cam[0])) ** 2 + (q.z - RC.frame.cam[2]) ** 2 < 900)); });
    void lastBuild;
  });

  /* ================================================================== */
  /*  On-foot locomotion: momentum, acceleration, turn-rate limits        */
  /* ================================================================== */
  RC.installers.push(function installKnockdowns(Game) {
    const impact = H.pedestrianVehicleImpact, advance = H.advancePedestrianInjury;
    if (typeof impact !== 'function' || typeof advance !== 'function') return;
    const ground = w => { const y = H.outdoorHeight(w.x, w.z); return Number.isFinite(y) ? y : (w.y || 0); };
    const knockOut = w => { if (w.injuryState === 'dead') { w.injuryState = 'down'; w.injuryClock = 13 + Math.random() * 5; } };
    H.pedestrianVehicleImpact = function (w, car, speed) {
      const r = impact.apply(this, arguments);
      if (r) {
        knockOut(w);
        w.y = ground(w);            // was forced to y=0: under the raised terrain, i.e. "vanished"
        w.rcWasDown = true;
        const g = globalThis.__SUNSET_PERFORMANCE06_GAME;
        setTimeout(() => RC.say && g && RC.say(g, w, 'אוי!', { voice: RC.voiceForWalker?.(w), mood: 'scared', priority: 2 }), 500);
      }
      return r;
    };
    H.advancePedestrianInjury = function (w, dt) {
      knockOut(w);
      const r = advance.call(this, w, dt);
      if (w.injuryState !== 'walking') w.y = ground(w);
      else if (w.rcWasDown) {
        w.rcWasDown = false;
        const g = globalThis.__SUNSET_PERFORMANCE06_GAME;
        const lines = ['מה יש לך?!', 'אתה עיוור?!', 'תסתכל על הכביש!'];
        RC.say && g && RC.say(g, w, lines[(Math.random() * lines.length) | 0], { voice: RC.voiceForWalker?.(w), mood: 'angry', priority: 2 });
      }
      return r;
    };
  });
  RC.installers.push(function installFootPhysics(Game) {
    if (params.has('realismPhysicsOff')) return;
    const legacyStep = H.stepWalker, legacyJump = H.jumpWalker;
    let hero = null;
    const update = Game.prototype.update;
    Game.prototype.update = function (dt) { hero = this.avatar; return update.call(this, dt); };
    H.stepWalker = function realismWalker(w, input, solids, dt, cars) {
      if (w !== hero || !input || !input.outdoors || dt <= 0) return legacyStep.call(this, w, input, solids, dt, cars);
      const f = clamp(input.forward || 0, -1, 1), s = clamp(input.strafe || 0, -1, 1);
      const has = Math.hypot(f, s) > .05;
      const fx = -Math.sin(input.viewYaw), fz = -Math.cos(input.viewYaw), rx = Math.cos(input.viewYaw), rz = -Math.sin(input.viewYaw);
      let dx = fx * f + rx * s, dz = fz * f + rz * s;
      const dn = Math.hypot(dx, dz) || 1; dx /= dn; dz /= dn;
      const st = w.rcLoco || (w.rcLoco = { vx: w.vx || 0, vz: w.vz || 0 });
      const target = has ? (input.run ? 10.2 : 6.6) : 0;
      let speed = Math.hypot(st.vx, st.vz);
      let hx = speed > .05 ? st.vx / speed : dx, hz = speed > .05 ? st.vz / speed : dz;
      if (has) {
        const angle = Math.atan2(hx * dz - hz * dx, hx * dx + hz * dz);
        if (Math.abs(angle) > 2.3 && speed > 3) speed = Math.max(0, speed - 22 * dt); // plant and pivot
        const maxTurn = (speed < 1 ? 18 : 14 - speed * .55) * dt;
        const turn = clamp(angle, -maxTurn, maxTurn);
        const c = Math.cos(turn), sn = Math.sin(turn);
        const nhx = hx * c - hz * sn, nhz = hx * sn + hz * c; hx = nhx; hz = nhz;
        const accel = speed < target ? (w.grounded === false ? 3.5 : 15 - speed * .65) : 16;
        speed += clamp(target - speed, -accel * dt, accel * dt);
      } else {
        speed = Math.max(0, speed - (w.grounded === false ? 1.5 : 14) * dt);
      }
      st.vx = hx * speed; st.vz = hz * speed;
      // Feed the momentum velocity through the original collision/slope solver.
      const moving = speed > .02;
      const fwd = moving ? -st.vz / speed : 0, side = moving ? st.vx / speed : 0;
      const fast = speed > 7.5;
      const legacyInput = { ...input, forward: fwd, strafe: side, run: fast, viewYaw: 0, speedFactor: clamp(speed / (fast ? 11.4 : 6.15), .25, 1.25) };
      if (!moving) { legacyInput.forward = 0; legacyInput.strafe = 0; }
      const result = legacyStep.call(this, w, legacyInput, solids, dt, cars);
      // Respect collisions: if the solver stopped an axis, drop that momentum too.
      if (Math.abs(w.vx) < .01 && Math.abs(st.vx) > .5) st.vx *= .2;
      if (Math.abs(w.vz) < .01 && Math.abs(st.vz) > .5) st.vz *= .2;
      if (speed > .3) w.stride = clamp(speed / 8, 0, 1);
      return result;
    };
    H.jumpWalker = function realismJump(w) {
      const ok = legacyJump.call(this, w);
      if (ok && w === hero) w.vy = 6.5;
      return ok;
    };
  });

  /* ================================================================== */
  /*  CPU: memoised road-level queries                                   */
  /* ================================================================== */
  // deckGround443 stacks 4 layers (terrain hills, coast grade, bridges, road
  // profiles). sameRoadLevel443 evaluated it twice for every pedestrian x car
  // and bus x car pair BEFORE the cheap distance test: ~12 ms per frame.
  // An actor's deck height is now computed once per simulation step.
  RC.installers.push(function installCpuOptimizations(Game) {
    if (params.has('realismCpuOff')) return;
    let step = 0;
    const ensureMemo = () => {
      const current = H.deckGround443;
      if (typeof current !== 'function' || current.__rcMemo) return;
      const inner = current;
      const memo = function (actor, x, z) {
        if (!actor || (x !== undefined && x !== actor.x) || (z !== undefined && z !== actor.z)) return inner(actor, x ?? actor?.x, z ?? actor?.z);
        if (actor.__rcDgStep === step && actor.__rcDgX === actor.x && actor.__rcDgZ === actor.z &&
          actor.__rcDgYaw === actor.yaw && actor.__rcDgDeck === actor.deck443 && actor.__rcDgCoast === actor.coastDeck461) return actor.__rcDgV;
        const v = inner(actor, actor.x, actor.z);
        actor.__rcDgStep = step; actor.__rcDgX = actor.x; actor.__rcDgZ = actor.z; actor.__rcDgYaw = actor.yaw;
        actor.__rcDgDeck = actor.deck443; actor.__rcDgCoast = actor.coastDeck461; actor.__rcDgV = v;
        return v;
      };
      memo.__rcMemo = true;
      H.deckGround443 = memo;
    };
    RC.cpuStats = { steps: 0 };
    const update = Game.prototype.update;
    Game.prototype.update = function (dt) {
      step++; RC.cpuStats.steps = step;
      ensureMemo();
      return update.call(this, dt);
    };
    // Simulation LOD for distant civilian traffic: same total travelled time,
    // fewer integration/collision sweeps far from the player.
    const moveCar = Game.prototype.moveCar;
    Game.prototype.moveCar = function (c, dt, input) {
      if (c && c.type === 'civilian' && c !== this.player && !c.wrecked) {
        const viewer = this.inVehicle ? this.player : this.avatar;
        const d2 = (viewer.x - c.x) ** 2 + (viewer.z - c.z) ** 2;
        const every = d2 > 380 * 380 ? 4 : d2 > 200 * 200 ? 2 : 1;
        if (every > 1) {
          c.__rcAcc = (c.__rcAcc || 0) + dt;
          c.__rcTick = ((c.__rcTick || 0) + 1) % every;
          if (c.__rcTick !== 0) return;
          const total = Math.min(c.__rcAcc, .05);
          c.__rcAcc = 0;
          return moveCar.call(this, c, total, input);
        }
        c.__rcAcc = 0;
      }
      return moveCar.call(this, c, dt, input);
    };
    Game.prototype.footCollisionCars = function () {
      const a = this.avatar, R2 = 40 * 40, out = [], seen = new Set();
      for (const list of [[this.player], this.parked, this.civilian, this.police, this.wrecks]) {
        if (!list) continue;
        for (const car of list) {
          if (!car || seen.has(car)) continue;
          seen.add(car);
          if ((car.x - a.x) ** 2 + (car.z - a.z) ** 2 > R2) continue;
          if (H.sameRoadLevel443(a, car)) out.push(car);
        }
      }
      return out;
    };
  });

  /* ================================================================== */
  /*  Player car: dynamic bicycle model with magic-formula tyres          */
  /* ================================================================== */
  function tyre(alpha, Fz, mu, B = 9.5, C = 1.35) {
    return mu * Fz * Math.sin(C * Math.atan(B * alpha));
  }
  function stepCarDynamic(c, input, dt) {
    dt = clamp(dt, 0, .05);
    if (!dt) return;
    if (c.wrecked) { c.vx = c.vz = c.speed = c.yawRate = 0; return; }
    if (c.rollover) return;
    const cls = H.VEHICLE_CLASSES[H.carClass(c)] || H.VEHICLE_CLASSES.standard;
    const s = c.rcDyn || (c.rcDyn = { vx: 0, vy: 0, r: 0, steer: 0, ax: 0, ay: 0 });
    const fwd0 = { x: -Math.sin(c.yaw), z: -Math.cos(c.yaw) }, left0 = { x: -Math.cos(c.yaw), z: Math.sin(c.yaw) };
    // Re-sync with world velocity (collisions elsewhere may have changed it).
    s.vx = c.vx * fwd0.x + c.vz * fwd0.z;
    s.vy = c.vx * left0.x + c.vz * left0.z;
    s.r = c.yawRate || 0;
    const m = 1450 * (cls.hw * cls.hd) / (1.34 * 2.42), Iz = m * 1.55, g = 9.81;
    const L = cls.wheelbase * .86, a = L * .47, b = L - a, hcg = .52;
    const ground = clamp(c.surfaceGrip ?? 1, .82, 1);   // grass/sidewalk no longer halve the grip
    const broken = Math.max(...(c.wheelDamage || [0]));
    const wear = clamp(Math.max(c.tireWear || 0, broken * .66), 0, 1);
    const mu = 1.28 * cls.grip * ground * (1 - .45 * wear) * (1 - .2 * (c.suspensionDamage || 0)) * (1 + .12 * clamp(c.tuneGrip || 0, 0, 3));
    const engineHealth = clamp(1 - .73 * (c.engineDamage || 0), .22, 1);
    const brakeHealth = clamp(1 - .68 * (c.brakeDamage || 0), .32, 1);
    const boost = input.nitro && (c.engineDamage || 0) < .7;
    const power = 168000 * cls.power * (1 + .11 * clamp(c.tuneEngine || 0, 0, 3)) * engineHealth * (boost ? 1.75 : 1);
    const throttle = clamp(input.gas, -1, 1);
    // Six-speed automatic gearbox: RPM from road speed, torque curve, shift cut.
    const GEARS = [3.45, 2.25, 1.62, 1.24, .98, .80], FINAL = 3.55, WHEEL = .34, IDLE = 850, REDLINE = 7000;
    s.gear = s.gear || 1; s.shift = Math.max(0, (s.shift || 0) - dt);
    const roadRpm = g => Math.abs(s.vx) / WHEEL * 9.549 * GEARS[g - 1] * FINAL;
    if (!s.shift && throttle >= 0) {
      if (s.gear < 6 && roadRpm(s.gear) > 6500) { s.gear++; s.shift = .2; }
      else if (s.gear > 1 && roadRpm(s.gear) < 2400 && roadRpm(s.gear - 1) < 6000) { s.gear--; s.shift = .14; }
    }
    if (s.vx < 3 && throttle <= 0) s.gear = 1;
    const launch = s.gear === 1 && throttle > 0 ? IDLE + throttle * 3600 * (1 - clamp(Math.abs(s.vx) / 9, 0, 1)) : 0;
    const rpmTarget = clamp(Math.max(IDLE, roadRpm(s.gear), launch), IDLE, REDLINE);
    s.rpm = (s.rpm || IDLE) + (rpmTarget - (s.rpm || IDLE)) * (1 - Math.exp(-dt * (s.shift ? 18 : 10)));
    const rpmN = clamp((s.rpm - 1200) / (REDLINE - 1200), 0, 1);
    const torqueCurve = (.72 + .28 * Math.sin(Math.PI * Math.min(1, rpmN * 1.15))) * (s.shift ? .18 : 1);
    c.rcRpm = s.rpm; c.rcGear = s.vx < -.5 ? -1 : s.gear; c.rcShift = s.shift;
    const steerIn = clamp(input.steer, -1, 1) * (1 - Math.min(.22, Math.abs(c.steeringBias || 0) * 1.25));
    const N = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / N;
    let braking = false, slipMax = 0;
    for (let k = 0; k < N; k++) {
      const v = Math.hypot(s.vx, s.vy);
      // Steering: rate limited, reduced lock at speed (speed-sensitive rack).
      // GTA-style keyboard steering: the wheel ramps in progressively (slower at
      // speed), returns quickly to centre, and the lock shrinks with speed.
      const vfw = Math.max(0, Math.abs(s.vx));
      const lock = .66 / (1 + vfw / 26);
      const inRate = steerIn === 0 ? 5.5 : (Math.sign(steerIn) !== Math.sign(s.input || 0) && Math.abs(s.input || 0) > .05 ? 6 : 4.6 / (1 + vfw / 45));
      s.input = (s.input || 0) + clamp(steerIn - (s.input || 0), -inRate * h, inRate * h);
      s.steer += clamp(s.input * lock - s.steer, -4 * h, 4 * h);
      const delta = s.steer + (c.steeringBias || 0) * .05;
      // Longitudinal load transfer.
      const Fzf = clamp(m * g * b / L - m * s.ax * hcg / L, m * g * .15, m * g * .85);
      const Fzr = m * g - Fzf;
      // Drive / brake forces.
      let Fdrive = 0, Fbrake = 0;
      if (throttle > 0) {
        if (s.vx < -.5) Fbrake = m * g * mu * .9 * throttle;
        else Fdrive = Math.min(9200 * cls.power * (boost ? 1.3 : 1), power / Math.max(4, Math.abs(s.vx))) * throttle * torqueCurve;
      } else if (throttle < 0) {
        if (s.vx > .8) Fbrake = m * g * mu * .92 * brakeHealth * (1 + .15 * clamp(c.tuneBrakes || 0, 0, 3)) * -throttle;
        else Fdrive = -4200 * engineHealth * -throttle;
      }
      if (Fbrake > 0) braking = true;
      const handbrake = !!input.brake;
      // Rear-biased AWD with traction limits.
      const Fxf = Fdrive * .4, Fxr = Fdrive * .6;
      const sgn = Math.sign(s.vx) || 0;
      const brakeF = Fbrake * .62 * sgn, brakeR = Fbrake * .38 * sgn + (handbrake ? m * g * .55 * sgn * Math.min(1, Math.abs(s.vx)) : 0);
      let FxF = clamp(Fxf - brakeF, -mu * Fzf, mu * Fzf), FxR = clamp(Fxr - brakeR, -mu * Fzr * (handbrake ? .6 : 1), mu * Fzr);
      // Lateral tyre forces (friction ellipse).
      let FyF = 0, FyR = 0;
      const dyn = clamp((Math.abs(s.vx) - 2.5) / 3, 0, 1);
      if (dyn > 0) {
        const vxa = Math.max(Math.abs(s.vx), .5);
        const alphaF = Math.atan2(s.vy + a * s.r, vxa) - delta * Math.sign(s.vx || 1);
        const alphaR = Math.atan2(s.vy - b * s.r, vxa);
        slipMax = Math.max(slipMax, Math.abs(alphaF), Math.abs(alphaR));
        const ellF = Math.sqrt(Math.max(0, 1 - (FxF / (mu * Fzf)) ** 2));
        const ellR = Math.sqrt(Math.max(0, 1 - (FxR / (mu * Fzr)) ** 2)) * (handbrake ? .58 : 1);
        FyF = -tyre(alphaF, Fzf, mu) * ellF;
        FyR = -tyre(alphaR, Fzr, mu) * ellR;
      }
      const cd = Math.cos(delta), sd = Math.sin(delta);
      const drag = .42 * s.vx * Math.abs(s.vx) + 13.5 * s.vx * (1 + (1 - ground) * 4 + broken * 2);
      const incline = H.deckGround443 ? (H.deckGround443(c, c.x + fwd0.x, c.z + fwd0.z) - H.deckGround443(c, c.x - fwd0.x, c.z - fwd0.z)) * .5 : 0;
      const Fx = FxF * cd - FyF * sd + FxR - drag - m * g * clamp(incline, -.3, .3);
      const Fy = FyF * cd + FxF * sd + FyR;
      const axBody = Fx / m, ayBody = Fy / m;
      let dvx = (axBody + s.vy * s.r) * h, dvy = (ayBody - s.vx * s.r) * h;
      let dr = (a * (FyF * cd + FxF * sd) - b * FyR) / Iz * h;
      // Low-speed kinematic blend: no singular slip angles when parking.
      const rKin = s.vx * Math.tan(delta) / L;
      s.vx += dvx;
      if (throttle === 0 && Math.abs(s.vx) < .25 && !braking) s.vx *= .9;
      if (Fbrake > 0 && Math.abs(s.vx) < .4) s.vx = 0;
      s.vy = (s.vy + dvy) * dyn;
      s.r = (s.r + dr) * dyn + rKin * (1 - dyn);
      // GTA-style stability assist: yaw follows the steering intent within the
      // grip limit and lateral slip is damped, except on the handbrake (drift).
      if (!handbrake && dyn > 0) {
        const vabs = Math.max(Math.abs(s.vx), 1);
        const rLimit = 1.6 * g * ground / vabs;   // arcade grip (~1.6 g) for sharp turns
        const rTarget = clamp(rKin, -rLimit, rLimit);
        s.r += (rTarget - s.r) * (1 - Math.exp(-h * 7.5));
        if (Math.abs(s.r) > rLimit * 1.05) s.r = Math.sign(s.r) * rLimit * 1.05;   // never exceed tyre grip (~1 g)
        s.vy *= Math.exp(-h * (throttle < 0 ? 8 : 6.5));   // kill sideways sliding
      }
      else if (handbrake && dyn > 0) {
        // Controlled slide: allow oversteer up to ~1.7x the grip yaw, never a spin.
        const vabs = Math.max(Math.abs(s.vx), 1);
        const rMax = mu * g * 1.7 / vabs;
        if (Math.abs(s.r) > rMax) s.r += (Math.sign(s.r) * rMax - s.r) * (1 - Math.exp(-h * 6));
        s.vy *= Math.exp(-h * .6);
      }
      s.ax += (axBody - s.ax) * (1 - Math.exp(-h * 12));
      s.ay += ((ayBody) - s.ay) * (1 - Math.exp(-h * 12));
      c.yaw += s.r * h;
      const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), lx = -Math.cos(c.yaw), lz = Math.sin(c.yaw);
      c.vx = fx * s.vx + lx * s.vy;
      c.vz = fz * s.vx + lz * s.vy;
      const top = (boost ? 108 : 80) * (.56 + .44 * engineHealth);
      const sp = Math.hypot(c.vx, c.vz);
      if (sp > top) { c.vx *= top / sp; c.vz *= top / sp; s.vx *= top / sp; s.vy *= top / sp; }
      c.x += c.vx * h; c.z += c.vz * h;
    }
    c.yawRate = s.r;
    c.steer = s.steer / .62;
    c.speed = Math.hypot(c.vx, c.vz);
    c.wheelSpin += s.vx / .43 * dt;
    if (Math.abs(c.wheelSpin) > Math.PI * 1000) c.wheelSpin %= H.TAU;
    c.wheelSteer += (s.steer - c.wheelSteer) * (1 - Math.exp(-dt * 20));
    const brakingVis = braking || (input.brake && c.speed > 1);
    c.brakeLight += (Number(brakingVis) - c.brakeLight) * (1 - Math.exp(-dt * 13));
    c.brakeTemperature = clamp(c.brakeTemperature + (brakingVis ? (c.speed / 90) * dt : 0) - dt * .065, 0, 1.3);
    const wheelspin = throttle > .85 && s.gear === 1 && Math.abs(s.vx) < 7 ? .55 * (1 - Math.abs(s.vx) / 7) : 0;
    c.tireSlip += (clamp(slipMax * 3.2 + wheelspin + (input.brake && c.speed > 9 ? .4 : 0), 0, 1) - c.tireSlip) * (1 - Math.exp(-dt * 8));
    // Body motion from real accelerations: pitch under braking/accel, roll in corners.
    const pitchTarget = clamp(-s.ax * .0105, -.11, .11), rollTarget = clamp(s.ay * .0085 * (1 + (c.suspensionDamage || 0) * .4), -.12, .12);
    [c.bodyPitch, c.pitchVelocity] = H.springStep(c.bodyPitch, c.pitchVelocity, pitchTarget, dt, 70, 11);
    [c.bodyRoll, c.rollVelocity] = H.springStep(c.bodyRoll, c.rollVelocity, rollTarget, dt, 60, 10);
    const pavement = c.speed > 5 ? Math.sin(c.wheelSpin * .038) * Math.min(.009, c.speed * .0002) : 0;
    const compression = clamp(-Math.abs(s.ax) * .0022 - Math.abs(s.ay) * .0009 - c.impact * .075 + pavement, -.16, .02);
    [c.suspension, c.springVelocity] = H.springStep(c.suspension, c.springVelocity, compression, dt, 104, 18);
    c.suspension = clamp(c.suspension, -.16, .025);
    c.impact = Math.max(0, c.impact - dt * 2.4);
    c.damageCooldown = Math.max(0, c.damageCooldown - dt);
    c.mechanicalCooldown = Math.max(0, c.mechanicalCooldown - dt);
    if (!Number.isFinite(c.x + c.z + c.yaw + c.vx + c.vz)) { c.vx = c.vz = c.yawRate = 0; s.vx = s.vy = s.r = 0; }
  }
  RC.stepCarDynamic = stepCarDynamic;
  RC.installers.push(function installDrivingFeel(Game) {
    if (params.has('realismPhysicsOff')) return;
    // Engine note follows RPM (revs climb, drop on each up-shift), not road speed.
    const update = Game.prototype.update;
    Game.prototype.update = function (dt) {
      const syn = this.synth;
      if (syn && !syn.__rcRpm && typeof syn.update === 'function') {
        syn.__rcRpm = true;
        const orig = syn.update.bind(syn), game = this;
        syn.update = function (speed, ...rest) {
          const p = game.player;
          if (game.inVehicle && p && p.rcRpm) speed = (p.rcRpm - 850) / 6150 * 70 * (p.rcShift ? .9 : 1);
          return orig(speed, ...rest);
        };
      }
      return update.call(this, dt);
    };
    // GTA-style chase camera: low and close, swings into turns with lag, shows drift angle.
    const cam = Game.prototype.updateCamera;
    Game.prototype.updateCamera = function (dt) {
      cam.call(this, dt);
      if (params.has('classicCamera') || !this.inVehicle || this.cameraMode !== 0 || this.vehicleEntry || this.inside || this.cameraTransfer) return;
      const p = this.player, c = this.cam, st = this.rcChase || (this.rcChase = { heading: p.yaw, x: c.x, y: c.y, z: c.z });
      dt = Math.min(dt, .05);
      const sp = Math.hypot(p.vx, p.vz);
      const travel = sp > 2.5 ? Math.atan2(-p.vx, -p.vz) : p.yaw;
      const reversing = (p.vx * -Math.sin(p.yaw) + p.vz * -Math.cos(p.yaw)) < -1;
      let target = reversing ? p.yaw : p.yaw + H.angleDiff(p.yaw, travel) * .55;
      st.heading += H.angleDiff(st.heading, target) * (1 - Math.exp(-dt * (2.6 + sp * .025)));
      const fx = -Math.sin(st.heading), fz = -Math.cos(st.heading);
      const ground = H.deckGround443 ? H.deckGround443(p) : 0;
      const dist = 8.2 + Math.min(2.4, sp * .03), height = 3.1 + Math.min(1.0, sp * .012);
      let dest = { x: p.x - fx * dist, y: ground + height, z: p.z - fz * dist };
      const eye = { x: p.x, y: ground + 1.9, z: p.z };
      const hit = this.cameraClearance ? this.cameraClearance(eye, dest, .6) : null;
      if (hit && hit.blocked) dest = { x: hit.x, y: Math.max(hit.y, ground + 1.6), z: hit.z };
      const k = 1 - Math.exp(-dt * 11);
      st.x += (dest.x - st.x) * k; st.y += (dest.y - st.y) * k; st.z += (dest.z - st.z) * k;
      const pitchKick = clamp((p.rcDyn?.ax || 0) * -.012, -.12, .12);
      c.x = st.x; c.y = st.y + pitchKick; c.z = st.z;
      const look = 5 + Math.min(8, sp * .1);
      c.tx = p.x + fx * look; c.ty = ground + 1.55; c.tz = p.z + fz * look;
      c.fov = clamp(60 + sp * .32, 60, 80) + (this.is && this.is('ShiftLeft', 'ShiftRight') && sp > 25 ? 5 : 0);
      if (sp > 25) { const sh = Math.min(1, (sp - 25) / 40) * .035; c.y += Math.sin(this.seconds * 37) * sh; c.x += Math.sin(this.seconds * 29) * sh; }
    };
  });
  RC.installers.push(function installLuxuryTraffic(Game) {
    if (params.has('realismPhysicsOff')) return;
    const premium = c => {
      const h = ((c.paint || 0) * 2654435761 ^ Math.round((c.x || 0) * 31) ^ Math.round((c.z || 0) * 17)) >>> 0;
      const r = (h % 1000) / 1000;
      if (r < .16) c.vehicleClass = 'luxury'; else if (r < .26) c.vehicleClass = 'sport';
      return c;
    };
    const create = Game.prototype.createTraffic;
    Game.prototype.createTraffic = function () { const c = create.call(this); return c && c.type === 'civilian' ? premium(c) : c; };
    const update = Game.prototype.update;
    Game.prototype.update = function (dt) {
      if (!this.rcParkedPremium && this.parked) { this.rcParkedPremium = true; for (const c of this.parked) if (c.type !== 'police' && c !== this.player) premium(c); for (const c of this.civilian || []) premium(c); }
      return update.call(this, dt);
    };
  });
  RC.installers.push(function installCarPhysics(Game) {
    if (params.has('realismPhysicsOff')) return;
    const legacy = H.stepCar;
    let playerCar = null;
    const update = Game.prototype.update;
    Game.prototype.update = function (dt) { playerCar = this.inVehicle ? this.player : null; return update.call(this, dt); };
    H.stepCar = function realismStepCar(c, input, dt) {
      if (c && c === playerCar && c.type !== 'police' && input) return stepCarDynamic(c, input, dt);
      if (c && c.rcDyn && c !== playerCar) c.rcDyn = null;
      return legacy.call(this, c, input, dt);
    };
  });
})(Heatline);
