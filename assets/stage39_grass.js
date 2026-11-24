/* SUNSET STATE — Stage 40: real 3-D lawn grass near the camera.
 * A lawn/height mask around the camera is built progressively on the CPU from the
 * actual top surface of the world (grass only where the visible top is lawn), then
 * thousands of 3-blade clumps are drawn in one instanced call, swaying in the wind,
 * lit by the same sun/sky/shadow model as the rest of the HDR frame.
 * Disable: ?grassOff=1
 */
var Heatline = globalThis.Heatline || {};
(function (H) {
  'use strict';
  const params = new URLSearchParams(globalThis.location ? location.search : '');
  const RC = H.realism39 = H.realism39 || {};
  RC.installers = RC.installers || [];
  if (params.has('grassOff') || params.has('realismOff') || !RC.GLSL) return;

  const VS = `#version 300 es
// RC-NATIVE grass
precision highp float;
layout(location=0) in vec3 aBlade;
uniform sampler2D uMask;uniform vec2 uOrigin;uniform float uCell;uniform int uN;
uniform mat4 uVP;uniform float uTime,uWind,uRadius,uFadeAll;uniform vec3 uCamP;
out vec3 vP;out vec3 vN;out float vH;out vec3 vCol;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
void main(){
  int ix=gl_InstanceID%uN,iz=gl_InstanceID/uN;
  vec4 m=texelFetch(uMask,ivec2(ix,iz),0);
  vec2 cell=uOrigin+(vec2(float(ix),float(iz))+.5)*uCell;
  float h1=hash(cell),h2=hash(cell+17.1),h3=hash(cell*1.7+3.3);
  vec2 base=cell+(vec2(h1,h2)-.5)*uCell*.95;
  float bi=aBlade.z;
  float ang=(h3+bi*.37)*6.2831853;
  vec2 pos=base+vec2(cos(ang),sin(ang))*(.04+.055*bi);
  float dist=distance(pos,uCamP.xz);
  float fade=(1.0-smoothstep(uRadius*.55,uRadius,dist))*m.g*uFadeAll;
  if(fade<.02){gl_Position=vec4(2.0,2.0,2.0,1.0);vP=vec3(0);vN=vec3(0,1,0);vH=0.0;vCol=vec3(0);return;}
  float height=(.06+.10*hash(pos*3.1)+.05*hash(cell*.21))*fade;
  float t=aBlade.y;
  float facing=ang+1.3*bi;
  vec2 side=vec2(cos(facing),sin(facing));
  float gust=uWind*(.55+.45*sin(uTime*1.3+pos.x*.21+pos.y*.17));
  float flutter=.22*sin(uTime*3.4+pos.x*1.9+pos.y*1.3+bi);
  vec2 bend=normalize(vec2(.83,.55))*(gust*.32+flutter*.08)+vec2(-side.y,side.x)*(.06+.10*h1);
  vec3 p=vec3(pos.x,m.r,pos.y);
  p.xz+=side*aBlade.x*.02*(1.0-t*.85)+bend*t*t*height;
  p.y+=t*height*(1.0-.25*length(bend));
  vP=p;vH=t;
  vN=normalize(vec3(-side.y,.55,side.x)+vec3(bend.x,0.0,bend.y)*.5);
  float hue=hash(cell*.37);
  // Matched to the lawn surface so blades blend into the ground.
  vCol=mix(vec3(.15,.27,.08),vec3(.20,.31,.09),hue);
  vCol=mix(vCol*.62,vCol*(1.06+.1*hue),t);
  gl_Position=uVP*vec4(p,1.0);
}`;
  const FS = hdr => `#version 300 es
// RC-NATIVE grass
#define RC_HDR ${hdr ? 1 : 0}
precision highp float;precision highp sampler2DShadow;
in vec3 vP;in vec3 vN;in float vH;in vec3 vCol;
uniform sampler2DShadow uShadow;uniform mat4 uSunViewProjection;uniform int uShadowsActive;
${RC.GLSL.uniforms}
uniform float rcShadowTexel;
${RC.GLSL.funcs}
out vec4 o;
void main(){
  vec3 n=normalize(vN);vec3 v=normalize(rcCam-vP);if(dot(n,v)<0.0)n=-n;
  vec3 albedo=vCol;
  float vis=1.0;
  if(uShadowsActive>0){
    vec4 q=uSunViewProjection*vec4(vP+vec3(0.0,.05,0.0),1.0);vec3 uv=q.xyz/q.w*.5+.5;
    if(max(abs(uv.x-.5),abs(uv.y-.5))<.497)vis=texture(uShadow,vec3(uv.xy,uv.z-.0008));
  }
  vis=mix(vis,1.0,rcFog.z*.55);
  float sunUp=smoothstep(-.035,.06,rcSunDir.y);
  float NoL=max(dot(n,rcSunDir),0.0)*.7+.3;
  float through=pow(max(0.0,dot(-v,rcSunDir)),3.0)*.6+.25;
  float ao=mix(.35,1.0,vH);
  vec3 col=albedo*(rcAmbient(vec3(0.0,1.0,0.0))*ao+rcSunColor*sunUp*(NoL+through*vec3(.9,1.0,.4))*vis*mix(.5,1.0,vH));
  col=rcFogApply(col,vP)*rcExposure.x;
  o=vec4(rcEmit(col),1.0);
}`;

  class Grass {
    constructor(renderer) {
      const g = this.g = renderer.gl;
      this.prog = RC.makeProgram(g, VS, FS(renderer.rcHdr), 'rc-grass');
      const L = n => g.getUniformLocation(this.prog, n);
      this.loc = { mask: L('uMask'), origin: L('uOrigin'), cell: L('uCell'), n: L('uN'), vp: L('uVP'), time: L('uTime'), wind: L('uWind'), radius: L('uRadius'), fadeAll: L('uFadeAll'), cam: L('uCamP'), shadow: L('uShadow'), sm: L('uSunViewProjection'), sa: L('uShadowsActive') };
      this.N = renderer.rcIntegrated ? 76 : 110;
      this.cell = renderer.rcIntegrated ? .48 : .42;
      this.radius = this.N * this.cell * .5 - 2;
      // Blade strip: 3 blades x 7 verts (tapered, 5 triangles each).
      const verts = [], idx = [];
      for (let b = 0; b < 5; b++) {
        const o = verts.length / 3;
        for (const [x, t] of [[-1, 0], [1, 0], [-1, .45], [1, .45], [-1, .8], [1, .8], [0, 1]]) verts.push(x, t, b);
        idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2, o + 2, o + 3, o + 4, o + 3, o + 5, o + 4, o + 4, o + 5, o + 6);
      }
      this.count = idx.length;
      this.vao = g.createVertexArray(); g.bindVertexArray(this.vao);
      const vb = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, vb); g.bufferData(g.ARRAY_BUFFER, new Float32Array(verts), g.STATIC_DRAW);
      g.enableVertexAttribArray(0); g.vertexAttribPointer(0, 3, g.FLOAT, false, 12, 0);
      for (let i = 1; i < 8; i++) g.disableVertexAttribArray(i);
      const ib = g.createBuffer(); g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, ib); g.bufferData(g.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), g.STATIC_DRAW);
      g.bindVertexArray(null);
      this.tex = g.createTexture();
      g.bindTexture(g.TEXTURE_2D, this.tex);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
      g.texImage2D(g.TEXTURE_2D, 0, g.RG32F, this.N, this.N, 0, g.RG, g.FLOAT, new Float32Array(this.N * this.N * 2));
      this.data = new Float32Array(this.N * this.N * 2);
      this.origin = null; this.pending = null; this.row = 0; this.ready = false;
    }
    buildIndex(world) {
      if (this.index && this.indexSource === world.boxes.length) return;
      const idx = new Map(), C = 8;
      for (const b of world.boxes) {
        if (!(b.h < 3) || b.layer > 4 || b.w * b.d < 3 || b.yaw || b.pitch || b.roll || b.sea461 || b.cityLife39) continue;
        for (let x = Math.floor((b.x - b.w / 2) / C); x <= Math.floor((b.x + b.w / 2) / C); x++)
          for (let z = Math.floor((b.z - b.d / 2) / C); z <= Math.floor((b.z + b.d / 2) / C); z++) {
            const k = x * 100003 + z; let l = idx.get(k); if (!l) idx.set(k, l = []); l.push(b);
          }
      }
      this.index = idx; this.indexSource = world.boxes.length; this.C = C;
    }
    sample(x, z) {
      const list = this.index.get(Math.floor(x / this.C) * 100003 + Math.floor(z / this.C));
      if (!list) return [0, 0];
      let top = -1e9, lawn = false;
      for (const b of list) {
        if (Math.abs(x - b.x) > b.w / 2 || Math.abs(z - b.z) > b.d / 2) continue;
        const t = b.y + b.h / 2 + (b.gradeX || 0) * (x - b.x) + (b.gradeZ || 0) * (z - b.z);
        if (t > top + .005) { top = t; lawn = b.material === 'lawn443'; }
      }
      return lawn ? [top, 1] : [0, 0];
    }
    update(world, cam) {
      this.buildIndex(world);
      const span = this.N * this.cell, snap = 6;
      const ox = Math.floor((cam.x - span / 2) / snap) * snap, oz = Math.floor((cam.z - span / 2) / snap) * snap;
      if (!this.pending && (!this.origin || Math.abs(ox - this.origin[0]) >= snap || Math.abs(oz - this.origin[1]) >= snap)) { this.pending = [ox, oz]; this.row = 0; this.next = new Float32Array(this.N * this.N * 2); }
      if (!this.pending) return;
      const [px, pz] = this.pending, rows = 6;
      for (let r = 0; r < rows && this.row < this.N; r++, this.row++) {
        const zz = pz + (this.row + .5) * this.cell;
        for (let i = 0; i < this.N; i++) {
          const s = this.sample(px + (i + .5) * this.cell, zz);
          const o = (this.row * this.N + i) * 2; this.next[o] = s[0]; this.next[o + 1] = s[1];
        }
      }
      if (this.row >= this.N) {
        const g = this.g;
        g.bindTexture(g.TEXTURE_2D, this.tex);
        g.texSubImage2D(g.TEXTURE_2D, 0, 0, 0, this.N, this.N, g.RG, g.FLOAT, this.next);
        this.origin = this.pending; this.pending = null; this.ready = true;
      }
    }
    draw(renderer, frame, world) {
      if (frame.indoors || frame.c.y > 140 || frame.c.satellite468) return;
      // Fast camera (driving): fade out and stop rebuilding — no cost while driving.
      const now = performance.now(), c = frame.c;
      if (this.lastCam) { const dtc = Math.max(.001, (now - this.lastCam.t) / 1000); const v = Math.hypot(c.x - this.lastCam.x, c.z - this.lastCam.z) / dtc; this.camSpeed = (this.camSpeed || 0) * .85 + v * .15; }
      this.lastCam = { x: c.x, z: c.z, t: now };
      this.fadeAll = 1 - Math.min(1, Math.max(0, ((this.camSpeed || 0) - 7) / 6));
      if (this.fadeAll <= .01) return;
      this.update(world, frame.c);
      if (!this.ready) return;
      const g = this.g, L = this.loc;
      g.useProgram(this.prog);
      RC.applyUniforms(g, this.prog);
      g.activeTexture(g.TEXTURE11); g.bindTexture(g.TEXTURE_2D, this.tex); g.uniform1i(L.mask, 11);
      g.activeTexture(g.TEXTURE7); g.bindTexture(g.TEXTURE_2D, renderer.shadowTexture); g.uniform1i(L.shadow, 7);
      g.uniformMatrix4fv(L.sm, false, renderer.shadowMatrix);
      g.uniform1i(L.sa, frame.shadowMode && frame.shadowMode !== 3 ? 1 : 0);
      g.uniform2f(L.origin, this.origin[0], this.origin[1]); g.uniform1f(L.cell, this.cell); g.uniform1i(L.n, this.N);
      g.uniformMatrix4fv(L.vp, false, frame.viewProjection);
      g.uniform1f(L.time, frame.t); g.uniform1f(L.wind, .45 + (frame.weather?.wind || 0) * .9); g.uniform1f(L.radius, this.radius); g.uniform1f(L.fadeAll, this.fadeAll);
      g.uniform3f(L.cam, frame.c.x, frame.c.y, frame.c.z);
      g.disable(g.CULL_FACE);
      g.bindVertexArray(this.vao);
      g.drawElementsInstanced(g.TRIANGLES, this.count, g.UNSIGNED_SHORT, 0, this.N * this.N);
      g.bindVertexArray(null);
      g.enable(g.CULL_FACE);
      g.activeTexture(g.TEXTURE0);
    }
  }

  RC.installers.push(function installGrass(Game) {
    let world = null;
    const attach = Game.prototype.attachImportedModels441;
    Game.prototype.attachImportedModels441 = function () { const r = attach.call(this); world = this.world; return r; };
    RC.passes.opaque.push((renderer, frame) => {
      if (!world) return;
      if (renderer.rcGrass === undefined) {
        try { renderer.rcGrass = new Grass(renderer); } catch (error) { console.warn('[Grass40] unavailable', error); renderer.rcGrass = null; }
      }
      renderer.rcGrass?.draw(renderer, frame, world);
    });
  });
})(Heatline);
