import type { ActionType, InteractionRequest, Instance, SimulationSnapshot, TickContext, TickResult, WorldSnapshot } from './types/index.js'
import { createDefaultEmotionState, createDefaultLearningState, createInitialState, createPersonality, clone } from './shared.js'
import { DOG_SPECIES } from './species/dog.js'
import { InMemoryInstanceStore } from './store/inMemory.js'
import { executeTick } from './engine/tick.js'

const INSTANCE_ID = 'dog-001'
const USER_ACTIONS: InteractionRequest['actionType'][] = ['EAT', 'SLEEP', 'PLAY', 'INTERACT', 'FOLLOW', 'GROOM']

export class EvoLifeRuntime {
  private tick = 0
  private readonly store = new InMemoryInstanceStore(createInitialInstance())
  private latestResult?: TickResult
  private pendingRequestedActionType?: InteractionRequest['actionType']

  async getSnapshot(): Promise<SimulationSnapshot> {
    const instance = await this.store.load(INSTANCE_ID)

    return {
      tick: this.tick,
      world: createWorldSnapshot(this.tick),
      instance,
      latestResult: this.latestResult ? clone(this.latestResult) : undefined,
      pendingRequestedActionType: this.pendingRequestedActionType,
    }
  }

  async advanceTick(): Promise<TickResult> {
    const instance = await this.store.load(INSTANCE_ID)
    const nextTick = this.tick + 1
    const result = executeTick(this.buildContext(instance, nextTick), {
      requestedActionType: this.pendingRequestedActionType,
    })

    await this.store.save(result.instanceAfter)
    this.tick = nextTick
    this.latestResult = clone(result)
    this.pendingRequestedActionType = undefined

    return clone(result)
  }

  requestInteraction(request: InteractionRequest) {
    if (!USER_ACTIONS.includes(request.actionType)) {
      throw new Error(`Unsupported interaction action: ${request.actionType}`)
    }

    this.pendingRequestedActionType = request.actionType
  }

  getLatestDebug() {
    return {
      tick: this.tick,
      pendingRequestedActionType: this.pendingRequestedActionType,
      decisionDebug: this.latestResult?.decisionDebug ? clone(this.latestResult.decisionDebug) : undefined,
      emittedEvents: this.latestResult?.emittedEvents ? clone(this.latestResult.emittedEvents) : [],
      latestResult: this.latestResult ? clone(this.latestResult) : undefined,
    }
  }

  private buildContext(instance: Instance, tick: number): TickContext {
    return {
      tick,
      deltaTicks: 1,
      world: createWorldSnapshot(tick),
      species: DOG_SPECIES,
      instance,
    }
  }
}

export function createWorldSnapshot(tick: number): WorldSnapshot {
  const cycle = tick % 4
  const timeOfDay = (['DAWN', 'DAY', 'DUSK', 'NIGHT'] as const)[cycle]

  return {
    tick,
    timeOfDay,
    ambientSafety: 0.85,
    ambientStimulation: 0.65,
    foodAvailability: 0.8,
    socialAvailability: 0.75,
  }
}

export function createInitialInstance(): Instance {
  return {
    id: INSTANCE_ID,
    speciesId: DOG_SPECIES.id,
    name: 'Nova',
    state: createInitialState({
      hunger: 62,
      energy: 48,
      ageTicks: 980,
      lastSleepTick: 0,
    }),
    emotion: createDefaultEmotionState(),
    personality: createPersonality(DOG_SPECIES.basePersonality),
    memory: [],
    learning: createDefaultLearningState(),
    growthStage: 'BABY',
    currentAction: undefined,
    actionHistory: [],
    createdAtTick: 0,
    updatedAtTick: 0,
  }
}

export function isSupportedInteractionAction(actionType: ActionType): actionType is InteractionRequest['actionType'] {
  return USER_ACTIONS.includes(actionType as InteractionRequest['actionType'])
}
