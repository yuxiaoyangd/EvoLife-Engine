export type ActionType =
  | 'MOVE'
  | 'EAT'
  | 'SLEEP'
  | 'PLAY'
  | 'INTERACT'
  | 'FOLLOW'
  | 'GROOM'
  | 'IDLE'
  | 'EXPLORE'

export type GrowthStage = 'BABY' | 'JUVENILE' | 'ADULT' | 'SENIOR'

export type TimeOfDay = 'DAWN' | 'DAY' | 'DUSK' | 'NIGHT'

export interface EmotionState {
  comfort: number
  stress: number
  joy: number
  trust: number
  curiosity: number
}

export interface Personality {
  affection: number
  independence: number
  curiosity: number
  confidence: number
  patience: number
  activity: number
}

export interface State {
  hunger: number
  energy: number
  health: number
  socialNeed: number
  stimulationNeed: number
  cleanliness: number
  ageTicks: number
  lastSleepTick: number
}

export interface ActionIntent {
  type: ActionType
  intensity: number
  targetId?: string
  targetPosition?: {
    x: number
    y: number
  }
  reasoningTags: string[]
}

export interface ActionScoreBreakdown {
  action: ActionType
  speciesBaseWeight: number
  stateModifier: number
  personalityModifier: number
  memoryModifier: number
  learningModifier: number
  worldModifier: number
  recencyModifier: number
  finalScore: number
}

export interface DecisionDebugSnapshot {
  rankedActions: ActionScoreBreakdown[]
  selectedAction: ActionType
  selectedScore: number
  totalScore: number
  maxScore: number
}

export interface ActionResult {
  type: ActionType
  success: boolean
  outcomeScore: number
  energyDelta: number
  hungerDelta: number
  healthDelta: number
  socialDelta: number
  stimulationDelta: number
  cleanlinessDelta: number
  generatedEmotionDelta: Partial<EmotionState>
  notes: string[]
}

export interface MemoryEntry {
  id: string
  actionType: ActionType
  eventKey: string
  emotionDelta: Partial<EmotionState>
  strength: number
  createdAtTick: number
  lastReinforcedTick: number
  decayRate: number
  valence: number
}

export interface LearningState {
  actionModifiers: Record<ActionType, number>
  actionConfidence: Record<ActionType, number>
  lastUpdatedTick: number
}

export interface SpeciesGrowthModifier {
  learningRateMultiplier: number
  energyRecoveryMultiplier: number
  activityMultiplier: number
  curiosityMultiplier: number
}

export interface SpeciesProfile {
  id: string
  displayName: string
  basePersonality: Personality
  actionBaseWeights: Record<ActionType, number>
  growthModifiers: Record<GrowthStage, SpeciesGrowthModifier>
  stateDriftProfile: {
    hungerPerTick: number
    passiveEnergyRecovery: number
    passiveCleanlinessLoss: number
    passiveSocialNeedGain: number
    passiveStimulationNeedGain: number
  }
}

export interface WorldSnapshot {
  tick: number
  timeOfDay: TimeOfDay
  ambientSafety: number
  ambientStimulation: number
  foodAvailability: number
  socialAvailability: number
}

export interface Instance {
  id: string
  speciesId: string
  name: string
  state: State
  emotion: EmotionState
  personality: Personality
  memory: MemoryEntry[]
  learning: LearningState
  growthStage: GrowthStage
  currentAction?: ActionIntent
  actionHistory: ActionResult[]
  createdAtTick: number
  updatedAtTick: number
}

export interface TickContext {
  tick: number
  deltaTicks: number
  world: WorldSnapshot
  species: SpeciesProfile
  instance: Instance
}

export interface TickOptions {
  requestedActionType?: ActionType
}

export interface TickResult {
  tick: number
  instanceBefore: Instance
  instanceAfter: Instance
  chosenAction: ActionIntent
  actionResult: ActionResult
  decisionDebug: DecisionDebugSnapshot
  emittedEvents: EngineEvent[]
}

export interface SimulationSnapshot {
  tick: number
  world: WorldSnapshot
  instance: Instance
  latestResult?: TickResult
  pendingRequestedActionType?: ActionType
}

export interface InteractionRequest {
  actionType: Extract<ActionType, 'EAT' | 'SLEEP' | 'PLAY' | 'INTERACT' | 'FOLLOW' | 'GROOM'>
}

export type EngineEvent =
  | {
      type: 'DECISION_SCORED'
      tick: number
      instanceId: string
      debug: DecisionDebugSnapshot
    }
  | {
      type: 'ACTION_CHOSEN'
      tick: number
      instanceId: string
      action: ActionIntent
    }
  | {
      type: 'ACTION_RESOLVED'
      tick: number
      instanceId: string
      result: ActionResult
    }
  | {
      type: 'STATE_CHANGED'
      tick: number
      instanceId: string
      state: State
    }
  | {
      type: 'MEMORY_RECORDED'
      tick: number
      instanceId: string
      memory: MemoryEntry
    }
  | {
      type: 'GROWTH_STAGE_CHANGED'
      tick: number
      instanceId: string
      from: GrowthStage
      to: GrowthStage
    }

export interface WorldStateDelta {
  hungerDelta: number
  energyDelta: number
  socialNeedDelta: number
  stimulationNeedDelta: number
  cleanlinessDelta: number
  emotionDelta: Partial<EmotionState>
}

export interface InstanceStore {
  load(instanceId: string): Promise<Instance>
  save(instance: Instance): Promise<void>
}

export interface RandomSource {
  next(): number
}
