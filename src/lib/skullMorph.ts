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
/**
 * Bins on either side folded into each bin's reach. Widening the maximum is
 * what keeps the plate inside its rectangle: every vertex between two bin
 * centres is covered by both of their reaches, so interpolating between them
 * can never under-report how far the skull actually goes in that direction.
 */
const REACH_WINDOW = 1;

export interface FlatMorphTarget {
    positions: Float32Array;
    /** Rectangle the flattened plate spans, in geometry-local units. */
    rectWidth: number;
    rectHeight: number;
    /** Plate centre in geometry-local units. */
    centerX: number;
    centerY: number;
    centerZ: number;
}

/** Continuous bin coordinate, with bin centres at whole numbers. */
function binCoord(angle: number) {
    const normalized = (angle + Math.PI) / (2 * Math.PI);
    return normalized * ANGULAR_BINS - 0.5;
}

function binIndex(angle: number) {
    const wrapped = Math.round(binCoord(angle)) % ANGULAR_BINS;
    return wrapped < 0 ? wrapped + ANGULAR_BINS : wrapped;
}

/** Reach at an arbitrary angle, interpolated between the two nearest bins. */
function reachAt(reach: Float32Array, angle: number) {
    const coord = binCoord(angle);
    const low = Math.floor(coord);
    const frac = coord - low;
    const a = reach[((low % ANGULAR_BINS) + ANGULAR_BINS) % ANGULAR_BINS];
    const b = reach[(((low + 1) % ANGULAR_BINS) + ANGULAR_BINS) % ANGULAR_BINS];
    return a + (b - a) * frac;
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

    // Spread each bin's reach over its neighbours. Empty bins pick up a value
    // this way too, and hard steps between bins soften without ever dipping
    // below what the silhouette actually needs.
    const windowed = new Float32Array(ANGULAR_BINS);
    for (let i = 0; i < ANGULAR_BINS; i++) {
        let widest = 0;
        for (let offset = -REACH_WINDOW; offset <= REACH_WINDOW; offset++) {
            const index = (i + offset + ANGULAR_BINS) % ANGULAR_BINS;
            widest = Math.max(widest, reach[index]);
        }
        windowed[i] = widest;
    }
    reach.set(windowed);

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
            rectRadius(angle, halfWidth, halfHeight) / reachAt(reach, angle);

        positions[i * 3] = centerX + x * stretch;
        positions[i * 3 + 1] = centerY + (y / halfSpanY) * halfThickness;
        positions[i * 3 + 2] = centerZ + z * stretch;
    }

    return { positions, rectWidth, rectHeight, centerX, centerY, centerZ };
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
