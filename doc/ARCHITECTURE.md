# EvoLife Engine Architecture

## Purpose

EvoLife Engine is a continuously running digital life simulation engine. It is not a game loop for scripted characters. It is a stateful system in which each life instance persists across ticks, accumulates experience, and diverges over time.

## Architectural principles

1. Engine is the only execution entry point.
2. AI or decision logic may select only `ActionIntent`, never mutate state directly.
3. Expression belongs to UI-facing consumers, not to simulation logic.
4. All simulation changes occur through tick execution.
5. Each layer owns a narrow responsibility and must not absorb adjacent concerns.

## Layer model

The system uses five layers.

### 1. Definition
Owns the canonical types used everywhere else.

Owns:
- State types
- Action types
- Emotion types
- Personality types
- Memory types
- Growth types
- Tick context and result types

May know:
- nothing outside shared type definitions

Must not contain:
- execution logic
- world formulas
- species-specific values
- instance mutation logic

### 2. Engine
Owns tick orchestration and is the sole mutator of instance data.

Owns:
- tick scheduler
- decision invocation
- action execution
- state update sequencing
- memory/learning/growth update ordering
- event emission

May read:
- Definition contracts
- World rules
- Species profiles
- current Instance data

Must not contain:
- species behavior rules embedded as logic
- UI expression logic

### 3. World
Owns species-agnostic environmental rules.

Owns:
- time progression
- hunger drift
- energy recovery/consumption baselines
- environment pressure or stimulation
- global conditions shared by all instances

May read:
- Definition contracts
- world configuration
- current world snapshot

Must not know:
- which species a specific instance belongs to
- any instance identity-specific behavior policy

### 4. Species
Owns species-level parameters only.

Owns:
- baseline personality distributions
- action bias weights
- growth curve parameters
- species constraints
- expression mapping references for downstream UI use

May read:
- Definition contracts

Must not contain:
- direct state mutation
- tick execution logic
- knowledge of a concrete instance

### 5. Instance
Owns the runtime data of one life entity.

Owns:
- current state
- personality vector
- memory collection
- learning state
- growth stage
- action history
- current action intent/result

May contain:
- persistent data only

Must not contain:
- world rule formulas
- species logic
- decision algorithms
- execution procedures

## Dependency rules

Allowed dependency direction:
- Engine -> Definition, World, Species, Instance
- World -> Definition
- Species -> Definition
- Instance -> Definition

Forbidden dependencies:
- World -> Species
- World -> Instance behavior logic
- Species -> Instance
- Instance -> World rules
- Instance -> Species rules
- UI -> Engine internals for mutation

## Core invariants

1. Every state mutation is applied by Engine during a tick.
2. Every chosen behavior is represented as `ActionIntent` before execution.
3. World rules are pure with respect to species identity.
4. Species contributes parameters, not imperative behavior.
5. Instance stores data, not rules.
6. UI receives events and may derive expression, but never feeds expression back into decision logic.

## Tick pipeline

Each tick follows the same ordered pipeline.

| Step | Name | Owner | Input | Output |
| --- | --- | --- | --- | --- |
| 1 | Load instance snapshot | Engine | Instance store | Current `Instance` |
| 2 | Apply world rules | Engine using World | `Instance.state`, `WorldSnapshot` | World-adjusted state delta |
| 3 | Apply species influence | Engine using Species | `SpeciesProfile`, `Instance` | Action and personality modifiers |
| 4 | Compute decision | Engine using Decision system | State, Memory, Learning, Personality, World, Species | `ActionIntent` |
| 5 | Validate action | Engine | `ActionIntent`, current state | Validated `ActionIntent` |
| 6 | Execute action | Engine | Validated `ActionIntent` | Action outcome |
| 7 | Update state | Engine | Prior state, world delta, action outcome | New `State` |
| 8 | Update memory | Engine | Action outcome, emotion shift | New or updated `MemoryEntry` |
| 9 | Update learning | Engine | Outcome feedback, prior learning state | New `LearningState` |
| 10 | Update growth | Engine | Age/lifecycle metrics, current stage | New `GrowthStage` and modifiers |
| 11 | Persist instance | Engine | Updated `Instance` | Saved snapshot |
| 12 | Emit events | Engine | Tick result | `EngineEvent[]` for consumers |

## Tick boundaries

### Tick input
A tick requires:
- one current `Instance`
- one `WorldSnapshot`
- one `SpeciesProfile`
- one elapsed tick delta

### Tick output
A tick produces:
- updated `Instance`
- `ActionResult`
- emitted `EngineEvent[]`
- optional diagnostics for debugging and testing

## Action boundary

Decision logic may emit only an `ActionIntent` using allowed action types.

Initial allowed action set:
- `MOVE`
- `EAT`
- `SLEEP`
- `PLAY`
- `INTERACT`
- `FOLLOW`
- `GROOM`
- `IDLE`
- `EXPLORE`

The action represents intent only. It must not contain:
- animation instructions
- rendering directives
- species-specific expression data

## Expression boundary

Expression is downstream interpretation of simulation events.

Example:
- DOG + `PLAY` -> wag tail, run, jump
- CAT + `PLAY` -> sneak, pounce
- ROBOT + `PLAY` -> light flash, rotate

These mappings do not belong in the decision or engine execution path.

## Extension points

### New species
Add new `SpeciesProfile` data without changing Engine orchestration.

### New actions
Add to `ActionType`, update decision scoring, and define execution semantics in Engine.

### LLM decision strategy
A future decision adapter may propose an `ActionIntent`, but it must still:
- consume the same canonical input context
- return only an `ActionIntent`
- pass through Engine validation and execution

### Multi-instance runtime
A future scheduler may run multiple instances, but each instance must still execute the same isolated tick pipeline.

## MVP architectural stance

The first implementation should keep the full five-layer design but limit runtime scope to:
- one species
- one instance
- in-memory persistence
- weighted decision model
- event output without UI dependency
