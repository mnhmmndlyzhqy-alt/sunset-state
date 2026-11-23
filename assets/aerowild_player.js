/* AeroWild player adapted to Sunset State's native street-character renderer. */
var Heatline = globalThis.Heatline || {};
(function (Heatline) {
    const coat = '#326da7', seam = '#8aaecc', pants = '#373e48';
    const armor = '#424e5d', leather = '#523b30', buckle = '#bc965b';
    const skin = '#bd866b', hair = '#292529', rubber = '#292a2c';
    const scale = .90;
    const bodyWidth = 1.14;
    const outfit = [
        ['torso', 0, 1.29, 0, .51, .84, .46, coat, 'fabric'],
        ['armor', 0, 1.38, -.178, .48, .36, .25, armor, 'leather'],
        ['backpack', 0, 1.34, .267, .39, .50, .26, leather, 'leather'],
        ['rounded_smooth', 0, 1.49, .395, .27, .05, .024, buckle, 'metal'],
        ['rounded_smooth', 0, .893, 0, .42, .29, .355, pants, 'fabric'],
        ['rounded_smooth', 0, .943, 0, .44, .072, .37, leather, 'leather'],
        ['rounded_smooth', 0, .943, -.193, .081, .046, .021, buckle, 'metal'],
        ['cylinder', 0, 1.723, -.022, .144, .20, .144, skin, 'skin'],
        ['head', 0, 1.928, -.042, .34, .41, .36, skin, 'skin'],
        ['hair', 0, 2.088, .007, .347, .168, .317, hair, 'fabric'],
        ['sphere', 0, 2.157, .053, .170, .041, .169, '#202b43', 'fabric'],
        ['rounded_smooth', 0, 1.839, -.136, .059, .012, .016, '#745147', 'skin'],
    ];
    const partFallback = {torso:'rounded_smooth',armor:'rounded',backpack:'rounded_smooth',
        head:'sphere',hair:'sphere',boot:'rounded_smooth'};

    Heatline.aerowildPlayerPose = function (actor, out, seconds, webgl) {
        if (actor.injuryState !== 'walking' || (webgl && !Heatline.AEROWILD_PLAYER_MESHES)) return false;

        const yaw = -actor.yaw, cy = Math.cos(yaw), sy = Math.sin(yaw);
        const stride = Heatline.clamp(actor.stride, 0, 1);
        const step = Math.sin(actor.phase);
        const airborne = !actor.grounded;
        const bob = airborne ? 0 : .013 * stride * (1 - Math.cos(actor.phase * 2));
        const floor = actor.y + bob - Math.min(.09, actor.stumble * .08);
        const blink = 1 - .91 * Math.max(0, 1 - Math.abs(seconds % 4.9 - 2.2) / .082);
        const add = (shape, x, y, z, width, height, depth, color, material, pitch = 0, roll = 0) => {
            const primitive = partFallback[shape];
            const lateralScale=y<1.72?bodyWidth:1;
            x*=lateralScale;
            const part = Heatline.box(
                actor.x + (cy * x - sy * z) * scale, floor + y * scale,
                actor.z + (sy * x + cy * z) * scale, width * scale * lateralScale, height * scale, depth * scale, color, yaw, 4
            );
            part.shape = primitive ? (webgl ? 'aerowild_' + shape : primitive) : shape;
            part.material = material === 'leather' ? 'fabric' : material;
            part.pitch = pitch;
            part.roll = roll;
            out.push(part);
        };
        for (const part of outfit) add(...part);

        // Each segment rotates around its joint while its shape remains rigid.
        const segment = (shape, x, y, z, length, angle, width, depth, color, material) => {
            add(shape, x, y - Math.cos(angle) * length * .5, z - Math.sin(angle) * length * .5,
                width, length + .048, depth, color, material, angle);
        };
        for (const side of [-1, 1]) {
            add('sphere', side * .113, 1.928, .011, .046, .079, .060, skin, 'skin');
            add('sphere', side * .057, 1.981, -.154, .044, .024 * blink, .025, '#e5dacf', 'skin');
            add('sphere', side * .057, 1.981, -.165, .017, .019 * blink, .012, '#3a332b', 'skin');
            add('rounded_smooth', side * .058, 2.008, -.155, .050, .010, .014, hair, 'fabric', 0, side * .07);
            add('rounded_smooth', side * .13, 1.51, -.275, .026, .178, .021, seam, 'fabric', 0, side * .27);
            add('capsule', side * .194, .79, .074, .012, .248, .012, '#e4ded0', 'fabric', .13 * side * step * stride);
            add('capsule', side * .211, .735, .077, .009, .198, .009, '#e4ded0', 'fabric', .13 * side * step * stride);

            const leg = airborne ? .23 + .15 * side : side * step * stride * .46;
            const bend = airborne ? .58 : Math.max(0, -leg) * .86;
            const shin = leg - bend, hipX = side * .134;
            const kneeY = .912 - Math.cos(leg) * .39, kneeZ = -Math.sin(leg) * .39;
            const ankleY = kneeY - Math.cos(shin) * .394, ankleZ = kneeZ - Math.sin(shin) * .394;
            segment('capsule', hipX, .912, 0, .39, leg, .223, .217, pants, 'fabric');
            segment('capsule', hipX, kneeY, kneeZ, .394, shin, .158, .168, pants, 'fabric');
            add('rounded_smooth', hipX, kneeY, kneeZ - .068, .135, .145, .118, armor, 'leather', shin);
            add('boot', hipX, ankleY - .025, ankleZ - .059, .184, .205, .300, rubber, 'rubber', airborne ? shin * .35 : shin * .18);

            const shoulderX = side * .268, shoulderY = 1.507, shoulderZ = .012;
            const arm = airborne ? .25 - side * .13 : -side * step * stride * .35;
            const forearm = arm + .29 + Math.max(0, arm) * .26;
            const elbowY = shoulderY - Math.cos(arm) * .30, elbowZ = shoulderZ - Math.sin(arm) * .30;
            const wristY = elbowY - Math.cos(forearm) * .251, wristZ = elbowZ - Math.sin(forearm) * .251;
            add('sphere', shoulderX, shoulderY, shoulderZ, .193, .207, .200, coat, 'fabric');
            segment('capsule', shoulderX, shoulderY, shoulderZ, .30, arm, .166, .169, coat, 'fabric');
            segment('capsule', shoulderX, elbowY, elbowZ, .251, forearm, .131, .155, coat, 'fabric');
            add('rounded_smooth', shoulderX, elbowY, elbowZ + .048, .133, .124, .088, armor, 'leather', arm);
            add('sphere', shoulderX, wristY, wristZ, .112, .140, .117, leather, 'leather', forearm);
        }
        return true;
    };
})(Heatline);
