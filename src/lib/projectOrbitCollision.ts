import { Matrix4, Vector3, type Object3D } from "three";
import { CONFIG } from "@/config/constants";

export interface ProjectOrbitCollider {
  object: Object3D | null;
  radius: number;
  active: boolean;
}

export function orbitCollisionTransform(object: Object3D, collider: ProjectOrbitCollider, target: Matrix4) {
  if (!collider.object || collider.radius <= 0) return null;
  object.updateWorldMatrix(true, false);
  collider.object.updateWorldMatrix(true, false);
  if (Math.abs(collider.object.matrixWorld.determinant()) < 1e-12 || Math.abs(object.matrixWorld.determinant()) < 1e-12) return null;
  target.copy(collider.object.matrixWorld).invert().multiply(object.matrixWorld);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 3; row++) target.elements[column * 4 + row] /= collider.radius;
  }
  return target;
}

export function projectCardDistance(point: Vector3) {
  const orbit = CONFIG.projectOrbit;
  const pitch = Math.PI * 2 / orbit.COUNT;
  const arc = pitch * (1 - orbit.GAP);
  const height = arc / CONFIG.projectPreview.ASPECT;
  const corner = height * orbit.CORNER_RADIUS;
  const angle = Math.atan2(point.x, point.z);
  const wrapped = angle - pitch * Math.floor(angle / pitch + 0.5);
  const x = Math.abs(wrapped) - arc / 2 + CONFIG.projectOrbitCollision.SIDE_INSET + corner;
  const y = Math.abs(point.y) - height / 2 + corner;
  const face = Math.hypot(Math.max(x, 0), Math.max(y, 0)) + Math.min(Math.max(x, y), 0) - corner;
  const radius = Math.hypot(point.x, point.z);
  const depth = Math.abs(radius - 1) - CONFIG.projectOrbitCollision.HALF_THICKNESS;
  const distance = Math.hypot(Math.max(face, 0), Math.max(depth, 0)) + Math.min(Math.max(face, depth), 0);
  return Math.max(depth, distance * Math.min(1, radius));
}

const O = CONFIG.projectOrbit;
const C = CONFIG.projectOrbitCollision;
const pitch = Math.PI * 2 / O.COUNT;
const arc = pitch * (1 - O.GAP);
const height = arc / CONFIG.projectPreview.ASPECT;

