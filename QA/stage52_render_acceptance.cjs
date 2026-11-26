'use strict';
// Executes the game's draw submission against recording GL. No pixels or GPU timing.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = (name, at = root) => fs.readFileSync(path.join(at, name), 'utf8');
const identity = Float32Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
const constants = Object.fromEntries(('ARRAY_BUFFER ELEMENT_ARRAY_BUFFER ELEMENT_ARRAY_BUFFER_BINDING ' +
  'VERTEX_ATTRIB_ARRAY_BUFFER_BINDING FLOAT TRIANGLES UNSIGNED_INT STREAM_DRAW DYNAMIC_DRAW ' +
  'FRAMEBUFFER CULL_FACE TEXTURE0 TEXTURE_2D COLOR_BUFFER_BIT DEPTH_BUFFER_BIT').split(' ').map((x, i) => [x, i + 1]));

function fakeGL() {
  const stats = {}, counters = key => { stats[key] = (stats[key] || 0) + 1; };
  let program, bound, buffer, faces = true;
  const state = {
    ...constants, stats, records: [], verify: true,
    createVertexArray: () => ({ attrib: new Map() }), createBuffer: () => ({}),
    useProgram(value) { program = value; },
    bindVertexArray(value) { counters('vaoBinds'); bound = value; },
    bindBuffer(kind, value) {
      counters('bufferBinds');
      if (kind === constants.ELEMENT_ARRAY_BUFFER) bound.indices = value;
      else buffer = value;
    },
    enable(cap) { if (cap === constants.CULL_FACE) faces = true; },
    disable(cap) { if (cap === constants.CULL_FACE) faces = false; },
    getVertexAttrib(index) { return bound.attrib.get(index)?.buffer; },
    getParameter() { return bound.indices; },
    getUniformLocation(program, name) { return name; },
    enableVertexAttribArray() { counters('attribEnables'); },
    vertexAttribDivisor() { counters('attribDivisors'); },
    vertexAttribPointer(index, count, type, norm, stride, offset) {
      counters('attribPointers');
      bound.attrib.set(index, { buffer, offset });
    },
    bufferData(kind, data, usage, start = 0, length = data.length) {
      counters('uploads');
      stats.bytes = (stats.bytes || 0) + length * data.BYTES_PER_ELEMENT;
      buffer.data = data.slice(start, start + length);
    },
    drawElementsInstanced(mode, elements, type, offset, instances) {
      counters('instancedDraws');
      if (!state.verify) return;
      const binding = bound.attrib.get(2), first = binding.offset / 4;
      const data = binding.buffer.data.subarray(first, first + instances * 20);
      assert.equal(data.length, instances * 20);
      for (let i = 0; i < 5; i++) {
        assert.equal(bound.attrib.get(2 + i).buffer, binding.buffer);
        assert.equal(bound.attrib.get(2 + i).offset, binding.offset + i * 16);
      }
      assert.equal(bound.indices?.name, 'shared indices');
      const hash = crypto.createHash('sha256').update(Buffer.from(data.buffer, data.byteOffset, data.byteLength)).digest('hex');
      this.records.push([program, faces, elements, offset, instances, hash]);
    },
    uniformMatrix4fv(loc, transpose, values) {
      if (this.verify && loc === 'uBones') this.records.push(Array.from(values));
    }
  };
  return new Proxy(state, { get: (target, key) => key in target ? target[key] : () => {} });
}

function engineBody(source) {
  const cut = (start, end, from = 0) => {
    const first = source.indexOf(start, from);
    const after = source.indexOf(end, first + start.length);
    assert.ok(first >= 0 && after > first, start);
    return source.slice(first, after);
  };
  const materials = cut('    const MATERIAL_CHANNEL = {', '    function box(');
  const methods = cut('        drawSunShadows(statics, dynamics, c) {', '        resize() {', source.indexOf('class GLRenderer'));
  return materials + `
    const sunShadowMatrix = () => identity;
    Heatline.GLRenderer = class {
      getVisibleStatic() { return this.testStatics; }
      getVisibilityInfo() { return { visible: this.testStatics.length }; }
      ${methods}
    };
  `;
}

function boot({ engine, render, policy, core, storage = new Map() }) {
  let allocations = 0, now = 0;
  class CountedArray extends Float32Array {
    static get [Symbol.species]() { return Float32Array; }
    constructor(...args) { super(...args); allocations++; }
  }
  const H = {
    SCENE_NEAR: .45, SCENE_FAR: 5050, quality51: { fixed: true },
    clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
    lerp: (a, b, t) => a + (b - a) * t, daylightFromHour: () => .75,
    angleDiff: (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a)),
    streetCharacterPose32: () => { throw Error('unexpected character fallback'); }
  };
  const ctx = vm.createContext({
    Heatline: H, identity, Float32Array: CountedArray, WebGL2RenderingContext: class {},
    URLSearchParams, location: { search: '?dayNight=1' }, window: { devicePixelRatio: 1 },
    performance: { now: () => now }, localStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) },
    console: { warn: label => assert.equal(label, '[Realism39] culling upgrade skipped') }
  });
  for (const src of [engineBody(engine), render, policy, core]) if (src) vm.runInContext(src, ctx);
  return { H, now: value => { now = value; }, allocations: () => allocations };
}

