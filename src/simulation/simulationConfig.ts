/**
 * Configuration for Surgical Robotics Simulation
 * Inspired by da Vinci 5 patient-side cart and EndoWrist kinematics
 */

import { Vector3D } from '../types/simulation';

export const SIMULATION_CONFIG = {
  // Surgical Workspace limits (in virtual decimeters/units)
  workspace: {
    xMin: -3.2,
    xMax: 3.2,
    yMin: -1.12, // Physical floor boundary (cavity floor surface at -1.12 to -1.20)
    yMax: 2.4,
    zMin: -2.8,
    zMax: 2.8,
  },


  // Remote Center of Motion (RCM) / Trocar Cannula Port location
  // In robotic surgery, the instrument shaft pivots around this stationary incision point
  trocarPort: {
    x: 0,
    y: 4.2,
    z: 0.2,
  } as Vector3D,

  // Speeds in units per second
  speed: {
    normal: 2.2,
    fine: 1.0,
  },

  // Interpolation smoothing factor (higher = crisper, lower = smoother)
  smoothFactor: 14.0,

  // Gripper animation speed (units per second from 0 to 1)
  gripperSpeed: 3.2,

  // Tolerances
  tolerance: {
    targetReached: 0.45,   // Distance threshold to enter target sphere
    graspDistance: 0.38,   // Proximity required to close jaws around object (closely matches ball & jaw scale)
    liftHeight: 1.2,       // Target vertical height for Task 2 Mission 3
    destinationReached: 0.5,
  },

  // Robot physical arm dimensions (procedural links in world units)
  robotGeometry: {
    baseRadius: 1.2,
    baseHeight: 0.8,
    columnHeight: 2.8,
    upperArmLength: 3.2,
    forearmLength: 2.8,
    cannulaLength: 2.5,
    instrumentShaftLength: 4.8,
    gripperLength: 0.35,
  },

  // Joint angle constraints (radians)
  jointLimits: {
    baseYaw: { min: -Math.PI * 0.75, max: Math.PI * 0.75 },
    shoulderPitch: { min: -0.8, max: 1.4 },
    elbowPitch: { min: -1.6, max: 0.8 },
    wristPitch: { min: -1.2, max: 1.2 },
    wristYaw: { min: -1.2, max: 1.2 },
    instrumentRoll: { min: -Math.PI, max: Math.PI },
  },
};
