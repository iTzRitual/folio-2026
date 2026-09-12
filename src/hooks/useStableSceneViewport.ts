import { useEffect } from "react";
import { useStore, useThree } from "@react-three/fiber";
import { CONFIG } from "@/config/constants";

export function useStableSceneViewport() {
  const store = useStore();
  const { camera } = useThree();

  useEffect(
    () =>
      store.subscribe((state) => {
        const restZ = CONFIG.scene.CAMERA_REST_Z;
        if (state.viewport.distance === restZ) return;

        const { x, y, z } = camera.position;
        camera.position.set(0, 0, restZ);
        camera.updateMatrixWorld();
        state.setSize(
          state.size.width,
          state.size.height,
          state.size.top,
          state.size.left,
        );
        camera.position.set(x, y, z);
        camera.updateMatrixWorld();
      }),
    [store, camera],
  );
}

