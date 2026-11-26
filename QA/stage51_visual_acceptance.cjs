'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load(context, ...files) {
  for (const file of files) {
    const filename = path.join(__dirname, '..', 'assets', file);
    vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  }
}

function harness(search = '') {
  const elements = new Map();
  const document = {
    readyState: 'loading',
    addEventListener() {},
    getElementById(id) {
      if (!elements.has(id)) {
        const events = new Map();
        elements.set(id, {
          addEventListener(type, handler) { events.set(type, handler); },
          emit(type, props) {
            const event = {
              pointerId: 1, button: 0, pointerType: 'mouse', isPrimary: true,
              clientX: 0, clientY: 0, stopped: false,
              stopImmediatePropagation() { this.stopped = true; },
              ...props
            };
            events.get(type)?.(event);
            return event;
          },
          setPointerCapture(id) { this.capture = id; },
          hasPointerCapture(id) { return this.capture === id; },
          releasePointerCapture() { this.capture = null; },
          setAttribute() {},
          querySelectorAll() { return []; }
        });
      }
      return elements.get(id);
    }
  };
  class LegacyRenderer {}
  const H = {
    GLRenderer: LegacyRenderer,
    MissionJournal30: class {},
    realism39: { enabled: true, installers: [], passes: { shadow: [], opaque: [] } },
    clamp: (x, min, max) => Math.max(min, Math.min(max, x)),
    lerp: (a, b, t) => a + (b - a) * t,
    angleDiff: (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from)),
    deckGround443: car => car.ground,
    carClass: () => 'standard',
    VEHICLE_CLASSES: { standard: { hd: 2.42, roof: 2.1 } },
    streetCharacterPose32(walker, out) { out.push(walker); }
  };
  const context = vm.createContext({
    console, URLSearchParams, document, performance, Heatline: H,
    location: { search: search + (search ? '&' : '?') + 'gameplay48Off=1' }
  });
  load(context, 'stage38_adaptive_lod.js', 'stage39_realism_core.js', 'stage50_city.js', 'stage51_quality.js');
  function Game() {
    this.running = true;
    this.onBus = this.onTram = -1;
    this.cameraMode = 0;
    this.cam = { x: 0, y: 3, z: 5, tx: 0, ty: 1.4, tz: 0, fov: 63 };
    this.avatar = { x: 0, y: 0, z: 0, vx: 0, vz: 0, yaw: 0 };
    this.player = { x: 0, z: 0, vx: 0, vz: 0, yaw: 0, ground: 0 };
    this.footCameraYaw = 0;
    this.keys = new Set();
  }
  Game.prototype.updateCamera = function () {
    this.legacyCalls = (this.legacyCalls || 0) + 1;
    this.cameraTransfer = Math.max(0, this.cameraTransfer - 1 / 60);
  };
  Game.prototype.cameraClearance = function (eye, destination) {
    const clearance = this.wallClearance ?? 1;
    return {
      x: H.lerp(eye.x, destination.x, clearance),
      y: H.lerp(eye.y, destination.y, clearance),
      z: H.lerp(eye.z, destination.z, clearance),
      clearance, blocked: clearance < 1
    };
  };
  Game.prototype.attachImportedModels441 = function () {};
  Game.prototype.stage44TrackPointer = function () { this.trackCalls = (this.trackCalls || 0) + 1; };
  Game.prototype.is = function (key) { return this.keys.has(key); };
  H.realism39.installers.find(f => f.name === 'installCharacters')(Game);
  H.realism39.installers.at(-1)(Game);
  H.realism39.renderer = { rcCharacters: {} };
  return { H, canvas: document.getElementById('game'), game: new Game() };
}

function frames(game, count, dt = 1 / 60) {
  for (let i = 0; i < count; i++) game.updateCamera(dt);
}
function range(game) {
  const subject = game.inVehicle ? game.player : game.avatar;
  return Math.hypot(game.cam.x - subject.x, game.cam.z - subject.z);
}

