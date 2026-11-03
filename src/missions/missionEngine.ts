/**
 * Mission Engine: Shared lifecycle logic for Task 1, Task 2, and Task 3
 */

import { Mission } from '../types/simulation';
import { TASK1_MISSIONS } from './task1Missions';
import { TASK2_MISSIONS } from './task2Missions';
import { TASK3_MISSIONS } from './task3Missions';

export function getMissionsForTask(taskId: 1 | 2 | 3): Mission[] {
  if (taskId === 1) return TASK1_MISSIONS;
  if (taskId === 2) return TASK2_MISSIONS;
  return TASK3_MISSIONS;
}

export function getMissionById(taskId: 1 | 2 | 3, missionId: string): Mission | undefined {
  const list = getMissionsForTask(taskId);
  return list.find((m) => m.id === missionId);
}

export function getMissionByIndex(taskId: 1 | 2 | 3, index: number): Mission | undefined {
  const list = getMissionsForTask(taskId);
  return list[index];
}
