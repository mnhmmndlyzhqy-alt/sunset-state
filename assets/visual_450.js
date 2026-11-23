/* SUNSET STATE 4.5.0 — progressive skyline, continuous interiors, and architectural finish.
 * Geometry is derived from the supplied 4.4.4 checkpoint; this is an additive layer.
 * No network assets or external runtime dependencies.
 */
var Heatline;
(function (H) {
    'use strict';
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    H.interiorExtents450 = function (b) {
        // Match actual exterior frontage: the earlier 15.5m/16.5m half-width/depth
        // clamps made large buildings look like cramped miniature corridors.
        return {
            X: Math.max(6.90, Math.min(62, b.w * .5 - .92)),
            Z: Math.max(8.00, Math.min(90, b.d * .5 - .83))
        };
    };
    H.interiorCorridor450 = function (X, floor) {
        // Ground-floor atriums feel much larger while rooms remain enclosed.
        return floor === 0 ? clamp(X * .34, 3.08, 5.40) : clamp(X * .235, 2.98, 3.70);
    };
    H.enhanceDistantCity450 = function (world) {
        const boxes = world.boxes, catalogue = world.buildings;
        const palette = [
            ['#a5a5a1','#566e78','#d4c9b7'],
            ['#a8b4b2','#507b8b','#a7a3a0'],
            ['#b6ac9e','#657985','#ddd2c1'],
            ['#9baaa9','#577b85','#d3d3cb'],
            ['#b2a6a4','#687783','#ded2c6'],
            ['#a0a6aa','#557580','#bfc7c5'],
            ['#b8b4a9','#56899b','#e1d8cc']
        ];
        let shells = 0, inserts = 0, windows = 0, details = 0;
        // All proxy batches use the same shared instanced geometry as the main
        // renderer. They start with a smooth coverage fade before the detailed city
        // retires and survive to the far clipping plane: no skyline-replacement flash.
        for (let k = 0; k < catalogue.length; k++) {
            const b = catalogue[k];
            if (!b || !Number.isFinite(b.h) || b.h < 9.5 || b.w < 7.5 || b.d < 7.5)
                continue;
            const base = H.cityTerrain42(b.x, b.z);
            const seed = ((Math.imul(k + 37, 19441) ^ Math.imul(Math.floor(b.x * .31), 3691)) >>> 0);
            const [stone, glass, trim] = palette[seed % palette.length];
            const near = 620 + (seed % 7) * 19;
            const cap = 3130;
            const put = (x, y, z, w, h, d, color, mat, from = near, glow = 0) => {
                const o = H.box(x, base + y, z, w, h, d, color, 0, 4, glow);
                o.material = mat;
                o.stage450Proxy = true;
                o.lodMin = from;
                o.visibilityCap = cap;
                boxes.push(o);
                inserts++;
                return o;
            };
            // Solid occupies 94% of the existing footprint, avoiding z-fighting.
            // This hull persists at altitude even when original nearby facade tiles
            // have streamed out. It doesn't add collisions or block doorways up close.
            put(b.x, b.h * .497, b.z, b.w * .954, b.h * .994, b.d * .950, stone, 'masonry');
            shells++;
            // Keep a recognizable rooftop at 2+km, with individualized crown/trim.
            put(b.x, b.h + .15, b.z, b.w * .974, .29, b.d * .972, trim, 'concrete', near + 55);
            const crown = seed % 4;
            if (b.h > 17 && crown !== 2) {
                const cw = b.w * (.27 + (seed % 3) * .095);
                const cd = b.d * (.26 + (seed % 5) * .055);
                const height = .8 + (seed % 5) * .24;
                put(b.x + b.w * .10, b.h + .32 + height * .5, b.z - b.d * .07,
                    cw, height, cd, crown ? stone : glass, crown ? 'masonry' : 'metal', near + 85);
                details++;
            }
            if (b.h > 25 && seed % 4 === 0) {
                const px = b.x - b.w * .22;
                put(px, b.h + .81, b.z + b.d * .14, .75, 1.3, .70, trim, 'metal', near + 80);
                details++;
            }
            // Actual facade bands, not blank texture tiles. Deliberately fewer
            // than near-field panes: high contrast, coherent distances, small GPU cost.
            const rows = clamp(Math.floor(b.h / 6.0), 2, 10);
            const spacing = (b.h - 3.6) / Math.max(1, rows);
            const sideFaces = b.h > 17 && b.d > 12;
            for (let row = 0; row < rows; row++) {
                const y = 2.35 + row * spacing;
                if (y + 1.2 > b.h - .3) continue;
                const shade = (seed + row * 13) % 9 === 0 ? '#9ab3b5' : glass;
                const stripeWidth = b.w * (.68 + ((row + seed) % 3) * .045);
                const sx = b.x + ((((seed >> 3) % 3) - 1) * b.w * .027);
                const front = b.d * .5 + .17;
                const bandH = clamp(spacing * .30, .92, 1.46);
                for (const sign of [-1, 1]) {
                    put(sx, y, b.z + sign * front, stripeWidth, bandH, .10,
                        shade, 'building_window', near + 40);
                    windows++;
                }
                if (sideFaces && row % 2 === (seed % 2)) {
                    for (const sign of [-1, 1]) {
                        put(b.x + sign * (b.w * .5 + .16), y, b.z,
                            .10, bandH, b.d * .62, glass, 'building_window', near + 55);
                        windows++;
                    }
                }
            }
        }
        world.stage450DistantStats = { shells, inserts, windows, details, visibilityMeters: 3130,
            transitionStartMeters: 620, usesInstancing: true };
    };
    H.enhanceInterior450 = function (scene, plan) {
        if (scene.enhanced450) return scene;
        scene.enhanced450 = true;
        const b = plan.outerShell, x = b.x, z = b.z;
        const { X, Z } = H.interiorExtents450(b);
        const C = H.interiorCorridor450(X, scene.floor);
        const Y = scene.floor * plan.floorHeight;
        const lobby = scene.floor === 0;
        const hue = (plan.buildingId * 7 + scene.floor * 11) % 6;
        const families = [
            ['#bdb4a3','#789297','#b4a389','#fff2d2'],
            ['#aabfc1','#597e88','#a6bbb9','#dbf2ee'],
            ['#c7b2a0','#977a68','#bfaba2','#fff0da'],
            ['#aebdb4','#69827a','#b6b4a2','#e8eee0'],
            ['#b2b5b9','#6c8494','#a7afba','#e4edf2'],
            ['#c4b5a7','#896e64','#d7baa1','#f3e2ca']
        ];
        const [stone, metal, wood, light] = families[hue];
        const put = (px, dy, pz, w, h, d, color = stone, material = 'paint', shape = 'cube', glow = 0) => {
            const o = H.box(px, Y + dy, pz, w, h, d, color, 0, 4, glow);
            o.material = material;
            o.shape = shape;
            scene.boxes.push(o);
            return o;
        };
        // Thin grout-defined stone field, metallic inlay and alternating ceiling
        // baffles: genuine modeled shapes, not giant flat sticker textures.
        const pathWidth = Math.min(C * 1.65, X * 1.37);
        put(x, .073, z, pathWidth, .018, Math.max(3, Z * 2 - 2.2),
            lobby ? stone : wood, lobby ? 'concrete' : 'paint');
        for (const sx of [-1, 1]) {
            put(x + sx * (pathWidth * .50 + .07), .086, z,
                .063, .019, Math.max(3, Z * 2 - 2.8), metal, 'metal');
            for (let q = -1; q <= 1; q++) {
                const anchor = z + q * Z * .58;
                put(x + sx * (C - .28), 2.75, anchor, .075, .62, .39,
                    metal, 'metal', 'rounded_smooth');
                put(x + sx * (C - .40), 2.75, anchor, .065, .42, .29,
                    light, 'light_emissive', 'rounded_smooth', .24);
            }
        }
        const lightingRuns = clamp(Math.round(Z / 5.5), 3, 15);
        for (let i = 0; i < lightingRuns; i++) {
            const pz = z - Z + 2.2 + i * (2 * Z - 4.4) / Math.max(1, lightingRuns - 1);
            put(x, 3.995, pz, Math.min(3.25, C * .88), .072, .31,
                light, 'light_emissive', 'rounded_smooth', .28);
            // Recessed ceiling panels are deliberately interspersed with fixtures.
            if (i % 2 === 0) {
                for (const sx of [-1, 1]) {
                    put(x + sx * Math.min(C * .47, 2.25), 4.015, pz,
                        .11, .045, Math.min(2.6, Z * .18), metal, 'metal');
                }
            }
        }
        // Atrium-focused detailing. Nothing obstructs the entire central 6m–11m
        // passage; fixtures are near the wall and are not collision objects.
        if (lobby) {
            const front = z - Z;
            const insetLength = Math.min(6.5, Math.max(3.5, Z * .35));
            for (const sx of [-1, 1]) {
                const px = x + sx * (C - .78);
                const pz = front + insetLength;
                put(px, .34, pz, .68, .62, .68, wood, 'concrete', 'cylinder');
                put(px, .68, pz, .52, .14, .52, metal, 'metal', 'cylinder');
                put(px, 1.02, pz, .15, .78, .15, '#5f7861', 'paint', 'cylinder');
                for (let l = 0; l < 4; l++) {
                    const theta = l * 2.399 + plan.buildingId;
                    put(px + Math.sin(theta) * .25, 1.30 + (l % 2) * .23,
                        pz + Math.cos(theta) * .20, .48, .73, .48,
                        l % 2 ? '#718d76' : '#426953', 'paint', 'sphere');
                }
                put(x + sx * (C - .23), 1.12, front + Math.max(9.8, Z * .46),
                    .13, 1.65, 2.0, wood, 'paint');
                put(x + sx * (C - .325), 1.16, front + Math.max(9.8, Z * .46),
                    .12, 1.33, 1.62, hue % 2 ? '#759a9c' : '#beaa8b', 'paint');
            }
            // Resting pockets along (not across) the corridor. The middle stays
            // accessible even in the narrowest plan, and benches have true solids.
            const benchZ = front + Math.min(11.0, Z * .86);
            for (const sx of [-1, 1]) {
                const px = x + sx * (C - .88);
                put(px, .48, benchZ, .70, .24, 2.05,
                    hue % 2 ? '#647f83' : '#8f8275', 'paint', 'rounded_smooth');
                put(px + sx * .34, .84, benchZ, .13, .63, 1.98,
                    hue % 2 ? '#52737a' : '#7e6d63', 'paint', 'rounded_smooth');
                for (const end of [-1, 1])
                    put(px, .28, benchZ + end * .83, .16, .48, .17, metal, 'metal');
                scene.solids.push({ x: px, z: benchZ, hw: .49, hd: 1.06 });
            }
            // Entrance stone ribbon is centered in the actual portal, not along
            // an unrelated prefabricated room origin.
            put(scene.entrance.x, .092, front + 1.66, Math.min(3.85, pathWidth - .5),
                .012, 2.45, '#ddd9cd', 'concrete');
            scene.lights.push({x, y:Y+3.80, z:front+4.75,
                radius:18, r:1.02, g:.96, b:.81});
        }
        scene.stage450Interior = { widthMeters: 2*X, depthMeters: 2*Z,
            centralPassageMeters: 2*C, floor: scene.floor,
            physicalEntrance: true, automaticRoomDoors: true };
        return scene;
    };
})(Heatline || (Heatline = {}));
