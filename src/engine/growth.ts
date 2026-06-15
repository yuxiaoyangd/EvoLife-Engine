import type { GrowthStage, SpeciesProfile, State } from '../types/index.js'

const STAGE_THRESHOLDS: Array<{ stage: GrowthStage; minAgeTicks: number }> = [
  { stage: 'SENIOR', minAgeTicks: 12000 },
  { stage: 'ADULT', minAgeTicks: 5000 },
  { stage: 'JUVENILE', minAgeTicks: 1000 },
  { stage: 'BABY', minAgeTicks: 0 },
]

export function getGrowthStageForAge(ageTicks: number): GrowthStage {
  return STAGE_THRESHOLDS.find((entry) => ageTicks >= entry.minAgeTicks)?.stage ?? 'BABY'
}

export function updateGrowthStage(state: State): GrowthStage {
  return getGrowthStageForAge(state.ageTicks)
}

export function getSpeciesGrowthModifier(species: SpeciesProfile, stage: GrowthStage) {
  return species.growthModifiers[stage]
}
