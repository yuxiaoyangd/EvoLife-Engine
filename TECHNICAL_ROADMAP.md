# EvoLife Engine Technical Roadmap

This document records the agreed technical rollout for EvoLife Engine. It exists to keep infrastructure decisions aligned with the real maturity of the simulation engine.

## Guiding principle

Build the digital life loop first. Add persistence, infrastructure, frontend, and deployment layers only after the core simulation proves stable and useful.

## Phase 0 — Current MVP target

This is the implementation phase the project is in right now.

### Runtime and language
- Node.js
- TypeScript
- `tsx` for direct local execution
- Vitest for testing

### Runtime scope
- single species
- single instance
- in-memory persistence
- weighted decision system
- no UI dependency
- no live LLM runtime integration

### Development style
- local development first
- CLI or console event output only
- focus on tick loop, decision, memory, learning, and growth
- avoid premature infrastructure work

### Tooling intentionally not included yet
- SQLite
- PostgreSQL
- Redis
- Next.js
- Vercel
- Docker
- PM2
- HTTP API layer
- ORM

## Phase 1 — Optional local persistence

This phase begins only if the MVP needs restart-safe persistence.

### Additions
- SQLite for saving and restoring `Instance` state
- tick history or replay storage if needed
- persistence boundary kept behind an `InstanceStore` interface

### Why this phase exists
SQLite is the lightest next step if in-memory runtime becomes too limiting, while still keeping local development simple.

## Phase 2 — Production-oriented infrastructure

This phase begins only after the local MVP proves that the engine loop and behavior model are worth operating long-term.

### Possible additions
- PostgreSQL for stronger persistent storage
- Redis for caching, coordination, or future scheduler support
- Docker for packaging
- PM2 or equivalent process supervision
- Linux server deployment

### Why these are deferred
At MVP stage they increase complexity without helping prove the core simulation design.

## Phase 3 — Frontend and presentation layer

This phase begins only after the engine produces stable state transitions and useful event output.

### Possible additions
- Next.js frontend
- Vercel deployment for frontend only
- UI event consumers
- expression adapters that map actions to species-specific presentation

### Architecture rule
The frontend must consume events and state from the engine. It must not own simulation logic.

## Phase 4 — Advanced runtime expansion

This phase begins only after single-instance behavior is validated.

### Possible additions
- multi-instance scheduler
- richer species catalog
- social interaction between instances
- optional LLM-backed decision strategies
- long-term analytics or replay tooling

### Architecture rule
Any advanced runtime must preserve the existing layer boundaries and keep Engine as the only execution authority.

## Current recommendation

Use this stack now:
- Node.js
- TypeScript
- `tsx`
- Vitest
- in-memory runtime

Defer everything else until the engine is truly running, testable, and behaviorally convincing.
