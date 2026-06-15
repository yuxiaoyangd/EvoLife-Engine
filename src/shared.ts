import type { ActionType, EmotionState, LearningState, Personality, State } from './types/index.js'

export const ACTION_TYPES: ActionType[] = [
  'MOVE',
  'EAT',
  'SLEEP',
  'PLAY',
  'INTERACT',
  'FOLLOW',
  'GROOM',
  'IDLE',
  'EXPLORE',
]

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function createDefaultLearningState(): LearningState {
  const actionModifiers = Object.fromEntries(ACTION_TYPES.map((action) => [action, 1])) as LearningState['actionModifiers']
  const actionConfidence = Object.fromEntries(ACTION_TYPES.map((action) => [action, 0])) as LearningState['actionConfidence']

  return {
    actionModifiers,
    actionConfidence,
    lastUpdatedTick: 0,
  }
}

export function createDefaultEmotionState(): EmotionState {
  return {
    comfort: 0.5,
    stress: 0.2,
    joy: 0.5,
    trust: 0.5,
    curiosity: 0.5,
  }
}

export function applyStateDelta(state: State, delta: Partial<State>): State {
  return {
    ...state,
    hunger: clamp(state.hunger + (delta.hunger ?? 0), 0, 100),
    energy: clamp(state.energy + (delta.energy ?? 0), 0, 100),
    health: clamp(state.health + (delta.health ?? 0), 0, 100),
    socialNeed: clamp(state.socialNeed + (delta.socialNeed ?? 0), 0, 100),
    stimulationNeed: clamp(state.stimulationNeed + (delta.stimulationNeed ?? 0), 0, 100),
    cleanliness: clamp(state.cleanliness + (delta.cleanliness ?? 0), 0, 100),
    ageTicks: Math.max(0, state.ageTicks + (delta.ageTicks ?? 0)),
    lastSleepTick: delta.lastSleepTick ?? state.lastSleepTick,
  }
}

export function applyEmotionDelta(emotion: EmotionState, delta: Partial<EmotionState>): EmotionState {
  return {
    comfort: clamp(emotion.comfort + (delta.comfort ?? 0), 0, 1),
    stress: clamp(emotion.stress + (delta.stress ?? 0), 0, 1),
    joy: clamp(emotion.joy + (delta.joy ?? 0), 0, 1),
    trust: clamp(emotion.trust + (delta.trust ?? 0), 0, 1),
    curiosity: clamp(emotion.curiosity + (delta.curiosity ?? 0), 0, 1),
  }
}

export function createSeededRandom(seed: number): { next(): number } {
  let current = seed >>> 0

  return {
    next(): number {
      current = (current * 1664525 + 1013904223) >>> 0
      return current / 0x100000000
    },
  }
}

export function createInitialState(partial?: Partial<State>): State {
  return {
    hunger: partial?.hunger ?? 45,
    energy: partial?.energy ?? 65,
    health: partial?.health ?? 100,
    socialNeed: partial?.socialNeed ?? 35,
    stimulationNeed: partial?.stimulationNeed ?? 40,
    cleanliness: partial?.cleanliness ?? 80,
    ageTicks: partial?.ageTicks ?? 0,
    lastSleepTick: partial?.lastSleepTick ?? 0,
  }
}

export function createPersonality(base: Personality): Personality {
  return { ...base }
}
