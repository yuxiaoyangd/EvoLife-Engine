import type { ActionType, MemoryEntry, TickContext } from '../types/index.js'
import { ACTION_TYPES, clamp } from '../shared.js'

export function getEffectiveMemoryStrength(memory: MemoryEntry, currentTick: number): number {
  const ageInTicks = Math.max(0, currentTick - memory.lastReinforcedTick)
  return memory.strength * Math.exp(-memory.decayRate * ageInTicks)
}

export function createMemoryId(actionType: ActionType, tick: number): string {
  return `${actionType.toLowerCase()}-${tick}`
}

export function decayMemories(memory: MemoryEntry[], currentTick: number): MemoryEntry[] {
  return memory.filter((entry) => getEffectiveMemoryStrength(entry, currentTick) > 0.05)
}

export function createOrReinforceMemory(context: TickContext, outcomeScore: number): MemoryEntry | null {
  const action = context.instance.currentAction

  if (!action || Math.abs(outcomeScore) < 0.1) {
    return null
  }

  return {
    id: createMemoryId(action.type, context.tick),
    actionType: action.type,
    eventKey: `${action.type}-${Math.sign(outcomeScore) >= 0 ? 'positive' : 'negative'}`,
    emotionDelta: {},
    strength: clamp(Math.abs(outcomeScore), 0.1, 1),
    createdAtTick: context.tick,
    lastReinforcedTick: context.tick,
    decayRate: 0.02,
    valence: clamp(outcomeScore, -1, 1),
  }
}

export function mergeMemory(memory: MemoryEntry[], entry: MemoryEntry | null): MemoryEntry[] {
  if (!entry) {
    return memory
  }

  const existing = memory.find((item) => item.eventKey === entry.eventKey && item.actionType === entry.actionType)

  if (!existing) {
    return [...memory, entry]
  }

  return memory.map((item) => {
    if (item !== existing) {
      return item
    }

    return {
      ...item,
      strength: clamp(item.strength + 0.25 * (1 - item.strength), 0, 1),
      lastReinforcedTick: entry.lastReinforcedTick,
      valence: clamp((item.valence + entry.valence) / 2, -1, 1),
    }
  })
}

export function getMemoryModifier(actionType: ActionType, memory: MemoryEntry[], currentTick: number): number {
  const influence = memory
    .filter((entry) => entry.actionType === actionType)
    .reduce((sum, entry) => sum + entry.valence * getEffectiveMemoryStrength(entry, currentTick), 0)

  return clamp(1 + influence * 0.3, 0.55, 1.4)
}

export function getRecentMemoryByAction(memory: MemoryEntry[]): Record<ActionType, number> {
  const result = Object.fromEntries(ACTION_TYPES.map((action) => [action, 0])) as Record<ActionType, number>

  for (const entry of memory) {
    result[entry.actionType] += entry.valence * entry.strength
  }

  return result
}
