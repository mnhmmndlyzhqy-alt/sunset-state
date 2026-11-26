const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { test } = require('node:test');
const vm = require('node:vm');

const root = resolve(process.env.STAGE51_SOURCE_ROOT || resolve(__dirname, '..'));
const importSpeech = () => import(pathToFileURL(resolve(root, 'assets/speech/speech-engine.js')).href);
const asset = path => readFileSync(resolve(root, path), 'utf8');
const voiceScript = asset('assets/stage39_city_voices.js');
const chatScript = asset('assets/stage48_chat.js');
const manifest = JSON.parse(asset('assets/voices/manifest.json'));
const bank = JSON.parse(asset('assets/chat48_bank.json'));
const absentLine = 'קוראים לך נועה.';
const flush = () => new Promise(resolve => setImmediate(resolve));
const response = value => ({
  ok: true, json: async () => value, arrayBuffer: async () => value
});

function target(props) {
  const listeners = new Map();
  return Object.assign({
    addEventListener(event, fn) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
    },
    dispatch(event, detail = {}) {
      for (const fn of listeners.get(event) || []) fn(detail);
    }
  }, props);
}

function element(tag, document) {
  const children = [], selectors = new Map();
  const n = target({
    tagName: tag.toUpperCase(), dataset: {}, style: {}, children, attributes: {},
    append(...nodes) { children.push(...nodes); },
    appendChild(child) { children.push(child); },
    replaceChildren() { children.length = 0; },
    remove() { this.removed = true; },
    contains(x) { return children.includes(x) || [...selectors.values()].includes(x); },
    querySelector(selector) {
      if (!selectors.has(selector)) selectors.set(selector, element(selector === 'input' ? 'input' : 'div', document));
      return selectors.get(selector);
    },
    matches(selector) { return this.tagName === 'INPUT' && selector.includes('input'); },
    setAttribute(k, v) { this.attributes[k] = v; },
    focus() { document.activeElement = this; },
    blur() { if (document.activeElement === this) document.activeElement = null; }
  });
  return n;
}

