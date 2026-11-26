/* SUNSET STATE — Stage 52 display resolution and opt-in frame pacing. */
(function (H) {
  'use strict';

  const STORAGE_KEY = 'sunset_state_render52';
  const MODES = ['1080p', 'native', '1440p', 'custom', 'auto'];
  const SCALES = [1, .94, .87, .80, .72, .65];
  const SAMPLE_WINDOW_MS = 2200;
  const bound = (value, min, max) => Math.max(min, Math.min(max, value));

  function normalize(value, fallback) {
    return {
      mode: MODES.includes(value?.mode) ? value.mode : fallback.mode,
      scale: Number.isFinite(value?.scale) ? bound(Math.round(value.scale * 100) / 100, .50, 1.50) : fallback.scale,
      targetFps: Number.isFinite(value?.targetFps) ? bound(Math.round(value.targetFps), 30, 120) : fallback.targetFps
    };
  }

  let saved;
  try { saved = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || 'null'); } catch {}
  let settings = normalize(saved, { mode: '1080p', scale: 1, targetFps: 50 });
  let fixedMode = MODES.includes(saved?.fixedMode) && saved.fixedMode !== 'auto' ? saved.fixedMode : '1080p';
  if (settings.mode !== 'auto') fixedMode = settings.mode;

  const getSettings = () => ({ ...settings });
  const rendererOf = game => game?.renderer || H.realism39?.renderer;

  function applyMode(game, renderer) {
    const policy = settings.mode === 'auto' ? 'adaptive50' : 'native1080';
    if (game) game.visualMode450 = game.graphicsMode = policy;
    renderer.renderPolicy475 = policy;
  }

  function setSettings(patch, game) {
    const next = normalize(patch, settings);
    if (next.mode === settings.mode && next.scale === settings.scale && next.targetFps === settings.targetFps) return getSettings();
    settings = next;
    if (settings.mode !== 'auto') fixedMode = settings.mode;
    try { globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify({ ...settings, fixedMode })); } catch {}
    const renderer = rendererOf(game);
    if (renderer?.atmosphere) {
      applyMode(game, renderer);
      renderer.rcAdaptive52 = null;
      renderer.rcResScale = 1;
      renderer.rcLite = false;
      renderer.resize();
    }
    return getSettings();
  }

  function toggleAdaptive(game) {
    if (!game?.renderer?.atmosphere) return false;
    const next = setSettings({ mode: settings.mode === 'auto' ? fixedMode : 'auto' }, game);
    game.showInfo(next.mode === 'auto' ? 'רזולוציה מותאמת לקצב הפריימים' : 'רזולוציה קבועה · ' + next.mode, 3.2);
    game.updateDiagnostics();
    return true;
  }

  function measure(width, height, dpr, maxSide, autoScale = 1) {
    const nativeRatio = bound(dpr || 1, .5, 4);
    const native = settings.mode === 'native' || settings.mode === 'custom' || settings.mode === 'auto';
    const is1440p = settings.mode === '1440p';
    const baseRatio = native ? nativeRatio : is1440p ? Math.max(2560 / width, 1440 / height) : Math.max(1920 / width, 1080 / height);
    const maxRatio = Math.min(maxSide / width, maxSide / height, Math.sqrt(8300000 / (width * height)));
    const outputRatio = Math.min(baseRatio, maxRatio);
    // Apply adaptive steps to the supported native dimensions, so every step
    // works even when the display originally exceeded the framebuffer limit.
    const requestedRatio = settings.mode === 'auto' ? outputRatio * bound(autoScale, .65, 1) :
      settings.mode === 'custom' ? baseRatio * settings.scale : baseRatio;
    const ratio = Math.min(requestedRatio, maxRatio);
    return {
      w: Math.max(1, Math.round(width * ratio)),
      h: Math.max(1, Math.round(height * ratio)),
      outW: Math.max(1, Math.round(width * outputRatio)),
      outH: Math.max(1, Math.round(height * outputRatio)),
      ratio,
      limited: outputRatio < baseRatio - .001 || ratio < requestedRatio - .001
    };
  }

  function status(game) {
    const r = rendererOf(game);
    const width = r?.glWidth || r?.canvas?.width || 0;
    const height = r?.glHeight || r?.canvas?.height || 0;
    const outputWidth = r?.rcOutW || r?.canvas?.width || width;
    const outputHeight = r?.rcOutH || r?.canvas?.height || height;
    return {
      mode: settings.mode, width, height, outputWidth, outputHeight,
      scale: outputWidth ? width / outputWidth : 1, limited: r?.rcFramebufferLimited52 === true
    };
  }

  function observe(game, active, now) {
    const r = game.renderer;
    if (!r?.atmosphere) return false;
    applyMode(game, r);
    if (settings.mode !== 'auto') return true;
    let state = r.rcAdaptive52;
    if (!active || game.graphicsLost || game.activeFrames < 35) {
      if (state) {
        state.started = null;
        state.hot = state.cool = 0;
      }
      return true;
    }
    if (!state) {
      state = { index: 0, started: null, hot: 0, cool: 0, holdUntil: 0, noRaiseUntil: 0, probe: null };
      r.rcAdaptive52 = state;
      if (r.rcResScale !== 1) r.setResolutionScale(1);
    }
    const frame = game.frameTimeMs;
    if (!Number.isFinite(frame) || frame <= 0 || now < state.holdUntil) return true;
    if (state.started === null) {
      state.started = now;
      state.sum = state.count = 0;
    }
    state.sum += Math.min(frame, 180);
    state.count++;
    if (now - state.started < SAMPLE_WINDOW_MS || state.count < 8) return true;

    const ms = state.sum / state.count, target = 1000 / settings.targetFps;
    state.started = null;
    if (state.probe) {
      const probe = state.probe;
      state.probe = null;
      if (ms > probe.frame * .94) {
        state.index = probe.index;
        r.setResolutionScale(SCALES[state.index]);
        state.holdUntil = now + 20000;
      }
      return true;
    }
    state.hot = ms > target * 1.12 ? state.hot + 1 : 0;
    state.cool = ms < target * .89 ? state.cool + 1 : 0;
    if (state.hot >= 2 && state.index < SCALES.length - 1) {
      // Resolution changes cannot improve simulation-bound frames. If the next
      // settled sample confirms that, restore detail and wait before probing.
      state.probe = { index: state.index, frame: ms };
      state.index++;
      state.noRaiseUntil = now + 13000;
    } else if (state.cool >= 3 && state.index > 0 && now >= state.noRaiseUntil) {
      state.index--;
    } else return true;
    r.setResolutionScale(SCALES[state.index]);
    state.hot = state.cool = 0;
    state.holdUntil = now + 2200;
    return true;
  }

  H.render52 = { getSettings, setSettings, toggleAdaptive, status, measure, observe };
})(Heatline);
