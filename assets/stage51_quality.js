/* SUNSET STATE — Stage 51 model fidelity. */
(function (H) {
  'use strict';
  const params = new URLSearchParams(location.search);
  const fixed = params.get('adaptiveQuality') !== '1';
  const wildlifeModels = {
    flamingo: ['flamingo_hi', 170],
    heron: ['heron_hi', 145],
    crocodile: ['crocodile_hi', 340]
  };

  function select(renderer, actor, key) {
    if (!renderer.ready(key)) {
      renderer.ensure(key);
      return;
    }
    if (renderer.assets.get(key)?.texturesReady) renderer.selection.set(actor, key);
  }

  function prepareWildlife(renderer, life, camera) {
    if (!fixed) return false;
    const range = actor => Math.hypot(actor.x - camera.x, actor.z - camera.z);
    let crocodiles = 0;
    for (const actor of life.wildlife) {
      const model = wildlifeModels[actor.kind];
      if (!model || range(actor) > model[1]) continue;
      select(renderer, actor, model[0]);
      if (actor.kind === 'crocodile' && renderer.selection.has(actor)) crocodiles++;
    }
    // The draw pass reads the same statistics and per-animal dither state as
    // before. Fixed detail does not schedule any mesh transitions.
    renderer.crocLodFrame = { selected: { high: crocodiles, mid: 0, far: 0 }, transitions: 0 };

    const plane = life.plane;
    if (plane && range(plane) < 1700) {
      const gearDown = plane.gear > .52;
      select(renderer, plane, gearDown ? 'airliner_hi' : 'airliner_cruise_hi');
      // Preload the other gear configuration so deployment never exposes the
      // procedural fallback during approach or takeoff.
      renderer.ensure(gearDown ? 'airliner_cruise_hi' : 'airliner_hi');
    }
    for (const parked of life.world.parkedAirliners471 || []) {
      if (parked === life.manualPlane51 || parked.fleetHidden53) continue;
      if (camera.satellite468 || range(parked) < (camera.y > 65 ? 900 : 555)) {
        select(renderer, parked, 'airliner_hi');
      }
    }

    for (const fish of life.fish || []) {
      if (range(fish) > 170) continue;
      const uniqueSpecies = fish.variant43 != null && fish.species !== 'barracuda';
      if (uniqueSpecies && !renderer.assets.get('fish_unique')?.failed) {
        if (!renderer.ready('fish_unique')) {
          renderer.ensure('fish_unique');
          continue;
        }
        if (renderer.assets.get('fish_unique').drawableFish(fish)?.length) {
          renderer.selection.set(fish, 'fish_unique');
          continue;
        }
      }
      select(renderer, fish, renderer.makeFishSpecies(fish));
    }
    return true;
  }

  H.quality51 = Object.freeze({
    fixed,
    mode: fixed ? 'high' : 'adaptive',
    reason: fixed ? 'default' : 'adaptiveQuality=1',
    prepareWildlife
  });
  if (H.realism39) H.realism39.fidelity51 = H.quality51;
})(Heatline);