function harness({ search = '', preferences = {}, fetchOverride, speech, random } = {}) {
  let now = 100, nextTimer = 0, insideGesture = false;
  const timers = new Map(), storage = new Map(Object.entries(preferences));
  const started = [], requests = [], contexts = [], errors = [], infos = [];
  const document = target({ readyState: 'complete', hidden: false });
  const soundButton = element('button', document); soundButton.dataset.off = '1';
  const volumeSettings = element('div', document), caption = element('output', document);
  document.body = element('body', document);
  document.head = element('head', document);
  document.getElementById = id => ({ 'sound-button': soundButton, settings51: volumeSettings, 'voices-caption50': caption })[id];
  document.createElement = tag => element(tag, document);
  const param = () => ({
    value: 0, ramps: [],
    setTargetAtTime(v) { this.value = v; },
    setValueAtTime(v, t) { this.ramps.push(['set', v, t]); },
    linearRampToValueAtTime(v, t) { this.ramps.push(['ramp', v, t]); }
  });
  const audioNode = () => ({
    gain: param(), pan: param(), frequency: param(), Q: param(), threshold: param(), ratio: param(),
    positionX: param(), positionY: param(), positionZ: param(),
    connect(node) { this.connected = node; }, disconnect() { this.connected = null; }
  });
  class Context {
    constructor() {
      this.state = 'suspended';
      this.sampleRate = 1000;
      this.currentTime = 1;
      this.resumeCalls = 0;
      this.destination = audioNode();
      this.listener = Object.fromEntries(['position', 'forward', 'up'].flatMap(k => ['X', 'Y', 'Z'].map(axis => [k + axis, param()])));
      contexts.push(this);
    }
    resume() {
      this.resumeCalls++;
      if (!insideGesture) return Promise.reject(new Error('No browser gesture'));
      this.state = 'running';
      return Promise.resolve();
    }
    createGain() { return audioNode(); }
    createPanner() { return audioNode(); }
    createStereoPanner() { return audioNode(); }
    createBiquadFilter() { return audioNode(); }
    createDynamicsCompressor() { return audioNode(); }
    createConvolver() { return audioNode(); }
    createAnalyser() { return Object.assign(audioNode(), { getByteTimeDomainData(data) { data.fill(128); } }); }
    createBuffer(_, length, rate) {
      return { kind: 'synth', duration: length / rate, copyToChannel() {}, getChannelData: () => new Float32Array(length) };
    }
    createBufferSource() {
      return Object.assign(audioNode(), {
        playbackRate: param(),
        start() { assert.equal(contexts.at(-1).state, 'running'); started.push(this); },
        stop() { this.stopped = true; },
        end() { this.onended?.(); }
      });
    }
    async decodeAudioData(buffer) {
      if (buffer === 'bad-mp3') throw new Error('invalid MP3');
      return { kind: 'recorded', duration: 1 };
    }
  }
  class Game {
    constructor() {
      this.keys = new Set();
      this.avatar = { x: 0, z: 0, y: 0, vx: 0, vz: 0 };
      this.cam = { x: 0, y: 4, z: 6, tx: 0, ty: 0, tz: 0 };
      this.pedestrians = [];
      this.world = { nearby: () => [], stage38Sites: [{ name: 'AIRPORT', x: 150, z: 0 }] };
      this.onBus = this.onTram = -1;
      this.seconds = 1;
    }
    restart() { this.running = true; this.paused = false; this.over = false; }
    togglePause() { this.paused = !this.paused; }
    muteSound() { soundButton.dataset.off = soundButton.dataset.off === '1' ? '0' : '1'; }
    update() {}
    nearestEntrance() { return null; }
    preferredRetailDoor() { return null; }
    nearestCar() { return null; }
    showInfo(text) { infos.push(text); }
  }
  const game = new Game();
  const ctx = vm.createContext(target({
    URLSearchParams, AbortController, AudioContext: Context, document, location: { search },
    console: { warn: message => errors.push(message) },
    performance: { now: () => now },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    setTimeout(fn, ms) { const id = ++nextTimer; timers.set(id, { fn, at: now + ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
    fetch(url, options) {
      requests.push(url);
      return Promise.resolve(fetchOverride?.(url, options) ?? response(url.endsWith('manifest.json') ? manifest :
        url.endsWith('chat48_bank.json') ? bank : 'mp3'));
    },
    SunsetSpeech: speech, __SUNSET_PERFORMANCE06_GAME: game,
    Heatline: { sameRoadLevel443: () => true, officerSightClear: () => true }
  }));
  if (random) ctx.Math = Object.assign(Object.create(Math), { random });
  vm.runInContext(voiceScript, ctx);
  vm.runInContext(chatScript, ctx);
  const rc = ctx.Heatline.realism39;
  rc.installers.forEach(install => install(Game));
  const who = { x: 1, y: 0, z: 0, injuryState: 'walking', panic: 0, appearance: 1 };
  game.pedestrians.push(who);
  function gesture(fn) {
    insideGesture = true;
    try { return fn(); } finally { insideGesture = false; }
  }
  function keyE() {
    const event = { type: 'keydown', code: 'KeyE', isTrusted: true, target: document.activeElement,
      preventDefault() { this.prevented = true; }, stopImmediatePropagation() {} };
    gesture(() => ctx.dispatch('keydown', event));
    return event;
  }
  async function advance(ms) {
    now += ms;
    for (const [id, timer] of timers) if (timer.at <= now) { timers.delete(id); timer.fn(); }
    await flush();
  }
  return { rc, ctx, document, caption, soundButton, volumeSettings, game, who, started, requests, contexts, errors, infos, storage, gesture, keyE, advance, timers };
}

test('starts Web Audio during Play or save restart, then retries an unavailable manifest and speech bridge', async () => {
  let attempts = 0;
  const h = harness({ fetchOverride(url) {
    if (url.endsWith('manifest.json') && ++attempts === 1) return { ok: false, status: 503 };
  } });
  await flush();
  h.gesture(() => h.game.restart({ reuseWorld: true }));
  assert.equal(h.soundButton.dataset.off, '0');
  assert.equal(h.contexts.length, 1);
  assert.equal(h.contexts[0].state, 'running');
  assert.equal(h.rc.voices.ready, false);
  const module = await importSpeech();
  h.ctx.SunsetSpeech = module;
  h.ctx.dispatch('sunset-speech-ready');
  await flush();
  assert.equal(h.rc.voices.engine.backend.ctx, h.contexts[0]);
  await h.advance(2100);
  h.gesture(() => h.ctx.dispatch('pointerup', { isTrusted: true }));
  await flush();
  assert.equal(attempts, 2);
  assert.equal(h.rc.hasClip('שלום'), true);
  h.rc.chatSpeak(h.who, ['שלום'], 'man_calm');
  await flush();
  assert.equal(h.started[0].buffer.kind, 'recorded');
  h.started[0].end();
  await flush();
  assert.equal(h.rc.voices.stats.spoken, 1);
});

test('engine initialization failure recovers on the next gesture without replacing its unlocked context', async () => {
  const speech = await importSpeech();
  let attempts = 0;
  class RetryEngine extends speech.SpeechEngine {
    async init() {
      if (++attempts === 1) throw new Error('Transient engine failure');
      return super.init();
    }
  }
  const h = harness({ speech: { ...speech, SpeechEngine: RetryEngine } });
  h.gesture(() => h.game.restart());
  await flush();
  assert.equal(h.rc.voices.ready, false);
  h.gesture(() => h.ctx.dispatch('keydown', { isTrusted: true }));
  await flush();
  assert.equal(h.rc.voices.ready, true);
  assert.equal(h.contexts.length, 1);
});

test('chat sequentially speaks lines after a clip HTTP error, decode error and a missing entry', async () => {
  const speech = await importSpeech();
  let firstClip = true;
  const decodedBadly = manifest.lines['שלום'].id;
  const h = harness({ speech, fetchOverride(url) {
    if (url.endsWith('.mp3') && firstClip) { firstClip = false; return { ok: false, status: 404 }; }
    if (url.includes(decodedBadly)) return response('bad-mp3');
  } });
  h.gesture(() => h.game.restart());
  await flush();
  const done = [], lines = [];
  h.rc.chatSpeak(h.who, ['בוקר טוב', 'שלום', absentLine], 'man_calm',
    (_, line) => lines.push(line), result => done.push(result));
  for (let i = 0; i < 3; i++) {
    await flush();
    assert.equal(h.started[i]?.buffer.kind, 'synth');
    h.started[i].end();
    await flush();
    await h.advance(190);
  }
  assert.deepEqual(lines, ['בוקר טוב', 'שלום', absentLine]);
  assert.deepEqual(done, [true]);
  assert.equal(h.rc.voices.clips.chat.size, 0);
  assert.equal(h.timers.size, 0);
  const recovered = [];
  h.rc.chatSpeak(h.who, ['בוקר טוב'], 'man_calm', null, result => recovered.push(result));
  await flush();
  assert.equal(h.started[3].buffer.kind, 'recorded');
  h.started[3].end();
  await flush();
  assert.deepEqual(recovered, [true]);
});

test('pausing cancels a pending download, restarting cancels the gap, and hiding stops synthesized speech', async () => {
  const speech = await importSpeech();
  let release;
  const h = harness({ speech, fetchOverride(url) {
    if (url.includes(manifest.lines['שלום'].id)) return new Promise(resolve => { release = resolve; });
  } });
  h.gesture(() => h.game.restart());
  await flush();
  const done = [];
  h.rc.chatSpeak(h.who, ['שלום', 'בוקר טוב'], 'man_calm', null, result => done.push(result));
  await flush();
  h.game.togglePause();
  release(response('mp3'));
  await flush();
  assert.deepEqual(done, [false]);
  assert.equal(h.started.length, 0);
  h.game.togglePause();
  h.rc.chatSpeak(h.who, ['בוקר טוב', 'שלום'], 'man_calm', null, result => done.push(result));
  await flush();
  h.started[0].end();
  await flush();
  h.game.restart();
  await h.advance(200);
  assert.equal(h.started.length, 1);
  assert.deepEqual(done, [false, false]);
  h.rc.chatSpeak(h.who, [absentLine], 'man_calm', null, result => done.push(result));
  await flush();
  h.document.hidden = true;
  h.document.dispatch('visibilitychange');
  assert.equal(h.started[1].buffer.kind, 'synth');
  assert.equal(h.started[1].stopped, true);
  assert.deepEqual(done, [false, false, false]);
  assert.equal(h.timers.size, 0);
});

test('master mute and the independent voice slider survive starts and stop current speech', async () => {
  const h = harness({ preferences: { sunset_state_sound_off: '1', sunset_state_voice_volume: '38' } });
  h.gesture(() => h.game.restart());
  assert.equal(h.soundButton.dataset.off, '1');
  assert.equal(h.contexts.length, 0);
  const slider = h.volumeSettings.children[0].children[0];
  assert.equal(slider.value, '38');
  h.gesture(() => h.game.muteSound());
  await flush();
  assert.equal(h.storage.get('sunset_state_sound_off'), '0');
  const done = [];
  h.rc.chatSpeak(h.who, ['בוקר טוב'], 'man_calm', null, result => done.push(result));
  await flush();
  assert.equal(h.started.length, 1);
  assert.equal(h.rc.voices.clips.out.gain.value, .95 * .38);
  slider.value = '0';
  slider.dispatch('input');
  assert.equal(h.started[0].stopped, true);
  assert.deepEqual(done, [false]);
  assert.equal(h.storage.get('sunset_state_voice_volume'), '0');
  assert.equal(h.soundButton.dataset.off, '0');
  h.game.muteSound();
  h.game.restart();
  assert.equal(h.soundButton.dataset.off, '1');
  assert.equal(h.storage.get('sunset_state_sound_off'), '1');
  const off = harness({ search: '?soundOff' });
  off.gesture(() => off.game.restart());
  assert.equal(off.soundButton.dataset.off, '1');
  await flush();
});

test('isolated conversation replies remember names and landmarks, and rotate recurring lines', async () => {
  const h = harness();
  await flush();
  const chat = h.rc.chat48, who = h.who;
  const first = chat.think(who, 'שָׁלוֹם, אֵיפֹה שדה התעופה?');
  assert.deepEqual(Array.from(first.parts), ['שדה התעופה?', bank.dirs.e_near]);
  assert.deepEqual(Array.from(chat.think(who, 'איך מגיעים לשם?').parts), [bank.dirs.e_near]);
  assert.ok(chat.think(who, 'קוראים לי נועה.').parts.length);
  assert.deepEqual(Array.from(chat.think(who, 'איך קוראים לי?').parts), [absentLine]);
  const who2 = { ...who };
  assert.deepEqual(Array.from(chat.think(who2, 'איך קוראים לי?').parts), ['איך קוראים לך?']);
  const replies = Array.from({ length: 4 }, () => chat.think(who, 'ספר לי בדיחה!').parts[0]);
  const count = bank.intents.joke.friendly.length;
  if (replies.length === count && !chat.mindOf(who).grumpy) assert.equal(new Set(replies).size, count);
  for (let i = 1; i < replies.length; i++) assert.notEqual(replies[i], replies[i - 1]);
});

test('chat interaction gives flight priority, retries its bank, and clears pending UI on restart', async () => {
  let attempt = 0;
  const h = harness({ fetchOverride(url) {
    if (url.endsWith('chat48_bank.json') && ++attempt === 1) return { ok: false, status: 503 };
  } });
  h.gesture(() => h.game.restart());
  await flush();
  h.game.flight51 = { ownsInteraction: () => true };
  assert.equal(h.keyE().prevented, undefined);
  assert.equal(h.rc.chat48.active, null);
  h.game.flight51 = { ownsInteraction: () => false };
  assert.equal(h.keyE().prevented, true);
  assert.equal(h.rc.chat48.active, null);
  assert.equal(h.infos.length, 1);
  await flush();
  h.keyE();
  assert.equal(h.rc.chat48.active.who, h.who);
  assert.ok(h.document.activeElement);
  assert.equal(h.keyE().prevented, undefined);
  assert.equal(h.rc.chat48.active.who, h.who);
  h.game.restart({ reuseWorld: true });
  await h.advance(2000);
  assert.equal(h.rc.chat48.active, null);
  assert.equal(h.document.activeElement, null);
  assert.equal(h.started.length, 0);
});

test('recorded fetch timeout aborts the transport and falls back for nearby ambient speech', async () => {
  const speech = await importSpeech();
  let signal;
  const h = harness({ speech, fetchOverride(url, options) {
    if (url.endsWith('.mp3')) { signal = options.signal; return new Promise(() => {}); }
  } });
  h.gesture(() => h.game.restart());
  await flush();
  h.rc.say(h.game, h.who, 'שלום', { voice: 'man_calm' });
  await flush();
  assert.equal(h.started.length, 0);
  await h.advance(2250);
  assert.equal(signal.aborted, true);
  assert.equal(h.started[0].buffer.kind, 'synth');
  h.started[0].end();
  await flush();
  assert.equal(h.rc.voices.stats.spoken, 1);
});

test('aircraft position replaces the boarding anchor and entering flight cancels old audio', async () => {
  const h = harness();
  h.gesture(() => h.game.restart());
  await flush();
  h.rc.say(h.game, h.who, 'שלום', { voice: 'man_calm' });
  await flush();
  assert.equal(h.started[0].buffer.kind, 'recorded');
  h.game.flight51 = { pilot: true, plane: { x: 200, y: 90, z: 200 } };
  h.game.update(1 / 60);
  assert.equal(h.started[0].stopped, true);
  await h.advance(2000);
  h.rc.say(h.game, h.who, 'שלום', { voice: 'man_calm' });
  await flush();
  assert.equal(h.started.length, 1);
  const nearPlane = { ...h.who, x: 199, y: 87, z: 200 };
  h.rc.say(h.game, nearPlane, 'שלום', { voice: 'man_calm' });
  await flush();
  assert.equal(h.started[1].buffer.kind, 'recorded');
  assert.equal(h.contexts[0].listener.positionX.value, 200);
  assert.equal(h.rc.voices.clips.cabin.frequency.value, 1600);
  h.started[1].end();
  await flush();
});

test('the shared voice queue preempts slow ambient downloads and reserves chat gaps', async () => {
  const speech = await importSpeech();
  let pending;
  const h = harness({ speech, fetchOverride(url) {
    if (url.includes(manifest.lines['שלום'].id)) return new Promise(resolve => { pending = resolve; });
  } });
  const duck = [];
  h.game.synth = { setVoiceDucking: gain => duck.push(gain) };
  h.gesture(() => h.game.restart());
  await flush();
  const rc = h.rc, listener = h.game, other = { ...h.who, x: 2 };
  assert.equal(rc.say(listener, h.who, 'שלום', { priority: 0 }), true);
  await flush();
  assert.equal(typeof pending, 'function');
  assert.equal(rc.say(listener, other, absentLine, { priority: 2 }), true);
  await flush();
  assert.deepEqual(h.started.map(source => source.buffer.kind), ['synth']);
  assert.deepEqual(duck, [.74]);
  pending(response('mp3'));
  await flush();
  assert.equal(h.started.length, 1, 'old decode cannot play when preempted');
  const chat = [];
  assert.equal(rc.chatSpeak(h.who, ['בוקר טוב', 'ערב טוב'], null, null, played => chat.push(played)), true);
  await flush();
  assert.equal(h.started[0].stopped, true);
  assert.equal(h.started[1].buffer.kind, 'recorded');
  const envelope = h.started[1].connected.gain.ramps;
  assert.deepEqual(envelope.map(entry => entry[0]), ['set', 'ramp', 'set', 'ramp']);
  assert.equal(envelope.at(-1)[1], 0);
  h.started[1].end();
  await flush();
  assert.equal(rc.say(listener, other, 'הצילו!', { priority: 3 }), false);
  assert.deepEqual(duck, [.74, 1, .74], 'effects stay ducked during the gap');
  await h.advance(190);
  assert.equal(h.started[2].buffer.kind, 'recorded');
  h.started[2].end();
  await flush();
  assert.deepEqual(chat, [true]);
  assert.deepEqual(duck, [.74, 1, .74, 1]);
});

test('lower priority speech stays queued and stale or out-of-range reactions are discarded', async () => {
  const h = harness();
  h.gesture(() => h.game.restart());
  await flush();
  const { rc, game, who } = h, quiet = { ...who, x: 2 }, normal = { ...who, x: 3 }, outside = { ...who, x: 4 };
  assert.equal(rc.say(game, who, 'הצילו!', { priority: 2 }), true);
  assert.equal(rc.say(game, quiet, 'שלום', { priority: 0 }), true);
  assert.equal(rc.say(game, normal, 'בוקר טוב', { priority: 1 }), true);
  assert.equal(rc.say(game, outside, 'ערב טוב', { priority: 1 }), true);
  await flush();
  assert.equal(h.started.length, 1);
  assert.equal(h.caption.textContent, 'הצילו!');
  await h.advance(1500);
  outside.x = 90;
  h.started[0].end();
  await flush();
  assert.equal(h.caption.textContent, 'בוקר טוב');
  assert.equal(h.started.length, 2);
  h.started[1].end();
  await flush();
  assert.equal(h.started.length, 2);
  assert.equal(h.requests.some(url => url.includes(manifest.lines['שלום'].id)), false);
  assert.equal(h.requests.some(url => url.includes(manifest.lines['ערב טוב'].id)), false);
});

test('reaction history rotates actual recordings and the same resident retains profile and delivery', async () => {
  const speech = await importSpeech();
  const h = harness({ speech, random: () => 0 });
  h.gesture(() => h.game.restart());
  await flush();
  const { rc, game, who } = h;
  Object.assign(who, { estateVoice53: 'woman_warm' });
  game.worldHour = 8;
  const lines = [], rates = [];
  for (let i = 0; i < 4; i++) {
    assert.equal(rc.sayReaction53(game, who, 'greet'), true);
    await flush();
    assert.equal(rc.sayReaction53(game, who, 'greet'), false);
    assert.equal(h.started[i].buffer.kind, 'recorded');
    lines.push(h.caption.textContent);
    rates.push(h.started[i].playbackRate.value);
    h.started[i].end();
    await flush();
    await h.advance(12500);
  }
  assert.equal(lines[0], 'בוקר טוב');
  assert.equal(new Set(lines).size, 4);
  assert.equal(new Set(rates).size, 1);
  assert.equal(h.requests.filter(url => url.endsWith('.mp3')).length, 4);
  assert.ok(h.requests.filter(url => url.endsWith('.mp3')).every(url => url.includes('/f_warm/')));
  const known = { ...who, estateVoice53: 'not-a-voice' };
  assert.equal(rc.voiceForWalker(known), 'man_deep');
  assert.equal(rc.sayReaction53(game, who, 'does-not-exist'), false);
  game.worldHour = 17.6; game.weather = { rain: .75 };
  assert.equal(rc.sayReaction53(game, { ...who, x: 1.9 }, 'greet'), true);
  await flush();
  assert.notEqual(h.caption.textContent, 'איזו שקיעה יפה היום!');
  h.started[4].end();
  await flush();
  // This line has only male recordings. The female character keeps her profile in synthesis.
  assert.equal(rc.chatSpeak(who, ['קוראים לי דני.'], rc.voiceForWalker(who)), true);
  await flush();
  assert.equal(h.started[5].buffer.kind, 'synth');
  assert.equal(h.requests.some(url => url.includes(manifest.lines['קוראים לי דני.'].id)), false);
  assert.equal(h.started[5].connected.gain.ramps.length, 4);
  h.started[5].end();
  await flush();
});

test('walls muffle existing speech and moving indoors cancels street voices', async () => {
  const h = harness();
  h.gesture(() => h.game.restart());
  await flush();
  const { rc, game, who } = h;
  let queries = 0, blocked = true;
  game.world.nearby = () => [{}];
  h.ctx.Heatline.officerSightClear = () => { queries++; return !blocked; };
  assert.equal(rc.say(game, who, 'שלום'), true);
  await flush();
  const clip = rc.voices.clips.active[0];
  assert.equal(clip.obstruction.frequency.value, 1900);
  assert.ok(clip.level.gain.value < .75);
  game.update(1 / 60);
  game.update(1 / 60);
  assert.equal(queries, 1, 'sight queries are throttled');
  blocked = false;
  await h.advance(200);
  game.update(1 / 60);
  assert.equal(queries, 2);
  assert.equal(clip.obstruction.frequency.value, 18000);
  assert.equal(clip.level.gain.value, 1);
  const clerk = { ...who, x: 2 };
  game.inside = true; game.retailVisit = { clerk, scene: { solids: [] } };
  game.update(1 / 60);
  assert.equal(h.started[0].stopped, true);
  assert.equal(rc.sayReaction53(game, who, 'greet'), false);
  assert.equal(rc.sayReaction53(game, clerk, 'browse'), true);
  await flush();
  assert.equal(h.started[1].buffer.kind, 'recorded');
  assert.equal(rc.voices.clips.cabin.frequency.value, 9500);
  h.started[1].end();
  await flush();
});
