# EvoLife Engine Domain Model

This document defines the canonical Definition-layer contracts. All runtime systems must use these shapes as the single source of truth.

## Type conventions

- Numeric behavior weights use `0..1` unless otherwise stated.
- Resource meters use `0..100`.
- Time values use tick-relative units unless explicitly named otherwise.
- `persistent` means stored on `Instance`.
- `derived` means recalculated during tick execution.

## Action types

```ts
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
```

## Growth stage

```ts
export type GrowthStage = 'BABY' | 'JUVENILE' | 'ADULT' | 'SENIOR'
```

## Emotion state

```ts
export interface EmotionState {
  comfort: number
  stress: number
  joy: number
  trust: number
  curiosity: number
}
```

| Field | Type | Range | Owner | Persistence |
| --- | --- | --- | --- | --- |
| `comfort` | `number` | `0..1` | Engine | persistent |
| `stress` | `number` | `0..1` | Engine | persistent |
| `joy` | `number` | `0..1` | Engine | persistent |
| `trust` | `number` | `0..1` | Engine | persistent |
| `curiosity` | `number` | `0..1` | Engine | persistent |

## Personality

```ts
export interface Personality {
  affection: number
  independence: number
  curiosity: number
  confidence: number
  patience: number
  activity: number
}
```

Generation rule:

```ts
Personality = SpeciesBase + RandomDistribution + LearningChange
```

All dimensions use `0..1`.

## State

```ts
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
```

| Field | Type | Range/Unit | Owner | Persistence |
| --- | --- | --- | --- | --- |
| `hunger` | `number` | `0..100` | Engine | persistent |
| `energy` | `number` | `0..100` | Engine | persistent |
| `health` | `number` | `0..100` | Engine | persistent |
| `socialNeed` | `number` | `0..100` | Engine | persistent |
| `stimulationNeed` | `number` | `0..100` | Engine | persistent |
| `cleanliness` | `number` | `0..100` | Engine | persistent |
| `ageTicks` | `number` | tick count | Engine | persistent |
| `lastSleepTick` | `number` | tick index | Engine | persistent |

## Action intent

```ts
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
```

| Field | Type | Range/Unit | Owner | Persistence |
| --- | --- | --- | --- | --- |
| `type` | `ActionType` | enum | Decision system | derived |
| `intensity` | `number` | `0..1` | Decision system | derived |
| `targetId` | `string?` | identifier | Decision system | derived |
| `targetPosition` | `{x:number;y:number}?` | coordinates | Decision system | derived |
| `reasoningTags` | `string[]` | labels | Decision system | derived |

`ActionIntent` is the only decision output allowed before execution.

## Action result

```ts
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
```

`outcomeScore` is normalized to `-1..1` for learning updates.

## Memory entry

```ts
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
```

| Field | Type | Range/Unit | Owner | Persistence |
| --- | --- | --- | --- | --- |
| `id` | `string` | unique id | Engine | persistent |
| `actionType` | `ActionType` | enum | Engine | persistent |
| `eventKey` | `string` | event label | Engine | persistent |
| `emotionDelta` | `Partial<EmotionState>` | emotion modifiers | Engine | persistent |
| `strength` | `number` | `0..1` | Engine | persistent |
| `createdAtTick` | `number` | tick index | Engine | persistent |
| `lastReinforcedTick` | `number` | tick index | Engine | persistent |
| `decayRate` | `number` | `0..1` per decay window | Engine | persistent |
| `valence` | `number` | `-1..1` | Engine | persistent |

## Learning state

```ts
export interface LearningState {
  actionModifiers: Record<ActionType, number>
  actionConfidence: Record<ActionType, number>
  lastUpdatedTick: number
}
```

Notes:
- `actionModifiers` defaults to `1` for every action.
- `actionConfidence` tracks how stable a learned preference is.
- modifiers should be clamped to a bounded range such as `0.5..1.5` in MVP.

## Species profile

```ts
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

export interface SpeciesGrowthModifier {
  learningRateMultiplier: number
  energyRecoveryMultiplier: number
  activityMultiplier: number
  curiosityMultiplier: number
}
```

Species stores parameters only.

## World snapshot

```ts
export interface WorldSnapshot {
  tick: number
  timeOfDay: 'DAWN' | 'DAY' | 'DUSK' | 'NIGHT'
  ambientSafety: number
  ambientStimulation: number
  foodAvailability: number
  socialAvailability: number
}
```

All environment scalars use `0..1` except `tick`.

## Instance

```ts
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
```

`Instance` is the only persistent runtime owner for an individual life entity.

## Tick context

```ts
export interface TickContext {
  tick: number
  deltaTicks: number
  world: WorldSnapshot
  species: SpeciesProfile
  instance: Instance
}
```

## Tick result

```ts
export interface TickResult {
  tick: number
  instanceBefore: Instance
  instanceAfter: Instance
  chosenAction: ActionIntent
  actionResult: ActionResult
  emittedEvents: EngineEvent[]
}
```

## Engine event

```ts
export type EngineEvent =
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
```

## Canonical instance example

```ts
const sampleInstance: Instance = {
  id: 'dog-001',
  speciesId: 'dog',
  name: 'Nova',
  state: {
    hunger: 62,
    energy: 48,
    health: 92,
    socialNeed: 40,
    stimulationNeed: 55,
    cleanliness: 73,
    ageTicks: 1200,
    lastSleepTick: 1188,
  },
  emotion: {
    comfort: 0.62,
    stress: 0.18,
    joy: 0.57,
    trust: 0.71,
    curiosity: 0.66,
  },
  personality: {
    affection: 0.78,
    independence: 0.36,
    curiosity: 0.69,
    confidence: 0.58,
    patience: 0.41,
    activity: 0.74,
  },
  memory: [],
  learning: {
    actionModifiers: {
      MOVE: 1,
      EAT: 1.1,
      SLEEP: 1,
      PLAY: 1,
      INTERACT: 1,
      FOLLOW: 1,
      GROOM: 1,
      IDLE: 1,
      EXPLORE: 1.05,
    },
    actionConfidence: {
      MOVE: 0.4,
      EAT: 0.6,
      SLEEP: 0.3,
      PLAY: 0.5,
      INTERACT: 0.4,
      FOLLOW: 0.2,
      GROOM: 0.2,
      IDLE: 0.3,
      EXPLORE: 0.5,
    },
    lastUpdatedTick: 1199,
  },
  growthStage: 'JUVENILE',
  currentAction: undefined,
  actionHistory: [],
  createdAtTick: 0,
  updatedAtTick: 1199,
}
```
