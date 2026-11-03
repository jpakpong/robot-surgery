/**
 * Local Storage Persistence Manager for Medical Student Progress
 * Level 1 Client-Side Architecture (zero backend required, versioned)
 */

import { UserProgressData, TaskRecord } from '../types/simulation';
import { getMissionsForTask } from '../missions/missionEngine';

const STORAGE_KEY = 'surgical_robotics_sim_progress_v1';

const defaultTaskRecord = (taskId: 1 | 2 | 3): TaskRecord => ({
  taskId,
  isCompleted: false,
  bestScore: 0,
  latestScore: 0,
  bestTimeSeconds: 0,
  attemptsCount: 0,
  completedMissions: [],
});

const defaultProgress: UserProgressData = {
  version: 1,
  studentInfo: {
    fullName: '',
    studentId: '',
  },
  task1: defaultTaskRecord(1),
  task2: defaultTaskRecord(2),
  task3: defaultTaskRecord(3),
  soundEnabled: true,
  lastActiveTaskId: null,
};

export function loadUserProgress(): UserProgressData {
  if (typeof window === 'undefined') return defaultProgress;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress;

    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 1) {
      return {
        ...defaultProgress,
        ...parsed,
        studentInfo: { ...defaultProgress.studentInfo, ...(parsed.studentInfo || {}) },
        task1: { ...defaultProgress.task1, ...parsed.task1 },
        task2: { ...defaultProgress.task2, ...parsed.task2 },
        task3: { ...defaultProgress.task3, ...(parsed.task3 || defaultTaskRecord(3)) },
      };
    }
  } catch (err) {
    console.warn('Failed to parse saved progress, resetting to default:', err);
  }

  return defaultProgress;
}

export function saveUserProgress(progress: UserProgressData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.error('Failed to save progress to localStorage:', err);
  }
}

export function recordMissionCompletion(
  current: UserProgressData,
  taskId: 1 | 2 | 3,
  missionId: string,
  missionScore: number,
  durationSeconds: number
): UserProgressData {
  const taskKey = taskId === 1 ? 'task1' : taskId === 2 ? 'task2' : 'task3';
  const task = { ...current[taskKey] };

  // Set of completed missions
  const completedSet = new Set(task.completedMissions);
  completedSet.add(missionId);
  task.completedMissions = Array.from(completedSet);

  // Recompute score dynamically from missions configuration
  const missions = getMissionsForTask(taskId);
  let totalScore = 0;
  for (const mId of task.completedMissions) {
    const m = missions.find((x) => x.id === mId);
    totalScore += m ? m.points : 10;
  }
  task.latestScore = totalScore;
  if (totalScore > task.bestScore) {
    task.bestScore = totalScore;
  }

  // If all missions completed for this task
  if (task.completedMissions.length >= missions.length) {
    task.isCompleted = true;
    if (task.bestTimeSeconds === 0 || durationSeconds < task.bestTimeSeconds) {
      task.bestTimeSeconds = durationSeconds;
    }
  }

  const updated: UserProgressData = {
    ...current,
    [taskKey]: task,
    lastActiveTaskId: taskId,
  };

  saveUserProgress(updated);
  return updated;
}

export function recordTaskCompletion(
  current: UserProgressData,
  taskId: 1 | 2 | 3,
  finalScore: number,
  timeSeconds: number
): UserProgressData {
  const taskKey = taskId === 1 ? 'task1' : taskId === 2 ? 'task2' : 'task3';
  const task = { ...current[taskKey] };

  task.isCompleted = true;
  task.latestScore = finalScore;
  task.attemptsCount += 1;
  if (finalScore > task.bestScore) {
    task.bestScore = finalScore;
  }
  if (task.bestTimeSeconds === 0 || timeSeconds < task.bestTimeSeconds) {
    task.bestTimeSeconds = timeSeconds;
  }

  const updated: UserProgressData = {
    ...current,
    [taskKey]: task,
    lastActiveTaskId: taskId,
  };

  saveUserProgress(updated);
  return updated;
}

export function resetTaskProgress(current: UserProgressData, taskId: 1 | 2 | 3): UserProgressData {
  const taskKey = taskId === 1 ? 'task1' : taskId === 2 ? 'task2' : 'task3';
  const oldTask = current[taskKey];

  const resetTask: TaskRecord = {
    ...defaultTaskRecord(taskId),
    bestScore: oldTask.bestScore, // retain best score across re-attempts!
    bestTimeSeconds: oldTask.bestTimeSeconds,
    attemptsCount: oldTask.attemptsCount + 1,
  };

  const updated: UserProgressData = {
    ...current,
    [taskKey]: resetTask,
    lastActiveTaskId: taskId,
  };

  saveUserProgress(updated);
  return updated;
}

export function updateStudentInfo(
  current: UserProgressData,
  info: { fullName: string; studentId: string }
): UserProgressData {
  const updated: UserProgressData = {
    ...current,
    studentInfo: {
      fullName: info.fullName.trim(),
      studentId: info.studentId.trim(),
    },
  };
  saveUserProgress(updated);
  return updated;
}

export function clearAllProgress(): UserProgressData {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  return defaultProgress;
}
