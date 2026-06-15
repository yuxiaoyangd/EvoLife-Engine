import type { ActionScoreBreakdown, ActionType, Personality, TickContext, WorldSnapshot } from '../types/index.js'
import { clamp } from '../shared.js'
import { getMemoryModifier } from '../engine/memory.js'

export function getStateModifier(action: ActionType, context: TickContext): number {
  const { state, emotion } = context.instance

  switch (action) {
    case 'EAT': {
      if (state.hunger <= 10) {
        return 0.05
      }

      if (state.hunger <= 25) {
        return clamp(0.08 + (state.hunger - 10) / 120, 0.05, 0.3)
      }

      if (state.hunger <= 60) {
        return clamp(0.3 + (state.hunger - 25) / 35, 0.3, 1.3)
      }

      return clamp(1.3 + (state.hunger - 60) / 25 - state.energy / 500, 1.1, 2.5)
    }
    case 'SLEEP': {
      const timeBonus = context.world.timeOfDay === 'NIGHT' ? 0.2 : context.world.timeOfDay === 'DUSK' ? 0.08 : 0
      const hungerPenalty = state.hunger > 65 ? 0.12 : 0
      return clamp(0.05 + Math.max(0, (45 - state.energy) / 22) + timeBonus - hungerPenalty, 0.05, 2.2)
    }
    case 'PLAY': {
      const energySupport = state.energy >= 55 ? state.energy / 220 : state.energy / 400
      const hungerPenalty = state.hunger / 180
      const lowEnergyPenalty = state.energy < 35 ? (35 - state.energy) / 60 : 0
      return clamp(0.18 + state.stimulationNeed / 60 + energySupport - hungerPenalty - lowEnergyPenalty, 0.08, 2.3)
    }
    case 'INTERACT': {
      const lowSocialPenalty = state.socialNeed < 20 ? (20 - state.socialNeed) / 70 : 0
      return clamp(0.18 + state.socialNeed / 48 + state.energy / 700 - lowSocialPenalty, 0.08, 2.2)
    }
    case 'FOLLOW': {
      const lowSocialPenalty = state.socialNeed < 25 ? (25 - state.socialNeed) / 55 : 0
      const trustFactor = context.instance.emotion.trust * 0.35
      return clamp(0.15 + state.socialNeed / 58 + trustFactor - lowSocialPenalty, 0.06, 2.1)
    }
    case 'GROOM':
      return clamp(0.2 + (100 - state.cleanliness) / 45, 0.25, 2.5)
    case 'IDLE':
      return clamp(0.5 + (100 - state.energy) / 230 - state.stimulationNeed / 260, 0.28, 2.5)
    case 'EXPLORE': {
      const stimulationDrive = Math.max(0, (state.stimulationNeed - 22) / 55)
      const lowStimPenalty = state.stimulationNeed < 20 ? (20 - state.stimulationNeed) / 35 : 0
      const hungerPenalty = state.hunger / 260
      const calmBonus = (1 - emotion.stress) * 0.18
      return clamp(0.08 + stimulationDrive + calmBonus - hungerPenalty - lowStimPenalty, 0.05, 2.2)
    }
    case 'MOVE':
      return clamp(0.22 + state.stimulationNeed / 120 + state.energy / 320 - state.hunger / 260, 0.2, 2.3)
    default:
      return 1
  }
}

export function getPersonalityModifier(action: ActionType, personality: Personality): number {
  switch (action) {
    case 'INTERACT':
      return clamp(1 + 0.25 * personality.affection + 0.1 * personality.confidence, 0.5, 1.5)
    case 'FOLLOW':
      return clamp(1 + 0.22 * personality.affection - 0.15 * personality.independence, 0.5, 1.5)
    case 'EXPLORE':
      return clamp(1 + 0.25 * personality.curiosity + 0.15 * personality.independence + 0.1 * personality.activity, 0.5, 1.5)
    case 'PLAY':
      return clamp(1 + 0.2 * personality.curiosity + 0.18 * personality.activity, 0.5, 1.5)
    case 'MOVE':
      return clamp(1 + 0.15 * personality.confidence + 0.2 * personality.activity, 0.5, 1.5)
    case 'IDLE':
      return clamp(1 + 0.2 * personality.patience - 0.15 * personality.activity, 0.5, 1.5)
    default:
      return 1
  }
}

export function getWorldModifier(action: ActionType, world: WorldSnapshot): number {
  switch (action) {
    case 'EAT':
      return clamp(0.8 + world.foodAvailability * 0.5, 0.5, 1.5)
    case 'INTERACT':
    case 'FOLLOW':
      return clamp(0.8 + world.socialAvailability * 0.5, 0.5, 1.5)
    case 'EXPLORE':
      return clamp(0.8 + world.ambientStimulation * 0.5 - (1 - world.ambientSafety) * 0.3, 0.5, 1.5)
    case 'PLAY':
      return clamp(0.85 + world.ambientStimulation * 0.4, 0.5, 1.5)
    case 'MOVE':
      return clamp(0.85 + world.ambientSafety * 0.3, 0.5, 1.5)
    default:
      return 1
  }
}

export function getLearningModifier(action: ActionType, context: TickContext): number {
  return clamp(context.instance.learning.actionModifiers[action], 0.45, 1.5)
}

export function getRecencyModifier(action: ActionType, context: TickContext): number {
  const previousAction = context.instance.actionHistory.at(-1)?.type

  if (previousAction !== action) {
    return 1
  }

  if (action === 'EAT' && context.instance.state.hunger < 25) {
    return 0.35
  }

  if ((action === 'INTERACT' || action === 'FOLLOW') && context.instance.state.socialNeed < 20) {
    return 0.72
  }

  if (action === 'PLAY' && context.instance.state.stimulationNeed < 18) {
    return 0.74
  }

  return 0.8
}

export function buildActionScoreBreakdown(action: ActionType, context: TickContext): ActionScoreBreakdown {
  const speciesBaseWeight = clamp(context.species.actionBaseWeights[action], 0.1, 3)
  const stateModifier = getStateModifier(action, context)
  const personalityModifier = getPersonalityModifier(action, context.instance.personality)
  const memoryModifier = getMemoryModifier(action, context.instance.memory, context.tick)
  const learningModifier = getLearningModifier(action, context)
  const worldModifier = getWorldModifier(action, context.world)
  const recencyModifier = getRecencyModifier(action, context)
  const finalScore = speciesBaseWeight * stateModifier * personalityModifier * memoryModifier * learningModifier * worldModifier * recencyModifier

  return {
    action,
    speciesBaseWeight,
    stateModifier,
    personalityModifier,
    memoryModifier,
    learningModifier,
    worldModifier,
    recencyModifier,
    finalScore,
  }
}

export function scoreAction(action: ActionType, context: TickContext): number {
  return buildActionScoreBreakdown(action, context).finalScore
}
