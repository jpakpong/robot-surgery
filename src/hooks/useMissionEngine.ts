/**
 * useMissionEngine Hook
 * Orchestrates step progression, success verification, feedback cues, and score tracking.
 * Designed with stable timer refs so high-frequency position updates never cancel transitions.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mission,
  MissionStep,
  Vector3D,
  GraspableObject,
  TargetZone,
  ObstacleZone,
} from '../types/simulation';
import { soundManager } from '../utils/audio';

interface UseMissionEngineProps {
  mission: Mission;
  tipPos: Vector3D;
  gripperRatio: number;
  object?: GraspableObject;
  objects?: GraspableObject[];
  targets: TargetZone[];
  obstacles: ObstacleZone[];
  hasCollided: boolean;
  onMissionCompleted: (missionId: string, score: number, timeSeconds: number) => void;
}

export function useMissionEngine({
  mission,
  tipPos,
  gripperRatio,
  object,
  objects,
  targets,
  obstacles,
  hasCollided,
  onMissionCompleted,
}: UseMissionEngineProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isStepSuccess, setIsStepSuccess] = useState<boolean>(false);
  const [stepSuccessMsg, setStepSuccessMsg] = useState<string>('');
  const [isMissionComplete, setIsMissionComplete] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [instructionFlash, setInstructionFlash] = useState<boolean>(false);

  // Stable refs to prevent closure staleness and unwanted timer cancellations
  const stepAdvancingRef = useRef<boolean>(false);
  const stepTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const onMissionCompletedRef = useRef(onMissionCompleted);
  onMissionCompletedRef.current = onMissionCompleted;

  const elapsedTimeRef = useRef<number>(0);
  elapsedTimeRef.current = elapsedTime;

  const currentStep: MissionStep | undefined = mission.steps[currentStepIndex];
  const currentStepIndexRef = useRef<number>(0);
  currentStepIndexRef.current = currentStepIndex;

  const missionRef = useRef<Mission>(mission);
  missionRef.current = mission;

  // Reset clean state when mission ID changes
  useEffect(() => {
    if (stepTimerRef.current) {
      clearTimeout(stepTimerRef.current);
      stepTimerRef.current = null;
    }
    setCurrentStepIndex(0);
    setIsStepSuccess(false);
    setStepSuccessMsg('');
    setIsMissionComplete(false);
    setIsPaused(false);
    setElapsedTime(0);
    stepAdvancingRef.current = false;
    startTimeRef.current = Date.now();
  }, [mission.id]);

  // Mission elapsed timer
  useEffect(() => {
    if (isPaused || isMissionComplete) return;

    const interval = window.setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, isMissionComplete]);

  // Flash instruction cue
  const flashInstructionAgain = useCallback(() => {
    setInstructionFlash(true);
    soundManager.playClick();
    setTimeout(() => setInstructionFlash(false), 800);
  }, []);

  // Step condition verification loop
  useEffect(() => {
    if (isPaused || isMissionComplete || stepAdvancingRef.current || !currentStep) return;

    const satisfied = currentStep.isSatisfied({
      tipPos,
      gripperRatio,
      object,
      objects,
      targets,
      obstacles,
      hasCollided,
    });

    if (satisfied) {
      stepAdvancingRef.current = true;
      setIsStepSuccess(true);
      setStepSuccessMsg(currentStep.successMessage);
      soundManager.playTargetReached();

      const stepIdx = currentStepIndexRef.current;
      const isLastStep = stepIdx >= mission.steps.length - 1;

      // Use stable stepTimerRef and DO NOT clear it on every tipPos change!
      stepTimerRef.current = window.setTimeout(() => {
        setIsStepSuccess(false);

        if (isLastStep) {
          setIsMissionComplete(true);
          soundManager.playSuccessFanfare();
          onMissionCompletedRef.current(mission.id, mission.points, elapsedTimeRef.current);
        } else {
          setCurrentStepIndex(stepIdx + 1);
          stepAdvancingRef.current = false;
        }
      }, 1000);
    }
  }, [
    currentStep,
    tipPos,
    gripperRatio,
    object,
    targets,
    obstacles,
    hasCollided,
    isPaused,
    isMissionComplete,
    mission.id,
    mission.points,
    mission.steps.length,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stepTimerRef.current) {
        clearTimeout(stepTimerRef.current);
      }
    };
  }, []);

  const pauseSimulation = useCallback(() => setIsPaused(true), []);
  const resumeSimulation = useCallback(() => setIsPaused(false), []);

  const resetCurrentMission = useCallback(() => {
    if (stepTimerRef.current) {
      clearTimeout(stepTimerRef.current);
      stepTimerRef.current = null;
    }
    setCurrentStepIndex(0);
    setIsStepSuccess(false);
    setStepSuccessMsg('');
    setIsMissionComplete(false);
    stepAdvancingRef.current = false;
    startTimeRef.current = Date.now();
    setElapsedTime(0);
    soundManager.playClick();
  }, []);

  return {
    currentStep,
    currentStepIndex,
    totalSteps: mission.steps.length,
    isStepSuccess,
    stepSuccessMsg,
    isMissionComplete,
    isPaused,
    elapsedTime,
    instructionFlash,
    pauseSimulation,
    resumeSimulation,
    resetCurrentMission,
    flashInstructionAgain,
  };
}
