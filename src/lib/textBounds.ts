import type { Mesh } from "three";

export interface TextBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

interface TroikaText {
    textRenderInfo?: { blockBounds: [number, number, number, number] };
}

export function readTextBounds(mesh: Mesh): TextBounds | null {
    const info = (mesh as Mesh & TroikaText).textRenderInfo;
    if (!info) return null;

    const [minX, minY, maxX, maxY] = info.blockBounds;
    if (maxX - minX <= 0 || maxY - minY <= 0) return null;

    return { minX, minY, maxX, maxY };
}

export function sameTextBounds(a: TextBounds | null, b: TextBounds) {
    return (
        a !== null &&
        a.minX === b.minX &&
        a.minY === b.minY &&
        a.maxX === b.maxX &&
        a.maxY === b.maxY
    );
}
