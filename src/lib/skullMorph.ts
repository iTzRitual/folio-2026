import { BufferAttribute, type BufferGeometry } from "three";

/**
 * Flattens the skull into a rectangle the preview image can sit on.
 *
 * The GLB is Blender-oriented: local X is width, Z is up and Y is depth. So the
 * plate is built in the local XZ plane and Y collapses to a thin slab — enough
 * thickness for the transmission material to still read as glass.
 *
 * The silhouette is rectangularised radially: for every direction around the
 * centre we measure how far the skull reaches, then rescale that direction so
 * its outermost vertex lands exactly on the rectangle's edge. Vertices keep
 * their relative depth along the ray, so the skull stretches into the frame
 * instead of being clipped by it.
 */

const ANGULAR_BINS = 180;
const SMOOTHING_PASSES = 2;

export interface FlatMorphTarget {
    positions: Float32Array;
    /** Rectangle the flattened plate spans, in geometry-local units. */
    rectWidth: number;
    rectHeight: number;
    /** Plate centre in geometry-local units. */
    centerX: number;
    centerZ: number;
}

function binIndex(angle: number) {
    const normalized = (angle + Math.PI) / (2 * Math.PI);
    return Math.min(ANGULAR_BINS - 1, Math.floor(normalized * ANGULAR_BINS));
}

/** Distance from the centre to the rectangle edge along `angle`. */
function rectRadius(angle: number, halfWidth: number, halfHeight: number) {
    const cos = Math.abs(Math.cos(angle));
    const sin = Math.abs(Math.sin(angle));
    const horizontal = cos > 1e-6 ? halfWidth / cos : Infinity;
    const vertical = sin > 1e-6 ? halfHeight / sin : Infinity;
    return Math.min(horizontal, vertical);
}

export function buildFlatMorphTarget(
    geometry: BufferGeometry,
    aspect: number,
    thickness: number,
): FlatMorphTarget {
    const source = geometry.getAttribute("position");
    const count = source.count;

    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const centerX = (box.min.x + box.max.x) / 2;
    const centerZ = (box.min.z + box.max.z) / 2;

    // Keep the plate's area close to the skull's own footprint so the morph
    // neither balloons nor shrinks: match the diagonal, then split by aspect.
    const spanX = box.max.x - box.min.x;
    const spanZ = box.max.z - box.min.z;
    const diagonal = Math.hypot(spanX, spanZ);
    const rectHeight = diagonal / Math.hypot(aspect, 1);
    const rectWidth = rectHeight * aspect;
    const halfWidth = rectWidth / 2;
    const halfHeight = rectHeight / 2;

    // Per-direction reach of the silhouette.
    const reach = new Float32Array(ANGULAR_BINS);
    for (let i = 0; i < count; i++) {
        const x = source.getX(i) - centerX;
        const z = source.getZ(i) - centerZ;
        const radius = Math.hypot(x, z);
        if (radius < 1e-6) continue;
        const bin = binIndex(Math.atan2(z, x));
        if (radius > reach[bin]) reach[bin] = radius;
    }

    // Empty bins (and hard steps between them) would tear the plate, so fill
    // then blur the reach curve — it wraps around, hence the modulo.
    let maxReach = 0;
    for (let i = 0; i < ANGULAR_BINS; i++) maxReach = Math.max(maxReach, reach[i]);
    for (let i = 0; i < ANGULAR_BINS; i++) {
        if (reach[i] <= 1e-6) reach[i] = maxReach;
    }
    for (let pass = 0; pass < SMOOTHING_PASSES; pass++) {
        const previous = reach.slice();
        for (let i = 0; i < ANGULAR_BINS; i++) {
            const before = previous[(i - 1 + ANGULAR_BINS) % ANGULAR_BINS];
            const after = previous[(i + 1) % ANGULAR_BINS];
            reach[i] = (before + previous[i] * 2 + after) / 4;
        }
    }

    const halfThickness = thickness / 2;
    const halfSpanY = Math.max((box.max.y - box.min.y) / 2, 1e-6);
    const centerY = (box.min.y + box.max.y) / 2;

    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const x = source.getX(i) - centerX;
        const y = source.getY(i) - centerY;
        const z = source.getZ(i) - centerZ;

        const angle = Math.atan2(z, x);
        const stretch =
            rectRadius(angle, halfWidth, halfHeight) / reach[binIndex(angle)];

        positions[i * 3] = centerX + x * stretch;
        positions[i * 3 + 1] = centerY + (y / halfSpanY) * halfThickness;
        positions[i * 3 + 2] = centerZ + z * stretch;
    }

    return { positions, rectWidth, rectHeight, centerX, centerZ };
}

/** Installs the target as morph target 0. No-op once it is already there. */
export function attachFlatMorphTarget(
    geometry: BufferGeometry,
    target: FlatMorphTarget,
) {
    if (geometry.morphAttributes.position) return;

    geometry.morphAttributes.position = [
        new BufferAttribute(target.positions, 3),
    ];

    // Every face of a flat plate points along local Y — without matching
    // normals the glass would keep refracting as if it were still a skull.
    const source = geometry.getAttribute("normal");
    const normals = new Float32Array(target.positions.length);
    for (let i = 0; i < source.count; i++) {
        normals[i * 3 + 1] = Math.sign(source.getY(i)) || 1;
    }
    geometry.morphAttributes.normal = [new BufferAttribute(normals, 3)];
}
