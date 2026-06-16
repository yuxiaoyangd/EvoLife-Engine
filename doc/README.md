# EvoLife Engine

EvoLife Engine is a continuously running digital life simulation engine. Its goal is to let each life instance persist across ticks, form memory, learn from outcomes, and diverge over time.

This repository currently defines the system as an engineering specification before implementation begins.

## Document map

- [ARCHITECTURE.md](ARCHITECTURE.md) — five-layer architecture, invariants, and tick pipeline
- [DOMAIN_MODEL.md](DOMAIN_MODEL.md) — canonical TypeScript-first type contracts
- [DECISION_SYSTEM.md](DECISION_SYSTEM.md) — weighted decision model for MVP and future LLM extension point
- [SYSTEMS_REFERENCE.md](SYSTEMS_REFERENCE.md) — world, memory, learning, growth, events, and persistence boundaries
- [MVP.md](MVP.md) — first implementation scope and acceptance criteria
- [TECHNICAL_ROADMAP.md](TECHNICAL_ROADMAP.md) — phased technical rollout from local MVP to future infrastructure
- [AI_GUIDE.md](AI_GUIDE.md) — AI collaborator rules, separated from engineering specs
- [EvoLife Engine 开发文档.md](EvoLife%20Engine%20开发文档.md) — original source document retained as reference

## Project stance

The current planned first version is:
- single species
- single instance
- in-memory persistence
- weighted decision system
- tick-driven runtime
- no UI dependency beyond emitted events
- no live LLM decision runtime in MVP

## Recommended reading order

1. [ARCHITECTURE.md](ARCHITECTURE.md)
2. [DOMAIN_MODEL.md](DOMAIN_MODEL.md)
3. [DECISION_SYSTEM.md](DECISION_SYSTEM.md)
4. [SYSTEMS_REFERENCE.md](SYSTEMS_REFERENCE.md)
5. [MVP.md](MVP.md)
6. [TECHNICAL_ROADMAP.md](TECHNICAL_ROADMAP.md)
7. [AI_GUIDE.md](AI_GUIDE.md)

## Intended outcome

The documentation set is designed so implementation can begin with clear contracts instead of relying on prompt-like assumptions. The immediate goal is to build a minimal but real digital life loop that can:
- make autonomous action choices
- update state every tick
- remember outcomes
- learn action preferences
- progress through lifecycle stages
- remain extensible for future multi-species and LLM-backed strategies
