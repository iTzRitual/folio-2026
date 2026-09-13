# Visual iteration

The three user photographs are the primary references. The official AT-LP60X manual confirms the envelope and control identities. The silver-front photograph informs geometry and layout; the two black product photographs determine the final finish.

## Proportional blockout

The first three rendered views are retained as `blockout-front-three-quarter.png`, `blockout-near-top.png` and `blockout-side.png`. The initial cover was partially cropped in the front inspection render; later inspection framing includes its complete silhouette. The blockout `.blend` and measurements were regenerated with the corrected measurement update and export settings after this review.

| Feature | Reference comparison and resulting decision |
| --- | --- |
| Footprint | 359.5 mm wide and 373.3 mm deep; width/depth ratio 0.963. Preserve the almost-square footprint. |
| Chassis | 48 mm deck height including feet; shallow layered shell and rounded front lip, rather than a sharp box. |
| Platter | 300 mm silver rim, offset 15 mm left and 9 mm rearward; diameter/width ratio 0.834. Keep generous front control clearance and the narrow right tonearm channel. |
| Platter thickness | Raised black lower rim, 8.5 mm silver profile and 2.3 mm felt layer. |
| Tonearm | Slim silver tube, compact housing, small integrated headshell and ivory stylus; no DJ counterweight. The base plate was refined to the reference's forward oval shape. |
| Adapter | Recessed upper-left well with separate circular adapter, as in the first two photographs. |
| Controls | Four small circular front controls and a separate top-right size selector. Replace blockout surfaces with real recessed sockets; move the tiny printed labels above the deck surface. |
| Cover | Independent thin shell, approximately 355 mm wide, with rear pivot and two hinge assemblies. Closed envelope reaches 97.5 mm. |

## Detailed model

The first detailed render showed overly soft chassis highlights after the circular recess booleans. Flat large shell faces removed the broad triangular gradients while the silhouette retains its small radii. The initially cloudy acrylic was reduced to restrained alpha blending. Removing duplicate center vertices reduced the rendered triangle count below 40,000. The front, near-top and side inspection renders were regenerated from the final asset.

## Application iteration

The existing workstation was inspected before choosing the right side. At `(0.445, 0, -0.17)`, the turntable was physically clear of the CRT but its platter was partly hidden by the housing in projection. A second test at `(0.56, 0, -0.36)` improved clearance. The final `(0.635, 0, -0.32)` with -3° yaw and scale 1 shows the platter and outside tonearm while leaving the CRT dominant.

The first acrylic export showed a diagonal highlight in Three.js. Flat cover normals and single-sided rendering removed it. The 65° opening clears the wall and CRT. The cover remains transparent against the actual gray workstation wall; opaque body and feet provide grounding in the existing cached shadow pass.

All three requested desktop viewports were inspected in the production application, after allowing resize/scroll interpolation to settle. Complete keyboard and turntable framing, transparent lid, desk contact and unobstructed CRT screen were confirmed. The original CRT, keyboard and desk assets were not modified.
