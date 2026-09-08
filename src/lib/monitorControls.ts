import * as THREE from "three";
import { CONFIG } from "@/config/constants";
import { buttonActive, knobNormalized, type MonitorControl, type MonitorKnob, type MonitorButton, type MonitorState } from "./monitorState";

type ControlDefinition = { id: MonitorControl; kind: "button" | "knob"; x: number; y: number; sources: string[] };
const largeKnobs: MonitorKnob[] = ["aperture", "brightness", "chroma", "phase", "contrast"];
export const MONITOR_CONTROLS: ControlDefinition[] = [
  { id: "inputSelect", kind: "button", x: -0.179, y: -0.219, sources: ["CRT_Buttons"] },
  { id: "inputMode", kind: "button", x: -0.156, y: -0.219, sources: ["CRT_Buttons"] },
  { id: "syncExternal", kind: "button", x: -0.133, y: -0.219, sources: ["CRT_Buttons"] },
  { id: "blueOnly", kind: "button", x: -0.179, y: -0.241, sources: ["CRT_Buttons"] },
  { id: "underScan", kind: "button", x: -0.156, y: -0.241, sources: ["CRT_Buttons"] },
  { id: "hvDelay", kind: "button", x: -0.133, y: -0.241, sources: ["CRT_Buttons"] },
  { id: "power", kind: "button", x: 0.181, y: -0.228, sources: ["CRT_Buttons_Power"] },
  ...largeKnobs.map((id, i): ControlDefinition => ({ id, kind: "knob", x: -0.047 + i * 0.034, y: -0.229, sources: ["CRT_Knobs", "CRT_KnobPointer"] })),
  ...(["bias", "gain"] as const).flatMap((type, col) => (["R", "G", "B"] as const).map((channel, row): ControlDefinition => ({
    id: `${type}${channel}`, kind: "knob", x: -0.108 + col * 0.021, y: -0.213 - row * 0.015, sources: ["CRT_TrimBottom"],
  }))),
];

