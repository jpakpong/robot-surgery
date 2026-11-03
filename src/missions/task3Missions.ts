/**
 * Task 3: Sequential Tri-Color Sorting across Progressive Barriers
 * 1: Move Red object, no barrier (Score = 10)
 * 2: Move Amber object, crossing low barrier (Score = 20)
 * 3: Move Cyan object, crossing high barrier (Score = 20)
 * Strictly performed in order (3 missions total, 50 points total)
 */

import { Mission, GraspableObject, TargetZone, ObstacleZone } from '../types/simulation';
import { distance3D } from '../simulation/kinematics';
import { SIMULATION_CONFIG } from '../simulation/simulationConfig';

const DEST_TOL = SIMULATION_CONFIG.tolerance.destinationReached + 0.15;

// Color Palette for 3 Distinct Objects
export const COLOR_RED = '#ef4444';
export const COLOR_AMBER = '#f59e0b';
export const COLOR_CYAN = '#06b6d4';

// 3 Color Receptacle Target Zones
export const TARGET_RED: TargetZone = {
  id: 'tgt_red_zone',
  name: 'Red Sterile Receptacle',
  position: { x: -1.5, y: -0.1, z: -1.2 },
  radius: 0.5,
  color: COLOR_RED,
  label: 'Red Zone',
};

export const TARGET_AMBER: TargetZone = {
  id: 'tgt_amber_zone',
  name: 'Amber Sterile Receptacle',
  position: { x: 0.0, y: -0.1, z: -1.2 },
  radius: 0.5,
  color: COLOR_AMBER,
  label: 'Amber Zone',
};

export const TARGET_CYAN: TargetZone = {
  id: 'tgt_cyan_zone',
  name: 'Cyan Sterile Receptacle',
  position: { x: 1.5, y: -0.1, z: -1.2 },
  radius: 0.5,
  color: COLOR_CYAN,
  label: 'Cyan Zone',
};

// Barriers
const LOW_BARRIER: ObstacleZone = {
  id: 'barrier_low',
  name: 'Low Anatomical Tissue Barrier',
  position: { x: 0.0, y: -0.15, z: -0.45 },
  size: { x: 4.4, y: 0.45, z: 0.35 },
  color: '#f43f5e',
};

const HIGH_BARRIER: ObstacleZone = {
  id: 'barrier_high',
  name: 'High Critical Tissue Barrier',
  position: { x: 0.0, y: 0.25, z: -0.45 },
  size: { x: 4.4, y: 1.15, z: 0.35 },
  color: '#dc2626',
};

// Base initial objects for Task 3 with radius 0.16 (scaled close to instrument tip)
export const createRedObject = (overrides?: Partial<GraspableObject>): GraspableObject => ({
  id: 'specimen_red',
  name: 'Red Specimen Bead',
  position: { x: -1.5, y: -0.4, z: 0.3 },
  initialPosition: { x: -1.5, y: -0.4, z: 0.3 },
  radius: 0.16,
  color: COLOR_RED,
  isGrasped: false,
  isDelivered: false,
  ...overrides,
});

export const createAmberObject = (overrides?: Partial<GraspableObject>): GraspableObject => ({
  id: 'specimen_amber',
  name: 'Amber Specimen Bead',
  position: { x: 0.0, y: -0.4, z: 0.3 },
  initialPosition: { x: 0.0, y: -0.4, z: 0.3 },
  radius: 0.16,
  color: COLOR_AMBER,
  isGrasped: false,
  isDelivered: false,
  ...overrides,
});

export const createCyanObject = (overrides?: Partial<GraspableObject>): GraspableObject => ({
  id: 'specimen_cyan',
  name: 'Cyan Specimen Bead',
  position: { x: 1.5, y: -0.4, z: 0.3 },
  initialPosition: { x: 1.5, y: -0.4, z: 0.3 },
  radius: 0.16,
  color: COLOR_CYAN,
  isGrasped: false,
  isDelivered: false,
  ...overrides,
});

