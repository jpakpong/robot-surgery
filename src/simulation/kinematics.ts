/**
 * Surgical Robotics Kinematics
 * Implements Cartesian-to-Joint mapping (Inverse Kinematics) and
 * Joint-to-Cartesian transforms (Forward Kinematics) with Remote Center of Motion (RCM).
 */

import { JointAngles, Vector3D, ObstacleZone } from '../types/simulation';
import { SIMULATION_CONFIG } from './simulationConfig';

export interface FKResult {
  basePos: Vector3D;
  shoulderPos: Vector3D;
  elbowPos: Vector3D;
  wristPos: Vector3D;
  trocarPos: Vector3D;
  tipPos: Vector3D;
  instrumentEntryPos: Vector3D;
}

/**
 * Clamp a number between min and max
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * 3D Euclidean distance
 */
export function distance3D(a: Vector3D, b: Vector3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Clamp cartesian position to allowed workspace
 */
export function clampToWorkspace(pos: Vector3D): Vector3D {
  const ws = SIMULATION_CONFIG.workspace;
  return {
    x: clamp(pos.x, ws.xMin, ws.xMax),
    y: clamp(pos.y, ws.yMin, ws.yMax),
    z: clamp(pos.z, ws.zMin, ws.zMax),
  };
}

/**
 * Compute 6-DOF joint angles from the current Cartesian instrument tip position.
 * Respects the Remote Center of Motion (RCM) trocar port.
 */
export function solveInverseKinematics(
  tip: Vector3D,
  roll: number = 0
): JointAngles {
  const trocar = SIMULATION_CONFIG.trocarPort;
  const limits = SIMULATION_CONFIG.jointLimits;

  // Vector from trocar port to instrument tip
  const dx = tip.x - trocar.x;
  const dy = tip.y - trocar.y;
  const dz = tip.z - trocar.z;
  const lengthToTip = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Azimuth (yaw) of the instrument shaft
  const shaftYaw = Math.atan2(dx, -dz);
  // Elevation (pitch) of the instrument shaft relative to horizontal
  const horizontalDist = Math.sqrt(dx * dx + dz * dz);
  const shaftPitch = Math.atan2(dy, horizontalDist);

  // Base yaw tracks the general working quadrant
  const rawBaseYaw = shaftYaw * 0.45;
  const baseYaw = clamp(rawBaseYaw, limits.baseYaw.min, limits.baseYaw.max);

  // Shoulder and elbow articulators hold the instrument carriage above the trocar
  const rawShoulderPitch = 0.25 - shaftPitch * 0.35 + (tip.y * 0.08);
  const shoulderPitch = clamp(rawShoulderPitch, limits.shoulderPitch.min, limits.shoulderPitch.max);

  const rawElbowPitch = -0.55 + shaftPitch * 0.45 - (lengthToTip * 0.04);
  const elbowPitch = clamp(rawElbowPitch, limits.elbowPitch.min, limits.elbowPitch.max);

  // EndoWrist distal micro-joints provide fine dexterous articulation at the tip
  const wristPitch = clamp(-shaftPitch * 0.6 + (tip.y * 0.15), limits.wristPitch.min, limits.wristPitch.max);
  const wristYaw = clamp(shaftYaw * 0.5, limits.wristYaw.min, limits.wristYaw.max);
  const instrumentRoll = clamp(roll + (tip.x * 0.12), limits.instrumentRoll.min, limits.instrumentRoll.max);

  return {
    baseYaw,
    shoulderPitch,
    elbowPitch,
    wristPitch,
    wristYaw,
    instrumentRoll,
  };
}

/**
 * Compute forward kinematics for all links and joint pivots of the robotic arm
 */
export function solveForwardKinematics(
  joints: JointAngles,
  tipPos: Vector3D
): FKResult {
  const geom = SIMULATION_CONFIG.robotGeometry;
  const trocar = SIMULATION_CONFIG.trocarPort;

  // Base mount position in the operating theater (offset from patient bed)
  const basePos: Vector3D = { x: -2.8, y: 0.0, z: -3.8 };

  // Setup column top
  const columnTop: Vector3D = {
    x: basePos.x,
    y: basePos.y + geom.columnHeight,
    z: basePos.z,
  };

  // Shoulder joint rotates with baseYaw
  const shoulderPos: Vector3D = {
    x: columnTop.x + Math.sin(joints.baseYaw) * 0.8,
    y: columnTop.y + 0.4,
    z: columnTop.z + Math.cos(joints.baseYaw) * 0.8,
  };

  // Elbow joint based on shoulder elevation
  const elbowPos: Vector3D = {
    x: shoulderPos.x + Math.sin(joints.baseYaw) * (geom.upperArmLength * Math.cos(joints.shoulderPitch)),
    y: shoulderPos.y + (geom.upperArmLength * Math.sin(joints.shoulderPitch)),
    z: shoulderPos.z + Math.cos(joints.baseYaw) * (geom.upperArmLength * Math.cos(joints.shoulderPitch)),
  };

  // Instrument carriage wrist assembly connects to the trocar line
  const dirX = tipPos.x - trocar.x;
  const dirY = tipPos.y - trocar.y;
  const dirZ = tipPos.z - trocar.z;
  const len = Math.max(0.1, Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ));
  const normX = dirX / len;
  const normY = dirY / len;
  const normZ = dirZ / len;

  // Instrument entry point (drive mechanism behind trocar)
  const entryDist = 2.4;
  const instrumentEntryPos: Vector3D = {
    x: trocar.x - normX * entryDist,
    y: trocar.y - normY * entryDist,
    z: trocar.z - normZ * entryDist,
  };

  const wristPos: Vector3D = {
    x: instrumentEntryPos.x,
    y: instrumentEntryPos.y,
    z: instrumentEntryPos.z,
  };

  return {
    basePos,
    shoulderPos,
    elbowPos,
    wristPos,
    trocarPos: trocar,
    tipPos,
    instrumentEntryPos,
  };
}

