import { describe, expect, it } from 'vitest'
import { createDefaultEmotionState, createDefaultLearningState, createInitialState } from '../src/shared.js'
import { DOG_SPECIES } from '../src/species/dog.js'
import { executeTick } from '../src/engine/tick.js'

describe('executeTick', () => {
  it('emits structured events including decision scoring', () => {
    const result = executeTick({
      tick: 1,
      deltaTicks: 1,
      world: {
        tick: 1,
        timeOfDay: 'DAY',
        ambientSafety: 0.9,
        ambientStimulation: 0.6,
        foodAvailability: 0.8,
        socialAvailability: 0.7,
      },
      species: DOG_SPECIES,
      instance: {
        id: 'dog-1',
        speciesId: 'dog',
        name: 'Nova',
        state: createInitialState({ hunger: 50, ageTicks: 0 }),
        emotion: createDefaultEmotionState(),
        personality: { ...DOG_SPECIES.basePersonality },
        memory: [],
        learning: createDefaultLearningState(),
        growthStage: 'BABY',
        currentAction: undefined,
        actionHistory: [],
        createdAtTick: 0,
        updatedAtTick: 0,
      },
    })

    expect(result.instanceAfter.state.ageTicks).toBe(1)
    expect(result.instanceAfter.state.hunger).not.toBe(result.instanceBefore.state.hunger)
    expect(result.emittedEvents.some((event) => event.type === 'DECISION_SCORED')).toBe(true)
    expect(result.emittedEvents.some((event) => event.type === 'ACTION_CHOSEN')).toBe(true)
    expect(result.emittedEvents.some((event) => event.type === 'STATE_CHANGED')).toBe(true)
    expect(result.decisionDebug.rankedActions.length).toBeGreaterThan(0)
  })

  it('gives strongly negative low-hunger EAT outcomes', () => {
    const result = executeTick({
      tick: 2,
      deltaTicks: 1,
      world: {
        tick: 2,
        timeOfDay: 'DAY',
        ambientSafety: 0.9,
        ambientStimulation: 0.2,
        foodAvailability: 0.8,
        socialAvailability: 0.2,
      },
      species: DOG_SPECIES,
      instance: {
        id: 'dog-1',
        speciesId: 'dog',
        name: 'Nova',
        state: createInitialState({ hunger: 0, energy: 40, stimulationNeed: 0, socialNeed: 0 }),
        emotion: createDefaultEmotionState(),
        personality: { ...DOG_SPECIES.basePersonality },
        memory: [],
        learning: createDefaultLearningState(),
        growthStage: 'BABY',
        currentAction: undefined,
        actionHistory: [{
          type: 'EAT',
          success: true,
          outcomeScore: -1,
          energyDelta: 4,
          hungerDelta: -24,
          healthDelta: 1,
          socialDelta: 0,
          stimulationDelta: 0,
          cleanlinessDelta: -1,
          generatedEmotionDelta: {},
          notes: ['overfed-eat-penalty'],
        }],
        createdAtTick: 0,
        updatedAtTick: 1,
      },
    })

    if (result.chosenAction.type === 'EAT') {
      expect(result.actionResult.outcomeScore).toBeLessThanOrEqual(-0.9)
    } else {
      expect(result.decisionDebug.rankedActions.find((entry) => entry.action === 'EAT')?.finalScore).toBeLessThan(0.2)
    }
  })
})
