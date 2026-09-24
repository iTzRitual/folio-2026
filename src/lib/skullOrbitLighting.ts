import { Matrix4, Uniform, Vector4, type Material } from "three";
import { CONFIG } from "@/config/constants";
import { PROJECT_ORBIT_ASPECT } from "@/lib/projectOrbit";
import { projectOrbitCollisionShape } from "@/lib/projectOrbitCollision";

const C = CONFIG.projectOrbit;
export function createSkullOrbitLightingUniforms() {
  return {
    skullOrbitFromLocal: new Uniform(new Matrix4()),
    skullOrbitFromView: new Uniform(new Matrix4()),
    skullOrbitLight: new Uniform(new Vector4()),
    skullOrbitReveal: new Uniform(0),
    skullOrbitPhase: new Uniform(0),
    skullOrbitHud: new Uniform(0),
    skullOrbitShape: new Uniform(projectOrbitCollisionShape()),
  };
}

export function applySkullOrbitLighting(material: Material, uniforms: ReturnType<typeof createSkullOrbitLightingUniforms>) {
  const compile = material.onBeforeCompile;
  const cacheKey = material.customProgramCacheKey;
  material.onBeforeCompile = (shader, renderer) => {
    compile.call(material, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `
      uniform mat4 skullOrbitFromLocal;
      varying vec3 vSkullOrbitPosition;
    ` + shader.vertexShader.replace("#include <project_vertex>", `
      vSkullOrbitPosition = (skullOrbitFromLocal * vec4(transformed, 1.0)).xyz;
      #include <project_vertex>
    `);
    shader.fragmentShader = `
      uniform mat4 skullOrbitFromView;
      uniform vec4 skullOrbitLight;
      uniform vec4 skullOrbitShape;
      uniform float skullOrbitReveal;
      uniform float skullOrbitPhase;
      uniform float skullOrbitHud;
      varying vec3 vSkullOrbitPosition;
    ` + shader.fragmentShader.replace("#include <opaque_fragment>", `
      if (skullOrbitLight.x > 0.0) {
        float orbitPitch = skullOrbitShape.x;
        float orbitHalfHeight = skullOrbitShape.z;
        float orbitHalfArc = orbitHalfHeight * ${PROJECT_ORBIT_ASPECT};
        vec3 orbitNormal = normalize(mat3(skullOrbitFromView) * normal);
        vec3 orbitEmission = vec3(0.0);
        float orbitOcclusion = 0.0;
        float orbitAngle = atan(vSkullOrbitPosition.x, vSkullOrbitPosition.z);
        float orbitCard = floor(orbitAngle / orbitPitch + 0.5);
        for (int neighbor = -1; neighbor <= 1; neighbor++) {
          float cardCenter = (orbitCard + float(neighbor)) * orbitPitch;
          float angle = clamp(orbitAngle, cardCenter - orbitHalfArc, cardCenter + orbitHalfArc);
          float travel = mod(${(Math.sign(C.SPEED) || -1).toFixed(1)} * (angle + skullOrbitPhase - ${C.ENTRANCE_ORIGIN}) + ${Math.PI * 4}, ${Math.PI * 2});
          float neighborWeight = 1.0 - smoothstep(orbitPitch * 0.75, orbitPitch * 1.5, abs(orbitAngle - cardCenter));
          float emerged = step(travel, skullOrbitReveal * ${Math.PI * 2}) * neighborWeight;
          vec3 cardPoint = vec3(sin(angle), clamp(vSkullOrbitPosition.y, -orbitHalfHeight, orbitHalfHeight), cos(angle));
          vec3 toCard = cardPoint - vSkullOrbitPosition;
          float facing = max(dot(orbitNormal, normalize(toCard + vec3(0.00001))), 0.0);
          float proximity = exp(-length(toCard) / ${C.OCCLUSION_REACH});
          orbitOcclusion = max(orbitOcclusion, emerged * proximity * facing);
          for (int edge = 0; edge < 2; edge++) {
            vec3 edgePoint = vec3(cardPoint.x, mix(-orbitHalfHeight, orbitHalfHeight, float(edge)), cardPoint.z);
            vec3 toEdge = edgePoint - vSkullOrbitPosition;
            float distanceToEdge = length(toEdge);
            float incidence = max(dot(orbitNormal, normalize(toEdge + vec3(0.00001))), 0.0);
            vec3 tint = mix(vec3(${C.LIGHT_COLOR_BOTTOM.join(", ")}), vec3(${C.LIGHT_COLOR_TOP.join(", ")}), float(edge));
            tint = mix(tint, mix(vec3(${C.HUD.SECONDARY_LINEAR.join(", ")}), vec3(${C.HUD.PRIMARY_LINEAR.join(", ")}), float(edge)), skullOrbitHud);
            orbitEmission += tint * emerged * incidence * exp(-distanceToEdge / ${C.LIGHT_REACH});
          }
        }
        outgoingLight *= 1.0 - orbitOcclusion * skullOrbitLight.z * skullOrbitLight.x;
        outgoingLight += orbitEmission / 6.0 * skullOrbitLight.y * skullOrbitLight.x;
      }
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey = () => `${cacheKey.call(material)}:skull-orbit-light-v3`;
  material.needsUpdate = true;
  return () => {
    material.onBeforeCompile = compile;
    material.customProgramCacheKey = cacheKey;
    material.needsUpdate = true;
  };
}
