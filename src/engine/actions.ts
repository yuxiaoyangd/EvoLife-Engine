import type { ActionIntent, ActionResult, TickContext } from '../types/index.js'
import { clamp } from '../shared.js'

const ACTION_OUTCOMES: Record<ActionIntent['type'], Omit<ActionResult, 'type' | 'success' | 'notes' | 'outcomeScore'>> = {
  MOVE: {
    energyDelta: -6,
    hungerDelta: 3,
    healthDelta: 0,
    socialDelta: 0,
    stimulationDelta: -8,
    cleanlinessDelta: -2,
    generatedEmotionDelta: { curiosity: 0.03 },
  },
  EAT: {
    energyDelta: 4,
    hungerDelta: -24,
    healthDelta: 1,
    socialDelta: 0,
    stimulationDelta: 0,
    cleanlinessDelta: -1,
    generatedEmotionDelta: { comfort: 0.08, joy: 0.04 },
  },
  SLEEP: {
    energyDelta: 24,
    hungerDelta: 5,
    healthDelta: 1,
    socialDelta: 2,
    stimulationDelta: 4,
    cleanlinessDelta: 0,
    generatedEmotionDelta: { comfort: 0.1, stress: -0.08 },
  },
  PLAY: {
    energyDelta: -10,
    hungerDelta: 4,
    healthDelta: 0,
    socialDelta: -4,
    stimulationDelta: -18,
    cleanlinessDelta: -4,
    generatedEmotionDelta: { joy: 0.1, stress: -0.03 },
  },
  INTERACT: {
    energyDelta: -5,
    hungerDelta: 1,
    healthDelta: 0,
    socialDelta: -18,
    stimulationDelta: -5,
    cleanlinessDelta: 0,
    generatedEmotionDelta: { joy: 0.06, trust: 0.07 },
  },
  FOLLOW: {
    energyDelta: -7,
    hungerDelta: 2,
    healthDelta: 0,
    socialDelta: -12,
    stimulationDelta: -6,
    cleanlinessDelta: -2,
    generatedEmotionDelta: { trust: 0.05 },
  },
  GROOM: {
    energyDelta: -3,
    hungerDelta: 1,
    healthDelta: 0,
    socialDelta: 0,
    stimulationDelta: -2,
    cleanlinessDelta: 16,
    generatedEmotionDelta: { comfort: 0.05 },
  },
  IDLE: {
    energyDelta: 6,
    hungerDelta: 2,
    healthDelta: 0,
    socialDelta: 1,
    stimulationDelta: 2,
    cleanlinessDelta: 0,
    generatedEmotionDelta: { comfort: 0.02 },
  },
  EXPLORE: {
    energyDelta: -8,
    hungerDelta: 3,
    healthDelta: 0,
    socialDelta: -2,
    stimulationDelta: -14,
    cleanlinessDelta: -3,
    generatedEmotionDelta: { curiosity: 0.06, joy: 0.03 },
  },
}