const { H, game, canvas } = harness();
assert.equal(H.realism39.fidelity51.mode, 'high');
assert.equal(H.realism39.fidelity51.reason, 'default');
assert.equal(H.stage38AdaptiveLOD.enabled(), false);
const adaptive = harness('?adaptiveQuality=1').H;
assert.equal(adaptive.quality51.mode, 'adaptive');
assert.equal(adaptive.stage38AdaptiveLOD.enabled(), true);
assert.equal(harness('?realismLow=1').H.quality51.mode, 'high');

frames(game, 60);
assert.ok(range(game) > 4 && range(game) < 6, 'normal foot framing');
assert.ok(game.cam.z > game.avatar.z && game.cam.ty > game.avatar.y);
const initialLift = game.cam.y;
assert.equal(canvas.emit('pointerdown').stopped, true);
assert.equal(canvas.capture, 1);
canvas.emit('pointermove', { clientX: 76, clientY: 30 });
assert.ok(game.footCameraYaw < -.4, 'movement coordinates follow the drag');
frames(game, 60);
assert.ok(game.cam.x < -1 && game.cam.y > initialLift + .25, 'yaw and pitch update the foot chase');
canvas.emit('pointercancel');
assert.equal(canvas.capture, null);
const footYaw = game.footCameraYaw;

game.keys.add('KeyB');
frames(game, 45);
assert.ok(game.cam.z < game.avatar.z, 'foot rear view reverses the camera');
assert.equal(game.footCameraYaw, footYaw, 'rear view leaves movement controls oriented');
game.keys.clear();
frames(game, 60);
assert.ok(game.cam.z > game.avatar.z, 'foot rear view releases');

const { game: unarmed, canvas: unarmedCanvas } = harness();
frames(unarmed, 1);
assert.equal(unarmedCanvas.emit('pointerdown', { button: 2 }).stopped, true, 'unarmed right drag bypasses legacy input');
unarmedCanvas.emit('pointermove', { clientX: 25, clientY: 20 });
assert.ok(unarmed.footCameraYaw < -.14 && unarmed.aimPitch > .07, 'unarmed right drag applies shared yaw and pitch');
unarmedCanvas.emit('pointerup', { button: 2 });

game.armed = true;
assert.equal(canvas.emit('pointerdown').stopped, false, 'armed left click still reaches legacy handler');
assert.equal(canvas.emit('pointerdown', { button: 2 }).stopped, true);
canvas.emit('pointermove', { clientX: 50, clientY: 15 });
assert.equal(game.trackCalls, 2, 'armed camera drag keeps pointer tracking');
assert.ok(game.aimPitch > 0);
canvas.emit('pointerup');
game.armed = false;

game.wallClearance = .25;
frames(game, 1);
assert.ok(range(game) < 2, 'wall immediately retracts camera');
game.wallClearance = 1;
frames(game, 1);
assert.ok(range(game) < 2.3, 'camera extends out of obstruction gradually');
frames(game, 60);
assert.ok(range(game) > 4, 'camera extends fully after wall clears');

const { game: blockedChase } = harness();
blockedChase.footCameraYaw = .7;
blockedChase.wallClearance = 0;
frames(blockedChase, 1);
assert.equal(range(blockedChase), 0, 'zero clearance leaves the eye at the safe anchor');
const { x, z, tx, tz } = blockedChase.cam;
assert.ok(Math.hypot(tx - x, tz - z) > .29, 'zero clearance keeps a nondegenerate view');
assert.ok((tx - x) * Math.sin(.7) + (tz - z) * Math.cos(.7) < -.29, 'pinched camera still looks along its heading');

