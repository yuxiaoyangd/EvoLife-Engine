import type { SpeciesProfile } from '../types/index.js'

export const DOG_SPECIES: SpeciesProfile = {
  id: 'dog',
  displayName: 'Dog',
  basePersonality: {
    affection: 0.78,
    independence: 0.36,
    curiosity: 0.69,
    confidence: 0.58,
    patience: 0.41,
    activity: 0.74,
  },
  actionBaseWeights: {
    MOVE: 0.95,
    EAT: 1.08,
    SLEEP: 0.92,
    PLAY: 1.28,
    INTERACT: 1.18,
    FOLLOW: 1.08,
    GROOM: 0.82,
    IDLE: 0.95,
    EXPLORE: 1.16,
  },
  growthModifiers: {
    BABY: {
      learningRateMultiplier: 1.3,
      energyRecoveryMultiplier: 1.1,
      activityMultiplier: 0.9,
      curiosityMultiplier: 1.1,
    },
    JUVENILE: {
      learningRateMultiplier: 1.15,
      energyRecoveryMultiplier: 1,
      activityMultiplier: 1.1,
      curiosityMultiplier: 1.15,
    },
    ADULT: {
      learningRateMultiplier: 1,
      energyRecoveryMultiplier: 1,
      activityMultiplier: 1,
      curiosityMultiplier: 1,
    },
    SENIOR: {
      learningRateMultiplier: 0.85,
      energyRecoveryMultiplier: 0.9,
      activityMultiplier: 0.8,
      curiosityMultiplier: 0.9,
    },
  },
  stateDriftProfile: {
    hungerPerTick: 1.2,
    passiveEnergyRecovery: -0.8,
    passiveCleanlinessLoss: -0.3,
    passiveSocialNeedGain: 0.5,
    passiveStimulationNeedGain: 0.7,
  },
}
