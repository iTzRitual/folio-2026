"use client";

import { useFrame } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { CONFIG } from "@/config/constants";
import type { MonitorState } from "@/lib/monitorState";

export type PlayStationSignalHandle = {
  syncFromMonitor: () => void;
};

function isPlayStationInput(state: MonitorState) {
  return state.inputMode === "LINE" && state.lineInput === "B";
}

function createPlayStationPlayback(monitorState: MonitorState) {
  const video = document.createElement("video");
  video.preload = "auto";
  video.playsInline = true;
  video.crossOrigin = "anonymous";

  const texture = new THREE.VideoTexture(video);
  const repeatX =
    CONFIG.workstation.PLANE_ASPECT / CONFIG.monitor.PLAYSTATION_SOURCE_ASPECT;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(repeatX, 1);
  texture.offset.set((1 - repeatX) / 2, 0);

  let clipIndex = 0;
  let lastPower = monitorState.power;
  let lastInput = isPlayStationInput(monitorState);

  const loadCurrentClip = () => {
    const source = CONFIG.monitor.PLAYSTATION_CLIPS[clipIndex];
    if (!video.src.endsWith(source)) {
      video.src = source;
      video.load();
    } else {
      video.currentTime = 0;
    }
  };
  const sync = () => {
    const selected = isPlayStationInput(monitorState);
    if (monitorState.power && selected) {
      if (!lastPower || !lastInput || video.ended) loadCurrentClip();
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
    lastPower = monitorState.power;
    lastInput = selected;
  };
  const ended = () => {
    monitorState.power = false;
    clipIndex = (clipIndex + 1) % CONFIG.monitor.PLAYSTATION_CLIPS.length;
    lastPower = false;
  };
  video.addEventListener("ended", ended);

  return {
    texture,
    sync,
    update() {
      if (
        monitorState.power !== lastPower ||
        isPlayStationInput(monitorState) !== lastInput
      ) {
        sync();
      }
    },
    dispose() {
      video.removeEventListener("ended", ended);
      video.pause();
      video.removeAttribute("src");
      video.load();
      texture.dispose();
    },
  };
}

export const PlayStationSignal = forwardRef<
  PlayStationSignalHandle,
  {
    geometry: THREE.BufferGeometry;
    monitorState: MonitorState;
  }
>(function PlayStationSignal({ geometry, monitorState }, ref) {
  const meshRef = useRef<THREE.Mesh>(null);
  const playback = useMemo(
    () => createPlayStationPlayback(monitorState),
    [monitorState],
  );

  useImperativeHandle(ref, () => ({ syncFromMonitor: playback.sync }));
  useEffect(() => () => playback.dispose(), [playback]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.visible = isPlayStationInput(monitorState);
    }
    playback.update();
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      renderOrder={20}
      frustumCulled={false}
      raycast={() => null}
      visible={false}
    >
      <meshBasicMaterial
        map={playback.texture}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
});