export function createMonitorControls(model: THREE.Object3D) {
  const controls = MONITOR_CONTROLS.map(definition => {
    const group = new THREE.Group();
    group.name = `MonitorControl_${definition.id}`;
    group.position.set(definition.x, definition.y, 0);
    model.add(group);
    return { ...definition, group, originalPosition: group.position.clone(), originalRotation: group.quaternion.clone(), amount: 0,
      materials: [] as { material: THREE.MeshStandardMaterial; emissive: THREE.Color; intensity: number }[] };
  });
  const registry = new Map<THREE.Object3D, typeof controls[number]>();
  const geometries: THREE.BufferGeometry[] = [];
  const originals: { mesh: THREE.Mesh; visible: boolean; material: THREE.Material | THREE.Material[] }[] = [];
  const materials: THREE.Material[] = [];
  const sourceNames = new Set(MONITOR_CONTROLS.flatMap(control => control.sources));
  for (const name of sourceNames) {
    const source = model.getObjectByName(name);
    if (!(source instanceof THREE.Mesh)) throw new Error(`Missing monitor mesh: ${name}`);
    const candidates = controls.filter(control => control.sources.includes(name));
    const geometry: THREE.BufferGeometry = source.geometry.index ? source.geometry.toNonIndexed() : source.geometry.clone();
    geometry.applyMatrix4(source.matrix);
    const positions = geometry.getAttribute("position");
    const buckets = candidates.map(() => [] as number[]);
    for (let i = 0; i < positions.count; i += 3) {
      const x = (positions.getX(i) + positions.getX(i + 1) + positions.getX(i + 2)) / 3;
      const y = (positions.getY(i) + positions.getY(i + 1) + positions.getY(i + 2)) / 3;
      let nearest = 0;
      let distance = Infinity;
      candidates.forEach((control, j) => {
        const next = (x - control.x) ** 2 + (y - control.y) ** 2;
        if (next < distance) { distance = next; nearest = j; }
      });
      buckets[nearest].push(i, i + 1, i + 2);
    }
    candidates.forEach((control, index) => {
      if (!buckets[index].length) throw new Error(`Missing geometry for ${control.id} in ${name}`);
      const part = new THREE.BufferGeometry();
      for (const [key, attribute] of Object.entries(geometry.attributes)) {
        const values = new Float32Array(buckets[index].length * attribute.itemSize);
        buckets[index].forEach((vertex, j) => {
          for (let axis = 0; axis < attribute.itemSize; axis++) values[j * attribute.itemSize + axis] = attribute.getComponent(vertex, axis);
        });
        part.setAttribute(key, new THREE.BufferAttribute(values, attribute.itemSize));
      }
      part.translate(-control.x, -control.y, 0);
      part.computeBoundingSphere();
      geometries.push(part);
      const original = Array.isArray(source.material) ? source.material[0] : source.material;
      const material = original.clone();
      materials.push(material);
      if (material instanceof THREE.MeshStandardMaterial) control.materials.push({ material, emissive: material.emissive.clone(), intensity: material.emissiveIntensity });
      const mesh = new THREE.Mesh(part, material);
      mesh.name = `${name}_${control.id}`;
      control.group.add(mesh);
      registry.set(mesh, control);
      registry.set(control.group, control);
    });
    geometry.dispose();
    originals.push({ mesh: source, visible: source.visible, material: source.material });
    source.visible = false;
  }
  const led = model.getObjectByName("CRT_StatusLight") as THREE.Mesh;
  const ledOriginal = led.material;
  const ledMaterial = (Array.isArray(led.material) ? led.material[0] : led.material).clone() as THREE.MeshStandardMaterial;
  led.material = ledMaterial;
  materials.push(ledMaterial);
  const axis = new THREE.Vector3(0, 0, 1);
  const rotation = new THREE.Quaternion();
  return {
    controls, registry,
    resolve(object: THREE.Object3D | null) {
      while (object) {
        const control = registry.get(object);
        if (control) return control;
        object = object.parent;
      }
      return undefined;
    },
    syncPhysicalControlsFromState(state: MonitorState, delta: number, reducedMotion: boolean) {
      const blend = reducedMotion ? 1 : 1 - Math.exp(-CONFIG.monitor.RESPONSE * delta);
      for (const control of controls) {
        const target = control.kind === "button" ? Number(buttonActive(state, control.id as MonitorButton)) : knobNormalized(state, control.id as MonitorKnob);
        control.amount = THREE.MathUtils.lerp(control.amount, target, blend);
        if (Math.abs(control.amount - target) < 0.00001) control.amount = target;
        control.group.position.copy(control.originalPosition);
        control.group.quaternion.copy(control.originalRotation);
        if (control.kind === "button") {
          control.group.position.z -= CONFIG.monitor.PRESS_DEPTH * control.amount;
          for (const entry of control.materials) {
            entry.material.emissive.copy(entry.emissive);
            entry.material.emissiveIntensity = entry.intensity;
            if (target && control.id !== "power") {
              entry.material.emissive.setRGB(0.5, 0.65, 0.4);
              entry.material.emissiveIntensity = CONFIG.monitor.ACTIVE_EMISSION;
            }
          }
        } else control.group.quaternion.multiply(rotation.setFromAxisAngle(axis, -control.amount * CONFIG.monitor.KNOB_ANGLE));
      }
      ledMaterial.emissive.setRGB(0.09, 0.8, 0.004);
      ledMaterial.emissiveIntensity = state.power ? CONFIG.monitor.ACTIVE_EMISSION : 0;
    },
    dispose() {
      for (const control of controls) model.remove(control.group);
      for (const original of originals) { original.mesh.visible = original.visible; original.mesh.material = original.material; }
      led.material = ledOriginal;
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      registry.clear();
    },
  };
}
