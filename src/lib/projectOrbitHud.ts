import { CanvasTexture, SRGBColorSpace } from "three";
import { CONFIG } from "@/config/constants";

export function createProjectOrbitHud(title: string) {
  const C = CONFIG.projectOrbit.HUD;
  const width = C.TEXTURE_WIDTH;
  const height = Math.round(width / CONFIG.projectPreview.ASPECT);
  const canvas = document.createElement("canvas");
  canvas.width = width * C.ATLAS_COLUMNS;
  canvas.height = height * C.ATLAS_ROWS;
  const context = canvas.getContext("2d")!;
  for (let index = 0; index < C.ATLAS_COLUMNS * C.ATLAS_ROWS; index++) {
    context.save();
    context.translate(index % C.ATLAS_COLUMNS * width, Math.floor(index / C.ATLAS_COLUMNS) * height);
    const line = (points: number[][], color: string, thickness = 1) => {
      context.beginPath();
      points.forEach(([x, y], i) => {
        if (i === 0) context.moveTo(x * width, y * height);
        else context.lineTo(x * width, y * height);
      });
      context.strokeStyle = color;
      context.lineWidth = thickness;
      context.stroke();
    };
    const cut = C.CORNER_CUT / CONFIG.projectPreview.ASPECT;
    line([[0.025, 0.026], [0.45, 0.026], [0.47, 0.044], [0.54, 0.044], [0.56, 0.026], [1 - cut, 0.026]], C.PRIMARY, 3);
    line([[cut, 0.974], [0.37, 0.974], [0.39, 0.956], [0.46, 0.956], [0.48, 0.974], [0.975, 0.974]], C.PRIMARY, 3);
    line([[0.022, 0.22], [0.022, 0.39]], C.PRIMARY, 3);
    line([[0.978, 0.61], [0.978, 0.78]], C.SECONDARY, 3);
    for (let tick = 0; tick < 6; tick++) {
      line([[0.025, 0.45 + tick * 0.018], [0.04, 0.45 + tick * 0.018]], C.SECONDARY);
    }
    const pad = (1 - C.MEDIA_SCALE) / 2;
    const bracket = 0.025;
    for (const x of [pad, 1 - pad]) {
      for (const y of [pad, 1 - pad]) {
        const sx = x < 0.5 ? 1 : -1;
        const sy = y < 0.5 ? 1 : -1;
        line([[x, y + sy * bracket], [x, y], [x + sx * bracket, y]], C.SECONDARY, 1.5);
      }
    }
    context.fillStyle = C.SECONDARY;
    context.textBaseline = "middle";
    context.font = "600 16px monospace";
    context.fillText(title.toUpperCase(), width * 0.055, height * 0.084, width * 0.77);
    context.font = "700 20px monospace";
    context.fillStyle = C.PRIMARY;
    context.fillText(String(index + 1).padStart(2, "0"), width * 0.875, height * 0.084);
    context.font = "500 10px monospace";
    context.fillStyle = C.SECONDARY;
    context.fillText("INTERACTIVE / PROJECT ARCHIVE", width * 0.085, height * 0.918, width * 0.6);
    for (let tick = 0; tick < 11; tick++) {
      context.fillStyle = tick < 8 ? C.SECONDARY : C.PRIMARY;
      context.globalAlpha = tick < 8 ? 0.85 : 0.3;
      context.fillRect(width * (0.755 + tick * 0.014), height * 0.905, width * 0.008, height * 0.025);
    }
    context.restore();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
