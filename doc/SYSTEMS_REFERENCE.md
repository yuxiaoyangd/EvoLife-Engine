# EvoLife Engine Systems Reference

This document specifies the operational systems that support tick execution beyond the core architecture and type model.

## 1. World rules

World rules are species-agnostic functions. They operate on general environmental and physical pressures and never inspect species identity.

### Responsibilities

World rules may influence:
- hunger growth
- passive energy recovery or depletion
- stimulation pressure
- social opportunity level
- perceived safety
- time-of-day conditions

### MVP world update style

World returns state deltas, not direct persistent mutations.

```ts
interface WorldStateDelta {
  hungerDelta: number
  energyDelta: number
  socialNeedDelta: number
  stimulationNeedDelta: number
  cleanlinessDelta: number
  emotionDelta: Partial<EmotionState>
}
```

Example baseline formulas:

```ts
hungerDelta = +1.2 * deltaTicks
energyDelta = -0.8 * deltaTicks
socialNeedDelta = +0.5 * deltaTicks
stimulationNeedDelta = +0.7 * deltaTicks
cleanlinessDelta = -0.3 * deltaTicks
```

Environment may adjust these values. Example:

```ts
if (world.timeOfDay === 'NIGHT') energyDelta += 0.2
if (world.ambientSafety < 0.3) emotionDelta.stress += 0.05
```

## 2. Memory system

Memory records meaningful action outcomes and makes them available to future decision scoring.

### Memory creation

Create or reinforce memory when:
- an action completes with non-trivial outcome
- emotion changes materially
- an event should affect future preference

A trivial or neutral action may skip memory creation in MVP.

### Memory reinforcement

If a new event matches an existing `eventKey` and `actionType`, reinforce instead of always creating a new entry.

Suggested reinforcement rule:

```ts
newStrength = clamp(oldStrength + reinforcementGain * (1 - oldStrength), 0, 1)
lastReinforcedTick = currentTick
valence = clamp((oldValence + newValence) / 2, -1, 1)
```

### Memory decay

Memory influence fades over time without deleting history immediately.

Recommended effective strength:

```ts
effectiveStrength = strength * exp(-decayRate * ageInTicks)
```

Recommended MVP interpretation:
- recent strong memory has meaningful decision impact
- old weak memory trends toward negligible impact
- archival deletion can be deferred until a later optimization phase

### Memory influence window

Decision should prioritize recent or still-strong memories. MVP may use:
- last `20` memories, or
- all memories with effective strength above `0.05`

## 3. Learning system

Learning compresses repeated outcomes into stable action preference adjustments.

### Reward signal

Learning consumes `ActionResult.outcomeScore` in range `-1..1`.

Interpretation:
- `+1` strongly beneficial outcome
- `0` neutral outcome
- `-1` strongly harmful or unsatisfying outcome

### Modifier update

Suggested MVP rule:

```ts
newModifier = clamp(oldModifier + outcomeScore * learningRate, 0.5, 1.5)
```

Suggested confidence update:

```ts
newConfidence = clamp(oldConfidence + Math.abs(outcomeScore) * confidenceRate, 0, 1)
```

### Growth-stage learning rate

MVP recommended defaults:

| Growth stage | Learning rate |
| --- | --- |
| `BABY` | `0.08` |
| `JUVENILE` | `0.06` |
| `ADULT` | `0.04` |
| `SENIOR` | `0.03` |

This makes younger instances adapt faster.

## 4. Growth system

Growth changes long-term behavioral and physiological tendencies.

### Lifecycle stages

- `BABY`
- `JUVENILE`
- `ADULT`
- `SENIOR`

### MVP stage transition rule

Use `state.ageTicks` thresholds.

Recommended initial thresholds:

| From | To | Threshold |
| --- | --- | --- |
| `BABY` | `JUVENILE` | `1000` ticks |
| `JUVENILE` | `ADULT` | `5000` ticks |
| `ADULT` | `SENIOR` | `12000` ticks |

These are MVP constants and should remain configurable.

### Stage effects

Growth may modify:
- learning rate
- energy recovery
- activity tendency
- curiosity tendency

Recommended behavioral direction:

| Stage | Learning | Recovery | Activity | Curiosity |
| --- | --- | --- | --- | --- |
| `BABY` | highest | high | medium | high |
| `JUVENILE` | high | high | high | highest |
| `ADULT` | medium | medium | medium | medium |
| `SENIOR` | lower | lower | lower | medium-low |

## 5. Action execution outcome contract

Engine execution converts `ActionIntent` into `ActionResult`.

MVP should define outcome impact tables per action. Example direction:

- `EAT`: lowers hunger, slightly raises comfort
- `SLEEP`: raises energy, lowers stimulation temporarily
- `PLAY`: lowers stimulation need, may lower energy, may increase joy
- `INTERACT`: lowers social need, may increase trust/joy
- `GROOM`: raises cleanliness, may raise comfort
- `IDLE`: small energy recovery, low impact elsewhere
- `EXPLORE`: lowers stimulation need, may increase stress if safety is low

Detailed per-action tables can remain implementation-facing once code begins, but the contract should stay normalized through `ActionResult`.

## 6. Event output contract

Engine emits structured events after each tick for UI, logging, analytics, or replay.

MVP required event families:
- action chosen
- action resolved
- state changed
- memory recorded
- growth stage changed

Event consumers may derive:
- animation
- text logs
- dashboards
- replay streams

They must not mutate Engine-owned state.

## 7. Persistence contract

### MVP stance

Persistence is in-memory only.

Implications:
- one live `Instance` exists in runtime memory
- tick reads current object state
- tick writes updated object state back to memory
- restart persistence is out of scope for MVP

### Future persistence interface

Reserve a storage boundary like:

```ts
interface InstanceStore {
  load(instanceId: string): Promise<Instance>
  save(instance: Instance): Promise<void>
}
```

Required future guarantees:
- Engine loads a whole instance snapshot per tick
- Engine saves a whole updated snapshot after tick completion
- save should be atomic at the snapshot level
- partial tick writes must not leave corrupted instance state

## 8. Single-instance runtime assumption

MVP operates on exactly one instance at a time.

Consequences:
- no scheduler fairness policy needed yet
- no concurrency control needed yet
- no inter-instance behavior model required yet

Future multi-instance runtime must preserve per-instance tick isolation and define scheduler ordering separately.

## 9. Observability requirements

To keep simulation behavior debuggable, each tick should make these inspectable:
- chosen action
- per-action score breakdown
- state before/after
- created or reinforced memory
- learning modifier changes
- growth stage transitions

These may be emitted as logs, diagnostics, or debug events in implementation.