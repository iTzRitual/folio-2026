let context: CanvasRenderingContext2D | null = null;
let fontFamily = "";

function getFontFamily(): string {
    if (fontFamily) return fontFamily;

    const probe = document.createElement("span");
    probe.className = "font-karla font-light";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    document.body.appendChild(probe);
    fontFamily = getComputedStyle(probe).fontFamily || "sans-serif";
    probe.remove();

    return fontFamily;
}

function getContext(): CanvasRenderingContext2D | null {
    if (context) return context;
    if (typeof document === "undefined") return null;

    context = document.createElement("canvas").getContext("2d");
    return context;
}

const ESTIMATED_ADVANCE_EM = 0.46;

export function measureTextWidth(
    text: string,
    fontPx: number,
    letterSpacingEm: number,
    fontsReady: boolean,
): number {
    const ctx = fontsReady ? getContext() : null;
    if (!ctx) return text.length * fontPx * ESTIMATED_ADVANCE_EM;

    ctx.font = `300 ${fontPx}px ${getFontFamily()}`;
    const tracking = letterSpacingEm * fontPx * Math.max(0, text.length - 1);

    return ctx.measureText(text).width + tracking;
}

export function wrapText(
    text: string,
    maxWidth: number,
    fontPx: number,
    letterSpacingEm: number,
    fontsReady: boolean,
): string[] {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    if (maxWidth <= 0) return [words.join(" ")];

    const lines: string[] = [];
    let current = words[0];

    for (let i = 1; i < words.length; i++) {
        const candidate = `${current} ${words[i]}`;

        if (
            measureTextWidth(candidate, fontPx, letterSpacingEm, fontsReady) <=
            maxWidth
        ) {
            current = candidate;
        } else {
            lines.push(current);
            current = words[i];
        }
    }

    lines.push(current);
    return lines;
}

export function wrapParagraphs(
    paragraphs: readonly string[],
    maxWidth: number,
    fontPx: number,
    letterSpacingEm: number,
    fontsReady: boolean,
): string[] {
    return paragraphs.flatMap((paragraph, index) => {
        const lines = wrapText(
            paragraph,
            maxWidth,
            fontPx,
            letterSpacingEm,
            fontsReady,
        );
        return index === 0 ? lines : ["", ...lines];
    });
}
