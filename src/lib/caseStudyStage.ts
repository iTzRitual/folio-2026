/** What the case study asks of the preview plate while it owns it. */
export interface PlateControl {
    /** "cursor" hands the plate back to its own hover follow. */
    mode: "cursor" | "placed";
    x: number;
    y: number;
    z: number;
    /** Plate width in world units. 0 keeps the size the hover left it at. */
    width: number;
    /**
     * How much of the plate still belongs to the hover, 1 → 0 over the flight.
     * Every term that only makes sense under a cursor is multiplied by it: the
     * velocity bend, the resting aberration and glitch, and the caption. A
     * permanent slice across a thumbnail is texture; across the case study's
     * opening image it is damage.
     */
    follow: number;
}

/**
 * The per-frame channels between the case study's driver and everything the
 * flight has to get out of its way. Module scope because there is one camera
 * and one plate, and the pieces that read this sit in three different subtrees
 * — the same reason the details curl keeps its uniforms here.
 */
export const caseStudyStage = {
    /**
     * Mirrors the provider's state for the readers that must not re-render
     * when it changes: every project row carries an <Html> twin, and a React
     * root per row is too much to pay for a boolean nobody draws.
     */
    open: false,
    /** 0 → 1 while a case study is on screen. */
    progress: 0,
    /**
     * 0 → 1 over everything that belongs to the list rather than to the study.
     * Ramped ahead of the flight's end so the list is gone before the frame is
     * small enough to show how magnified it has become.
     */
    dim: 0,
    plate: {
        mode: "cursor",
        x: 0,
        y: 0,
        z: 0,
        width: 0,
        follow: 1,
    } as PlateControl,
};
