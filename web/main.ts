const API_BASE_URL = 'http://localhost:3001'
const ACTION_LABELS: Record<string, string> = {
  EAT: '喂食',
  SLEEP: '休息',
  PLAY: '玩耍',
  INTERACT: '互动',
  FOLLOW: '跟随',
  GROOM: '清洁',
  IDLE: '发呆',
  MOVE: '移动',
  EXPLORE: '探索',
}

interface ActionScoreBreakdown {
  action: string
  finalScore: number
  speciesBaseWeight: number
  stateModifier: number
  personalityModifier: number
  memoryModifier: number
  learningModifier: number
  worldModifier: number
  recencyModifier: number
}

interface ActionResult {
  type: string
  outcomeScore: number
  notes: string[]
}

interface InstanceState {
  hunger: number
  energy: number
  socialNeed: number
  stimulationNeed: number
  cleanliness: number
}

interface Instance {
  name: string
  speciesId: string
  growthStage: string
  state: InstanceState
  currentAction?: { type: string }
}

interface WorldSnapshot {
  tick: number
  timeOfDay: string
  ambientSafety: number
  ambientStimulation: number
  foodAvailability: number
  socialAvailability: number
}

interface TickResult {
  tick: number
  chosenAction: { type: string }
  actionResult: ActionResult
  decisionDebug: {
    rankedActions: ActionScoreBreakdown[]
  }
  emittedEvents: Array<{ type: string; [key: string]: unknown }>
}

interface SimulationSnapshot {
  tick: number
  world: WorldSnapshot
  instance: Instance
  latestResult?: TickResult
  pendingRequestedActionType?: string
}

const root = document.querySelector<HTMLDivElement>('#app')

if (!root) {
  throw new Error('App root not found')
}

const app = root

async function fetchState(): Promise<SimulationSnapshot> {
  const response = await fetch(`${API_BASE_URL}/api/state`)
  if (!response.ok) throw new Error('Failed to load state')
  return response.json()
}

async function postTick() {
  const response = await fetch(`${API_BASE_URL}/api/tick`, { method: 'POST' })
  if (!response.ok) throw new Error('Failed to advance tick')
}

