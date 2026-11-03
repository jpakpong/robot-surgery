/**
 * Task 2: Object Manipulation Missions (5 missions)
 * Teaches robotic surgical grasping, lifting, transfer, and release inside the surgical workspace
 */

import { Mission } from '../types/simulation';
import { distance3D } from '../simulation/kinematics';
import { SIMULATION_CONFIG } from '../simulation/simulationConfig';

const GRASP_DIST = SIMULATION_CONFIG.tolerance.graspDistance;
const LIFT_HEIGHT = SIMULATION_CONFIG.tolerance.liftHeight;
const DEST_TOL = SIMULATION_CONFIG.tolerance.destinationReached;

export const TASK2_MISSIONS: Mission[] = [
  // Mission 1: Approach Object
  {
    id: 't2_m1',
    taskNumber: 2,
    missionNumber: 1,
    title: 'Approach Object',
    shortDescription: 'Guide the surgical gripper jaws into close proximity with the specimen.',
    objective: 'Maneuver the instrument tip until it is positioned within the yellow grasping zone of the surgical bead.',
    points: 10,
    initialTipPosition: { x: -1.8, y: 1.2, z: 0.8 },
    initialGripperRatio: 1.0, // Open
    targets: [],
    object: {
      id: 'specimen_bead',
      name: 'Surgical Specimen Bead',
      position: { x: 0.0, y: -0.4, z: 0.0 },
      initialPosition: { x: 0.0, y: -0.4, z: 0.0 },
      radius: 0.16,
      color: '#f59e0b', // Amber/gold
      isGrasped: false,
      isDelivered: false,
    },
    steps: [
      {
        id: 'step_approach',
        instruction: 'Locate the yellow specimen bead. Use the directional controls to position the open instrument jaws directly over the object.',
        detailedHint: 'Move the instrument tip close to the bead until the grasping alignment beacon activates.',
        highlightObjectId: 'specimen_bead',
        isSatisfied: ({ tipPos, object }) => {
          if (!object) return false;
          return distance3D(tipPos, object.position) <= GRASP_DIST;
        },
        successMessage: 'Object reached! The gripper is in position and ready to grasp.',
      },
    ],
  },

  // Mission 2: Grasp Object
  {
    id: 't2_m2',
    taskNumber: 2,
    missionNumber: 2,
    title: 'Grasp Object',
    shortDescription: 'Actuate the robotic gripper to securely clamp the surgical specimen.',
    objective: 'Confirm proximity, then trigger CLOSE GRIPPER to capture the object.',
    points: 10,
    initialTipPosition: { x: 0.0, y: -0.25, z: 0.0 },
    initialGripperRatio: 1.0, // Open
    targets: [],
    object: {
      id: 'specimen_bead',
      name: 'Surgical Specimen Bead',
      position: { x: 0.0, y: -0.4, z: 0.0 },
      initialPosition: { x: 0.0, y: -0.4, z: 0.0 },
      radius: 0.16,
      color: '#f59e0b',
      isGrasped: false,
      isDelivered: false,
    },
    steps: [
      {
        id: 'step_close_jaws',
        instruction: 'The instrument is aligned with the bead. Tap CLOSE GRIPPER to clamp the jaws securely onto the specimen.',
        detailedHint: 'Press CLOSE GRIPPER on the control panel below.',
        requiredControl: 'gripper_close',
        highlightObjectId: 'specimen_bead',
        isSatisfied: ({ object, gripperRatio }) => {
          return !!object && object.isGrasped && gripperRatio <= 0.15;
        },
        successMessage: 'Object successfully grasped! The specimen is now locked in the jaws.',
      },
    ],
  },

  // Mission 3: Lift Object
  {
    id: 't2_m3',
    taskNumber: 2,
    missionNumber: 3,
    title: 'Lift Object',
    shortDescription: 'Safely elevate the captured specimen away from the underlying surgical bed.',
    objective: 'Hold UP to lift the specimen to the designated target height (above 1.4 units).',
    points: 10,
    initialTipPosition: { x: 0.0, y: -0.3, z: 0.0 },
    initialGripperRatio: 0.0, // Closed
    targets: [
      {
        id: 't2_m3_lift_zone',
        name: 'Target Elevation Plane',
        position: { x: 0.0, y: 1.5, z: 0.0 },
        radius: 0.5,
        color: '#3b82f6',
        label: 'Target Lift Height (Y ≥ 1.4)',
      },
    ],
    object: {
      id: 'specimen_bead',
      name: 'Surgical Specimen Bead',
      position: { x: 0.0, y: -0.3, z: 0.0 },
      initialPosition: { x: 0.0, y: -0.4, z: 0.0 },
      radius: 0.16,
      color: '#f59e0b',
      isGrasped: true, // Already grasped from prior mission
      isDelivered: false,
    },
    steps: [
      {
        id: 'step_lift',
        instruction: 'Identify the required lifting height ring. Press and hold UP to elevate the captured object.',
        detailedHint: 'Press and hold UP until the specimen enters the blue elevation ring.',
        requiredControl: 'up',
        highlightTargetId: 't2_m3_lift_zone',
        isSatisfied: ({ object }) => {
          return !!object && object.isGrasped && object.position.y >= LIFT_HEIGHT;
        },
        successMessage: 'Object lifted successfully! Clean surgical elevation achieved.',
      },
    ],
  },

  // Mission 4: Transfer Object
  {
    id: 't2_m4',
    taskNumber: 2,
    missionNumber: 4,
    title: 'Transfer Object',
    shortDescription: 'Transport the suspended specimen across the field into the delivery receptacle.',
    objective: 'Translate horizontally and in depth to position the object inside the green delivery zone.',
    points: 10,
    initialTipPosition: { x: 0.0, y: 1.5, z: 0.0 },
    initialGripperRatio: 0.0, // Closed
    destinationZone: {
      id: 't2_dest_tray',
      name: 'Sterile Delivery Tray',
      position: { x: 2.1, y: 0.2, z: -1.2 },
      radius: 0.55,
      color: '#10b981',
      label: 'Delivery Receptacle',
    },
    targets: [
      {
        id: 't2_dest_tray',
        name: 'Sterile Delivery Tray',
        position: { x: 2.1, y: 0.2, z: -1.2 },
        radius: 0.55,
        color: '#10b981',
        label: 'Delivery Zone',
      },
    ],
    object: {
      id: 'specimen_bead',
      name: 'Surgical Specimen Bead',
      position: { x: 0.0, y: 1.5, z: 0.0 },
      initialPosition: { x: 0.0, y: -0.4, z: 0.0 },
      radius: 0.16,
      color: '#f59e0b',
      isGrasped: true,
      isDelivered: false,
    },
    steps: [
      {
        id: 'step_transfer',
        instruction: 'Identify the green delivery receptacle on the right. Maneuver horizontally and into depth while keeping the object attached.',
        detailedHint: 'Use RIGHT and FORWARD to transfer the object directly over the green delivery ring.',
        requiredControl: 'right',
        highlightTargetId: 't2_dest_tray',
        isSatisfied: ({ object, targets }) => {
          const dest = targets.find((t) => t.id === 't2_dest_tray');
          if (!dest || !object || !object.isGrasped) return false;
          return distance3D(object.position, dest.position) <= DEST_TOL;
        },
        successMessage: 'Object successfully transferred! Positioned over delivery receptacle.',
      },
    ],
  },

  // Mission 5: Release Object
  {
    id: 't2_m5',
    taskNumber: 2,
    missionNumber: 5,
    title: 'Release Object',
    shortDescription: 'Safely disengage jaws to deposit the specimen inside the destination receptacle.',
    objective: 'Confirm the specimen is positioned inside the delivery zone, then tap OPEN GRIPPER.',
    points: 10,
    initialTipPosition: { x: 2.1, y: 0.2, z: -1.2 },
    initialGripperRatio: 0.0, // Closed
    destinationZone: {
      id: 't2_dest_tray',
      name: 'Sterile Delivery Tray',
      position: { x: 2.1, y: 0.2, z: -1.2 },
      radius: 0.55,
      color: '#10b981',
      label: 'Delivery Zone',
    },
    targets: [
      {
        id: 't2_dest_tray',
        name: 'Sterile Delivery Tray',
        position: { x: 2.1, y: 0.2, z: -1.2 },
        radius: 0.55,
        color: '#10b981',
        label: 'Delivery Zone',
      },
    ],
    object: {
      id: 'specimen_bead',
      name: 'Surgical Specimen Bead',
      position: { x: 2.1, y: 0.2, z: -1.2 },
      initialPosition: { x: 0.0, y: -0.4, z: 0.0 },
      radius: 0.16,
      color: '#f59e0b',
      isGrasped: true,
      isDelivered: false,
    },
    steps: [
      {
        id: 'step_release',
        instruction: 'The object is safely aligned above the sterile delivery tray. Tap OPEN GRIPPER to release the specimen.',
        detailedHint: 'Press OPEN GRIPPER to disengage the jaws.',
        requiredControl: 'gripper_open',
        highlightTargetId: 't2_dest_tray',
        isSatisfied: ({ object, gripperRatio, targets }) => {
          const dest = targets.find((t) => t.id === 't2_dest_tray');
          if (!dest || !object) return false;
          // Gripper must be opened and object must reside inside destination zone
          const inZone = distance3D(object.position, dest.position) <= DEST_TOL + 0.2;
          return inZone && !object.isGrasped && gripperRatio >= 0.7;
        },
        successMessage: 'Congratulations! You have completed Object Manipulation.',
      },
    ],
  },
];
