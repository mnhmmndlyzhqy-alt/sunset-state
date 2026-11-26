/* SUNSET STATE — mouse, touch and keyboard flight deck. */
(function (H) {
  'use strict';
  if (!H.realism39?.enabled) return;
  const el = (tag, style) => {
    const node = document.createElement(tag);
    if (style) node.style.cssText = style;
    return node;
  };
  const degrees = rad => Math.round(rad * 180 / Math.PI);
  const paint = 'border:1px solid #527784;border-radius:6px;background:#17333e;color:#eaf8fb;font:650 11px system-ui;min-height:30px;padding:4px 7px;touch-action:none';
  const row = 'display:grid;gap:4px;grid-template-columns:repeat(auto-fit,minmax(70px,1fr));';
  const stage = 'padding:5px;border:1px solid #536f75;border-radius:7px;background:#102b37;white-space:nowrap';
  function item(label) {
    const box = el('div', stage), name = el('small', 'display:block;color:#abc5cc;font-size:10px'), value = el('strong');
    name.textContent = label;
    box.append(name, value);
    return { box, value };
  }
  function mount(f, panel, target, detail, touch) {
    const last = new Map(), heldInputs = new Map();
    target.textContent = '';
    target.style.cssText = 'display:grid;gap:5px;margin-top:4px';
    panel.style.width = 'min(518px, calc(100% - 30px))';
    panel.style.bottom = touch ? 'clamp(140px, 23%, 205px)' : 'max(72px, 10%)';
    panel.style.background = '#081c26f5';
    panel.style.fontSize = '12px';
    const metrics = el('div', row);
    const speed = item('מהירות'), height = item('גובה'), lift = item('טיפוס / הנמכה'), tip = item('אף'), tilt = item('הטיית כנפיים'), gear = item('גלגלים');
    metrics.append(speed.box, height.box, lift.box, tip.box, tilt.box, gear.box);
    const power = el('label', 'display:grid;grid-template-columns:110px 1fr;align-items:center;text-align:right;gap:7px');
    const powerText = el('span'), slider = el('input', 'width:100%;accent-color:#70dcca;pointer-events:auto;touch-action:none');
    slider.type = 'range'; slider.min = 0; slider.max = 100; slider.step = 1;
    slider.setAttribute('aria-label', 'מצערת מטוס');
    slider.addEventListener('input', () => f.setThrottle(Number(slider.value) / 100));
    power.append(powerText, slider);
    const axes = el('div', row), actions = el('div', row);
    const button = text => {
      const b = el('button', paint); b.textContent = text; b.type = 'button'; return b;
    };
    const focusKeys = ['Space', 'Enter'];
    function hold(text, code) {
      const b = button(text);
      const press = id => { heldInputs.set(id, code); b.setAttribute('aria-pressed', 'true'); };
      const release = id => { heldInputs.delete(id); b.setAttribute('aria-pressed', String([...heldInputs.values()].includes(code))); };
      b.addEventListener('pointerdown', event => {
        if (event.button != null && event.button !== 0) return;
        event.preventDefault();
        b.setPointerCapture(event.pointerId);
        press(event.pointerId);
      });
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(event, e => release(e.pointerId));
      b.addEventListener('keydown', e => {
        if (!focusKeys.includes(e.code)) return;
        e.stopPropagation();
        e.preventDefault();
        press(b);
      });
      b.addEventListener('keyup', e => { if (focusKeys.includes(e.code)) release(b); });
      b.addEventListener('blur', () => release(b));
      b.setAttribute('aria-pressed', 'false');
      axes.append(b);
      return b;
    }
    hold('שמאלה ←', 'ArrowLeft'); hold('אף למעלה ↑', 'ArrowUp'); hold('אף למטה ↓', 'ArrowDown');
    hold('ימינה →', 'ArrowRight'); const brake = hold('בלמים · רווח', 'Space');
    function action(text, fn) {
      const b = button(text); b.addEventListener('click', fn); actions.append(b); return b;
    }
    const flaps = action('מדפים · F', () => f.toggleFlaps());
    const taxi = action('הסעה · T', () => f.maneuver('KeyT'));
    const reverse = action('דחיפה · X', () => f.maneuver('KeyX'));
    const course = action('נחיתה · L', () => f.toggleGuidance());
    action('מצלמה · C', () => f.cycleCamera());
    action('למסלול · R', () => f.recover('המטוס חזר לנקודת ההמראה.'));
    const cue = el('small', 'display:block;min-height:14px;color:#bbd8df');
    target.append(metrics, power, axes, actions, cue);
    function update(above) {
      const p = f.plane, airborne = p.airborne, rotate = p.flaps ? 112 : 126;
      detail.hidden = true;
      speed.value.textContent = `${Math.round(p.speed * 3.6)} קמ״ש`;
      height.value.textContent = `${above} מ׳`;
      lift.value.textContent = `${p.verticalSpeed > .05 ? '+' : ''}${p.verticalSpeed.toFixed(1)} מ׳/ש׳`;
      tip.value.textContent = `${degrees(p.pitch)}°`;
      tilt.value.textContent = `${Math.abs(degrees(p.bank))}° ${p.bank < -.012 ? 'שמאל' : p.bank > .012 ? 'ימין' : ''}`;
      gear.value.textContent = p.gear > .52 ? 'פרוסים' : 'מקופלים';
      slider.value = String(Math.round(p.throttle * 100));
      powerText.textContent = `מצערת · ${slider.value}%`;
      taxi.hidden = reverse.hidden = brake.hidden = airborne;
      const changed = (node, value) => {
        if (last.get(node) === value) return;
        last.set(node, value);
        node.setAttribute('aria-pressed', String(!!value));
      };
      changed(flaps, p.flaps); changed(taxi, p.apron); changed(reverse, p.reverse); changed(course, f.guideDirection);
      const prompt = p.reverse ? 'דחיפה לאחור: W לתנועה, רווח לעצירה.' : p.apron && !airborne ? 'הסעה איטית. התיישרו במסלול, לחצו W והרימו אף.' :
        !airborne ? p.speed * 3.6 < rotate ? `החזק W עד ${rotate} קמ״ש, ואז הרם את האף עם ↑ או Shift.` : 'מהירות המראה הושגה · הרימו אף עם ↑ או Shift.' :
          'A/D או חצים להטיה · Shift/↑ להרים אף · Ctrl/↓ להנמיך · L לכוונת נחיתה';
      cue.textContent = prompt;
    }
    const clear = () => {
      heldInputs.clear();
      for (const b of axes.children) b.setAttribute('aria-pressed', 'false');
    };
    const held = codes => {
      for (const key of heldInputs.values()) if (codes.includes(key)) return true;
      return false;
    };
    return { held, clear, update, slider, axes, actions };
  }
  H.flightControls53 = { mount };
})(Heatline);
