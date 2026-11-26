/* Stage05 runtime interior hook: executes AFTER engine44.js defines the real scene builders,
 * but BEFORE DOMContentLoaded creates the game. No global engine rewrite. */
if(!globalThis.Heatline?.stage05City20?.installInterior)
  throw Error('Stage05 CITY20 entrance module not loaded');
globalThis.Heatline.stage05City20.installInterior();
// The Stage 52 circulation pass may move an authored reception desk before
// the established exterior orientation and scene rotation steps run.
(function (H) {
  const build = H.makeInteriorScene;
  H.makeInteriorScene = function (plan, floor) {
    const scene = build.call(this, plan, floor);
    H.buildings52?.clearCompactReception(scene, plan);
    return scene;
  };
})(globalThis.Heatline);
