import {
  Color, DoubleSide, Mesh, MeshBasicMaterial, MeshDepthMaterial, OrthographicCamera,
  PlaneGeometry, Scene, ShaderMaterial, Vector3, WebGLRenderTarget,
  type Object3D, type WebGLRenderer,
} from "three";
import { HorizontalBlurShader } from "three/addons/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/addons/shaders/VerticalBlurShader.js";
import { CONFIG } from "@/config/constants";

export function createWorkstationShadow() {
  const resolution = CONFIG.phase2.CONTACT_SHADOW_RESOLUTION;
  const target = new WebGLRenderTarget(resolution, resolution);
  const intermediate = new WebGLRenderTarget(resolution, resolution);
  target.texture.generateMipmaps = intermediate.texture.generateMipmaps = false;
  const depth = new MeshDepthMaterial({ side: DoubleSide });
  depth.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "vec4( vec3( 1.0 - fragCoordZ ), opacity )",
      "vec4( vec3( 0.0 ), 1.0 - fragCoordZ )",
    );
  };
  const horizontal = new ShaderMaterial(HorizontalBlurShader);
  const vertical = new ShaderMaterial(VerticalBlurShader);
  const geometry = new PlaneGeometry(2, 2);
  const quad = new Mesh(geometry, horizontal);
  const blurCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 2);
  blurCamera.position.z = 1;
  const material = new MeshBasicMaterial({
    map: target.texture,
    transparent: true,
    opacity: CONFIG.phase2.CONTACT_SHADOW_OPACITY,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  });

  return {
    material,
    capture(gl: WebGLRenderer, models: Object3D[], center: Vector3, width: number, depthSize: number) {
      const captureScene = new Scene();
      for (const model of models) captureScene.add(model);
      captureScene.overrideMaterial = depth;
      const camera = new OrthographicCamera(-width / 2, width / 2, depthSize / 2, -depthSize / 2, 0, CONFIG.phase2.CONTACT_SHADOW_FAR);
      camera.position.copy(center);
      camera.up.set(0, 0, 1);
      camera.lookAt(center.clone().add(new Vector3(0, 1, 0)));
      camera.updateMatrixWorld(true);
      const previousTarget = gl.getRenderTarget();
      const clearColor = gl.getClearColor(new Color());
      const clearAlpha = gl.getClearAlpha();
      const autoClear = gl.autoClear;
      try {
        gl.autoClear = true;
        gl.setClearColor(0x000000, 0);
        gl.setRenderTarget(target);
        gl.render(captureScene, camera);
        quad.material = horizontal;
        horizontal.uniforms.tDiffuse.value = target.texture;
        horizontal.uniforms.h.value = CONFIG.phase2.CONTACT_SHADOW_BLUR / resolution;
        gl.setRenderTarget(intermediate);
        gl.render(quad, blurCamera);
        quad.material = vertical;
        vertical.uniforms.tDiffuse.value = intermediate.texture;
        vertical.uniforms.v.value = CONFIG.phase2.CONTACT_SHADOW_BLUR / resolution;
        gl.setRenderTarget(target);
        gl.render(quad, blurCamera);
      } finally {
        gl.setRenderTarget(previousTarget);
        gl.setClearColor(clearColor, clearAlpha);
        gl.autoClear = autoClear;
        captureScene.clear();
      }
    },
    dispose() {
      target.dispose();
      intermediate.dispose();
      depth.dispose();
      horizontal.dispose();
      vertical.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
