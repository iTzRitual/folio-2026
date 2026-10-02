# Validation

- Production build, TypeScript and ESLint pass.
- The workstation check loads the actual GLB variants, verifies the original placement envelope and Y=0 contact plane, and checks desk containment and monitor/keyboard clearance. It passes at all three existing viewport sizes.
- GLB inspection confirms embedded wood, paper and normal textures, finite vertex data, unit normals, opaque materials and no exported cameras.
- The local `/debug` scene loads both models without browser errors and retains their original positions, inward yaw and contact shadows.
- Studio views inspect the uncovered drivers, port depth, mounting hardware, material grain and recessed controls. The side panel's planar normals were corrected after its recess was cut to eliminate diagonal shading artifacts.

`npm test` passes all checks before the final pointer-camera assertion, which fails with `Workstation moves visibly in the same direction as the reference`. The same assertion was reproduced using unchanged files from pre-task commit `cc3437f`; speaker changes do not modify camera behavior. A separate portability fix makes the existing Windows-path normalization test pass on macOS.

The asset has 11 material draws for the passive speaker and 14 for the active speaker. Exact triangle counts, bounds and GLB size are in `asset-report.json`. Browser performance was not benchmarked; the in-app browser throttles background frames.
