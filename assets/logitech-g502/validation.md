# Validation

- `npm run typecheck`, `npm run lint` and `npm run build` pass.
- The workstation check reads the actual GLB and verifies its 75 × 42 × 130 mm footprint, Y=0 glide-pad plane, desk contact, desktop containment and clearance from the keyboard and monitor.
- Binary asset inspection confirms finite vertex data, unit normals, nine material draws, embedded textures and no exported cameras or animations. The GLB is approximately 2.7 MiB; exact statistics are in `asset-report.json`.
- The local `/debug` workstation loads the mouse without browser errors at the original X=0.30, Y=0, Z=0.02 placement and -5° yaw. `workstation.png` records the runtime view. Studio renders inspect the curved shell, panel separation, wheel recess, thumb controls, rubber grip and illuminated marks.
- `npm test` passes through workstation, skull and project-orbit checks, then fails at the existing pointer-camera assertion: `Workstation moves visibly in the same direction as the reference`. This same failure is documented in `assets/edifier-r1280dbs/validation.md`; the mouse change does not modify the pointer-camera implementation, settings or test.

Frame rate was not benchmarked. Studio lighting is for material inspection and is not exported; runtime lighting comes from the existing workstation environment.
