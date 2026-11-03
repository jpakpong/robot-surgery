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
  resolveTipCollisions,
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
  const [collisionType, setCollisionType] = useState<'floor' | 'barrier' | null>(null);
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

  // Dispatch memoization refs to eliminate React re-render thrashing at 60-120fps on mobile
  const lastDispatchedCart = useRef({ x: 9999, y: 9999, z: 9999 });
  const lastDispatchedGrip = useRef<number>(-1);
  const lastDispatchedMoving = useRef<boolean | null>(null);
  const lastDispatchedDir = useRef<DirectionKey | null>(null);
  const lastCollidedRef = useRef<boolean>(false);
  const lastColTypeRef = useRef<'floor' | 'barrier' | null>(null);
  const lastColWarnRef = useRef<string | null>(null);
  const lastContactRef = useRef<boolean>(false);

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
    setCollisionType(null);
    setCollisionWarning(null);
    setIsContactingObject(false);

    lastDispatchedCart.current = { x: 9999, y: 9999, z: 9999 };
    lastDispatchedGrip.current = -1;
    lastDispatchedMoving.current = null;
    lastDispatchedDir.current = null;
    lastCollidedRef.current = false;
    lastColTypeRef.current = null;
    lastColWarnRef.current = null;
    lastContactRef.current = false;

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
    setCollisionType(null);
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

        const candidateTarget = { ...targetPosRef.current };

        switch (activeDirRef.current) {
          case 'left':
            candidateTarget.x -= deltaMove;
            break;
          case 'right':
            candidateTarget.x += deltaMove;
            break;
          case 'up':
            candidateTarget.y += deltaMove;
            break;
          case 'down':
            candidateTarget.y -= deltaMove;
            break;
          case 'forward':
            // Forward drives deeper into the surgical field (-Z)
            candidateTarget.z -= deltaMove;
            break;
          case 'backward':
            // Backward retracts toward the entry port (+Z)
            candidateTarget.z += deltaMove;
            break;
        }

        // Rigid collision resolution: strictly blocks passing through floor or obstacles
        const col = resolveTipCollisions(
          targetPosRef.current,
          candidateTarget,
          obstaclesRef.current
        );

        targetPosRef.current = col.resolvedPosition;

        let hasColNow = false;
        let colTypeNow: 'floor' | 'barrier' | null = null;
        let warnNow: string | null = null;

        if (col.hitFloor || col.hitBarrier) {
          hasColNow = true;
          colTypeNow = col.hitFloor ? 'floor' : 'barrier';
          warnNow = col.hitFloor
            ? 'PHYSICAL CONTACT: Cavity Floor / Tray Surface — Penetration Blocked'
            : `PHYSICAL CONTACT: ${col.contactedObstacleName || 'Anatomical Barrier'} — Penetration Blocked`;
          // Play urgent medical alert buzzer sound
          soundManager.playCollisionAlert();
        }

        if (lastCollidedRef.current !== hasColNow) {
          lastCollidedRef.current = hasColNow;
          setHasCollided(hasColNow);
        }
        if (lastColTypeRef.current !== colTypeNow) {
          lastColTypeRef.current = colTypeNow;
          setCollisionType(colTypeNow);
        }
        if (lastColWarnRef.current !== warnNow) {
          lastColWarnRef.current = warnNow;
          setCollisionWarning(warnNow);
        }
      } else {
        // Idle contact query: ensure current position is not resting in collision
        const col = resolveTipCollisions(
          targetPosRef.current,
          targetPosRef.current,
          obstaclesRef.current
        );
        const hasColNow = col.hitFloor || col.hitBarrier;
        const colTypeNow = hasColNow ? (col.hitFloor ? 'floor' : 'barrier') : null;

        if (lastCollidedRef.current !== hasColNow) {
          lastCollidedRef.current = hasColNow;
          setHasCollided(hasColNow);
        }
        if (lastColTypeRef.current !== colTypeNow) {
          lastColTypeRef.current = colTypeNow;
          setCollisionType(colTypeNow);
        }
        if (lastColWarnRef.current !== null && !hasColNow) {
          lastColWarnRef.current = null;
          setCollisionWarning(null);
        }
      }

      // 2. Smoothly damp Cartesian tip position toward target position
      const factor = 1 - Math.exp(-SIMULATION_CONFIG.smoothFactor * dt);
      const candidateCart = {
        x: cartesianPosRef.current.x + (targetPosRef.current.x - cartesianPosRef.current.x) * factor,
        y: cartesianPosRef.current.y + (targetPosRef.current.y - cartesianPosRef.current.y) * factor,
        z: cartesianPosRef.current.z + (targetPosRef.current.z - cartesianPosRef.current.z) * factor,
      };

      // Rigid boundary enforcement on actual Cartesian position: tip can never penetrate floor or barrier
      const cartCol = resolveTipCollisions(
        cartesianPosRef.current,
        candidateCart,
        obstaclesRef.current
      );
      cartesianPosRef.current = cartCol.resolvedPosition;

      if (cartCol.hitFloor || cartCol.hitBarrier) {
        if (!lastCollidedRef.current) {
          lastCollidedRef.current = true;
          setHasCollided(true);
        }
        const cType = cartCol.hitFloor ? 'floor' : 'barrier';
        if (lastColTypeRef.current !== cType) {
          lastColTypeRef.current = cType;
          setCollisionType(cType);
        }
        soundManager.playCollisionAlert();
      }

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

      const nowContacting = !hasAnyGrasped && contacting;
      if (lastContactRef.current !== nowContacting) {
        lastContactRef.current = nowContacting;
        setIsContactingObject(nowContacting);
      }

      // 5. Solve Inverse Kinematics for 6-DOF joint angles
      const joints = solveInverseKinematics(cartesianPosRef.current);

      // 6. Update state for React consumers (only dispatch when delta exceeds threshold or status changed)
      const dx = Math.abs(cartesianPosRef.current.x - lastDispatchedCart.current.x);
      const dy = Math.abs(cartesianPosRef.current.y - lastDispatchedCart.current.y);
      const dz = Math.abs(cartesianPosRef.current.z - lastDispatchedCart.current.z);
      const dg = Math.abs(gripperRatioRef.current - lastDispatchedGrip.current);
      const dm = isMovingRef.current !== lastDispatchedMoving.current;
      const dd = activeDirRef.current !== lastDispatchedDir.current;

      const hasMovementDelta = dx > 0.0004 || dy > 0.0004 || dz > 0.0004 || dg > 0.0008 || dm || dd;

      if (hasMovementDelta) {
        lastDispatchedCart.current.x = cartesianPosRef.current.x;
        lastDispatchedCart.current.y = cartesianPosRef.current.y;
        lastDispatchedCart.current.z = cartesianPosRef.current.z;
        lastDispatchedGrip.current = gripperRatioRef.current;
        lastDispatchedMoving.current = isMovingRef.current;
        lastDispatchedDir.current = activeDirRef.current;

        setRobotState({
          cartesianPosition: { ...cartesianPosRef.current },
          targetPosition: { ...targetPosRef.current },
          joints,
          gripperOpenRatio: gripperRatioRef.current,
          targetGripperRatio: targetGripperRef.current,
          isMoving: isMovingRef.current,
          activeDirection: activeDirRef.current,
        });

        if (objectsRef.current.length > 0 && (hasAnyGrasped || dx > 0.0004 || dy > 0.0004 || dz > 0.0004)) {
          setObjectsState([...objectsRef.current]);
          setObjectState(objectsRef.current[0]);
        }
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
    collisionType,
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

