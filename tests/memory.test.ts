import { describe, expect, it } from 'vitest'
import type { MemoryEntry } from '../src/types/index.js'
import { decayMemories, getEffectiveMemoryStrength, getMemoryModifier, mergeMemory } from '../src/engine/memory.js'

describe('memory system', () => {
  it('decays effective memory strength over time', () => {
    const entry: MemoryEntry = {
      id: 'play-1',
      actionType: 'PLAY',
      eventKey: 'PLAY-positive',
      emotionDelta: {},
      strength: 1,
      createdAtTick: 1,
      lastReinforcedTick: 1,
      decayRate: 0.02,
      valence: 1,
    }

    expect(getEffectiveMemoryStrength(entry, 50)).toBeLessThan(1)
  })

  it('reinforces an existing matching memory', () => {
    const original: MemoryEntry = {
      id: 'eat-1',
      actionType: 'EAT',
      eventKey: 'EAT-positive',
      emotionDelta: {},
      strength: 0.4,
      createdAtTick: 1,
      lastReinforcedTick: 1,
      decayRate: 0.02,
      valence: 0.8,
    }
    const reinforced: MemoryEntry = {
      ...original,
      id: 'eat-2',
      lastReinforcedTick: 5,
      strength: 0.6,
    }

    const merged = mergeMemory([original], reinforced)
    expect(merged).toHaveLength(1)
    expect(merged[0].strength).toBeGreaterThan(original.strength)
    expect(decayMemories(merged, 100)).toHaveLength(1)
  })

  it('applies stronger suppression for repeated negative EAT memory', () => {
    const negativeEat: MemoryEntry = {
      id: 'eat-neg-1',
      actionType: 'EAT',
      eventKey: 'EAT-negative',
      emotionDelta: {},
      strength: 0.9,
      createdAtTick: 1,
      lastReinforcedTick: 1,
      decayRate: 0.02,
      valence: -1,
    }

    const modifier = getMemoryModifier('EAT', [negativeEat], 2)
    expect(modifier).toBeLessThan(1)
    expect(modifier).toBeLessThanOrEqual(0.75)
  })
})
