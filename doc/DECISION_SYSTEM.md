# EvoLife Engine Decision System

## Purpose

The Decision system selects one `ActionIntent` per tick. In MVP it uses a weighted scoring model. It does not mutate state and does not perform execution. It only chooses intent.

## Inputs

The decision function consumes the canonical tick context:

```ts
function decideAction(context: TickContext): ActionIntent
```

Inputs used during scoring:
- `Instance.state`
- `Instance.emotion`
- `Instance.personality`
- recent `Instance.memory`
- `Instance.learning`
- `SpeciesProfile.actionBaseWeights`
- `WorldSnapshot`

## Output boundary

The only legal output is:

```ts
ActionIntent
```

The decision system must not:
- change `State`
- create `MemoryEntry`
- adjust `LearningState`
- emit expression or animation data

## Candidate action set

MVP scores every allowed action:

- `MOVE`
- `EAT`
- `SLEEP`
- `PLAY`
- `INTERACT`
- `FOLLOW`
- `GROOM`
- `IDLE`
- `EXPLORE`

A future optimization may prune impossible actions before scoring, but the contract remains the same.

## Scoring model

### Base formula

```ts
score(action) =
  speciesBaseWeight
  * stateModifier
  * personalityModifier
  * memoryModifier
  * learningModifier
  * worldModifier
```

Each factor must be positive and clamped to a bounded range in MVP so no single subsystem produces unstable behavior.

Recommended clamp ranges:
- `speciesBaseWeight`: `0.1..3`
- `stateModifier`: `0.25..2.5`
- `personalityModifier`: `0.5..1.5`
- `memoryModifier`: `0.7..1.4`
- `learningModifier`: `0.5..1.5`
- `worldModifier`: `0.5..1.5`

## Factor definitions

### 1. Species base weight

Comes directly from `SpeciesProfile.actionBaseWeights[action]`.

Purpose:
- encodes species tendency without introducing imperative logic

Example:
- dogs may start with higher `PLAY` and `FOLLOW`
- cats may start with higher `EXPLORE` and lower `FOLLOW`

### 2. State modifier

Reflects immediate biological and situational pressure.

Example MVP rules:

```ts
EAT      <- increases as hunger rises
SLEEP    <- increases as energy falls
PLAY     <- increases when energy is moderate and stimulationNeed is high
INTERACT <- increases when socialNeed is high
GROOM    <- increases when cleanliness is low
IDLE     <- increases when no urgent drive dominates
EXPLORE  <- increases when stimulationNeed is high and stress is low
MOVE     <- increases when another action implies movement or when exploration pressure is moderate
FOLLOW   <- increases when socialNeed is high and trust is high
```

Suggested rule style:

```ts
stateModifier(EAT) = 0.25 + hunger / 50
stateModifier(SLEEP) = 0.25 + (100 - energy) / 50
```

All formulas should be deterministic and easy to inspect.

### 3. Personality modifier

Uses the six personality dimensions to bias action preference.

Suggested MVP mapping:

- `affection` boosts `INTERACT` and `FOLLOW`
- `independence` boosts `EXPLORE`, reduces `FOLLOW`
- `curiosity` boosts `EXPLORE` and `PLAY`
- `confidence` boosts `INTERACT`, `MOVE`, `EXPLORE`
- `patience` slightly boosts `IDLE`, reduces frantic switching
- `activity` boosts `MOVE`, `PLAY`, `EXPLORE`, reduces `IDLE`

Example:

```ts
personalityModifier(EXPLORE) =
  1
  + 0.25 * personality.curiosity
  + 0.15 * personality.independence
  + 0.10 * personality.activity
```

### 4. Memory modifier

Recent meaningful experiences shape current preference.

Only memories relevant to the candidate action should contribute.

Recommended MVP process:
1. filter memory entries by `actionType === action`
2. decay each memory by age
3. sum weighted valence contributions
4. transform the result into a bounded multiplier

Example:

```ts
memoryInfluence = sum(memory.valence * effectiveStrength)
memoryModifier = clamp(1 + memoryInfluence * 0.2, 0.7, 1.4)
```

