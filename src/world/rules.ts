import type { TickContext, WorldStateDelta } from '../types/index.js'

export function applyWorldRules(context: TickContext): WorldStateDelta {
  const { deltaTicks, world, species } = context

  let hungerDelta = species.stateDriftProfile.hungerPerTick * deltaTicks
  let energyDelta = species.stateDriftProfile.passiveEnergyRecovery * deltaTicks
  const socialNeedDelta = species.stateDriftProfile.passiveSocialNeedGain * deltaTicks
  const stimulationNeedDelta = species.stateDriftProfile.passiveStimulationNeedGain * deltaTicks
  const cleanlinessDelta = species.stateDriftProfile.passiveCleanlinessLoss * deltaTicks
  const emotionDelta: WorldStateDelta['emotionDelta'] = {}

  if (world.timeOfDay === 'NIGHT') {
    energyDelta += 0.2 * deltaTicks
  }

  if (world.ambientSafety < 0.3) {
    emotionDelta.stress = 0.05
  }

  if (world.ambientStimulation > 0.7) {
    emotionDelta.curiosity = 0.03
  }

  if (world.ambientSafety > 0.8) {
    emotionDelta.comfort = 0.02
  }

  return {
    hungerDelta,
    energyDelta,
    socialNeedDelta,
    stimulationNeedDelta,
    cleanlinessDelta,
    emotionDelta,
  }
}