const beforeCar = { ...game.cam };
game.inVehicle = true;
frames(game, 1);
assert.ok(Math.hypot(beforeCar.x - game.cam.x, beforeCar.z - game.cam.z) < 2);
frames(game, 60);
assert.ok(range(game) > 7, 'vehicle uses its proper chase distance');
assert.equal(canvas.emit('pointerdown').stopped, true);
canvas.emit('pointermove', { clientX: -71, clientY: 31 });
frames(game, 60);
assert.ok(game.cam.x > 1, 'vehicle uses the same pointer yaw');
assert.equal(game.footCameraYaw, footYaw - .30, 'driving never steers the foot view');
canvas.emit('pointerup');
game.cameraMode = 1;
frames(game, 60);
assert.ok(range(game) > 12, 'wide camera retains greater vehicle distance');
game.cameraMode = 2;
frames(game, 1);
assert.equal(game.legacyCalls, 1, 'hood camera delegates');
game.cameraMode = 0;
game.keys.add('KeyQ');
frames(game, 60);
assert.ok(game.cam.z < game.player.z, 'car rear view remains on Q');
game.keys.clear();
game.inVehicle = false;
frames(game, 150);
assert.ok(range(game) < 6, 'exit returns to the foot profile');
for (const [key, value] of Object.entries({
  onBus: 0, onTram: 0, indoor: {}, retailVisit: {}, vehicleEntry: {},
  entryTransition: {}, exitTransition: {}, cameraTransfer: .25, flight51: { pilot: true },
  boat444: {}, roofVisit: {}, prison471: { active: true }
})) {
  const previous = game[key], calls = game.legacyCalls;
  game[key] = value;
  frames(game, 1);
  game[key] = previous;
  assert.equal(game.legacyCalls, calls + 1, `${key} retains its own camera`);
}
game.avatar.swim445 = {};
const beforeSwim = game.legacyCalls;
frames(game, 1);
assert.equal(game.legacyCalls, beforeSwim + 1, 'dedicated swim camera stays active');

const npc = (appearance, extra) => ({
  x: 0, y: 0, z: 0, yaw: 0, vx: 0, vz: 0, style: 0, appearance, injuryState: 'walking',
  ...extra
});
const fallback = [];
for (let i = 0; i < 32; i++) H.streetCharacterPose32(npc(i), fallback, 0, false, 150, true);
H.streetCharacterPose32(npc(44, { socialPose: 'sit' }), fallback, 0, false, 150, true);
H.streetCharacterPose32(npc(0), fallback, 0, true, 0, true);
assert.equal(fallback.length, 0);
const queue = H.realism39.characterQueue;
assert.equal(queue.length, 34, 'skinned crowd keeps high detail beyond old distance and count limits');
assert.ok(queue[32].pose.rootY < -.4, 'skinned seated actor actually sits');
assert.ok(queue[33].outfit.kippah && queue[33].outfit.tzitzit);
assert.equal(new Set(queue.map(x => x.key)).size, queue.length, 'distinct actor outfits do not collide');

// A software GL harness tracks uploads and deletion across successive dense frames.
let allocations = 0, freed = 0;
const gl = new Proxy({
  createVertexArray() { return { id: ++allocations }; },
  deleteVertexArray() { freed++; },
  createBuffer() { return {}; }
}, { get: (target, method) => target[method] || (() => {}) });
H.realism39.GLSL = { uniforms: "", funcs: "" };
H.realism39.makeProgram = () => ({});
H.realism39.applyUniforms = () => {};
H.realism39.frame = {};
game.renderer = { atmosphere: true, gl };
game.attachImportedModels441();
H.realism39.renderer = game.renderer;
const frame = { viewProjection: Float32Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1) };
const draw = () => H.realism39.passes.opaque[0](game.renderer, frame);
queue.length = 0;
for (let i = 0; i < 101; i++) H.streetCharacterPose32(npc(i), fallback, 0, i === 0, 100, true);
draw();
assert.equal(allocations, 101);
assert.equal(freed, 0, 'live actors remain cached even above the nominal capacity');
queue.length = 0;
for (let i = 0; i < 101; i++) H.streetCharacterPose32(npc(i), fallback, 0, i === 0, 100, true);
draw();
assert.equal(allocations, 101, 'steady crowd avoids GPU buffer re-uploads');
queue.length = 1;
draw();
assert.equal(freed, 5, 'inactive meshes are evicted only once the crowd moves away');
assert.ok(game.renderer.rcCharacters.meshes.has('hero'));

adaptive.streetCharacterPose32(npc(1), fallback, 0, false, 150, true);
assert.equal(fallback.length, 1, 'adaptive selection retains old crowd distance');

