# GPU collision regression check

`check-orbit-collision-browser.ts` executes the production collision shader on WebGL and reads back positions and velocities. It checks fast impacts, overlapping starts, size-dependent gaps, rounded corners, open space, spring return at 30/60/120 Hz, moving cards, and disabled colliders.

To run it with the development server, temporarily create `src/app/collision-check/page.tsx`:

```tsx
"use client";
import { useEffect, useRef } from "react";
import { WebGLRenderer } from "three";
import { checkOrbitCollision } from "../../../scripts/check-orbit-collision-browser";

export default function CollisionCheck() {
  const output = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const renderer = new WebGLRenderer();
    try {
      output.current!.textContent = checkOrbitCollision(renderer);
    } catch (error) {
      output.current!.textContent = String(error);
    } finally {
      renderer.dispose();
    }
  }, []);
  return <pre ref={output}>Running GPU collision checks</pre>;
}
```

Open `/collision-check` and verify `PASS`. Delete the temporary route after running the check; it must not be included in the production build. CPU geometry and transform regressions run through `npm test`.
