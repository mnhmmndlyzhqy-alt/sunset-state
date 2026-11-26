'use strict';
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { test } = require('node:test');

process.env.SUNSET_QA_SEED ||= '53';
const bootstrap = process.env.STAGE51_SOURCE_ROOT
  ? join(process.env.STAGE51_SOURCE_ROOT, 'QA', 'stage51_bootstrap.cjs')
  : './stage51_bootstrap.cjs';
const { H, g, ctx, document, errors, warnings, root, dispatch } = require(bootstrap);
const flush = () => new Promise(resolve => setImmediate(resolve));

// Operate the real game and voice scripts while substituting browser activation,
// playback and decoding. Fetch still reads the shipped manifest and MP3 bytes.
const starts = [];
let inGesture = false;
const param = () => ({ value: 0,
  setTargetAtTime(value) { this.value = value; },
  setValueAtTime() {},
  linearRampToValueAtTime() {}
});
function audioNode() {
  return Object.assign(Object.fromEntries([
    'gain', 'pan', 'frequency', 'Q', 'threshold', 'ratio', 'positionX', 'positionY', 'positionZ'
  ].map(name => [name, param()])), { connect() {}, disconnect() {} });
}
class VoiceContext {
  constructor() {
    this.state = 'suspended';
    this.sampleRate = 44100;
    this.currentTime = 4;
    this.destination = audioNode();
    this.listener = Object.fromEntries(['position', 'forward', 'up'].flatMap(key =>
      ['X', 'Y', 'Z'].map(axis => [key + axis, param()])));
  }
  async resume() {
    assert.ok(inGesture, 'voice activation is initiated inside the trusted event');
    this.state = 'running';
  }
  createGain() { return audioNode(); }
  createPanner() { return audioNode(); }
  createStereoPanner() { return audioNode(); }
  createBiquadFilter() { return audioNode(); }
  createDynamicsCompressor() { return audioNode(); }
  createConvolver() { return audioNode(); }
  createAnalyser() { return Object.assign(audioNode(), { getByteTimeDomainData(data) { data.fill(148); } }); }
  createBuffer(_, length, rate) {
    const samples = new Float32Array(length);
    return { kind: 'formant', duration: length / rate, copyToChannel: data => samples.set(data),
      getChannelData: () => samples };
  }
  createBufferSource() {
    return Object.assign(audioNode(), { playbackRate: param(),
      start() { starts.push(this); },
      stop() { this.stopped = true; },
      end() { this.onended?.(); }
    });
  }
  async decodeAudioData(bytes) {
    const header = Buffer.from(bytes.slice(0, 3));
    assert.ok(bytes.byteLength > 400 && (header.toString('latin1') === 'ID3' ||
      (header[0] === 0xff && (header[1] & 0xe0) === 0xe0)), 'read a real local MP3');
    return { kind: 'recording', duration: .8 };
  }
}

function place(p) {
  Object.assign(g, {
    running: true, paused: false, over: false, inVehicle: false, indoor: null, retailVisit: null, boat444: null,
    roofVisit: null, onBus: -1, onTram: -1, showFullMap: false, missionBoardOpen: false, garageOpen: false,
    entryTransition: null, exitTransition: null, vehicleEntry: null
  });
  g.flight51.pilot = false;
  Object.assign(g.avatar, p, {
    y: H.outdoorHeight(p.x, p.z), grounded: true, deck443: false, coastDeck461: false, swim445: null, vx: 0, vz: 0
  });
}

test('estate and public-island speakers share real Game speech, priorities and mute', async () => {
  const RC = H.realism39;
  await flush();
  g.restart({ reuseWorld: true });
  ctx.AudioContext = VoiceContext;
  ctx.SunsetSpeech = await import(pathToFileURL(join(root, 'assets', 'speech', 'speech-engine.js')).href);
  inGesture = true;
  try { dispatch('pointerdown', { isTrusted: true }); } finally { inGesture = false; }
  await flush();
  assert.equal(RC.voices.clips.ctx.state, 'running');
  assert.equal(RC.voices.engine.backend.ctx, RC.voices.clips.ctx);

  const estate = H.estate53;
  place(g.world.estate53.office);
  g.profile.credits = 5000;
  assert.equal(estate.purchase(g, 'housing').ok, true);
  assert.equal(estate.offer(g, 'maya', 'a1', 12).status, 'accepted');
  assert.equal(estate.approve(g, 'maya').ok, true);
  const maya = g.world.estate53.actors.get('maya');
  Object.assign(maya, maya.estateUnit.walk.at(-1));
  place({ x: maya.x - 1.2, z: maya.z });

  const effects = [];
  g.synth.ctx = { currentTime: 4, state: 'running' };
  g.synth.master = { gain: { setTargetAtTime(value) { effects.push(value); } } };
  g.synth.setEnabled(true);
  g.synth.setVolume(.5);
  assert.equal(H.residentAI53.voice(g, maya, 'warning'), true);
  await flush();
  assert.equal(starts[0].buffer.kind, 'recording');
  assert.equal(RC.voiceForWalker(maya), RC.chat48.mindOf(maya).profile);
  assert.match(RC.voiceForWalker(maya), /^woman_/);
  assert.equal(g.synth.voiceDucking, .74);
  assert.ok(Math.abs(effects.at(-1) - .56 * .5 * .74) < 1e-9);
  assert.ok(RC.speechLoudness(maya) > 0);
  const subtitle = document.getElementById('voices-caption50');
  assert.equal(subtitle.hidden, false);
  assert.ok(RC.LINES.nearMiss.includes(subtitle.textContent));

  const spoken = RC.chat48.think(maya, 'איך קוראים לך?');
  assert.match(spoken.parts.join(' '), /מאיה ברק/);
  let played;
  assert.equal(RC.chatSpeak(maya, spoken.parts, RC.voiceForWalker(maya), null, x => { played = x; }), true);
  await flush();
  assert.equal(starts[0].stopped, true);
  assert.equal(starts[1].buffer.kind, 'formant');
  const pcm = starts[1].buffer.getChannelData();
  assert.ok(pcm.every(Number.isFinite));
  assert.ok(pcm.some(v => Math.abs(v) > .001));
  assert.equal(RC.voices.clips.active.length, 0);
  assert.equal(g.synth.voiceDucking, .74);
  g.muteSound();
  await flush();
  assert.equal(starts[1].stopped, true);
  assert.equal(played, false);
  assert.equal(g.synth.voiceDucking, 1);
  assert.equal(effects.at(-1), 0);

  estate.restore(null);
  H.estate53World.sync(g);
  assert.equal(H.residentAI53.voice(g, maya, 'greet'), false);
  const host = H.islands53.states.get(g.world).actors[0];
  place({ x: host.x - 1.1, z: host.z });
  assert.equal(RC.chat48.canContinue(g, host), true);
  assert.equal(RC.sayReaction53(g, host, 'arrival'), true);
  await flush();
  assert.equal(subtitle.hidden, false, 'muted reaction caption remains available');
  assert.ok(RC.LINES.arrival.includes(subtitle.textContent));
  assert.equal(starts.length, 2, 'mute suppresses audio for both paths');
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.ok(warnings.every(w => w.includes('AudioContext is not defined')), warnings.join('\n'));
});