export const TASK3_MISSIONS: Mission[] = [
  // -------------------------------------------------------------
  // Mission 1: Move Red Object - No Barrier (Score = 10)
  // -------------------------------------------------------------
  {
    id: 't3_m1',
    taskNumber: 3,
    missionNumber: 1,
    title: '1: Move Red Object (No Barrier)',
    shortDescription: 'First in order: Move the Red object into the Red receptacle (No barrier).',
    objective: 'Protocol Sequence 1: Approach the Red specimen on the left, clamp with CLOSE GRIPPER, and deposit into the matching Red receptacle.',
    points: 10,
    initialTipPosition: { x: -1.5, y: 0.5, z: 0.6 },
    initialGripperRatio: 1.0,
    targets: [TARGET_RED, TARGET_AMBER, TARGET_CYAN],
    obstacles: [],
    objects: [
      createRedObject(),
      createAmberObject(),
      createCyanObject(),
    ],
    steps: [
      {
        id: 't3_m1_step1',
        instruction: 'Protocol Sequence 1 of 3: Grasp the RED specimen (left). Position open jaws directly over the Red bead and tap CLOSE GRIPPER.',
        detailedHint: 'Use LEFT, DOWN, and FORWARD to align jaws over the Red bead, then press CLOSE GRIPPER.',
        requiredControl: 'gripper_close',
        highlightObjectId: 'specimen_red',
        isSatisfied: ({ objects, gripperRatio }) => {
          const red = objects?.find((o) => o.id === 'specimen_red');
          return !!red && red.isGrasped && gripperRatio <= 0.2;
        },
        successMessage: 'Red specimen securely clamped! Transfer it into the matching Red receptacle.',
      },
      {
        id: 't3_m1_step2',
        instruction: 'Move the Red specimen into the matching Red Destination Zone (back left). Tap OPEN GRIPPER to deposit.',
        detailedHint: 'Elevate slightly, push FORWARD (-Z) into the Red zone, then tap OPEN GRIPPER.',
        requiredControl: 'gripper_open',
        highlightTargetId: 'tgt_red_zone',
        isSatisfied: ({ objects, targets, gripperRatio }) => {
          const red = objects?.find((o) => o.id === 'specimen_red');
          const tgt = targets.find((t) => t.id === 'tgt_red_zone');
          if (!red || !tgt) return false;
          const inZone = distance3D(red.position, tgt.position) <= DEST_TOL;
          return inZone && !red.isGrasped && gripperRatio >= 0.7;
        },
        successMessage: 'Mission 1 Complete! (+10 PTS) Red specimen safely delivered.',
      },
    ],
  },

  // -------------------------------------------------------------
  // Mission 2: Move Amber Object - Crossing Low Barrier (Score = 20)
  // -------------------------------------------------------------
  {
    id: 't3_m2',
    taskNumber: 3,
    missionNumber: 2,
    title: '2: Move Amber Object (Crossing Low Barrier)',
    shortDescription: 'Second in order: Move the Amber object crossing the low barrier into the Amber receptacle.',
    objective: 'Protocol Sequence 2: Pick up the central Amber specimen, elevate it safely over the low tissue barrier, and deposit into the central Amber receptacle without collision.',
    points: 20,
    initialTipPosition: { x: 0.0, y: 0.5, z: 0.6 },
    initialGripperRatio: 1.0,
    targets: [TARGET_RED, TARGET_AMBER, TARGET_CYAN],
    obstacles: [LOW_BARRIER],
    objects: [
      createRedObject({
        position: { ...TARGET_RED.position },
        isDelivered: true,
      }),
      createAmberObject(),
      createCyanObject(),
    ],
    steps: [
      {
        id: 't3_m2_step1',
        instruction: 'Protocol Sequence 2 of 3: Grasp the AMBER specimen (center). Position jaws over the Amber bead and tap CLOSE GRIPPER.',
        detailedHint: 'Center the tip over the Amber bead and press CLOSE GRIPPER.',
        requiredControl: 'gripper_close',
        highlightObjectId: 'specimen_amber',
        isSatisfied: ({ objects, gripperRatio }) => {
          const amber = objects?.find((o) => o.id === 'specimen_amber');
          return !!amber && amber.isGrasped && gripperRatio <= 0.2;
        },
        successMessage: 'Amber specimen secured! Elevate safely above the pink low barrier.',
      },
      {
        id: 't3_m2_step2',
        instruction: 'Elevate over the low tissue barrier, navigate into depth, and deposit into the matching Amber receptacle. Tap OPEN GRIPPER.',
        detailedHint: 'Press UP to elevate over the barrier, then push FORWARD into the Amber zone and tap OPEN GRIPPER.',
        requiredControl: 'gripper_open',
        highlightTargetId: 'tgt_amber_zone',
        isSatisfied: ({ objects, targets, gripperRatio, hasCollided }) => {
          if (hasCollided) return false;
          const amber = objects?.find((o) => o.id === 'specimen_amber');
          const tgt = targets.find((t) => t.id === 'tgt_amber_zone');
          if (!amber || !tgt) return false;
          const inZone = distance3D(amber.position, tgt.position) <= DEST_TOL;
          return inZone && !amber.isGrasped && gripperRatio >= 0.7;
        },
        successMessage: 'Mission 2 Complete! (+20 PTS) Amber specimen successfully crossed the low barrier.',
      },
    ],
  },

  // -------------------------------------------------------------
  // Mission 3: Move Cyan Object - Crossing High Barrier (Score = 20)
  // -------------------------------------------------------------
  {
    id: 't3_m3',
    taskNumber: 3,
    missionNumber: 3,
    title: '3: Move Cyan Object (Crossing High Barrier)',
    shortDescription: 'Third in order: Move the Cyan object crossing the high barrier into the Cyan receptacle.',
    objective: 'Protocol Sequence 3: Pick up the Cyan specimen on the right, elevate high above the tall anatomical barrier, and deposit into the Cyan receptacle.',
    points: 20,
    initialTipPosition: { x: 1.5, y: 0.8, z: 0.6 },
    initialGripperRatio: 1.0,
    targets: [TARGET_RED, TARGET_AMBER, TARGET_CYAN],
    obstacles: [HIGH_BARRIER],
    objects: [
      createRedObject({
        position: { ...TARGET_RED.position },
        isDelivered: true,
      }),
      createAmberObject({
        position: { ...TARGET_AMBER.position },
        isDelivered: true,
      }),
      createCyanObject(),
    ],
    steps: [
      {
        id: 't3_m3_step1',
        instruction: 'Protocol Sequence 3 of 3: Grasp the CYAN specimen (right). Align instrument jaws over the Cyan bead and tap CLOSE GRIPPER.',
        detailedHint: 'Position over the Cyan bead on the right and press CLOSE GRIPPER.',
        requiredControl: 'gripper_close',
        highlightObjectId: 'specimen_cyan',
        isSatisfied: ({ objects, gripperRatio }) => {
          const cyan = objects?.find((o) => o.id === 'specimen_cyan');
          return !!cyan && cyan.isGrasped && gripperRatio <= 0.2;
        },
        successMessage: 'Cyan specimen captured! Elevate high to clear the tall anatomical barrier.',
      },
      {
        id: 't3_m3_step2',
        instruction: 'Press and hold UP to elevate high above the red barrier, move FORWARD into depth, and deposit into the Cyan receptacle. Tap OPEN GRIPPER.',
        detailedHint: 'Lift high (Y > 0.85) to clear the top of the barrier, drive into the Cyan zone, and tap OPEN GRIPPER.',
        requiredControl: 'gripper_open',
        highlightTargetId: 'tgt_cyan_zone',
        isSatisfied: ({ objects, targets, gripperRatio, hasCollided }) => {
          if (hasCollided) return false;
          const cyan = objects?.find((o) => o.id === 'specimen_cyan');
          const tgt = targets.find((t) => t.id === 'tgt_cyan_zone');
          if (!cyan || !tgt) return false;
          const inZone = distance3D(cyan.position, tgt.position) <= DEST_TOL;
          return inZone && !cyan.isGrasped && gripperRatio >= 0.7;
        },
        successMessage: 'Mission 3 Complete! (+20 PTS) Full tri-color sequential sorting mastered!',
      },
    ],
  },
];
