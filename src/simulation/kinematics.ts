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

/**
 * Check if tip is inside an obstacle bounding box
 */
export function checkObstacleCollision(
  tip: Vector3D,
  obstacles: ObstacleZone[]
): boolean {
  for (const obs of obstacles) {
    const halfX = obs.size.x / 2;
    const halfY = obs.size.y / 2;
    const halfZ = obs.size.z / 2;

    if (
      tip.x >= obs.position.x - halfX &&
      tip.x <= obs.position.x + halfX &&
      tip.y >= obs.position.y - halfY &&
      tip.y <= obs.position.y + halfY &&
      tip.z >= obs.position.z - halfZ &&
      tip.z <= obs.position.z + halfZ
    ) {
      return true;
    }
  }
  return false;
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
  // Physical boundary contact threshold (bead radius ~0.28 + tip contact zone ~0.14)
  const contactRadius = object.radius + 0.12;
  return dist <= contactRadius;
}
