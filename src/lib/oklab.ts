const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

const toGamma = (c: number) =>
    c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

export type Oklab = [number, number, number];

export function hexToOklab(hex: string): Oklab {
    const int = parseInt(hex.slice(1), 16);
    const r = toLinear(((int >> 16) & 255) / 255);
    const g = toLinear(((int >> 8) & 255) / 255);
    const b = toLinear((int & 255) / 255);

    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

    return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
}

export function oklabToHex([L, A, B]: Oklab): string {
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
    const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
    const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;

    const channel = (v: number) =>
        Math.round(Math.min(1, Math.max(0, toGamma(v))) * 255)
            .toString(16)
            .padStart(2, "0");

    return `#${channel(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)}${channel(
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    )}${channel(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)}`;
}

const cache = new Map<string, Oklab>();

export function oklabOf(hex: string): Oklab {
    let value = cache.get(hex);
    if (!value) {
        value = hexToOklab(hex);
        cache.set(hex, value);
    }
    return value;
}

export function mixHex(from: string, to: string, t: number): string {
    if (from === to) return to;
    if (t <= 0) return from;
    if (t >= 1) return to;
    const a = oklabOf(from);
    const b = oklabOf(to);
    return oklabToHex([
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
    ]);
}
