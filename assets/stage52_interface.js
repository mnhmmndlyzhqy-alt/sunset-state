/* SUNSET STATE 52: resolution settings and honest, sampled diagnostics. */
(function (H) {
  'use strict';
  H.build52 = { version: '52.0', title: 'City & Flight', gpuVerified: false };
  const names = { '1080p': 'Full HD · 1080p', native: 'רזולוציית המסך', '1440p': 'QHD · 1440p', custom: 'קנה מידה אישי', auto: 'התאמה לקצב הפריימים' };
  const byId = id => document.getElementById(id);
  const gameNow = () => window.__SUNSET_PERFORMANCE06_GAME;
  const shownFps = game => game?.activeFrames >= 20 && Number.isFinite(game.fps) ? game.fps.toFixed(1) : null;
  const text = (el, value) => { if (el && el.textContent !== value) el.textContent = value; };

  function refresh(game = gameNow()) {
    const api = H.render52;
    if (!api) return;
    const s = api.getSettings(), mode = byId('render-mode52'), scale = byId('render-scale52'), target = byId('render-target52');
    if (mode && document.activeElement !== mode) mode.value = s.mode;
    if (scale && document.activeElement !== scale) scale.value = String(Math.round(s.scale * 100));
    if (target && document.activeElement !== target) target.value = String(s.targetFps);
    if (byId('render-scale-row52')) byId('render-scale-row52').hidden = s.mode !== 'custom';
    if (byId('render-target-row52')) byId('render-target-row52').hidden = s.mode !== 'auto';
    text(byId('render-scale-value52'), Math.round(s.scale * 100) + '%');
    const status = game ? api.status(game) : null, fps = shownFps(game);
    text(byId('render-status52'), status ?
      `ציור פנימי: ${status.width}×${status.height} · פלט למסך: ${status.outputWidth}×${status.outputHeight}` +
      (status.limited ? ' · הותאם למגבלות התצוגה' : '') : 'הרזולוציה תופיע לאחר הפעלת המשחק');
    text(byId('render-fps52'), fps ? `קצב שנמדד במשחק: ${fps} FPS` : 'קצב הפריימים יופיע אחרי תחילת המשחק');
  }

  function setup() {
    const change = part => { H.render52?.setSettings(part, gameNow()); refresh(); };
    // Let native sliders, number fields and buttons own their keyboard events.
    // The game otherwise consumes arrows and Space before the browser can edit.
    for (const id of ['render-mode52','render-scale52','render-target52','render-reset52'])
      byId(id)?.addEventListener('keydown', event => {
        if (event.code !== 'Escape' && event.code !== 'F4') event.stopPropagation();
      });
    byId('render-mode52')?.addEventListener('change', event => change({ mode: event.target.value }));
    byId('render-scale52')?.addEventListener('input', event => {
      text(byId('render-scale-value52'), event.target.value + '%');
    });
    // Resize once on commit instead of reallocating render targets on every drag.
    byId('render-scale52')?.addEventListener('change', event => change({ mode: 'custom', scale: Number(event.target.value) / 100 }));
    byId('render-target52')?.addEventListener('change', event => change({ targetFps: parseFloat(event.target.value) }));
    byId('render-reset52')?.addEventListener('click', () => change({ mode: '1080p', scale: 1, targetFps: 50 }));
    refresh();
  }

  H.realism39?.installers.push(function installStage52Interface(Game) {
    const oldHud = Game.prototype.updateHUD;
    Game.prototype.updateHUD = function (...args) {
      const result = oldHud.apply(this, args);
      if (this.paused) refresh(this);
      return result;
    };
    const oldPause = Game.prototype.togglePause;
    if (typeof oldPause === 'function') Game.prototype.togglePause = function (...args) {
      const result = oldPause.apply(this, args); refresh(this); return result;
    };
    Game.prototype.updateDiagnostics = function () {
      if (!this.diagnosticVisible || !H.render52) return;
      const s = H.render52.status(this), config = H.render52.getSettings(), fps = shownFps(this);
      const visibility = window.__SUNSET_STAGE17_VISIBILITY || {};
      const ms = v => Number.isFinite(v) ? v.toFixed(1) : '—';
      text(byId('stage17-diagnostics'), `SUNSET STATE 52 · ${this.renderer.name} | ` +
        (fps ? `${fps} FPS שנמדדו` : 'ממתין לדגימת פריימים') +
        ` | ${s.width}×${s.height} פיקסלים פנימיים / ${s.outputWidth}×${s.outputHeight} פלט | ${names[config.mode]}` +
        (config.mode === 'auto' ? ` · יעד ${config.targetFps} FPS` : '') +
        (s.limited ? ' · מוגבל תצוגה' : '') +
        ` | עדכון ${ms(this.updateCostMs)}ms / מודלים ${ms(this.geometryCostMs)}ms / פקודות ציור ${ms(this.renderCostMs)}ms` +
        ` | עצמים ${visibility.visible ?? visibility.staticInstances ?? '—'}/${visibility.source ?? visibility.staticSource ?? '—'} | F4 התאמה · F8 דוח`);
    };
  });
  H.interface52 = { refresh, shownFps };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('resize', () => refresh());
  window.addEventListener('keydown', event => {
    if (event.code === 'F4') setTimeout(() => refresh(), 0);
  });
})(Heatline);