export const FLOOR_SURFACE_Y = -1.12; // Surgical cavity floor level (tip cannot penetrate below this)
export const TIP_COLLISION_MARGIN = 0.08; // Physical contact margin around instrument jaws/tip

export interface CollisionResolution {
  resolvedPosition: Vector3D;
  hitFloor: boolean;
  hitBarrier: boolean;
  contactedObstacleName?: string;
}

/**
 * Checks if a 3D position penetrates an obstacle bounding box (with optional margin)
 */
export function isPointInsideObstacle(
  pos: Vector3D,
  obs: ObstacleZone,
  margin: number = TIP_COLLISION_MARGIN
): boolean {
  const halfX = obs.size.x / 2 + margin;
  const halfY = obs.size.y / 2 + margin;
  const halfZ = obs.size.z / 2 + margin;

  return (
    pos.x >= obs.position.x - halfX &&
    pos.x <= obs.position.x + halfX &&
    pos.y >= obs.position.y - halfY &&
    pos.y <= obs.position.y + halfY &&
    pos.z >= obs.position.z - halfZ &&
    pos.z <= obs.position.z + halfZ
  );
}

/**
 * Check if tip is inside any obstacle bounding box
 */
export function checkObstacleCollision(
  tip: Vector3D,
  obstacles: ObstacleZone[]
): boolean {
  for (const obs of obstacles) {
    if (isPointInsideObstacle(tip, obs, TIP_COLLISION_MARGIN)) {
      return true;
    }
  }
  return false;
}

/**
 * Rigid collision resolution:
 * 1. Strictly prevents the tip from passing through the floor (Y cannot go below FLOOR_SURFACE_Y).
 * 2. Strictly prevents the tip from passing through any barrier/obstacle box (rigid AABB collision blocking).
 * 3. Permits sliding along non-blocked axes so the tool does not completely seize.
 * Returns the resolved non-penetrating position and collision status flags.
 */
