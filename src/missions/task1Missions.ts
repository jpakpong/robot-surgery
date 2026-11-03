/**
 * Task 1: Basic Instrument Control Missions (5 missions)
 * Introduces medical students to directional robotic instrument navigation
 */

import { Mission } from '../types/simulation';
import { distance3D } from '../simulation/kinematics';
import { SIMULATION_CONFIG } from '../simulation/simulationConfig';

const TOL = SIMULATION_CONFIG.tolerance.targetReached;

export const TASK1_MISSIONS: Mission[] = [
  // Mission 1: Move Right
  {
    id: 't1_m1',
    taskNumber: 1,
    missionNumber: 1,
    title: 'Move Right',
    shortDescription: 'Navigate the instrument tip laterally to the right target.',
    objective: 'Press and hold the RIGHT directional control to guide the instrument into the right target zone.',
    points: 10,
    initialTipPosition: { x: 0.0, y: 0.5, z: 0.0 },
    initialGripperRatio: 0.5,
    targets: [
      {
        id: 't1_m1_tgt_right',
        name: 'Right Target Zone',
        position: { x: 2.2, y: 0.5, z: 0.0 },
        radius: 0.45,
        color: '#10b981',
        label: 'Target A (Right)',
      },
    ],
    steps: [
      {
        id: 'step_right',
        instruction: 'Locate the green target on the right. Press and hold RIGHT to guide the instrument tip into the target zone.',
        detailedHint: 'Hold the RIGHT button until the instrument tip enters the glowing green target sphere.',
        requiredControl: 'right',
        highlightTargetId: 't1_m1_tgt_right',
        isSatisfied: ({ tipPos, targets }) => {
          const tgt = targets.find((t) => t.id === 't1_m1_tgt_right');
          return !!tgt && distance3D(tipPos, tgt.position) <= TOL;
        },
        successMessage: 'Great! You have reached the right target.',
      },
    ],
  },

  // Mission 2: Move Left
  {
    id: 't1_m2',
    taskNumber: 1,
    missionNumber: 2,
    title: 'Move Left',
    shortDescription: 'Navigate the instrument tip laterally to the left target.',
    objective: 'Press and hold the LEFT directional control to guide the instrument into the left target zone.',
    points: 10,
    initialTipPosition: { x: 1.5, y: 0.5, z: 0.0 },
    initialGripperRatio: 0.5,
    targets: [
      {
        id: 't1_m2_tgt_left',
        name: 'Left Target Zone',
        position: { x: -2.2, y: 0.5, z: 0.0 },
        radius: 0.45,
        color: '#10b981',
        label: 'Target B (Left)',
      },
    ],
    steps: [
      {
        id: 'step_left',
        instruction: 'Locate the green target on the left. Press and hold LEFT to guide the instrument tip into the target zone.',
        detailedHint: 'Press and hold the LEFT button. Release when you hear the chime.',
        requiredControl: 'left',
        highlightTargetId: 't1_m2_tgt_left',
        isSatisfied: ({ tipPos, targets }) => {
          const tgt = targets.find((t) => t.id === 't1_m2_tgt_left');
          return !!tgt && distance3D(tipPos, tgt.position) <= TOL;
        },
        successMessage: 'Great! You have reached the left target.',
      },
    ],
  },

  // Mission 3: Move Up and Down
  {
    id: 't1_m3',
    taskNumber: 1,
    missionNumber: 3,
    title: 'Move Up and Down',
    shortDescription: 'Master vertical instrument elevation within the surgical space.',
    objective: 'First elevate the instrument to the upper target, then descend to the lower target.',
    points: 10,
    initialTipPosition: { x: 0.0, y: 0.4, z: 0.0 },
    initialGripperRatio: 0.5,
    targets: [
      {
        id: 't1_m3_tgt_up',
        name: 'Upper Target Zone',
        position: { x: 0.0, y: 1.9, z: 0.0 },
        radius: 0.45,
        color: '#3b82f6',
        label: 'Elevation Target',
      },
      {
        id: 't1_m3_tgt_down',
        name: 'Lower Target Zone',
        position: { x: 0.0, y: -0.8, z: 0.0 },
        radius: 0.45,
        color: '#10b981',
        label: 'Base Target',
      },
    ],
    steps: [
      {
        id: 'step_up',
        instruction: 'Identify the blue upper target. Press and hold UP to elevate the instrument tip.',
        detailedHint: 'Press and hold the UP button until the instrument tip enters the blue target.',
        requiredControl: 'up',
        highlightTargetId: 't1_m3_tgt_up',
        isSatisfied: ({ tipPos, targets }) => {
          const tgt = targets.find((t) => t.id === 't1_m3_tgt_up');
          return !!tgt && distance3D(tipPos, tgt.position) <= TOL;
        },
        successMessage: 'Upper target reached! Now prepare to descend.',
      },
      {
        id: 'step_down',
        instruction: 'Identify the green lower target. Press and hold DOWN until the target is reached.',
        detailedHint: 'Press and hold the DOWN button to lower the instrument.',
        requiredControl: 'down',
        highlightTargetId: 't1_m3_tgt_down',
        isSatisfied: ({ tipPos, targets }) => {
          const tgt = targets.find((t) => t.id === 't1_m3_tgt_down');
          return !!tgt && distance3D(tipPos, tgt.position) <= TOL;
        },
        successMessage: 'Excellent! You can control vertical movement.',
      },
    ],
  },

  // Mission 4: Move Forward and Backward
  {
    id: 't1_m4',
    taskNumber: 1,
    missionNumber: 4,
    title: 'Move Forward and Backward',
    shortDescription: 'Understand depth perception and instrument travel along the camera axis.',
    objective: 'Drive the instrument forward into depth, then retract backward toward the near plane.',
    points: 10,
    initialTipPosition: { x: 0.0, y: 0.5, z: 0.0 },
    initialGripperRatio: 0.5,
    targets: [
      {
        id: 't1_m4_tgt_forward',
        name: 'Far Target Zone',
        position: { x: 0.0, y: 0.5, z: -2.0 },
        radius: 0.45,
        color: '#6366f1',
        label: 'Far Target (Depth)',
      },
      {
        id: 't1_m4_tgt_backward',
        name: 'Near Target Zone',
        position: { x: 0.0, y: 0.5, z: 1.8 },
        radius: 0.45,
        color: '#10b981',
        label: 'Near Target',
      },
    ],
    steps: [
      {
        id: 'step_forward',
        instruction: 'Identify the purple far target in the deep surgical field. Press and hold FORWARD to push into depth.',
        detailedHint: 'Press and hold FORWARD. Observe how the instrument tip advances away from the endoscopic camera.',
        requiredControl: 'forward',
        highlightTargetId: 't1_m4_tgt_forward',
        isSatisfied: ({ tipPos, targets }) => {
          const tgt = targets.find((t) => t.id === 't1_m4_tgt_forward');
          return !!tgt && distance3D(tipPos, tgt.position) <= TOL;
        },
        successMessage: 'Far depth target reached! Now retract backward.',
      },
      {
        id: 'step_backward',
        instruction: 'Identify the green near target. Press and hold BACKWARD until the near target is reached.',
        detailedHint: 'Press and hold BACKWARD to retract the instrument toward the camera.',
        requiredControl: 'backward',
        highlightTargetId: 't1_m4_tgt_backward',
        isSatisfied: ({ tipPos, targets }) => {
          const tgt = targets.find((t) => t.id === 't1_m4_tgt_backward');
          return !!tgt && distance3D(tipPos, tgt.position) <= TOL;
        },
        successMessage: 'Excellent! You can control instrument depth.',
      },
    ],
  },

  // Mission 5: Combined Movement
  {
    id: 't1_m5',
    taskNumber: 1,
    missionNumber: 5,
    title: 'Combined Movement',
    shortDescription: 'Navigate multi-axis trajectories around anatomical obstacle barriers.',
    objective: 'Reach the upper-right surgical target by combining horizontal, vertical, and depth movements.',
    points: 10,
    initialTipPosition: { x: -2.0, y: -0.6, z: 0.5 },
    initialGripperRatio: 0.5,
    targets: [
      {
        id: 't1_m5_tgt_final',
        name: 'Final Target Zone',
        position: { x: 2.0, y: 1.6, z: -0.8 },
        radius: 0.48,
        color: '#10b981',
        label: 'Surgical Goal',
      },
    ],
    obstacles: [
      {
        id: 't1_m5_obs_center',
        name: 'Sensitive Tissue Barrier',
        position: { x: 0.0, y: 0.4, z: 0.0 },
        size: { x: 1.2, y: 1.6, z: 1.4 },
        color: '#ef4444',
      },
    ],
    steps: [
      {
        id: 'step_combined',
        instruction: 'Identify the glowing goal on the upper right. Use LEFT/RIGHT, UP/DOWN, and FORWARD/BACKWARD to navigate around the red barrier.',
        detailedHint: 'Elevate over or navigate around the red tissue barrier to reach the final green target.',
        highlightTargetId: 't1_m5_tgt_final',
        isSatisfied: ({ tipPos, targets, hasCollided }) => {
          const tgt = targets.find((t) => t.id === 't1_m5_tgt_final');
          return !hasCollided && !!tgt && distance3D(tipPos, tgt.position) <= TOL;
        },
        successMessage: 'Well done! You have completed Basic Instrument Control.',
      },
    ],
  },
];
