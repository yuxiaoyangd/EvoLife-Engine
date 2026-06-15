import type { ActionIntent, ActionType, DecisionDebugSnapshot, RandomSource, TickContext } from '../types/index.js'
import { ACTION_TYPES, clamp, createSeededRandom } from '../shared.js'
import { buildActionScoreBreakdown } from './scoring.js'

export interface DecisionStrategy {
  decide(context: TickContext): { action: ActionIntent; debug: DecisionDebugSnapshot }
}

export class WeightedDecisionStrategy implements DecisionStrategy {
  constructor(private readonly random: RandomSource = createSeededRandom(123456)) {}

  decide(context: TickContext): { action: ActionIntent; debug: DecisionDebugSnapshot } {
    const rankedActions = ACTION_TYPES
      .map((action) => buildActionScoreBreakdown(action, context))
      .sort((left, right) => right.finalScore - left.finalScore)

    const scores = rankedActions.map((entry) => ({ action: entry.action, score: Math.max(0.0001, entry.finalScore) }))
    const totalScore = scores.reduce((sum, entry) => sum + entry.score, 0)
    const selected = pickWeighted(scores, this.random.next() * totalScore)
    const maxScore = Math.max(...scores.map((entry) => entry.score))
    const selectedBreakdown = rankedActions.find((entry) => entry.action === selected.action) ?? rankedActions[0]

    return {
      action: {
        type: selected.action,
        intensity: clamp(selected.score / maxScore, 0.3, 1),
        reasoningTags: createReasoningTags(selected.action, context),
      },
      debug: {
        rankedActions,
        selectedAction: selected.action,
        selectedScore: selected.score,
        totalScore,
        maxScore,
      },
    }
  }
}

function pickWeighted(entries: Array<{ action: ActionType; score: number }>, target: number) {
  let cursor = 0

  for (const entry of entries) {
    cursor += entry.score
    if (target <= cursor) {
      return entry
    }
  }

  return entries[entries.length - 1]
}

function createReasoningTags(action: ActionType, context: TickContext): string[] {
  const tags: string[] = []
  const { state } = context.instance

  if (state.hunger >= 70 && action === 'EAT') {
    tags.push('high-hunger')
  }

  if (state.energy <= 30 && action === 'SLEEP') {
    tags.push('low-energy')
  }

  if (state.socialNeed >= 60 && (action === 'INTERACT' || action === 'FOLLOW')) {
    tags.push('social-pressure')
  }

  if (state.stimulationNeed >= 60 && (action === 'PLAY' || action === 'EXPLORE' || action === 'MOVE')) {
    tags.push('stimulation-pressure')
  }

  if (context.world.timeOfDay === 'NIGHT' && action === 'SLEEP') {
    tags.push('night-rest-bias')
  }

  if (context.instance.actionHistory.at(-1)?.type === action) {
    tags.push('repeat-action')
  }

  if (tags.length === 0) {
    tags.push('weighted-selection')
  }

  return tags
}