async function postInteract(actionType: string) {
  const response = await fetch(`${API_BASE_URL}/api/interact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actionType }),
  })

  if (!response.ok) throw new Error('Failed to queue interaction')
}

function renderBar(label: string, value: number) {
  return `
    <div class="stat-row">
      <div class="stat-head">
        <span>${label}</span>
        <span>${value.toFixed(1)}</span>
      </div>
      <div class="bar"><div class="bar-fill" style="width:${value}%"></div></div>
    </div>
  `
}

function render(snapshot: SimulationSnapshot, message = '') {
  const result = snapshot.latestResult
  const topScores = result?.decisionDebug.rankedActions.slice(0, 3) ?? []
  const events = result?.emittedEvents.slice(-5) ?? []
  const currentAction = result?.chosenAction.type ?? snapshot.instance.currentAction?.type ?? 'IDLE'

  app.innerHTML = `
    <div class="page">
      <div class="header">
        <div>
          <h1>EvoLife 观察台</h1>
          <p>单实例数字生命面板</p>
        </div>
        <div class="tick-box">
          <div>Tick ${snapshot.tick}</div>
          <div>${snapshot.world.timeOfDay}</div>
        </div>
      </div>

      <div class="layout">
        <section class="panel pet-panel">
          <div class="pet-avatar">◉</div>
          <div class="pet-name">${snapshot.instance.name}</div>
          <div class="pet-meta">${snapshot.instance.speciesId} · ${snapshot.instance.growthStage}</div>
          <div class="pet-action">当前动作：${ACTION_LABELS[currentAction] ?? currentAction}</div>
          <div class="pet-result">结果分：${result?.actionResult.outcomeScore?.toFixed(2) ?? '--'}</div>
          <div class="pet-notes">${result?.actionResult.notes.join('，') ?? '等待第一次 tick'}</div>
          <div class="pending">${snapshot.pendingRequestedActionType ? `已排队：${ACTION_LABELS[snapshot.pendingRequestedActionType] ?? snapshot.pendingRequestedActionType}` : '暂无排队互动'}</div>
        </section>

        <section class="panel status-panel">
          <h2>状态</h2>
          ${renderBar('饥饿', snapshot.instance.state.hunger)}
          ${renderBar('精力', snapshot.instance.state.energy)}
          ${renderBar('社交需求', snapshot.instance.state.socialNeed)}
          ${renderBar('刺激需求', snapshot.instance.state.stimulationNeed)}
          ${renderBar('清洁度', snapshot.instance.state.cleanliness)}
          <div class="world-grid">
            <div>食物 ${snapshot.world.foodAvailability.toFixed(2)}</div>
            <div>社交 ${snapshot.world.socialAvailability.toFixed(2)}</div>
            <div>安全 ${snapshot.world.ambientSafety.toFixed(2)}</div>
            <div>刺激 ${snapshot.world.ambientStimulation.toFixed(2)}</div>
          </div>
        </section>

        <section class="panel debug-panel">
          <h2>决策 Top 3</h2>
          <div class="score-list">
            ${topScores
              .map(
                (item, index) => `
                  <div class="score-item">
                    <div class="score-title">${index + 1}. ${ACTION_LABELS[item.action] ?? item.action}</div>
                    <div class="score-main">总分 ${item.finalScore.toFixed(3)}</div>
                    <div class="score-meta">基础 ${item.speciesBaseWeight.toFixed(2)} · 状态 ${item.stateModifier.toFixed(2)} · 记忆 ${item.memoryModifier.toFixed(2)} · 学习 ${item.learningModifier.toFixed(2)}</div>
                  </div>
                `,
              )
              .join('')}
          </div>
          <h2>最近事件</h2>
          <div class="event-list">
            ${events.map((event) => `<div class="event-item">${event.type}</div>`).join('') || '<div class="event-item">暂无事件</div>'}
          </div>
        </section>
      </div>

      <section class="panel controls-panel">
        <h2>互动</h2>
        <div class="button-row">
          ${['EAT', 'INTERACT', 'PLAY', 'GROOM', 'FOLLOW', 'SLEEP']
            .map((action) => `<button data-action="${action}">${ACTION_LABELS[action]}</button>`)
            .join('')}
          <button data-tick="true" class="tick-button">下一 tick</button>
        </div>
        <div class="message">${message}</div>
      </section>
    </div>
  `

  app.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        const actionType = button.dataset.action
        if (!actionType) return
        await postInteract(actionType)
        const next = await fetchState()
        render(next, `已请求：${ACTION_LABELS[actionType] ?? actionType}`)
      } catch (error) {
        render(snapshot, error instanceof Error ? error.message : '请求失败')
      }
    })
  })

  app.querySelector<HTMLButtonElement>('button[data-tick]')?.addEventListener('click', async () => {
    try {
      await postTick()
      const next = await fetchState()
      render(next, '已推进 1 个 tick')
    } catch (error) {
      render(snapshot, error instanceof Error ? error.message : '推进 tick 失败')
    }
  })
}

async function refresh(message = '') {
  try {
    const snapshot = await fetchState()
    render(snapshot, message)
  } catch (error) {
    app.innerHTML = `<div class="error">${error instanceof Error ? error.message : '加载失败'}</div>`
  }
}

const style = document.createElement('style')
style.textContent = `
  :root {
    color-scheme: dark;
    font-family: Inter, "Microsoft YaHei", sans-serif;
    background: #0f1115;
    color: #f2f5f8;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: radial-gradient(circle at top, #1c2230, #0f1115 50%); }
  .page { max-width: 1280px; margin: 0 auto; padding: 24px; }
  .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
  .header h1 { margin:0; font-size: 32px; }
  .header p { margin: 6px 0 0; color: #97a3b6; }
  .tick-box { text-align:right; color:#d8e2ee; }
  .layout { display:grid; grid-template-columns: 1.1fr 1fr 1.2fr; gap:16px; }
  .panel { background: rgba(20, 24, 32, 0.88); border:1px solid #2c3443; border-radius:18px; padding:18px; box-shadow: 0 10px 30px rgba(0,0,0,.24); }
  .pet-panel { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height: 420px; text-align:center; }
  .pet-avatar { width:140px; height:140px; border-radius:28px; display:flex; align-items:center; justify-content:center; font-size:72px; background: linear-gradient(135deg, #4c8bf5, #7f5af0); margin-bottom:18px; }
  .pet-name { font-size:28px; font-weight:700; }
  .pet-meta, .pet-result, .pet-notes, .pending { color:#aab6c8; margin-top:10px; }
  .pet-action { margin-top:14px; font-size:22px; font-weight:600; }
  h2 { margin:0 0 14px; font-size:18px; }
  .stat-row { margin-bottom:14px; }
  .stat-head { display:flex; justify-content:space-between; margin-bottom:6px; color:#dfe7f1; }
  .bar { height:10px; border-radius:999px; background:#222a36; overflow:hidden; }
  .bar-fill { height:100%; border-radius:999px; background: linear-gradient(90deg, #5eead4, #3b82f6); }
  .world-grid { display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:18px; color:#aab6c8; }
  .score-list, .event-list { display:flex; flex-direction:column; gap:10px; }
  .score-item, .event-item { background:#171c25; border:1px solid #293140; border-radius:12px; padding:10px 12px; }
  .score-title { font-weight:600; margin-bottom:4px; }
  .score-main { color:#90caf9; margin-bottom:4px; }
  .score-meta { color:#97a3b6; font-size:13px; line-height:1.4; }
  .controls-panel { margin-top:16px; }
  .button-row { display:flex; flex-wrap:wrap; gap:12px; }
  button { border:0; border-radius:12px; padding:12px 18px; background:#2f6fed; color:white; cursor:pointer; font-size:15px; }
  button:hover { background:#3d7af0; }
  .tick-button { background:#3c4658; }
  .message { margin-top:14px; min-height:24px; color:#9ec1ff; }
  .error { padding:24px; color:#fff; }
  @media (max-width: 1024px) { .layout { grid-template-columns: 1fr; } }
`
document.head.appendChild(style)

refresh()
window.setInterval(() => {
  void refresh()
}, 2500)
