/**
 * Types for Surgical Robotics Simulation (da Vinci 5 inspired educational tool)
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface JointAngles {
  baseYaw: number;        // Joint 1: Rotation around base vertical axis
  shoulderPitch: number;  // Joint 2: Shoulder vertical elevation
  elbowPitch: number;     // Joint 3: Forearm pitch
  wristPitch: number;     // Joint 4: Wrist pitch
  wristYaw: number;       // Joint 5: Wrist lateral deflection
  instrumentRoll: number; // Joint 6: Axial roll of shaft
}

export type DirectionKey = 'left' | 'right' | 'up' | 'down' | 'forward' | 'backward';
export type ControlKey = DirectionKey | 'gripper_open' | 'gripper_close';

export interface TargetZone {
  id: string;
  name: string;
  position: Vector3D;
  radius: number;
  color?: string;
  label?: string;
}

export interface ObstacleZone {
  id: string;
  name: string;
  position: Vector3D;
  size: Vector3D; // box dimensions
  color?: string;
}

export interface GraspableObject {
  id: string;
  name: string;
  position: Vector3D;
  initialPosition: Vector3D;
  radius: number;
  color: string;
  isGrasped: boolean;
  isDelivered: boolean;
}

export interface RobotState {
  cartesianPosition: Vector3D; // Current instrument tip position in workspace coordinates
  targetPosition: Vector3D;    // Target position for smooth interpolation
  joints: JointAngles;         // Calculated joint angles from kinematics
  gripperOpenRatio: number;    // 0.0 (fully closed) to 1.0 (fully open)
  targetGripperRatio: number;
  isMoving: boolean;
  activeDirection: DirectionKey | null;
}

export interface MissionStep {
  id: string;
  instruction: string;
  detailedHint?: string;
  requiredControl?: ControlKey;
  highlightTargetId?: string;
  highlightObjectId?: string;
  isSatisfied: (state: {
    tipPos: Vector3D;
    gripperRatio: number;
    object?: GraspableObject;
    objects?: GraspableObject[];
    targets: TargetZone[];
    obstacles: ObstacleZone[];
    hasCollided: boolean;
  }) => boolean;
  successMessage: string;
}

export interface Mission {
  id: string;
  taskNumber: 1 | 2 | 3;
  missionNumber: 1 | 2 | 3 | 4 | 5;
  title: string;
  shortDescription: string;
  objective: string;
  points: number;
  initialTipPosition: Vector3D;
  initialGripperRatio: number;
  targets: TargetZone[];
  obstacles?: ObstacleZone[];
  object?: GraspableObject;
  objects?: GraspableObject[];
  destinationZone?: TargetZone;
  steps: MissionStep[];
}

export interface MissionResult {
  missionId: string;
  completed: boolean;
  score: number;
  timeSeconds: number;
  attempts: number;
}

export interface TaskRecord {
  taskId: 1 | 2 | 3;
  isCompleted: boolean;
  bestScore: number;
  latestScore: number;
  bestTimeSeconds: number;
  attemptsCount: number;
  completedMissions: string[];
}

export interface StudentInfo {
  fullName: string;
  studentId: string;
}

export interface UserProgressData {
  version: number;
  studentInfo: StudentInfo;
  task1: TaskRecord;
  task2: TaskRecord;
  task3: TaskRecord;
  soundEnabled: boolean;
  lastActiveTaskId: 1 | 2 | 3 | null;
}