function sceneTrial({ H, now }) {
  const gl = fakeGL(), r = Object.create(H.GLRenderer.prototype);
  const shapes = Array.from({ length: 60 }, (_, i) => i % 3 ? 's20_sedan_' + i : 'i31_blue_m' + i);
  const allShapes = ['cube', 'wedge', 'wheel', ...shapes];
  const box = (i, moving) => ({
    x: i % 113 - 60, y: 2, z: Math.floor(i / 113) * 2 - 28, yaw: i % 2 ? .04 : 0,
    w: 1.4, h: 1.8, d: 1.1, color: '#8c91a0', shape: allShapes[(i + (moving ? 4 : 0)) % allShapes.length],
    material: moving && i % 23 === 0 ? 'translucent_glass' : i % 11 ? 'metal' : 'unknown-test-material',
    layer: 4, glow: 0, lodMax: moving && i % 13 === 0 ? 100 : 0, visibilityCap: 540
  });
  const statics = Array.from({ length: 5800 }, (_, i) => box(i, false));
  const dynamics = Array.from({ length: 1690 }, (_, i) => box(i, true));
  const scene = { cubes: {}, wedges: {}, sea: {}, extra: new Map() };
  const vao = gl.createVertexArray(), vertices = {};
  vao.indices = { name: 'shared indices' };
  vao.attrib.set(0, { buffer: vertices });
  vao.attrib.set(1, { buffer: vertices });
  Object.assign(r, {
    testStatics: statics, indoorStatic: scene, outdoorStatic: scene, activeStaticScene: scene,
    gl, vao, glWidth: 1920, glHeight: 1080, rcOutW: 1920, rcOutH: 1080,
    displayRatio463: 1, prog: { name: 'world' }, shadowProgram: { name: 'shadow' }, shadowReady: true, shadowSize: 2048,
    shadowBuffer: {}, shadowViewLoc: 'shadowView', shadowFrameIndex: 0, shadowMatrix: identity,
    canvas: { width: 1920, height: 1080 }, instanceScratch: new Float32Array(0), modelBuffers: new Map(),
    modelRanges: new Map(shapes.map((name, i) => [name, { offset: 400 + i * 500, count: 120 + i * 3 }])),
    wheelIndexCount: 72, dynamicBuffer: {}, wheelBuffer: {}, wedgeBuffer: {},
    materialTextures: [], qualityScale: 1, skyProgram: { name: 'sky' }, skyVAO: gl.createVertexArray(),
    lightData: new Float32Array(48), lightColors: new Float32Array(36), lightCones: new Float32Array(48),
    updateAtmosphere() { H.realism39.frame.sunDir = [1, .6, 0]; }
  });
  const camera = { x: 0, y: 4, z: 0, tx: 0, ty: 2, tz: -10, fov: 64 };
  const weather = { cloud: 0, rain: 0, flash: 0, wind: 0 };
  const draw = i => { now(100 + i * 17); r.draw(statics, dynamics, camera, 1, [], [], [], 17.35, weather, false); };
  draw(0);
  const records = gl.records.slice();
  gl.verify = false;
  for (let frame = 1; frame <= 35; frame++) draw(frame);
  for (const key of Object.keys(gl.stats)) gl.stats[key] = 0;
  for (let frame = 36; frame < 126; frame++) draw(frame);
  return { records, counts: { ...gl.stats }, frames: 90 };
}

function skinTrial({ H, now, allocations }) {
  const RC = H.realism39, gl = fakeGL();
  class Game { attachImportedModels441() {} buildDynamic() {} }
  RC.installers.find(f => f.name === 'installCharacters')(Game);
  RC.makeProgram = () => ({});
  const game = new Game();
  game.renderer = { gl, atmosphere: true, shadowMatrix: identity };
  game.attachImportedModels441();
  RC.renderer = game.renderer;
  const actors = Array.from({ length: 40 }, (_, i) => ({
    x: 0, y: 0, z: 0, yaw: i * .01, vx: i % 2 ? 1 : 0, vz: 0, style: i % 6, appearance: i,
    injuryState: i === 5 ? 'down' : 'walking', grounded: true, socialPose: i === 10 ? 'photo' : undefined
  }));
  const draw = i => {
    now(1000 + i * 17);
    game.buildDynamic();
    for (let j = 0; j < actors.length; j++) H.streetCharacterPose32(actors[j], [], 0, j === 0, 0, true);
    RC.passes.opaque[0](game.renderer, { viewProjection: identity });
  };
  draw(0);
  gl.verify = false;
  const first = allocations();
  for (let i = 1; i <= 25; i++) {
    gl.verify = i === 25;
    draw(i);
  }
  return { matrices: gl.records, allocations: allocations() - first };
}