export const projectOrbitCollisionShader = `
uniform float orbitActive;
uniform mat4 orbitStart;
uniform mat4 orbitEnd;
uniform mat4 simulationFromOrbit;
uniform float orbitScale;
const float orbitPitch = ${pitch};
const float cardHalfWidth = ${arc / 2 - C.SIDE_INSET};
const float cardHalfHeight = ${height / 2};
const float cardCorner = ${height * O.CORNER_RADIUS};
const float cardThickness = ${C.HALF_THICKNESS};
const float collisionSkin = ${C.SKIN};

float cardAngle(vec3 p) {
  float angle = atan(p.x, p.z);
  return angle - orbitPitch * floor(angle / orbitPitch + 0.5);
}

float cardDistance(vec3 p) {
  vec2 q = abs(vec2(cardAngle(p), p.y)) - vec2(cardHalfWidth, cardHalfHeight) + cardCorner;
  float face = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - cardCorner;
  float radius = length(p.xz);
  vec2 d = vec2(face, abs(radius - 1.0) - cardThickness);
  return max(d.y, (length(max(d, 0.0)) + min(max(d.x, d.y), 0.0)) * min(1.0, radius));
}

vec3 cardNormal(vec3 p) {
  vec2 e = vec2(${C.NORMAL_EPSILON}, 0.0);
  vec3 gradient = vec3(
    cardDistance(p + e.xyy) - cardDistance(p - e.xyy),
    cardDistance(p + e.yxy) - cardDistance(p - e.yxy),
    cardDistance(p + e.yyx) - cardDistance(p - e.yyx)
  );
  if (length(gradient) > 0.000001) return normalize(gradient);
  return normalize(vec3(p.x, 0.0, p.z)) * (length(p.xz) < 1.0 ? -1.0 : 1.0);
}

vec3 cardEscape(vec3 p, float radius) {
  float angle = cardAngle(p);
  float vertical = cardHalfHeight + radius + collisionSkin - abs(p.y);
  float horizontal = cardHalfWidth + radius + collisionSkin - abs(angle);
  bool gapFits = orbitPitch * 0.5 - cardHalfWidth > radius + collisionSkin;
  if (gapFits && horizontal < vertical) {
    return normalize(vec3(p.z, 0.0, -p.x)) * (angle < 0.0 ? -1.0 : 1.0);
  }
  return vec3(0.0, p.y < 0.0 ? -1.0 : 1.0, 0.0);
}

void collideOrbit(vec3 previousPosition, vec3 rest, float localRadius, float dt, inout vec3 position, inout vec3 velocity) {
  if (orbitActive < 0.5 || localRadius <= 0.0) return;
  float radius = localRadius * orbitScale;
  vec3 start = (orbitStart * vec4(previousPosition, 1.0)).xyz;
  vec3 end = (orbitEnd * vec4(position, 1.0)).xyz;
  if (max(length(start.xz), length(end.xz)) < 1.0 - radius - cardThickness - ${C.STEER_RANGE}) return;
  if (min(start.y, end.y) > cardHalfHeight + radius + ${C.STEER_RANGE}) return;
  if (max(start.y, end.y) < -cardHalfHeight - radius - ${C.STEER_RANGE}) return;
  vec3 freeVelocity = (end - start) / dt;
  vec3 relativeVelocity = freeVelocity;
  float separation = cardDistance(start) - radius;
  if (separation < ${C.STEER_RANGE}) {
    vec3 normal = cardNormal(start);
    vec3 home = (orbitEnd * vec4(rest, 1.0)).xyz - start;
    if (dot(home, normal) < 0.0 || dot(relativeVelocity, normal) < 0.0) {
      float proximity = 1.0 - smoothstep(0.0, ${C.STEER_RANGE}, max(0.0, separation));
      float slow = 1.0 - smoothstep(${C.BOUNCE_START}, ${C.BOUNCE_FULL}, abs(dot(relativeVelocity, normal)));
      relativeVelocity += cardEscape(start, radius) * ${C.STEER_ACCELERATION.toFixed(4)} * proximity * slow * dt;
    }
  }
  vec3 current = start;
  float remaining = dt;
  for (int contact = 0; contact < ${C.CONTACTS}; contact++) {
    vec3 travel = relativeVelocity * remaining;
    float travelLength = length(travel);
    float fraction = 0.0;
    bool hit = false;
    for (int sampleIndex = 0; sampleIndex < ${C.SWEEP_STEPS}; sampleIndex++) {
      float distance = cardDistance(current) - radius;
      if (distance <= collisionSkin) { hit = true; break; }
      if (travelLength < collisionSkin || fraction >= 1.0) {
        current += travel * (1.0 - fraction);
        fraction = 1.0;
        break;
      }
      float stepFraction = min(1.0 - fraction, (distance - collisionSkin * 0.5) * ${C.SWEEP_SAFETY} / travelLength);
      current += travel * stepFraction;
      fraction += stepFraction;
    }
    if (!hit) break;
    vec3 normal = cardNormal(current);
    current += normal * max(0.0, collisionSkin * 2.0 - (cardDistance(current) - radius));
    float inward = dot(relativeVelocity, normal);
    if (inward < 0.0) {
      float bounce = ${C.RESTITUTION} * smoothstep(${C.BOUNCE_START}, ${C.BOUNCE_FULL}, -inward);
      relativeVelocity -= (1.0 + bounce) * inward * normal;
      vec3 normalVelocity = normal * dot(relativeVelocity, normal);
      relativeVelocity = normalVelocity + (relativeVelocity - normalVelocity) * exp(-${C.FRICTION.toFixed(4)} * remaining);
    }
    remaining *= 1.0 - fraction;
    if (remaining <= 0.000001) break;
  }
  position = (simulationFromOrbit * vec4(current, 1.0)).xyz;
  velocity += mat3(simulationFromOrbit) * (relativeVelocity - freeVelocity);
}
`;