Interpretation:
- repeated good `PLAY` outcomes make `PLAY` more likely
- repeated bad `INTERACT` outcomes make `INTERACT` less likely

### 5. Learning modifier

`LearningState` carries compressed preference adjustments across ticks.

For MVP:

```ts
learningModifier(action) = learning.actionModifiers[action]
```

This should change more slowly than memory influence and represent stabilized preference rather than a single event.

### 6. World modifier

World contributes species-agnostic environmental pressure.

Examples:
- low `foodAvailability` reduces `EAT` success expectation
- high `ambientStimulation` raises `EXPLORE` and `PLAY`
- low `ambientSafety` suppresses `EXPLORE` and `MOVE`
- high `socialAvailability` raises `INTERACT` and `FOLLOW`

Example:

```ts
worldModifier(EXPLORE) =
  clamp(0.8 + ambientStimulation * 0.5 - (1 - ambientSafety) * 0.3, 0.5, 1.5)
```

## Selection rule

MVP should use weighted random sampling over normalized scores rather than strict argmax.

Reason:
- avoids deterministic lock-in
- preserves personality bias without producing identical repeated behavior
- still remains fully inspectable

Selection steps:
1. compute scores for all actions
2. clamp to positive values
3. normalize into probabilities
4. sample one action
5. derive `intensity` from the selected action score relative to total urgency

If deterministic testing is needed, use a seeded RNG.

## Intensity rule

`ActionIntent.intensity` should reflect urgency or commitment.

Suggested MVP rule:

```ts
intensity = clamp(selectedScore / maxScore, 0.3, 1)
```

This keeps low-confidence actions from becoming zero-intensity.

## Reasoning tags

The decision system may attach debug labels in `reasoningTags`, for example:
- `high-hunger`
- `low-energy`
- `positive-play-memory`
- `species-bias-follow`
- `night-penalty-explore`

These tags are for observability only.

## Learning update contract

Decision does not update learning directly, but it depends on the following Engine-side contract:

```ts
newModifier = clamp(oldModifier + outcomeScore * learningRate, 0.5, 1.5)
```

Where:
- positive `outcomeScore` reinforces the action
- negative `outcomeScore` suppresses the action
- `learningRate` may vary by growth stage

## Memory interaction contract

Decision reads memory through effective strength, not raw strength.

Recommended effective strength:

```ts
effectiveStrength = strength * exp(-decayRate * ageInTicks)
```

This allows powerful recent experiences to matter more than old weak ones.

## Worked example

Example context for a juvenile dog:

- hunger: `78`
- energy: `35`
- socialNeed: `42`
- stimulationNeed: `58`
- stress: `0.12`
- species base `EAT`: `1.4`
- personality curiosity: `0.69`
- learned `EAT` modifier: `1.1`
- food availability: `0.8`
- one recent positive `EAT` memory contributes `1.08`

Approximate scoring:

```ts
speciesBaseWeight = 1.4
stateModifier = 0.25 + 78 / 50 = 1.81
personalityModifier = 1.00
memoryModifier = 1.08
learningModifier = 1.10
worldModifier = 1.12

score(EAT) = 1.4 * 1.81 * 1.00 * 1.08 * 1.10 * 1.12
           ~= 3.37
```

If this is the highest or one of the highest weighted scores, the sampler is likely to choose:

```ts
{
  type: 'EAT',
  intensity: 0.92,
  reasoningTags: ['high-hunger', 'positive-eat-memory']
}
```

## Future LLM strategy hook

A future strategy adapter may be introduced as:

```ts
interface DecisionStrategy {
  decide(context: TickContext): ActionIntent
}
```

MVP implementation:
- `WeightedDecisionStrategy`

Future implementation:
- `LLMDecisionStrategy`

Rules for any future LLM strategy:
- must consume the same canonical context
- must return only `ActionIntent`
- must not bypass Engine validation
- must not mutate state directly
- should fall back to weighted decision if unavailable or invalid