const sources = {
  engine: read('engine44.js', process.env.STAGE52_ENGINE_ROOT || root),
  render: read('assets/stage39_realism_render.js'),
  core: read('assets/stage39_realism_core.js'),
  policy: read('assets/stage52_render.js')
};
const store = new Map(), settings = boot({ ...sources, storage: store }).H.render52;
assert.equal(settings.getSettings().mode, '1080p');
const fallback = settings.status({ renderer: { canvas: { width: 1280, height: 720 } } });
assert.deepEqual([fallback.width, fallback.height, fallback.outputWidth, fallback.outputHeight, fallback.scale],
  [1280, 720, 1280, 720, 1], 'status reports actual Canvas fallback dimensions');
assert.equal(settings.measure(1280, 720, 1, 4096).w, 1920);
assert.equal(settings.measure(1280, 720, 1, 4096).h, 1080);
settings.setSettings({ mode: '1440p' });
assert.equal(settings.measure(1920, 1080, 1, 4096).w, 2560);
assert.equal(settings.measure(1920, 1080, 1, 4096).h, 1440);
assert.equal(settings.measure(1920, 1080, 1, 1024).limited, true);
settings.setSettings({ mode: 'native' });
assert.equal(settings.measure(1366, 768, 1, 4096).w, 1366);
assert.equal(settings.measure(1366, 768, 1, 4096).h, 768);
assert.equal(settings.measure(1920, 1080, 2, 4096).w, 3840);
settings.setSettings({ mode: 'custom', scale: .8, targetFps: 60 });
assert.equal(settings.measure(1366, 768, 1, 4096).w, 1093);
assert.equal(settings.measure(1920, 1080, 1, 4096).w, 1536);
assert.equal(settings.measure(2560, 1440, 1, 4096).w, 2048);
assert.equal(boot({ ...sources, storage: store }).H.render52.getSettings().scale, .8);
settings.setSettings({ mode: 'auto' });
const capped = settings.measure(7680, 4320, 1, 4096, .8);
assert.ok(capped.w < capped.outW && capped.limited, 'adaptive scale still works under an allocation cap');
const renderer = {
  atmosphere: true, rcResScale: 1,
  setResolutionScale(value) { this.rcResScale = value; }, resize() {}
};
const game = { renderer, activeFrames: 100, frameTimeMs: 40, showInfo() {}, updateDiagnostics() {} };
const samples = (from, to, ms) => {
  game.frameTimeMs = ms;
  for (let t = from; t <= to; t += 100) settings.observe(game, true, t);
};
samples(0, 4900, 40);
assert.equal(renderer.rcResScale, .94, 'sustained real frame delays lower opt-in scale');
samples(5000, 10000, 40);
assert.equal(renderer.rcResScale, 1, 'CPU-bound probe restores full scale');
samples(10100, 20000, 45);
assert.equal(renderer.rcResScale, 1, 'failed probe respects cooldown');
settings.toggleAdaptive(game);
assert.equal(settings.getSettings().mode, 'custom');
samples(30000, 40000, 100);
assert.equal(renderer.rcResScale, 1, 'custom policy stays fixed under load');
settings.setSettings({ mode: 'auto', targetFps: 50 }, game);
for (let t = 0; t <= 70000; t += 100) {
  game.frameTimeMs = 38 * renderer.rcResScale ** 2;
  settings.observe(game, true, t);
}
assert.equal(renderer.rcResScale, .72, 'a successful scale probe settles on the paced tier');
for (let t = 70100; t <= 125000; t += 100) {
  game.frameTimeMs = 12;
  settings.observe(game, true, t);
}
assert.equal(renderer.rcResScale, 1, 'sustained headroom restores the selected reference resolution');

const candidate = sceneTrial(boot(sources)), candidateSkin = skinTrial(boot(sources));
assert.equal(candidateSkin.allocations, 0, 'steady skin pose buffer reuse');
assert.ok(candidate.records.length > 150, 'submission exercises opaque, glass and shadow model ranges');
const result = { candidate: candidate.counts, candidateSkinAllocations: candidateSkin.allocations, frames: candidate.frames };
if (process.argv.includes('--compare')) {
  const baselineRoot = process.env.STAGE52_BASELINE_ROOT;
  const old = name => baselineRoot ? read(name, baselineRoot) : execFileSync('git', ['show', '96316d2:' + name],
    { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const original = { engine: old('engine44.js'), render: old('assets/stage39_realism_render.js'), core: old('assets/stage39_realism_core.js') };
  const baseline = sceneTrial(boot(original)), skin = skinTrial(boot(original));
  assert.deepEqual(candidate.records, baseline.records, 'instance bytes, order and face culling match Stage 51');
  assert.deepEqual(candidateSkin.matrices, skin.matrices, 'bone transforms match Stage 51');
  assert.equal(candidate.counts.instancedDraws, baseline.counts.instancedDraws);
  assert.equal(candidate.counts.bytes, baseline.counts.bytes);
  assert.ok(candidate.counts.uploads < baseline.counts.uploads);
  assert.ok(candidate.counts.attribPointers < baseline.counts.attribPointers);
  result.baseline = baseline.counts;
  result.baselineSkinAllocations = skin.allocations;
}
console.log(JSON.stringify(result, null, 2));
console.log('PASS Stage 52 model submission, skin transforms, and persisted resolution policy');
