import type { DecisionDebugSnapshot, EngineEvent, Instance, WorldSnapshot } from './types/index.js'
import { EvoLifeRuntime, createWorldSnapshot } from './runtime.js'

function formatState(instance: Instance): string {
  const { hunger, energy, socialNeed, stimulationNeed, cleanliness } = instance.state
  return `饥饿=${hunger.toFixed(1)} 精力=${energy.toFixed(1)} 社交需求=${socialNeed.toFixed(1)} 刺激需求=${stimulationNeed.toFixed(1)} 清洁度=${cleanliness.toFixed(1)}`
}

function formatTopScores(debug: DecisionDebugSnapshot): string[] {
  return debug.rankedActions.slice(0, 3).map((entry, index) => {
    return `${index + 1}. ${entry.action} 总分=${entry.finalScore.toFixed(3)} [基础=${entry.speciesBaseWeight.toFixed(2)} 状态=${entry.stateModifier.toFixed(2)} 性格=${entry.personalityModifier.toFixed(2)} 记忆=${entry.memoryModifier.toFixed(2)} 学习=${entry.learningModifier.toFixed(2)} 世界=${entry.worldModifier.toFixed(2)} 连续行为修正=${entry.recencyModifier.toFixed(2)}]`
  })
}

function findEvent<T extends EngineEvent['type']>(events: EngineEvent[], type: T): Extract<EngineEvent, { type: T }> | undefined {
  return events.find((event): event is Extract<EngineEvent, { type: T }> => event.type === type)
}

function printTickSummary(world: WorldSnapshot, result: Awaited<ReturnType<EvoLifeRuntime['advanceTick']>>) {
  const memoryEvent = findEvent(result.emittedEvents, 'MEMORY_RECORDED')
  const growthEvent = findEvent(result.emittedEvents, 'GROWTH_STAGE_CHANGED')

  process.stdout.write(`\n第 ${result.tick} 个 tick\n`)
  process.stdout.write(`变化前：${formatState(result.instanceBefore)}\n`)
  process.stdout.write(`变化后：${formatState(result.instanceAfter)}\n`)
  process.stdout.write(`本次行为：${result.chosenAction.type} 强度=${result.chosenAction.intensity.toFixed(2)} 结果分=${result.actionResult.outcomeScore.toFixed(2)}\n`)
  process.stdout.write(`触发原因：${result.actionResult.notes.join('，')}\n`)
  process.stdout.write('候选动作评分：\n')

  for (const line of formatTopScores(result.decisionDebug)) {
    process.stdout.write(`  ${line}\n`)
  }

  if (memoryEvent) {
    process.stdout.write(`记忆更新：${memoryEvent.memory.eventKey} 强度=${memoryEvent.memory.strength.toFixed(2)} 倾向=${memoryEvent.memory.valence.toFixed(2)}\n`)
  }

  if (growthEvent) {
    process.stdout.write(`成长变化：${growthEvent.from} -> ${growthEvent.to}\n`)
  }

  process.stdout.write(`世界状态：时间=${world.timeOfDay} 食物=${world.foodAvailability.toFixed(2)} 社交=${world.socialAvailability.toFixed(2)} 安全=${world.ambientSafety.toFixed(2)} 环境刺激=${world.ambientStimulation.toFixed(2)}\n`)
}

async function main() {
  const totalTicks = Number(process.env.TICKS ?? 20)
  const runtime = new EvoLifeRuntime()

  for (let tick = 1; tick <= totalTicks; tick += 1) {
    const result = await runtime.advanceTick()
    printTickSummary(createWorldSnapshot(result.tick), result)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
