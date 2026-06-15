import { describe, expect, it } from 'vitest'
import { getGrowthStageForAge } from '../src/engine/growth.js'

describe('growth system', () => {
  it('transitions through documented age thresholds', () => {
    expect(getGrowthStageForAge(0)).toBe('BABY')
    expect(getGrowthStageForAge(1000)).toBe('JUVENILE')
    expect(getGrowthStageForAge(5000)).toBe('ADULT')
    expect(getGrowthStageForAge(12000)).toBe('SENIOR')
  })
})
