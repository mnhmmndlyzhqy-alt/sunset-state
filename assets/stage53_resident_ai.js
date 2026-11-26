/* SUNSET STATE — local civilian decisions on the existing sidewalk network. */
(function (H) {
  'use strict';
  const RC = H.realism39;
  if (!RC?.enabled || new URLSearchParams(location.search).has('residentAI53Off')) return;

  const minds = new WeakMap();
  const totals = new WeakMap();
  const limits = Object.freeze({ spots: 18, slots: 42, neighbours: 12 });
  const personalities = [
    { id: 'social', social: 1.34, errand: .82, rest: .90 },
    { id: 'practical', social: .77, errand: 1.40, rest: .82 },
    { id: 'curious', social: 1.10, errand: 1.11, rest: .84 },
    { id: 'calm', social: .81, errand: .82, rest: 1.37 },
    { id: 'cautious', social: .92, errand: 1.03, rest: 1.15 }
  ];
  const clamp = H.clamp;
  const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const ordinary = w => !w.estateResident && !w.prisonActor471 && !w.storyContact445 && !w.gang461 && !w._witness460;
  const stableWalk = w => w.injuryState === 'walking' && !(w.panic > 0 || w.stumble > 0 || w.reaction > 0);
  const canPause = w => w.navState === 'sidewalk' && !(w.pause > 0);

  function seedOf(w) {
    let n = ((Number(w.appearance) >>> 0) ^ Math.imul((w.style || 0) + 11, 0x9e3779b9)) >>> 0;
    n = Math.imul(n ^ n >>> 16, 0x21f0aaad);
    return Math.imul(n ^ n >>> 15, 0x735a2d97) >>> 0;
  }

  function mindOf(w) {
    let mind = minds.get(w);
    if (!mind) {
      const seed = seedOf(w);
      mind = { seed, type: personalities[seed % personalities.length], activity: 'walk', visits: 0,
        needs: { social: .21 + ((seed >>> 13) & 31) / 71, errand: .24 + ((seed >>> 18) & 31) / 74,
          rest: .17 + ((seed >>> 23) & 31) / 77 },
        next: .7 + (seed % 39) / 12, elapsed: 0, hold: 0, yieldIn: 0, recovering: false,
        encounter: null, visitedJob: null, visitedSpot: null };
      minds.set(w, mind);
    }
    return mind;
  }

  function stateOf(w) {
    if (!w) return null;
    const m = mindOf(w);
    return { profile: m.type.id, activity: m.activity, needs: { ...m.needs }, visits: m.visits };
  }

  function counters(g) {
    let c = totals.get(g);
    if (!c || c.world !== g.world || c.life !== g.streetLife) {
      c = { world: g.world, life: g.streetLife, decisions: 0, spots: 0, slots: 0,
        blocked: 0, yields: 0, encounters: 0, visits: 0, recoveries: 0 };
      totals.set(g, c);
    }
    return c;
  }

  function metrics(g) {
    const { world, life, ...data } = counters(g);
    return data;
  }

  function voice(g, w, kind, options) {
    return !!RC.sayReaction53?.(g, w, kind, options);
  }

  function conversationWith(g, w) {
    const chat = RC.chat48?.active;
    return chat?.who === w && chat.game === g && stableWalk(w) && !w._witness460 &&
      !g.inside && !g.inVehicle && !g.boat444 && !g.flight51?.pilot &&
      gap(g.avatar, w) < 5 && H.sameRoadLevel443(g.avatar, w) &&
      H.officerSightClear(g.avatar.x, g.avatar.z, w.x, w.z, g.world.nearby(g.avatar.x, g.avatar.z));
  }

  function hold(w, dt, pose, face) {
    w.vx = w.vz = 0;
    w.stride = H.lerp(w.stride || 0, 0, Math.min(1, dt * 13));
    w.navActivity = pose;
    if (face) {
      const yaw = Math.atan2(w.x - face.x, w.z - face.z);
      w.yaw += H.angleDiff(w.yaw, yaw) * (1 - Math.exp(-dt * 9));
    }
  }

  function holdConversation(g, w, dt) {
    if ((!ordinary(w) && !w.estateResident) || !conversationWith(g, w)) return false;
    const m = mindOf(w);
    m.activity = 'talk';
    m.encounter = null;
    m.hold = 0;
    m.needs.social = Math.max(.12, m.needs.social - Math.min(.055, dt * .18));
    hold(w, dt, 'talk', g.avatar);
    return true;
  }

  function observe(g, w) {
    if (!ordinary(w)) return;
    const known = minds.get(w);
    if (w.panic > 0) {
      const m = known || mindOf(w);
      if (m.activity !== 'flee') {
        m.activity = 'flee';
        m.hold = 0;
        m.encounter = null;
        m.recovering = true;
        m.next = 2.6;
        voice(g, w, 'panic', { priority: 2 });
      }
    } else if (known?.activity === 'flee') {
      known.activity = 'recover';
    }
  }

  function needFor(spot, slot) {
    if (slot.role === 'sit' || spot.kind === 'garden') return 'rest';
    if (spot.kind === 'cafe') return 'social';
    return 'errand';
  }

  function actionFor(spot, slot) {
    if (slot.role === 'sit') return 'rest';
    if (slot.role === 'talk' || slot.role === 'stand' && spot.kind === 'cafe') return 'social';
    return 'browse';
  }

  function clearPath(world, from, to) {
    return [.24, .49, .74, 1].every(t => H.streetLifeFree(
      H.lerp(from.x, to.x, t), H.lerp(from.z, to.z, t), world, .38));
  }

  function localVisit(g, w, m, near, c) {
    const life = g.streetLife, rain = g.weather.rain || 0;
    const ix = Math.floor(w.x / 16), iz = Math.floor(w.z / 16);
    const search = w.tourist ? 13.5 : 8.7;
    let choice = null, best = Infinity, spots = 0, slots = 0;
    const first = (m.seed + m.visits) % 9;
    for (let cell = 0; cell < 9 && spots < limits.spots && slots < limits.slots; cell++) {
      const position = (cell + first) % 9;
      const group = life.spotCells.get(`${ix + position % 3 - 1},${iz + Math.floor(position / 3) - 1}`);
      if (!group?.length) continue;
      for (let i = 0; i < group.length && spots < limits.spots && slots < limits.slots; i++) {
        const spot = group[(i + m.seed) % group.length];
        spots++;
        if (!H.streetLifeOpen(spot, g.worldHour) || (rain > .51 && spot.kind === 'garden')) continue;
        const taken = life.occupied.get(spot.id);
        for (let slot = 0; slot < spot.slots.length && slots < limits.slots; slot++) {
          slots++;
          const at = spot.slots[slot], dist = gap(w, at);
          if (dist < .38 || dist > search || taken?.has(slot) || (at.role === 'photo' && (!w.tourist || rain > .51))) continue;
          const need = needFor(spot, at);
          const interest = m.needs[need] * m.type[need] + (w.tourist && at.role === 'photo' ? .28 : 0);
          if (interest < .46) continue;
          const score = dist - interest * 6.4 + (m.visitedSpot === spot.id || life.lastVisited.get(w) === spot.id ? 9 : 0);
          if (score >= best || near.some(other => other !== w && gap(other, at) < 1.04)) continue;
          if (!clearPath(g.world, w, at)) { c.blocked++; continue; }
          choice = { spot, slot, state: 'approach', remaining: 0, stall: 0, residentAI53: true };
          best = score;
        }
      }
    }
    c.spots += spots;
    c.slots += slots;
    if (!choice) return;
    if (!life.occupied.has(choice.spot.id)) life.occupied.set(choice.spot.id, new Set());
    life.occupied.get(choice.spot.id).add(choice.slot);
    life.jobs.set(w, choice);
  }

  function reachedVisit(g, w, m, job, c) {
    const at = job.spot.slots[job.slot];
    if (job.residentAI53 && job.state === 'approach' && gap(w, at) < .43) {
      if (!clearPath(g.world, w, at)) {
        g.streetLife.clearCitizen(w, 10);
        m.activity = 'walk';
        return;
      }
      // Reuse the existing occupation timer and pose without snapping to a slot.
      job.state = 'active';
      job.remaining = (m.type.id === 'practical' ? 5.5 : 7.1) + (m.seed % 17) * .29;
      w.navState = 'sidewalk';
      w.navAxis = null;
      g.streetLife.residentsEngaged++;
    }
    if (job.state !== 'active') {
      m.activity = 'walk';
      return;
    }
    m.activity = actionFor(job.spot, at);
    if (m.visitedJob === job) return;
    m.visitedJob = job;
    m.visitedSpot = job.spot.id;
    m.visits++;
    c.visits++;
    const need = needFor(job.spot, at);
    m.needs[need] = Math.max(.12, m.needs[need] - .48);
    if (job.residentAI53) voice(g, w, m.activity === 'social' ? 'greet' : 'browse', { priority: 0 });
  }

  function socialPeer(g, w, m, near) {
    if (m.needs.social * m.type.social < .72 || !H.streetLifeFree(w.x, w.z, g.world, .45)) return false;
    const other = near.find(q => q !== w && ordinary(q) && stableWalk(q) && canPause(q) &&
      !g.streetLife.jobs.has(q) && gap(w, q) > 1.15 && gap(w, q) < 2.60 && H.sameRoadLevel443(w, q) &&
      !minds.get(q)?.encounter && !conversationWith(g, q) && clearPath(g.world, w, q));
    if (!other) return false;
    const second = mindOf(other);
    const event = { first: w, second: other, until: g.seconds + 2.2 + (m.seed % 8) * .13 };
    m.encounter = second.encounter = event;
    m.needs.social = Math.max(.14, m.needs.social - .45);
    second.needs.social = Math.max(.14, second.needs.social - .34);
    second.next = Math.max(second.next, 4.5);
    voice(g, w, 'greet', { priority: 0 });
    counters(g).encounters++;
    return true;
  }

  function holdPeer(g, w, m, dt) {
    const event = m.encounter;
    if (!event) return false;
    const other = event.first === w ? event.second : event.first;
    if (event.until <= g.seconds || gap(w, other) > 3.1 || !stableWalk(other) || minds.get(other)?.encounter !== event) {
      m.encounter = null;
      return false;
    }
    m.activity = 'social';
    hold(w, dt, 'talk', other);
    return true;
  }

  function yieldSpace(g, w, m, near, c) {
    if (m.yieldIn > 0 || !canPause(w) || m.type.id === 'practical' ||
        !H.streetLifeFree(w.x, w.z, g.world, .44)) return false;
    const fx = -Math.sin(w.yaw), fz = -Math.cos(w.yaw);
    for (const q of near) {
      if (q === w || !ordinary(q) || !stableWalk(q) || !canPause(q) || !H.sameRoadLevel443(w, q)) continue;
      const d = gap(w, q);
      if (d < .34 || d > 1.62 || seedOf(q) >= m.seed) continue;
      const ahead = (q.x - w.x) * fx + (q.z - w.z) * fz;
      if (ahead < d * .49 || Math.cos(w.yaw - q.yaw) > -.38) continue;
      m.yieldIn = 4.2;
      m.hold = .36 + (m.seed % 7) * .06;
      m.activity = 'wait';
      c.yields++;
      return true;
    }
    return false;
  }

  function advance(g, w, dt, neighbours = []) {
    if (!ordinary(w) || !stableWalk(w)) return false;
    const life = g.streetLife, m = mindOf(w), c = counters(g);
    m.next -= dt;
    m.elapsed += dt;
    m.yieldIn = Math.max(0, m.yieldIn - dt);
    if (m.recovering) {
      m.recovering = false;
      m.next = Math.max(m.next, 2.8);
      if (H.streetLifeFree(w.x, w.z, g.world, .46)) {
        m.hold = m.type.id === 'cautious' ? .95 : .58;
        m.activity = 'recover';
        c.recoveries++;
      }
    }
    if (m.hold > 0) {
      m.hold = Math.max(0, m.hold - dt);
      hold(w, dt, 'look');
      return true;
    }
    if (holdPeer(g, w, m, dt)) return true;

    const job = life.jobs.get(w);
    if (job) {
      reachedVisit(g, w, m, job, c);
      return false; // StreetLife owns occupation, path motion and all cancellation.
    }
    m.visitedJob = null;
    m.activity = w.navState === 'waiting' ? 'wait' : 'walk';
    if (life.nextProbe.get(w) <= .06 || !life.nextProbe.has(w)) life.nextProbe.set(w, .20);
    if (m.next > 0) return false;
    if (!canPause(w)) { m.next = .40; return false; }

    const elapsed = Math.min(12, m.elapsed);
    m.elapsed = 0;
    m.next = 2.4 + ((m.seed + c.decisions * 13) % 27) * .12;
    for (const need of ['social', 'errand', 'rest'])
      m.needs[need] = clamp(m.needs[need] + elapsed * (.021 * m.type[need] + .006), .10, 1);
    const near = neighbours.length > limits.neighbours ? neighbours.slice(0, limits.neighbours) : neighbours;
    c.decisions++;
    if (yieldSpace(g, w, m, near, c)) return true;
    if (socialPeer(g, w, m, near)) return holdPeer(g, w, m, dt);
    localVisit(g, w, m, near, c);
    return false;
  }

  H.residentAI53 = { stateOf, mindOf: stateOf, observe, advance, holdConversation, conversationWith, voice, limits, metrics };
})(Heatline);
