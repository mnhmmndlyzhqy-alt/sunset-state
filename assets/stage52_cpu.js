/* SUNSET STATE 52: local broadphase for unchanged traffic / pedestrian rules.
 * Each index lives for one simulation phase. It never throttles an actor and
 * returns candidates in their original order, including duplicate entries. */
(function (H) {
  'use strict';
  const stats = { builds: 0, queries: 0, fullScanCandidates: 0, bucketCandidates: 0, returned: 0 };
  const api = { enabled: !new URLSearchParams(location.search).has('cpu52Off'), stats };
  api.createLocalIndex = function (actors) {
    const rows = new Map(), cellSize = 64;
    stats.builds++;
    for (let i = 0; i < actors.length; i++) {
      const a = actors[i];
      if (!a || !Number.isFinite(a.x) || !Number.isFinite(a.z)) continue;
      const x = Math.floor(a.x / cellSize), z = Math.floor(a.z / cellSize);
      let row = rows.get(x);
      if (!row) rows.set(x, row = new Map());
      let bucket = row.get(z);
      if (!bucket) row.set(z, bucket = []);
      bucket.push(i);
    }
    return {
      querySquare(x, z, radius) {
        stats.queries++; stats.fullScanCandidates += actors.length;
        if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(radius) || radius < 0) return [];
        const found = [];
        const x0 = Math.floor((x - radius) / cellSize), x1 = Math.floor((x + radius) / cellSize);
        const z0 = Math.floor((z - radius) / cellSize), z1 = Math.floor((z + radius) / cellSize);
        for (let ix = x0; ix <= x1; ix++) {
          const row = rows.get(ix);
          if (!row) continue;
          for (let iz = z0; iz <= z1; iz++) {
            const bucket = row.get(iz);
            if (!bucket) continue;
            stats.bucketCandidates += bucket.length;
            for (const i of bucket) {
              const a = actors[i];
              if (Math.abs(a.x - x) <= radius && Math.abs(a.z - z) <= radius) found.push(i);
            }
          }
        }
        found.sort((a, b) => a - b);
        stats.returned += found.length;
        return found.map(i => actors[i]);
      }
    };
  };
  H.cpu52 = api;
})(Heatline);
