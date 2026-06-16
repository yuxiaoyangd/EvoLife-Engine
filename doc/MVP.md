# EvoLife Engine MVP Scope

## Goal

The MVP exists to prove that one digital life instance can run continuously, make decisions, accumulate experience, and diverge over time without any UI-dependent logic.

## MVP definition

The first buildable version includes:
- one species profile
- one instance
- one in-memory runtime
- one active tick loop
- weighted decision scoring
- real action execution outcomes
- real memory creation and decay
- real learning modifier updates
- real lifecycle stage transitions
- structured event output

## In scope

### Runtime
- single tick pipeline from load to event emission
- deterministic or seeded-random weighted action selection
- instance update each tick
- in-memory instance storage

### Domain
- canonical TypeScript contracts for all core models
- full allowed MVP action set
- one initial species definition, recommended `DOG`

### Systems
- world rule deltas
- decision score calculation
- memory reinforcement and decay
- learning update from action outcomes
- growth stage updates from age ticks

### Output
- machine-readable events
- debug-friendly score and state diagnostics

## Explicitly out of scope

- multiple concurrent instances
- production persistence backend
- network APIs
- rendering or animation system
- expression mapping runtime
- breeding/genetics systems
- freeform LLM decision runtime in MVP
- social graph between multiple individuals

## Deferred but reserved

These are not part of MVP, but interfaces should not block them later:
- `InstanceStore` for persistent storage
- `DecisionStrategy` for LLM-backed decision making
- scheduler abstraction for multi-instance execution
- species catalog expansion
- UI expression adapters

## Recommended first species

Use `DOG` for MVP because it naturally exercises:
- play behavior
- follow behavior
- social need
- curiosity vs rest tradeoffs

This gives the engine a wider visible behavior range than a minimal passive species.

## Acceptance behaviors

MVP should be considered successful only if all of the following are observable:

1. Hunger increases across ticks without needing manual intervention.
2. Low energy makes `SLEEP` more likely than high-energy actions.
3. High hunger makes `EAT` meaningfully more likely.
4. A positive repeated action outcome increases that action's future decision weight.
5. A negative repeated action outcome decreases that action's future decision weight.
6. Memory influence weakens over time through decay.
7. Growth stage changes occur automatically once age thresholds are crossed.
8. Each tick emits structured events without requiring any UI layer.

## Stub guidance

The following may start minimal, but not fake:

- `WorldSnapshot` may use simple scalar values.
- action execution may use a small deterministic effect table.
- memory matching may use basic `eventKey` equality.
- learning may operate only on per-action scalar modifiers.

The following should not be stubbed away if the MVP is meant to validate the concept:
- tick loop
- real decision scoring
- real state change
- real memory update
- real learning update
- real growth update

## Non-goals for the MVP

The MVP is not trying to prove:
- photorealistic behavior
- emergent civilization-scale simulation
- multi-agent ecosystem dynamics
- natural language reasoning quality

It is only trying to prove that a single digital life loop can persist and evolve in a coherent way.

## Exit criteria for moving beyond MVP

Move to the next stage only after the MVP can demonstrate:
- stable multi-tick execution without broken invariants
- observable preference drift caused by memory and learning
- visible stage-based behavior changes
- architecture clean enough to add a second species without redesigning Engine
