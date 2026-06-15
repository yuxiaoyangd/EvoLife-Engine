import type { ActionIntent, EngineEvent, GrowthStage, TickContext, TickOptions, TickResult } from '../types/index.js'
import { applyEmotionDelta, applyStateDelta, clone } from '../shared.js'
import { WeightedDecisionStrategy } from '../decision/strategy.js'
import { executeAction } from './actions.js'
import { createOrReinforceMemory, decayMemories, mergeMemory } from './memory.js'
import { updateLearning } from './learning.js'
import { updateGrowthStage } from './growth.js'
import { applyWorldRules } from '../world/rules.js'

export function executeTick(context: TickContext, options?: TickOptions): TickResult {
  const instanceBefore = clone(context.instance)
  const worldDelta = applyWorldRules(context)
  const worldAdjustedState = applyStateDelta(context.instance.state, {
    hunger: worldDelta.hungerDelta,
    energy: worldDelta.energyDelta,
    socialNeed: worldDelta.socialNeedDelta,
    stimulationNeed: worldDelta.stimulationNeedDelta,
    cleanliness: worldDelta.cleanlinessDelta,
    ageTicks: context.deltaTicks,
  })
  const worldAdjustedEmotion = applyEmotionDelta(context.instance.emotion, worldDelta.emotionDelta)

  const decisionContext: TickContext = {
    ...context,
    instance: {
      ...context.instance,
      state: worldAdjustedState,
      emotion: worldAdjustedEmotion,
    },
  }

  const autonomousDecision = new WeightedDecisionStrategy().decide(decisionContext)
  const decision = options?.requestedActionType ? createRequestedActionIntent(options.requestedActionType) : autonomousDecision.action
  const decisionDebug = autonomousDecision.debug
  const actionContext: TickContext = {
    ...decisionContext,
    instance: {
      ...decisionContext.instance,
      currentAction: decision,
    },
  }

  const actionResult = executeAction(decision, actionContext)
  const stateAfterAction = applyStateDelta(worldAdjustedState, {
    hunger: actionResult.hungerDelta,
    energy: actionResult.energyDelta,
    health: actionResult.healthDelta,
    socialNeed: actionResult.socialDelta,
    stimulationNeed: actionResult.stimulationDelta,
    cleanliness: actionResult.cleanlinessDelta,
    lastSleepTick: decision.type === 'SLEEP' ? context.tick : worldAdjustedState.lastSleepTick,
  })
  const emotionAfterAction = applyEmotionDelta(worldAdjustedEmotion, actionResult.generatedEmotionDelta)
  const updatedGrowthStage = updateGrowthStage(stateAfterAction)
  const memoryEntry = createOrReinforceMemory(actionContext, actionResult.outcomeScore)
  const updatedMemory = decayMemories(mergeMemory(actionContext.instance.memory, memoryEntry), context.tick)
  const updatedLearning = updateLearning(
    actionContext.instance.learning,
    decision.type,
    actionResult.outcomeScore,
    updatedGrowthStage,
    context.tick,
  )

  const instanceAfter = {
    ...actionContext.instance,
    state: stateAfterAction,
    emotion: emotionAfterAction,
    memory: updatedMemory,
    learning: updatedLearning,
    growthStage: updatedGrowthStage,
    currentAction: decision,
    actionHistory: [...actionContext.instance.actionHistory, actionResult],
    updatedAtTick: context.tick,
  }

  const emittedEvents: EngineEvent[] = [
    {
      type: 'DECISION_SCORED',
      tick: context.tick,
      instanceId: instanceAfter.id,
      debug: decisionDebug,
    },
    {
      type: 'ACTION_CHOSEN',
      tick: context.tick,
      instanceId: instanceAfter.id,
      action: decision,
    },
    {
      type: 'ACTION_RESOLVED',
      tick: context.tick,
      instanceId: instanceAfter.id,
      result: actionResult,
    },
    {
      type: 'STATE_CHANGED',
      tick: context.tick,
      instanceId: instanceAfter.id,
      state: instanceAfter.state,
    },
  ]

  if (memoryEntry) {
    emittedEvents.push({
      type: 'MEMORY_RECORDED',
      tick: context.tick,
      instanceId: instanceAfter.id,
      memory: memoryEntry,
    })
  }

  if (instanceBefore.growthStage !== updatedGrowthStage) {
    emittedEvents.push({
      type: 'GROWTH_STAGE_CHANGED',
      tick: context.tick,
      instanceId: instanceAfter.id,
      from: instanceBefore.growthStage as GrowthStage,
      to: updatedGrowthStage,
    })
  }

  return {
    tick: context.tick,
    instanceBefore,
    instanceAfter,
    chosenAction: decision,
    actionResult,
    decisionDebug,
    emittedEvents,
  }
}

function createRequestedActionIntent(actionType: TickOptions['requestedActionType']): ActionIntent {
  return {
    type: actionType ?? 'IDLE',
    intensity: 1,
    reasoningTags: ['user-requested-action'],
  }
}
