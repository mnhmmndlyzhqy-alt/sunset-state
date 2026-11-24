/* SUNSET STATE — Stage 48: gameplay
 *  - Police (GTA-style): small things (scrapes, a bumped pedestrian, broken glass, street props)
 *    no longer bring the police unless an officer sees it. Evidence fades faster out of sight.
 *  - Heist missions on the mission board (K): shop job, the big bank heist with planning,
 *    and a getaway-driver chase. Each ends with "lose the police".
 *  Off with ?gameplay48Off.
 */
(function (H) {
  'use strict';
  const params = new URLSearchParams(globalThis.location ? location.search : '');
  const RC = H.realism39 = H.realism39 || {};
  RC.installers = RC.installers || [];
  if (params.has('gameplay48Off') || params.has('realismOff')) return;

  // ---------- Police: only real crimes ----------
  const MINOR = new Set(['public property damage', 'street fixture shot', 'rail crossing damage', 'bus collision',
    'facade glass damaged', 'broken shop or shelter glass', 'shop window damaged', 'railway collision',
    'rail crossing destroyed', 'dangerous collision', 'security camera damaged', 'shot in public']);
  const baseWeight = H.incidentWeight;
  // Severity 1 barely counts; 2 needs several; 3+ (robbery, hurting people, theft seen by police) as before.
  H.incidentWeight = function (severity) {
    const s = H.clamp(Math.round(severity), 0, 5);
    return s <= 1 ? .3 : s === 2 ? 1.25 : baseWeight(s);
  };

  RC.installers.push(function installGameplay48(Game) {
    const P = Game.prototype;
    const report = P.reportOffense;
    P.reportOffense = function (type, x, z, severity, reportedBy) {
      const officer = reportedBy === 'officer' || reportedBy === 'police' ||
        (typeof this.officerWitness460 === 'function' && this.officerWitness460(x, z));
      if (!officer) {
        if (MINOR.has(type) && severity < 4) return;
        // Knocking someone over by accident is not a manhunt; it still upsets people nearby.
        if (type === 'pedestrian hit' && severity < 5) severity = 2;
      }
      return report.call(this, type, x, z, severity, reportedBy);
    };

    // ---------- Heist missions ----------
    const Journal = H.MissionJournal30;
    if (Journal && !Journal.__heists48) {
      class HeistJournal extends Journal {
        constructor(world) {
          super(world);
          try { addHeists(this.catalog, world); } catch (e) { console.warn('[Gameplay48] heists', e); }
        }
      }
      HeistJournal.__heists48 = true;
      H.MissionJournal30 = HeistJournal;
    }
    function addHeists(catalog, world) {
      const shops = (world.retailShops || []).filter(v => v.retail);
      const bank = shops.find(v => v.bank44) || null;
      const store = shops.filter(v => !v.bank44).sort((a, b) => Math.hypot(a.x + 54, a.z - 23) - Math.hypot(b.x + 54, b.z - 23))[0];
      const escape = { type: 'escape', label: 'אבד את המשטרה והתרחק מהזירה (מעל 90 מ׳)' };
      if (store) catalog.push({ id: 'heist_corner48', icon: '💰', title: 'הקופה הראשונה',
        description: 'היכנס לחנות, עמוד ליד הדלפק ולחץ U. אחר כך ברח מהמשטרה והיעלם בעיר.', reward: 650, xp: 150,
        steps: [{ type: 'heist', shop: 'shop', x: store.x, z: store.z, label: 'שדוד חנות כלשהי · שלוף נשק, כוון אל המוכר ולחץ U' }, escape] });
      if (bank) catalog.push({ id: 'heist_bank48', icon: '🏦', title: 'השוד הגדול של סאנסט',
        description: 'תכנן את השוד: צלם את הבנק, החנה רכב מילוט ליד הכניסה, רוקן את הכספת והיעלם.', reward: 3000, xp: 420,
        steps: [{ type: 'photo', x: bank.x, z: bank.z, label: 'סיור מקדים: צלם את ' + bank.label + ' · Z' },
          { type: 'park', x: bank.x, z: bank.z, label: 'החנה רכב מילוט ליד הבנק (עד 8 קמ״ש)' },
          { type: 'heist', shop: 'bank', x: bank.x, z: bank.z, label: 'היכנס לבנק, לחץ U בדלפק ואז בכספת' }, escape] });
      catalog.push({ id: 'getaway48', icon: '🚓', title: 'נהג מילוט',
        description: 'משוך את תשומת לב המשטרה ונער אותם מאחור. עדיף ברכב מהיר.', reward: 550, xp: 160,
        steps: [{ type: 'wanted', label: 'קבל לפחות כוכב משטרה אחד' }, escape] });
    }

    // Robberies pay out in two engine paths (shop threat / bank vault); both bump a counter.
    function watchRobberies(g) {
      const s = g.shopRobberies44 || 0, b = g.bankRobberies44 || 0;
      const last = g.__rob48 || (g.__rob48 = { s, b });
      const kind = b > last.b ? 'bank' : s > last.s ? 'shop' : null;
      last.s = s; last.b = b;
      if (!kind) return;
      g.heist48 = { at: g.seconds, x: g.avatar.x, z: g.avatar.z };
      g.missionAction30({ type: 'heist', shop: kind });
    }

    const update = P.update;
    P.update = function (dt) {
      const r = update.call(this, dt);
      try {
        if (!this.running || this.paused) return r;
        // Evidence fades faster while no officer is watching (GTA-style "lose them").
        if (this.crimeHeat > 0 && !this.policeInSight && this.lawEvidence > 0)
          this.lawEvidence = Math.max(0, this.lawEvidence - dt * .06);
        watchRobberies(this);
        const step = this.missions30 && this.missions30.objective;
        if (!step) return r;
        if (step.type === 'wanted' && this.crimeHeat > 0) {
          this.heist48 = { at: this.seconds, x: this.avatar.x, z: this.avatar.z };
          this.missionAction30({ type: 'wanted' });
        } else if (step.type === 'escape') {
          const h = this.heist48 || (this.heist48 = { at: this.seconds, x: this.avatar.x, z: this.avatar.z });
          const f = this.inVehicle ? this.player : this.avatar;
          if (this.crimeHeat === 0 && this.seconds - h.at > 6 && Math.hypot(f.x - h.x, f.z - h.z) > 90) {
            this.heist48 = null;
            this.missionAction30({ type: 'escape' });
          }
        }
      } catch (e) { if (!RC.__g48warn) { RC.__g48warn = true; console.warn('[Gameplay48]', e); } }
      return r;
    };
  });
})(Heatline);
