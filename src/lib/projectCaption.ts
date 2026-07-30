export interface CaptionTexture {
    canvas: HTMLCanvasElement;
    /** Trail label extent in plate UV, so the hold bar can sit under it. */
    barX: [number, number];
    barY: [number, number];
}

export interface CaptionTextureOptions {
    width: number;
    aspect: number;
    lead: string;
    trail: string;
    /** All as fractions of the plate, so the caption is resolution-free. */
    fontFraction: number;
    padXFraction: number;
    baselineFraction: number;
    barFraction: number;
    barGapFraction: number;
    fontFamily: string;
}

/**
 * A coverage mask, white on black: the material blends it as a difference, so
 * white becomes the exact inverse of whatever is under it and black leaves the
 * plate alone. Drawn once and reused for every project.
 */
export function drawCaptionTexture({
    width,
    aspect,
    lead,
    trail,
    fontFraction,
    padXFraction,
    baselineFraction,
    barFraction,
    barGapFraction,
    fontFamily,
}: CaptionTextureOptions): CaptionTexture | null {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width);
    canvas.height = Math.round(width / aspect);

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const padX = canvas.width * padXFraction;
    const baseline = canvas.height * (1 - baselineFraction);

    ctx.font = `300 ${canvas.width * fontFraction}px ${fontFamily}`;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";

    ctx.textAlign = "left";
    ctx.fillText(lead, padX, baseline);

    const trailWidth = ctx.measureText(trail).width;
    ctx.textAlign = "right";
    ctx.fillText(trail, canvas.width - padX, baseline);

    const barTop =
        baseline + canvas.width * fontFraction * 0.5 + canvas.height * barGapFraction;

    return {
        canvas,
        barX: [
            (canvas.width - padX - trailWidth) / canvas.width,
            (canvas.width - padX) / canvas.width,
        ],
        barY: [
            1 - (barTop + canvas.height * barFraction) / canvas.height,
            1 - barTop / canvas.height,
        ],
    };
}
