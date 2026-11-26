/* SUNSET STATE — CITY20 interiors share the exterior foundation height. */
(function (H) {
  'use strict';
  if (!H.buildings52) return;

  const surveys = new WeakMap();
  const position = ({ x, z }) => `${x},${z}`;
  H.interiorGrade52 = function (plan, world) {
    const shell = plan.outerShell;
    if (!plan.stage05City20) return H.cityTerrain42(shell.x, shell.z);
    let grades = surveys.get(world);
    if (!grades) {
      grades = new Map((world.city20DistrictBuildings || []).map(site => [position(site), site.baseY]));
      surveys.set(world, grades);
    }
    // These survey values were sampled from outdoorHeight when laying the
    // exterior foundations. Their original mesh and door elevations use them.
    return grades.get(position(shell)) ?? H.outdoorHeight(shell.x, shell.z);
  };
})(Heatline);