const creatures = [];
for (let i = 0; i < 5; i++) for (const [kind, x] of [['flamingo', 160], ['heron', 140], ['crocodile', 335]]) {
  creatures.push({ kind, x, z: i });
}
const plane = { gear: 0, x: 1690, z: 0 };
const parked = [{ gear: 1, x: 492, z: 0 }, { gear: 1, x: 555, z: 0 }];
const fish = [{ variant43: 0, species: 'mackerel', x: 158, z: 0 }];
const ready = new Map(['flamingo_hi', 'heron_hi', 'crocodile_hi', 'airliner_hi', 'airliner_cruise_hi', 'fish_unique']
  .map(key => [key, { texturesReady: true, drawableFish: () => [0] }]));
const renderer = {
  assets: ready, selection: new Map(), ensured: new Set(),
  ensure(key) { this.ensured.add(key); },
  ready(key) { return this.assets.has(key); },
  makeFishSpecies(f) { return 'fish_' + f.species; }
};
const life = { wildlife: creatures, plane, fish, world: { parkedAirliners471: parked } };
const observer = { x: 0, y: 0, z: 0 };
assert.equal(H.quality51.prepareWildlife(renderer, life, observer), true);
assert.equal(renderer.selection.size, 18);
assert.equal(renderer.crocLodFrame.selected.high, 5);
assert.equal(renderer.selection.get(plane), 'airliner_cruise_hi');
assert.equal(renderer.selection.get(parked[0]), 'airliner_hi');
assert.equal(renderer.selection.has(parked[1]), false);
assert.equal(renderer.selection.get(fish[0]), 'fish_unique');
renderer.selection.clear();
ready.delete('crocodile_hi');
assert.equal(H.quality51.prepareWildlife(renderer, life, observer), true);
assert.equal(renderer.crocLodFrame.selected.high, 0);
assert.ok(renderer.ensured.has('crocodile_hi'), 'pending geometry requests the authored high asset');
assert.equal(adaptive.quality51.prepareWildlife(renderer, life, observer), false);
console.log('PASS Stage 51 chase controls, special cameras, character queue, and fixed wildlife model selection');

// Exercise the actual renderer's resize and adaptation methods. The base
// culler is deliberately absent here, since no geometry pass is emulated.
{
  const H = { GLRenderer: class {} };
  const context = vm.createContext({
    Heatline: H, URLSearchParams, WebGL2RenderingContext: class {},
    location: { search: '?dayNight=1' }, window: { devicePixelRatio: 1 },
    console: { warn(message) { assert.equal(message, '[Realism39] culling upgrade skipped'); } }
  });
  load(context, 'stage39_realism_render.js', 'stage51_quality.js');
  const renderer = Object.create(H.GLRenderer.prototype);
  Object.assign(renderer, {
    canvas: { clientWidth: 1280, clientHeight: 720 },
    gl: { viewport() {} }, rcComposite: {}, rcResScale: .8,
    renderPolicy475: 'native1080', atmosphere: {}, rcGpuMs: 60
  });
  renderer.resize();
  assert.equal(renderer.glWidth, 1920);
  assert.equal(renderer.glHeight, 1080);
  assert.equal(renderer.renderNative475, true);
  class Game {}
  H.realism39.installGame(Game);
  const game = new Game();
  game.renderer = renderer;
  game.activeFrames = 300;
  game.manageVisualQuality450(true, 5000);
  assert.equal(renderer.rcLite, undefined, 'native mode ignores GPU-time downgrade');
  renderer.maxSide463 = 1024;
  renderer.resize();
  assert.equal(renderer.glWidth, 1024);
  assert.equal(renderer.renderNative475, false);
  assert.equal(renderer.framebufferLimited475, true);
  renderer.maxSide463 = 4096;
  renderer.renderPolicy475 = 'adaptive50';
  renderer.resize();
  assert.equal(renderer.glWidth, 1024);
  assert.equal(renderer.glHeight, 576);
  assert.equal(renderer.canvas.width, 1280);
  assert.equal(renderer.canvas.height, 720);
  assert.equal(H.quality51.fixed, true, 'changing pixel policy preserves full model detail');
  game.manageVisualQuality450(true, 5000);
  assert.equal(renderer.rcLite, true);
}
console.log('PASS Stage 51 native Full HD sizing and independent adaptive resolution policy');
