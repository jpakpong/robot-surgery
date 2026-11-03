/**
 * Shared Simulation Hook
 * Acts as the single source of truth for both Doctor View and Robot View
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Vector3D,
  DirectionKey,
  RobotState,
  JointAngles,
  GraspableObject,
  TargetZone,
  ObstacleZone,
  Mission,
} from '../types/simulation';
import {
  solveInverseKinematics,
  clampToWorkspace,
  checkObstacleCollision,
  checkObjectPhysicalContact,
  distance3D,
} from '../simulation/kinematics';
import { SIMULATION_CONFIG } from '../simulation/simulationConfig';
import { soundManager } from '../utils/audio';

const INITIAL_POS: Vector3D = { x: 0, y: 0.5, z: 0 };
const INITIAL_JOINTS: JointAngles = solveInverseKinematics(INITIAL_POS);

const getInitialObjects = (m?: Mission): GraspableObject[] => {
  if (m?.objects && m.objects.length > 0) {
    return m.objects.map((o) => ({ ...o }));
  }
  if (m?.object) {
    return [{ ...m.object }];
  }
  return [];
};

export function useRobotSimulation(initialMission?: Mission) {
  // Speed mode
  const [speedMode, setSpeedMode] = useState<'normal' | 'fine'>('normal');

  // Robot Cartesian & Joint State
  const [robotState, setRobotState] = useState<RobotState>({
    cartesianPosition: initialMission ? initialMission.initialTipPosition : INITIAL_POS,
    targetPosition: initialMission ? initialMission.initialTipPosition : INITIAL_POS,
    joints: initialMission
      ? solveInverseKinematics(initialMission.initialTipPosition)
      : INITIAL_JOINTS,
    gripperOpenRatio: initialMission ? initialMission.initialGripperRatio : 0.6,
    targetGripperRatio: initialMission ? initialMission.initialGripperRatio : 0.6,
    isMoving: false,
    activeDirection: null,
  });

  // Current mission objects, targets & obstacles
  const initialObjs = getInitialObjects(initialMission);
  const [objectsState, setObjectsState] = useState<GraspableObject[]>(initialObjs);
  const [objectState, setObjectState] = useState<GraspableObject | undefined>(initialObjs[0]);
  const [targets, setTargets] = useState<TargetZone[]>(initialMission?.targets || []);
  const [obstacles, setObstacles] = useState<ObstacleZone[]>(initialMission?.obstacles || []);
  const [hasCollided, setHasCollided] = useState<boolean>(false);
  const [collisionWarning, setCollisionWarning] = useState<string | null>(null);
  const [isContactingObject, setIsContactingObject] = useState<boolean>(false);

  // Mutable refs for high-frequency physics/render loop without re-triggering effects
  const cartesianPosRef = useRef<Vector3D>(
    initialMission ? { ...initialMission.initialTipPosition } : { ...INITIAL_POS }
  );
  const targetPosRef = useRef<Vector3D>(
    initialMission ? { ...initialMission.initialTipPosition } : { ...INITIAL_POS }
  );
  const gripperRatioRef = useRef<number>(initialMission ? initialMission.initialGripperRatio : 0.6);
  const targetGripperRef = useRef<number>(initialMission ? initialMission.initialGripperRatio : 0.6);
  const activeDirRef = useRef<DirectionKey | null>(null);
  const isMovingRef = useRef<boolean>(false);
  const speedModeRef = useRef<'normal' | 'fine'>('normal');
  speedModeRef.current = speedMode;

  const objectsRef = useRef<GraspableObject[]>(initialObjs);
  const obstaclesRef = useRef<ObstacleZone[]>(initialMission?.obstacles || []);
  obstaclesRef.current = obstacles;

  // Sound hum state
  const isHummingRef = useRef<boolean>(false);

  /**
   * Reset or re-initialize to a specific mission
   */
  const loadMissionState = useCallback((mission: Mission) => {
    activeDirRef.current = null;
    isMovingRef.current = false;
    soundManager.stopServoHum();
    isHummingRef.current = false;

    const tip = { ...mission.initialTipPosition };
    cartesianPosRef.current = { ...tip };
    targetPosRef.current = { ...tip };
    gripperRatioRef.current = mission.initialGripperRatio;
    targetGripperRef.current = mission.initialGripperRatio;

    const objs = getInitialObjects(mission);
    objectsRef.current = objs;
    setObjectsState(objs);
    setObjectState(objs[0]);

    setTargets([...mission.targets]);
    setObstacles(mission.obstacles ? [...mission.obstacles] : []);
    setHasCollided(false);
    setCollisionWarning(null);
    setIsContactingObject(false);

    const calculatedJoints = solveInverseKinematics(tip);
    setRobotState({
      cartesianPosition: { ...tip },
      targetPosition: { ...tip },
      joints: calculatedJoints,
      gripperOpenRatio: mission.initialGripperRatio,
      targetGripperRatio: mission.initialGripperRatio,
      isMoving: false,
      activeDirection: null,
    });
  }, []);

  /**
   * Continuous movement control handlers (Press & Hold)
   */
  const startMove = useCallback((direction: DirectionKey) => {
    activeDirRef.current = direction;
    isMovingRef.current = true;
    soundManager.playClick();

    if (!isHummingRef.current) {
      soundManager.startServoHum();
      isHummingRef.current = true;
    }

    setRobotState((prev) => ({
      ...prev,
      isMoving: true,
      activeDirection: direction,
    }));
  }, []);

  const stopMove = useCallback((direction?: DirectionKey) => {
    if (!direction || activeDirRef.current === direction) {
      activeDirRef.current = null;
      isMovingRef.current = false;

      if (isHummingRef.current) {
        soundManager.stopServoHum();
        isHummingRef.current = false;
      }

      setRobotState((prev) => ({
        ...prev,
        isMoving: false,
        activeDirection: null,
      }));
    }
  }, []);

  /**
   * Gripper controls
   */
  const openGripper = useCallback(() => {
    targetGripperRef.current = 1.0;
    soundManager.playGrasp(false);

    // If any object was grasped, release it!
    let changed = false;
    objectsRef.current.forEach((obj) => {
      if (obj.isGrasped) {
        obj.isGrasped = false;
        changed = true;
      }
    });

    if (changed) {
      setObjectsState([...objectsRef.current]);
      setObjectState(objectsRef.current[0]);
    }

    setRobotState((prev) => ({
      ...prev,
      targetGripperRatio: 1.0,
    }));
  }, []);

  const closeGripper = useCallback(() => {
    targetGripperRef.current = 0.0;
    soundManager.playGrasp(true);

    // Check if within grasping proximity of any ungrasped object
    let closestObj: GraspableObject | null = null;
    let minDist = SIMULATION_CONFIG.tolerance.graspDistance;

    for (const obj of objectsRef.current) {
      if (!obj.isGrasped && !obj.isDelivered) {
        const dist = distance3D(cartesianPosRef.current, obj.position);
        if (dist <= minDist) {
          minDist = dist;
          closestObj = obj;
        }
      }
    }

    if (closestObj) {
      closestObj.isGrasped = true;
      setObjectsState([...objectsRef.current]);
      setObjectState(objectsRef.current[0]);
    }

    setRobotState((prev) => ({
      ...prev,
      targetGripperRatio: 0.0,
    }));
  }, []);

  /**
   * Reset position to workspace origin
   */
  const recalibratePosition = useCallback(() => {
    activeDirRef.current = null;
    isMovingRef.current = false;
    soundManager.stopServoHum();
    isHummingRef.current = false;

    targetPosRef.current = { x: 0, y: 0.5, z: 0 };
    setCollisionWarning(null);
    setHasCollided(false);
  }, []);

  /**
   * Main Physics / Kinematics animation loop (60 FPS)
   */
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(0.06, (time - lastTime) / 1000);
      lastTime = time;

      // 1. Process directional movement on target position
      if (activeDirRef.current) {
        const speed =
          speedModeRef.current === 'fine'
            ? SIMULATION_CONFIG.speed.fine
            : SIMULATION_CONFIG.speed.normal;
        const deltaMove = speed * dt;

        const nextTarget = { ...targetPosRef.current };

        switch (activeDirRef.current) {
          case 'left':
            nextTarget.x -= deltaMove;
            break;
          case 'right':
            nextTarget.x += deltaMove;
            break;
          case 'up':
            nextTarget.y += deltaMove;
            break;
          case 'down':
            nextTarget.y -= deltaMove;
            break;
          case 'forward':
            // Forward drives deeper into the surgical field (-Z)
            nextTarget.z -= deltaMove;
            break;
          case 'backward':
            // Backward retracts toward the entry port (+Z)
            nextTarget.z += deltaMove;
            break;
        }

        // Clamp to physical surgical workspace bounds
        const clamped = clampToWorkspace(nextTarget);

        // Check obstacle collision
        const collided = checkObstacleCollision(clamped, obstaclesRef.current);
        if (collided) {
          setHasCollided(true);
          setCollisionWarning('Warning: Proximity to sensitive tissue barrier!');
        } else {
          setHasCollided(false);
          setCollisionWarning(null);
          targetPosRef.current = clamped;
        }
      }

      // 2. Smoothly damp Cartesian tip position toward target position
      const factor = 1 - Math.exp(-SIMULATION_CONFIG.smoothFactor * dt);
      cartesianPosRef.current.x += (targetPosRef.current.x - cartesianPosRef.current.x) * factor;
      cartesianPosRef.current.y += (targetPosRef.current.y - cartesianPosRef.current.y) * factor;
      cartesianPosRef.current.z += (targetPosRef.current.z - cartesianPosRef.current.z) * factor;

      // 3. Smoothly interpolate gripper jaws
      const gripSpeed = SIMULATION_CONFIG.gripperSpeed * dt;
      if (gripperRatioRef.current < targetGripperRef.current) {
        gripperRatioRef.current = Math.min(
          targetGripperRef.current,
          gripperRatioRef.current + gripSpeed
        );
      } else if (gripperRatioRef.current > targetGripperRef.current) {
        gripperRatioRef.current = Math.max(
          targetGripperRef.current,
          gripperRatioRef.current - gripSpeed
        );
      }

      // 4. Update grasped objects position if attached, or check physical contact
      let contacting = false;
      let hasAnyGrasped = false;

      for (const obj of objectsRef.current) {
        if (obj.isGrasped) {
          hasAnyGrasped = true;
          obj.position = {
            x: cartesianPosRef.current.x,
            y: cartesianPosRef.current.y - 0.1,
            z: cartesianPosRef.current.z,
          };
        } else {
          // Check physical contact if ungrasped
          if (checkObjectPhysicalContact(cartesianPosRef.current, obj)) {
            contacting = true;
          }
        }
      }

      setIsContactingObject(!hasAnyGrasped && contacting);

      // 5. Solve Inverse Kinematics for 6-DOF joint angles
      const joints = solveInverseKinematics(cartesianPosRef.current);

      // 6. Update state for React consumers
      setRobotState({
        cartesianPosition: { ...cartesianPosRef.current },
        targetPosition: { ...targetPosRef.current },
        joints,
        gripperOpenRatio: gripperRatioRef.current,
        targetGripperRatio: targetGripperRef.current,
        isMoving: isMovingRef.current,
        activeDirection: activeDirRef.current,
      });

      if (objectsRef.current.length > 0) {
        setObjectsState([...objectsRef.current]);
        setObjectState(objectsRef.current[0]);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      soundManager.stopServoHum();
    };
  }, []);

  return {
    robotState,
    objectState,
    objectsState,
    targets,
    obstacles,
    hasCollided,
    collisionWarning,
    isContactingObject,
    speedMode,
    setSpeedMode,
    startMove,
    stopMove,
    openGripper,
    closeGripper,
    recalibratePosition,
    loadMissionState,
  };
}