export function resolveTipCollisions(
  prevPos: Vector3D,
  candidatePos: Vector3D,
  obstacles: ObstacleZone[] = []
): CollisionResolution {
  let hitFloor = false;
  let hitBarrier = false;
  let contactedObstacleName: string | undefined;

  const ws = SIMULATION_CONFIG.workspace;

  // 1. Initial clamp to workspace and floor plane
  const desired: Vector3D = {
    x: clamp(candidatePos.x, ws.xMin, ws.xMax),
    y: clamp(candidatePos.y, FLOOR_SURFACE_Y, ws.yMax),
    z: clamp(candidatePos.z, ws.zMin, ws.zMax),
  };

  // Flag floor collision if candidate penetrates or rests on the floor
  if (candidatePos.y <= FLOOR_SURFACE_Y || Math.abs(desired.y - FLOOR_SURFACE_Y) < 0.005) {
    hitFloor = true;
    desired.y = FLOOR_SURFACE_Y;
  }

  // If no obstacle barriers exist, enforce floor barrier only
  if (!obstacles || obstacles.length === 0) {
    return {
      resolvedPosition: desired,
      hitFloor,
      hitBarrier: false,
    };
  }

  // 2. Axis-by-axis barrier resolution to allow smooth surface sliding while preventing pass-through
  const resolved: Vector3D = { ...prevPos };
  if (resolved.y < FLOOR_SURFACE_Y) {
    resolved.y = FLOOR_SURFACE_Y;
  }

  // --- Test X-axis movement ---
  const testX: Vector3D = { x: desired.x, y: resolved.y, z: resolved.z };
  let xCollided = false;
  for (const obs of obstacles) {
    if (isPointInsideObstacle(testX, obs)) {
      xCollided = true;
      hitBarrier = true;
      contactedObstacleName = obs.name;
      const halfX = obs.size.x / 2 + TIP_COLLISION_MARGIN;
      if (desired.x > prevPos.x) {
        resolved.x = Math.min(resolved.x, obs.position.x - halfX);
      } else if (desired.x < prevPos.x) {
        resolved.x = Math.max(resolved.x, obs.position.x + halfX);
      }
      break;
    }
  }
  if (!xCollided) {
    resolved.x = desired.x;
  }

  // --- Test Y-axis movement (including floor check) ---
  const testY: Vector3D = { x: resolved.x, y: desired.y, z: resolved.z };
  let yCollided = false;
  if (desired.y <= FLOOR_SURFACE_Y) {
    hitFloor = true;
    resolved.y = FLOOR_SURFACE_Y;
  } else {
    for (const obs of obstacles) {
      if (isPointInsideObstacle(testY, obs)) {
        yCollided = true;
        hitBarrier = true;
        contactedObstacleName = obs.name;
        const halfY = obs.size.y / 2 + TIP_COLLISION_MARGIN;
        if (desired.y > prevPos.y) {
          resolved.y = Math.min(resolved.y, obs.position.y - halfY);
        } else if (desired.y < prevPos.y) {
          resolved.y = Math.max(resolved.y, obs.position.y + halfY);
        }
        break;
      }
    }
    if (!yCollided) {
      resolved.y = desired.y;
    }
  }

  // --- Test Z-axis movement ---
  const testZ: Vector3D = { x: resolved.x, y: resolved.y, z: desired.z };
  let zCollided = false;
  for (const obs of obstacles) {
    if (isPointInsideObstacle(testZ, obs)) {
      zCollided = true;
      hitBarrier = true;
      contactedObstacleName = obs.name;
      const halfZ = obs.size.z / 2 + TIP_COLLISION_MARGIN;
      if (desired.z > prevPos.z) {
        resolved.z = Math.min(resolved.z, obs.position.z - halfZ);
      } else if (desired.z < prevPos.z) {
        resolved.z = Math.max(resolved.z, obs.position.z + halfZ);
      }
      break;
    }
  }
  if (!zCollided) {
    resolved.z = desired.z;
  }

  // 3. Absolute penetration safeguard: project out if still inside any obstacle bounding box
  for (const obs of obstacles) {
    if (isPointInsideObstacle(resolved, obs)) {
      hitBarrier = true;
      contactedObstacleName = obs.name;
      const halfX = obs.size.x / 2 + TIP_COLLISION_MARGIN;
      const halfY = obs.size.y / 2 + TIP_COLLISION_MARGIN;
      const halfZ = obs.size.z / 2 + TIP_COLLISION_MARGIN;

      const dLeft = Math.abs(resolved.x - (obs.position.x - halfX));
      const dRight = Math.abs(resolved.x - (obs.position.x + halfX));
      const dBottom = Math.abs(resolved.y - (obs.position.y - halfY));
      const dTop = Math.abs(resolved.y - (obs.position.y + halfY));
      const dFront = Math.abs(resolved.z - (obs.position.z - halfZ));
      const dBack = Math.abs(resolved.z - (obs.position.z + halfZ));

      const minPen = Math.min(dLeft, dRight, dBottom, dTop, dFront, dBack);
      if (minPen === dLeft) resolved.x = obs.position.x - halfX;
      else if (minPen === dRight) resolved.x = obs.position.x + halfX;
      else if (minPen === dBottom) resolved.y = obs.position.y - halfY;
      else if (minPen === dTop) resolved.y = obs.position.y + halfY;
      else if (minPen === dFront) resolved.z = obs.position.z - halfZ;
      else resolved.z = obs.position.z + halfZ;
    }
  }

  // 4. Hard floor enforcement: ensure Y is strictly never below floor level
  if (resolved.y <= FLOOR_SURFACE_Y) {
    resolved.y = FLOOR_SURFACE_Y;
    hitFloor = true;
  }

  return {
    resolvedPosition: resolved,
    hitFloor,
    hitBarrier,
    contactedObstacleName,
  };
}

/**
 * Check if the instrument tip has physical contact with a specimen object.
 * Returns true if tip is touching or penetrating the object surface without grasping.
 */
export function checkObjectPhysicalContact(
  tip: Vector3D,
  object?: { position: Vector3D; radius: number; isGrasped: boolean }
): boolean {
  if (!object) return false;
  const dist = distance3D(tip, object.position);
  // Physical boundary contact threshold (bead radius ~0.16 + tip contact zone ~0.12)
  const contactRadius = object.radius + 0.12;
  return dist <= contactRadius;
}

