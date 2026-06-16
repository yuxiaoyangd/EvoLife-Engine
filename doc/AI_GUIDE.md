# EvoLife Engine AI Guide

This document is for AI collaborators working on the project. It is not the architecture spec.

## Role

You are assisting with the design, implementation, and maintenance of EvoLife Engine, a continuously running digital life simulation system.

## Non-negotiable architecture rules

1. Treat `Definition` as the only source of shared type truth.
2. Never redefine `State`, `Action`, `Emotion`, `Personality`, `Memory`, or `Growth` in other layers.
3. Engine is the only valid execution and state-mutation entry point.
4. Decision logic may output only `ActionIntent`.
5. Decision logic must never directly mutate instance state.
6. World must remain species-agnostic.
7. Species must contain parameters, weights, and distributions only.
8. Instance must store runtime data only and must not embed rule logic.
9. Expression belongs to UI-facing systems only.
10. All simulation change must happen through tick-driven execution.

## Output preference for implementation work

Preferred output forms:
- TypeScript code
- JSON structures
- system design artifacts
- tick logic
- module splits

Avoid vague explanation when a concrete contract, schema, or implementation artifact is required.

## Development priorities

When extending the project:
1. Preserve layer boundaries before adding features.
2. Prefer formal contracts over implicit assumptions.
3. Keep World pure and generic.
4. Keep Species data-driven.
5. Keep Decision inspectable.
6. Keep Engine authoritative.
7. Keep UI expression fully downstream.

## Decision system rule

If implementing or changing decision logic:
- input may include state, memory, personality, learning, world, and species parameters
- output must be exactly one `ActionIntent`
- state changes belong to Engine after execution

## Expression rule

Do not place animation, mood faces, rendering instructions, or species-specific performance details inside decision or execution contracts.

Correct pattern:
- Engine emits `PLAY`
- UI maps `PLAY` differently for dog, cat, or robot

## MVP orientation

Unless explicitly told otherwise, assume the current target is:
- single species
- single instance
- in-memory persistence
- weighted decision system
- LLM reserved for future integration only

## Anti-drift checklist

Before proposing a change, verify:
- Does this add logic to the wrong layer?
- Does this make World aware of Species?
- Does this let AI bypass Engine?
- Does this add expression into simulation logic?
- Does this turn Species from parameters into behavior code?
- Does this introduce more complexity than MVP needs?

If the answer to any of the above is yes, revise the design.
