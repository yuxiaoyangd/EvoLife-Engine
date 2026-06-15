import type { GrowthStage, LearningState } from '../types/index.js'
import { ACTION_TYPES, clamp } from '../shared.js'

const LEARNING_RATES: Record<GrowthStage, number> = {
  BABY: 0.08,
  JUVENILE: 0.06,
  ADULT: 0.04,
  SENIOR: 0.03,
}

export function getLearningRate(stage: GrowthStage): number {
  return LEARNING_RATES[stage]
}

export function updateLearning(
  learning: LearningState,
  actionType: keyof LearningState['actionModifiers'],
  outcomeScore: number,
  growthStage: GrowthStage,
  tick: number,
): LearningState {
  const rate = getLearningRate(growthStage)
  const confidenceRate = rate * 0.8

  return {
    actionModifiers: {
      ...learning.actionModifiers,
      [actionType]: clamp(learning.actionModifiers[actionType] + outcomeScore * rate, 0.5, 1.5),
    },
    actionConfidence: {
      ...learning.actionConfidence,
      [actionType]: clamp(learning.actionConfidence[actionType] + Math.abs(outcomeScore) * confidenceRate, 0, 1),
    },
    lastUpdatedTick: tick,
  }
}

export function createFlatLearningSnapshot(value = 1): LearningState['actionModifiers'] {
  return Object.fromEntries(ACTION_TYPES.map((action) => [action, value])) as LearningState['actionModifiers']
}