function calculateOutcomeScore(intent: ActionIntent, context: TickContext): number {
  const { state, emotion } = context.instance

  switch (intent.type) {
    case 'EAT': {
      if (state.hunger <= 10) {
        return -1
      }

      if (state.hunger <= 25) {
        return clamp(-0.7 + (state.hunger - 10) / 30, -1, -0.2)
      }

      if (state.hunger <= 45) {
        return clamp((state.hunger - 25) / 40 - 0.2, -0.2, 0.4)
      }

      return clamp((state.hunger - 45) / 40 + 0.2, 0.2, 1)
    }
    case 'SLEEP': {
      const timeBonus = context.world.timeOfDay === 'NIGHT' ? 0.1 : context.world.timeOfDay === 'DUSK' ? 0.04 : 0
      const restNeed = clamp((35 - state.energy) / 35, -0.6, 1)
      const hungerPenalty = state.hunger > 70 ? 0.15 : 0
      return clamp(restNeed + timeBonus - hungerPenalty, -0.7, 1)
    }
    case 'PLAY': {
      const stimulationBenefit = clamp((state.stimulationNeed - 28) / 55, -0.4, 0.9)
      const energyPenalty = state.energy < 35 ? (35 - state.energy) / 40 : 0
      const hungerPenalty = state.hunger > 55 ? (state.hunger - 55) / 60 : 0
      return clamp(stimulationBenefit - energyPenalty - hungerPenalty, -0.8, 0.9)
    }
    case 'INTERACT': {
      const socialBenefit = clamp((state.socialNeed - 18) / 50, -0.3, 0.9)
      const lowNeedPenalty = state.socialNeed < 15 ? (15 - state.socialNeed) / 45 : 0
      const trustBonus = emotion.trust > 0.6 ? 0.08 : 0
      return clamp(socialBenefit - lowNeedPenalty + trustBonus, -0.6, 1)
    }
    case 'FOLLOW': {
      const socialBenefit = clamp((state.socialNeed - 24) / 55, -0.25, 0.75)
      const trustBonus = clamp((emotion.trust - 0.45) * 0.35, -0.05, 0.2)
      const lowNeedPenalty = state.socialNeed < 18 ? (18 - state.socialNeed) / 35 : 0
      return clamp(socialBenefit + trustBonus - lowNeedPenalty, -0.65, 0.85)
    }
    case 'GROOM':
      return clamp((55 - state.cleanliness) / 55, -1, 1)
    case 'EXPLORE': {
      const stimulationBenefit = clamp((state.stimulationNeed - 32) / 45, -0.55, 0.85)
      const lowStimPenalty = state.stimulationNeed < 18 ? (18 - state.stimulationNeed) / 28 : 0
      const energyPenalty = state.energy < 30 ? (30 - state.energy) / 45 : 0
      const hungerPenalty = state.hunger > 60 ? (state.hunger - 60) / 70 : 0
      return clamp(stimulationBenefit - lowStimPenalty - energyPenalty - hungerPenalty, -0.85, 0.9)
    }
    case 'MOVE':
      return clamp((state.stimulationNeed - 30) / 70, -1, 1)
    case 'IDLE':
      return clamp((60 - state.energy) / 100, -0.3, 0.6)
    default:
      return 0
  }
}

function buildOutcomeNotes(intent: ActionIntent, context: TickContext, outcomeScore: number): string[] {
  const notes = [...intent.reasoningTags]

  if (intent.type === 'EAT' && context.instance.state.hunger <= 10) {
    notes.push('低饥饿进食惩罚')
  }

  if (intent.type === 'EAT' && outcomeScore < 0) {
    notes.push('当前并不太饿')
  }

  if (intent.type === 'SLEEP' && context.instance.state.energy <= 20) {
    notes.push('确实需要休息')
  }

  if (intent.type === 'SLEEP' && context.instance.state.energy >= 65) {
    notes.push('精力充足无需睡眠')
  }

  if (intent.type === 'PLAY' && context.instance.state.energy < 35) {
    notes.push('玩耍过度消耗')
  }

  if (intent.type === 'EXPLORE' && context.instance.state.stimulationNeed < 18) {
    notes.push('刺激需求不足仍在探索')
  }

  if ((intent.type === 'INTERACT' || intent.type === 'FOLLOW') && context.instance.state.socialNeed < 18) {
    notes.push('社交需求不足')
  }

  if (intent.type === 'FOLLOW' && context.instance.state.socialNeed < 25) {
    notes.push('跟随收益一般')
  }

  return notes
}

export function executeAction(intent: ActionIntent, context: TickContext): ActionResult {
  const outcome = ACTION_OUTCOMES[intent.type]
  const outcomeScore = calculateOutcomeScore(intent, context)

  return {
    type: intent.type,
    success: true,
    outcomeScore,
    notes: buildOutcomeNotes(intent, context, outcomeScore),
    ...outcome,
  }
}
