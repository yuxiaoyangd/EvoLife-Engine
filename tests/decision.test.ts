import { describe, expect, it } from 'vitest'
import type { TickContext } from '../src/types/index.js'
import { createDefaultEmotionState, createDefaultLearningState, createInitialState, createSeededRandom } from '../src/shared.js'
import { DOG_SPECIES } from '../src/species/dog.js'
import { WeightedDecisionStrategy } from '../src/decision/strategy.js'

function buildContext(overrides?: Partial<TickContext>): TickContext {
  return {
    tick: overrides?.tick ?? 1,
    deltaTicks: overrides?.deltaTicks ?? 1,
    world: overrides?.world ?? {
      tick: 1,
      timeOfDay: 'DAY',
      ambientSafety: 0.9,
      ambientStimulation: 0.7,
      foodAvailability: 0.9,
      socialAvailability: 0.8,
    },
    species: overrides?.species ?? DOG_SPECIES,
    instance: overrides?.instance ?? {
      id: 'dog-1',
      speciesId: 'dog',
      name: 'Nova',
      state: createInitialState(),
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
  }
}

function sampleActions(context: TickContext, sampleSize: number): Map<string, number> {
  const counts = new Map<string, number>()

  for (let index = 0; index < sampleSize; index += 1) {
    const decision = new WeightedDecisionStrategy(createSeededRandom(index + 1)).decide(context)
    counts.set(decision.action.type, (counts.get(decision.action.type) ?? 0) + 1)
  }

  return counts
}

describe('WeightedDecisionStrategy', () => {
  it('favors EAT when hunger is high', () => {
    const context = buildContext({
      instance: {
        ...buildContext().instance,
        state: createInitialState({ hunger: 95, energy: 70, stimulationNeed: 10, socialNeed: 10 }),
      },
    })

    const counts = sampleActions(context, 40)
    expect(counts.get('EAT')).toBeGreaterThan((counts.get('SLEEP') ?? 0))
    expect(counts.get('EAT')).toBeGreaterThan((counts.get('MOVE') ?? 0))
  })

  it('favors SLEEP when energy is low', () => {
    const context = buildContext({
      instance: {
        ...buildContext().instance,
        state: createInitialState({ hunger: 5, energy: 0, stimulationNeed: 0, socialNeed: 0, cleanliness: 100 }),
      },
      world: {
        tick: 1,
        timeOfDay: 'NIGHT',
        ambientSafety: 1,
        ambientStimulation: 0.1,
        foodAvailability: 0.4,
        socialAvailability: 0.2,
      },
    })

    const counts = sampleActions(context, 40)
    expect(counts.get('SLEEP')).toBeGreaterThan((counts.get('EAT') ?? 0))
    expect(counts.get('SLEEP')).toBeGreaterThan((counts.get('MOVE') ?? 0))
  })

  it('does not let EAT dominate when hunger is zero', () => {
    const context = buildContext({
      instance: {
        ...buildContext().instance,
        state: createInitialState({ hunger: 0, energy: 65, stimulationNeed: 45, socialNeed: 35 }),
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
      },
    })

    const counts = sampleActions(context, 40)
    expect((counts.get('EAT') ?? 0)).toBeLessThan((counts.get('PLAY') ?? 0) + (counts.get('INTERACT') ?? 0) + (counts.get('EXPLORE') ?? 0))
  })

  it('returns ranked debug breakdowns', () => {
    const context = buildContext()
    const decision = new WeightedDecisionStrategy(createSeededRandom(1)).decide(context)

    expect(decision.debug.rankedActions.length).toBeGreaterThan(0)
    expect(decision.debug.rankedActions[0].finalScore).toBeGreaterThanOrEqual(decision.debug.rankedActions[1].finalScore)
    expect(decision.debug.selectedAction).toBe(decision.action.type)
  })

  it('favors PLAY when stimulation need is high and energy is healthy', () => {
    const context = buildContext({
      instance: {
        ...buildContext().instance,
        state: createInitialState({ hunger: 20, energy: 75, stimulationNeed: 80, socialNeed: 10 }),
      },
    })

    const counts = sampleActions(context, 40)
    const playCount = counts.get('PLAY') ?? 0
    const sleepCount = counts.get('SLEEP') ?? 0
    expect(playCount).toBeGreaterThan(sleepCount)
    expect(playCount).toBeGreaterThan(3)
  })

  it('reduces PLAY when energy is too low', () => {
    const highStimLowEnergy = buildContext({
      instance: {
        ...buildContext().instance,
        state: createInitialState({ hunger: 20, energy: 15, stimulationNeed: 80, socialNeed: 10 }),
      },
    })
    const highStimHealthyEnergy = buildContext({
      instance: {
        ...buildContext().instance,
        state: createInitialState({ hunger: 20, energy: 75, stimulationNeed: 80, socialNeed: 10 }),
      },
    })

    const countsLow = sampleActions(highStimLowEnergy, 40)
    const countsHealthy = sampleActions(highStimHealthyEnergy, 40)
    expect(countsHealthy.get('PLAY') ?? 0).toBeGreaterThan(countsLow.get('PLAY') ?? 0)
  })

  it('does not let INTERACT or FOLLOW dominate when social need is near zero', () => {
    const context = buildContext({
      instance: {
        ...buildContext().instance,
        state: createInitialState({ hunger: 25, energy: 60, stimulationNeed: 50, socialNeed: 0 }),
      },
    })

    const counts = sampleActions(context, 40)
    const socialCount = (counts.get('INTERACT') ?? 0) + (counts.get('FOLLOW') ?? 0)
    const otherCount = (counts.get('PLAY') ?? 0) + (counts.get('EXPLORE') ?? 0) + (counts.get('MOVE') ?? 0)
    expect(socialCount).toBeLessThan(otherCount)
  })

  it('does not strongly favor SLEEP when energy is healthy', () => {
    const context = buildContext({
      instance: {
        ...buildContext().instance,
        state: createInitialState({ hunger: 20, energy: 80, stimulationNeed: 40, socialNeed: 30 }),
      },
      world: {
        tick: 1,
        timeOfDay: 'DAY',
        ambientSafety: 0.9,
        ambientStimulation: 0.7,
        foodAvailability: 0.9,
        socialAvailability: 0.8,
      },
    })

    const counts = sampleActions(context, 40)
    const sleepCount = counts.get('SLEEP') ?? 0
    const activeCount = (counts.get('PLAY') ?? 0) + (counts.get('EXPLORE') ?? 0) + (counts.get('INTERACT') ?? 0) + (counts.get('MOVE') ?? 0)
    expect(sleepCount).toBeLessThan(activeCount)
  })
})
