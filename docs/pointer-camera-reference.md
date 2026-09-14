# Pointer camera reference

Measured against [Shopify BFCM 2025](https://bfcm.shopify.com/2025/) on 2026-09-14.

The public [desktop camera implementation](https://bfcm.shopify.com/2025/assets/R3FCanvas-CWygpSpF.js) uses negative horizontal translation and negative world-up translation, with a stationary look-at target. Full normalized pointer input produces ±0.25 horizontal and ±0.125 vertical movement. There is no center deadzone. Pointer exit moves the input target toward zero over three seconds with a cosine profile; reentry gradually restores follow speed over 1.5 seconds.

The [camera constants and damping implementation](https://bfcm.shopify.com/2025/assets/SceneEnvironment-nogSmDBF.js) place the look-at target one unit from the camera. Follow uses critically damped motion with a one-second smooth time and retained velocity. The reference FOV is 26.5 degrees, widened below a 1920/968 aspect ratio.

Live reference response to a unit step:

| Elapsed | Distance covered |
| --- | --- |
| 0.1 s | 1.741% |
| 0.25 s | 8.994% |
| 0.5 s | 26.382% |
| 1 s | 59.353% |
| 2 s | 90.821% |

## Portfolio adaptation

The reveal path remains authoritative. Its camera position and orientation are rebuilt before applying parallax; its target is never modified.

The parallax aim point sits halfway between the base camera and the workstation target. This adapts the reference's near aim point to the portfolio's scene scale. Translation is proportional to that aim distance, with FOV compensation to retain comparable screen movement without changing the existing lens or framing.

The implementation uses the exact exponential solution of critical damping instead of the reference's exponential approximation. Regression tests compare its response with the measured samples and check 30/60/120/144 FPS.

Portfolio-specific behavior remains: reveal influence from 0.70 to 0.95, stationary offsets during active presses, scroll attenuation, and complete disabling for touch/coarse input and reduced motion. Pressing also clears follow velocity so release starts smoothly. Controls are in `/debug` → **Pointer Camera**.
