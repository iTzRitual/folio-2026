# Hologram lab

Open `/lab/hologram` on the development server. The canvas uses the same skull, orbit and signal shader as the portfolio.

Click the canvas or **New seed** for a new deterministic signal pattern. **Character** changes the attack of signal interruptions. The remaining controls adjust frequency, size, travel along the ring, bursts, tearing, colour separation, reveal strength and tempo. **Freeze signal** and **Preview time** let you compare configurations at the same moment. Reduced motion uses gentle, steady transparency over the skull.

**Keep variant** adds the current configuration to the session's comparison rail. **Save to site** writes the complete configuration, including the seed, to `src/config/orbitSignal.json` and copies its JSON when clipboard access is available. Both the live site and lab read that file. The editor and save endpoint are unavailable in production.

The signal renderer is `src/lib/orbitSignal.ts`. Its animated field is determined by configuration and elapsed time. Strips follow cylindrical coordinates along the tilted ring, independently of card boundaries. Damage is intermittent and capped below complete transparency; card borders remain visible to preserve the sense that the skull sits inside the ring. `src/lib/skullSignalMask.ts` renders the intact skull geometry into a small depth mask, so stronger damage only affects card fragments in front of its projected surface. The mask follows the skull's scale, position and tilt; detached glass fragments do not expand the mask.
