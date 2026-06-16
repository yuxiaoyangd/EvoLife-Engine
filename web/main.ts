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
const SPEED_PRESETS = {
  slow: 4000,
  normal: 2000,
  fast: 1000,
} as const

type SpeedPreset = keyof typeof SPEED_PRESETS

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

interface MemoryEntry {
  actionType: string
  eventKey: string
  strength: number
  createdAtTick: number
  lastReinforcedTick: number
  decayRate: number
  valence: number
}

interface LearningState {
  actionModifiers: Record<string, number>
  actionConfidence: Record<string, number>
  lastUpdatedTick: number
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
  memory: MemoryEntry[]
  learning: LearningState
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

interface DerivedMemoryItem {
  actionType: string
  eventKey: string
  effectiveStrength: number
  influence: number
  valence: number
  ageTicks: number
  lastReinforcedTick: number
}

interface DerivedLearningItem {
  action: string
  modifier: number
  confidence: number
  tendency: string
}

const root = document.querySelector<HTMLDivElement>('#app')

if (!root) {
  throw new Error('App root not found')
}

const app = root
let currentSnapshot: SimulationSnapshot | null = null
let statusMessage = ''
let autoTickEnabled = false
let selectedSpeed: SpeedPreset = 'normal'
let autoTickTimer: number | null = null
let isTickInFlight = false
let passiveRefreshTimer: number | null = null
let hasMounted = false

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

async function postReset(): Promise<SimulationSnapshot> {
  const response = await fetch(`${API_BASE_URL}/api/reset`, { method: 'POST' })
  if (!response.ok) throw new Error('Failed to reset')
  return response.json()
}

function getEffectiveMemoryStrength(memory: MemoryEntry, currentTick: number): number {
  const ageInTicks = Math.max(0, currentTick - memory.lastReinforcedTick)
  return memory.strength * Math.exp(-memory.decayRate * ageInTicks)
}

function deriveMemories(snapshot: SimulationSnapshot): DerivedMemoryItem[] {
  return snapshot.instance.memory
    .map((entry) => {
      const effectiveStrength = getEffectiveMemoryStrength(entry, snapshot.tick)
      return {
        actionType: entry.actionType,
        eventKey: entry.eventKey,
        effectiveStrength,
        influence: entry.valence * effectiveStrength,
        valence: entry.valence,
        ageTicks: Math.max(0, snapshot.tick - entry.lastReinforcedTick),
        lastReinforcedTick: entry.lastReinforcedTick,
      }
    })
    .sort((left, right) => Math.abs(right.influence) - Math.abs(left.influence))
    .slice(0, 5)
}

function deriveLearning(snapshot: SimulationSnapshot): DerivedLearningItem[] {
  return Object.entries(snapshot.instance.learning.actionModifiers)
    .map(([action, modifier]) => ({
      action,
      modifier,
      confidence: snapshot.instance.learning.actionConfidence[action] ?? 0,
      tendency: modifier > 1.05 ? '偏好' : modifier < 0.95 ? '抑制' : '中性',
    }))
    .sort((left, right) => Math.abs(right.modifier - 1) - Math.abs(left.modifier - 1))
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

function renderAutoTickControls() {
  return `
    <div class="auto-controls">
      <button data-auto-toggle="true" class="auto-button ${autoTickEnabled ? 'active' : ''}">${autoTickEnabled ? '暂停' : '开始'}</button>
      <label class="speed-control">
        <span>速度</span>
        <select data-speed-select="true">
          <option value="slow" ${selectedSpeed === 'slow' ? 'selected' : ''}>慢</option>
          <option value="normal" ${selectedSpeed === 'normal' ? 'selected' : ''}>正常</option>
          <option value="fast" ${selectedSpeed === 'fast' ? 'selected' : ''}>快</option>
        </select>
      </label>
      <div class="run-status">${autoTickEnabled ? `运行中 · ${SPEED_PRESETS[selectedSpeed] / 1000}s/tick` : '已暂停'}</div>
    </div>
  `
}

function renderMemoryPanel(snapshot: SimulationSnapshot) {
  const items = deriveMemories(snapshot)

  return `
    <section class="panel side-panel memory-panel">
      <h2>记忆</h2>
      <div class="memory-list">
        ${items.length > 0
          ? items
              .map(
                (item) => `
                  <div class="memory-item ${item.valence >= 0 ? 'positive' : 'negative'}">
                    <div class="memory-top">
                      <span>${ACTION_LABELS[item.actionType] ?? item.actionType}</span>
                      <span>${item.valence >= 0 ? '正向' : '负向'}</span>
                    </div>
                    <div class="memory-meta">${item.eventKey}</div>
                    <div class="memory-meta">强度 ${item.effectiveStrength.toFixed(2)} · 影响 ${item.influence.toFixed(2)}</div>
                    <div class="memory-meta">距今 ${item.ageTicks} tick</div>
                  </div>
                `,
              )
              .join('')
          : '<div class="empty-item">暂无记忆</div>'}
      </div>
    </section>
  `
}

function renderLearningPanel(snapshot: SimulationSnapshot) {
  const items = deriveLearning(snapshot)

  return `
    <section class="panel side-panel learning-panel">
      <h2>学习</h2>
      <div class="learning-list">
        ${items
          .map(
            (item) => `
              <div class="learning-item">
                <div class="learning-head">
                  <span>${ACTION_LABELS[item.action] ?? item.action}</span>
                  <span>${item.tendency}</span>
                </div>
                <div class="learning-meta">修正 ${item.modifier.toFixed(2)} · 置信 ${item.confidence.toFixed(2)}</div>
                <div class="learning-bars">
                  <div class="mini-row">
                    <span>modifier</span>
                    <div class="mini-bar"><div class="mini-bar-fill modifier" style="width:${Math.min(100, item.modifier / 1.5 * 100)}%"></div></div>
                  </div>
                  <div class="mini-row">
                    <span>confidence</span>
                    <div class="mini-bar"><div class="mini-bar-fill confidence" style="width:${Math.min(100, item.confidence * 100)}%"></div></div>
                  </div>
                </div>
              </div>
            `,
          )
          .join('')}
      </div>
      <div class="learning-foot">最近更新：Tick ${snapshot.instance.learning.lastUpdatedTick}</div>
    </section>
  `
}

function render(snapshot: SimulationSnapshot, message = statusMessage) {
  currentSnapshot = snapshot
  statusMessage = message

  const result = snapshot.latestResult
  const topScores = result?.decisionDebug.rankedActions.slice(0, 3) ?? []
  const events = result?.emittedEvents.slice(-5) ?? []
  const currentAction = result?.chosenAction.type ?? snapshot.instance.currentAction?.type ?? 'IDLE'

  if (!hasMounted) {
    app.innerHTML = `
      <div class="page">
        <div class="header">
          <div>
            <h1>EvoLife 观察台</h1>
            <p>单实例数字生命面板</p>
          </div>
          <div class="tick-box" data-slot="tick-box"></div>
        </div>

        <div class="main-layout">
          <div class="side-panel-col">
            <div data-slot="memory-panel">${renderMemoryPanel(snapshot)}</div>
            <div data-slot="learning-panel">${renderLearningPanel(snapshot)}</div>
          </div>

          <div class="content-col">
            <div class="layout layout-wide">
              <div data-slot="pet-panel"></div>
              <div data-slot="status-panel"></div>
              <div data-slot="debug-panel"></div>
            </div>

            <section class="panel controls-panel">
              <h2>控制</h2>
              ${renderAutoTickControls()}
              <div class="bottom-action-row">
                ${['EAT', 'INTERACT', 'PLAY', 'GROOM', 'FOLLOW', 'SLEEP']
                  .map((action) => `<button data-action="${action}" class="compact-button">${ACTION_LABELS[action]}</button>`)
                  .join('')}
                <button data-tick="true" class="tick-button compact-button" ${autoTickEnabled ? 'disabled' : ''}>下一 tick</button>
                <button data-reset="true" class="reset-button compact-button">重置</button>
              </div>
              <div class="message">${message}</div>
            </section>
          </div>
        </div>
      </div>
    `

    bindEvents()
    hasMounted = true
  }

  app.querySelector('[data-slot="tick-box"]')!.innerHTML = `
    <div>Tick ${snapshot.tick}</div>
    <div>${snapshot.world.timeOfDay}</div>
  `

  app.querySelector('[data-slot="pet-panel"]')!.innerHTML = `
    <section class="panel pet-panel panel-xl">
      <div class="pet-avatar ${currentAction.toLowerCase()}">◉</div>
      <div class="pet-name">${snapshot.instance.name}</div>
      <div class="pet-meta">${snapshot.instance.speciesId} · ${snapshot.instance.growthStage}</div>
      <div class="pet-action">当前动作：${ACTION_LABELS[currentAction] ?? currentAction}</div>
      <div class="pet-result">结果分：${result?.actionResult.outcomeScore?.toFixed(2) ?? '--'}</div>
      <div class="pet-notes">${result?.actionResult.notes.join('，') ?? '等待第一次 tick'}</div>
      <div class="pending">${snapshot.pendingRequestedActionType ? `已排队：${ACTION_LABELS[snapshot.pendingRequestedActionType] ?? snapshot.pendingRequestedActionType}` : '暂无排队互动'}</div>
    </section>
  `
  app.querySelector('[data-slot="status-panel"]')!.innerHTML = `
    <section class="panel status-panel panel-xl">
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
  `
  app.querySelector('[data-slot="debug-panel"]')!.innerHTML = `
    <section class="panel debug-panel panel-xl">
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
  `

  const autoToggleButton = app.querySelector<HTMLButtonElement>('button[data-auto-toggle]')
  if (autoToggleButton) {
    autoToggleButton.textContent = autoTickEnabled ? '暂停' : '开始'
    autoToggleButton.classList.toggle('active', autoTickEnabled)
  }

  const speedSelect = app.querySelector<HTMLSelectElement>('select[data-speed-select]')
  if (speedSelect) {
    speedSelect.value = selectedSpeed
  }

  const runStatus = app.querySelector('.run-status')
  if (runStatus) {
    runStatus.textContent = autoTickEnabled ? `运行中 · ${SPEED_PRESETS[selectedSpeed] / 1000}s/tick` : '已暂停'
  }

  const tickButton = app.querySelector<HTMLButtonElement>('button[data-tick]')
  if (tickButton) {
    tickButton.disabled = autoTickEnabled
  }

  const messageNode = app.querySelector('.message')
  if (messageNode) {
    messageNode.textContent = message
  }
}

function bindEvents() {
  app.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!currentSnapshot || isTickInFlight) return

      try {
        const actionType = button.dataset.action
        if (!actionType) return
        await postInteract(actionType)
        const next = await fetchState()
        render(next, `已请求：${ACTION_LABELS[actionType] ?? actionType}`)
      } catch (error) {
        render(currentSnapshot, error instanceof Error ? error.message : '请求失败')
      }
    })
  })

  app.querySelector<HTMLButtonElement>('button[data-tick]')?.addEventListener('click', async () => {
    if (!currentSnapshot || autoTickEnabled || isTickInFlight) return

    try {
      isTickInFlight = true
      await postTick()
      const next = await fetchState()
      render(next, '已推进 1 个 tick')
    } catch (error) {
      render(currentSnapshot, error instanceof Error ? error.message : '推进 tick 失败')
    } finally {
      isTickInFlight = false
    }
  })

  app.querySelector<HTMLButtonElement>('button[data-reset]')?.addEventListener('click', async () => {
    if (!currentSnapshot || isTickInFlight) return

    const wasAutoTickEnabled = autoTickEnabled
    if (autoTickEnabled) {
      stopAutoTick('自动 tick 已暂停')
    }

    try {
      isTickInFlight = true
      const snapshot = await postReset()
      render(snapshot, wasAutoTickEnabled ? '已重置并暂停自动 tick' : '已重置')
    } catch (error) {
      render(currentSnapshot, error instanceof Error ? error.message : '重置失败')
    } finally {
      isTickInFlight = false
    }
  })

  app.querySelector<HTMLButtonElement>('button[data-auto-toggle]')?.addEventListener('click', () => {
    if (autoTickEnabled) {
      stopAutoTick('自动 tick 已暂停')
    } else {
      startAutoTick('自动 tick 已开始')
    }
  })

  app.querySelector<HTMLSelectElement>('select[data-speed-select]')?.addEventListener('change', (event) => {
    const value = (event.target as HTMLSelectElement).value as SpeedPreset
    selectedSpeed = value
    if (autoTickEnabled) {
      restartAutoTick('自动 tick 速度已更新')
    } else if (currentSnapshot) {
      render(currentSnapshot, `速度已切换为${value === 'slow' ? '慢' : value === 'fast' ? '快' : '正常'}`)
    }
  })
}

async function runSingleAutoTick() {
  if (isTickInFlight || !autoTickEnabled) {
    return
  }

  isTickInFlight = true
  try {
    await postTick()
    const snapshot = await fetchState()
    render(snapshot, `自动运行中 · ${SPEED_PRESETS[selectedSpeed] / 1000}s/tick`)
  } catch (error) {
    stopAutoTick(error instanceof Error ? error.message : '自动 tick 失败')
  } finally {
    isTickInFlight = false
  }
}

function startAutoTick(message: string) {
  autoTickEnabled = true
  if (autoTickTimer) {
    window.clearInterval(autoTickTimer)
  }
  autoTickTimer = window.setInterval(() => {
    void runSingleAutoTick()
  }, SPEED_PRESETS[selectedSpeed])
  if (currentSnapshot) {
    render(currentSnapshot, message)
  }
  void runSingleAutoTick()
}

function stopAutoTick(message: string) {
  autoTickEnabled = false
  if (autoTickTimer) {
    window.clearInterval(autoTickTimer)
    autoTickTimer = null
  }
  if (currentSnapshot) {
    render(currentSnapshot, message)
  }
}

function restartAutoTick(message: string) {
  if (!autoTickEnabled) return
  stopAutoTick(message)
  startAutoTick(message)
}

async function refresh(message = statusMessage) {
  try {
    const snapshot = await fetchState()
    render(snapshot, message)
  } catch (error) {
    app.innerHTML = `<div class="error">${error instanceof Error ? error.message : '加载失败'}</div>`
  }
}

function startPassiveRefresh() {
  if (passiveRefreshTimer) {
    window.clearInterval(passiveRefreshTimer)
  }

  passiveRefreshTimer = window.setInterval(() => {
    if (!autoTickEnabled && !isTickInFlight) {
      void refresh()
    }
  }, 2500)
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
  html, body { margin: 0; min-height: 100%; background: radial-gradient(circle at top, #1c2230, #0f1115 50%); }
  body { min-height: 100vh; }
  .page { max-width: 1760px; margin: 0 auto; padding: 24px; }
  .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
  .header h1 { margin:0; font-size: 32px; }
  .header p { margin: 6px 0 0; color: #97a3b6; }
  .tick-box { text-align:right; color:#d8e2ee; }
  .main-layout { display:flex; gap:16px; align-items:stretch; }
  .side-panel-col { width: 250px; display:flex; flex-direction:column; gap:16px; flex-shrink:0; }
  .content-col { flex:1; display:flex; flex-direction:column; gap:16px; min-width:0; }
  .layout { display:grid; gap:16px; }
  .layout-wide { grid-template-columns: 1.1fr 1fr 1.45fr; }
  .panel { background: rgba(20, 24, 32, 0.88); border:1px solid #2c3443; border-radius:18px; padding:18px; box-shadow: 0 10px 30px rgba(0,0,0,.24); }
  .side-panel, .pet-panel, .status-panel, .debug-panel { overflow-y:auto; }
  .side-panel { height: 320px; }
  .panel-xl { height: 560px; }
  .pet-panel { display:flex; flex-direction:column; align-items:center; justify-content:flex-start; text-align:center; }
  .pet-avatar { width:140px; height:140px; border-radius:28px; display:flex; align-items:center; justify-content:center; font-size:72px; background: linear-gradient(135deg, #4c8bf5, #7f5af0); margin-bottom:18px; transition: transform .2s ease, background .2s ease; flex-shrink:0; margin-top:8px; }
  .pet-avatar.play { background: linear-gradient(135deg, #ff7b54, #f7b801); transform: scale(1.04); }
  .pet-avatar.sleep { background: linear-gradient(135deg, #3949ab, #5c6bc0); }
  .pet-avatar.eat { background: linear-gradient(135deg, #2e7d32, #66bb6a); }
  .pet-avatar.interact, .pet-avatar.follow { background: linear-gradient(135deg, #c2185b, #8e24aa); }
  .pet-avatar.groom { background: linear-gradient(135deg, #00838f, #26c6da); }
  .pet-name { font-size:28px; font-weight:700; }
  .pet-meta, .pet-result, .pet-notes, .pending { color:#aab6c8; margin-top:10px; }
  .pet-action { margin-top:14px; font-size:22px; font-weight:600; }
  h2 { margin:0 0 14px; font-size:18px; }
  .stat-row { margin-bottom:14px; }
  .stat-head { display:flex; justify-content:space-between; margin-bottom:6px; color:#dfe7f1; }
  .bar { height:10px; border-radius:999px; background:#222a36; overflow:hidden; }
  .bar-fill { height:100%; border-radius:999px; background: linear-gradient(90deg, #5eead4, #3b82f6); }
  .world-grid { display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:18px; color:#aab6c8; }
  .score-list, .event-list, .memory-list, .learning-list { display:flex; flex-direction:column; gap:10px; }
  .event-list { margin-top:12px; }
  .score-item, .event-item, .memory-item, .learning-item { background:#171c25; border:1px solid #293140; border-radius:12px; padding:10px 12px; }
  .score-title, .memory-top, .learning-head { display:flex; justify-content:space-between; font-weight:600; margin-bottom:4px; gap:8px; }
  .score-main { color:#90caf9; margin-bottom:4px; }
  .score-meta, .memory-meta, .learning-meta, .learning-foot { color:#97a3b6; font-size:13px; line-height:1.4; }
  .controls-panel { min-height: 132px; }
  .auto-controls { display:flex; flex-wrap:wrap; gap:12px; align-items:center; margin-bottom:14px; }
  .bottom-action-row { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
  .system-actions { display:flex; flex-wrap:wrap; gap:12px; }
  button, select { border:0; border-radius:12px; padding:12px 18px; font-size:15px; }
  button { background:#2f6fed; color:white; cursor:pointer; width:100%; min-height:48px; }
  .compact-button { width:auto; min-height:36px; padding:8px 14px; font-size:14px; border-radius:10px; }
  button:hover { background:#3d7af0; }
  button:disabled { cursor:not-allowed; opacity:.5; }
  .tick-button { background:#3c4658; }
  .reset-button { background:#8e2430; }
  .reset-button:hover { background:#a62d3a; }
  .auto-button.active { background:#c62828; }
  .speed-control { display:flex; align-items:center; gap:8px; color:#d8e2ee; }
  select { background:#171c25; color:#f2f5f8; border:1px solid #293140; }
  .run-status { color:#9ec1ff; }
  .message { margin-top:14px; min-height:24px; color:#9ec1ff; }
  .memory-item.positive { border-color:#2e7d32; }
  .memory-item.negative { border-color:#ad1457; }
  .learning-foot { margin-top:12px; }
  .mini-row { display:grid; grid-template-columns: 80px 1fr; gap:8px; align-items:center; margin-top:8px; color:#d0dae7; font-size:12px; }
  .mini-bar { height:8px; border-radius:999px; background:#222a36; overflow:hidden; }
  .mini-bar-fill { height:100%; border-radius:999px; }
  .mini-bar-fill.modifier { background: linear-gradient(90deg, #f59e0b, #ef4444); }
  .mini-bar-fill.confidence { background: linear-gradient(90deg, #4ade80, #22c55e); }
  .empty-item { color:#97a3b6; padding:4px 0; }
  .error { padding:24px; color:#fff; }
  @media (max-width: 1180px) {
    .main-layout { flex-direction:column; }
    .side-panel-col { width: 100%; display:grid; grid-template-columns: 1fr 1fr; }
    .layout-wide { grid-template-columns: 1fr; }
  }
  @media (max-width: 760px) {
    .page { padding: 16px; }
    .header { flex-direction:column; align-items:flex-start; gap:12px; }
    .side-panel-col { grid-template-columns: 1fr; }
    .bottom-action-row { gap:6px; }
    .side-panel, .pet-panel, .status-panel, .debug-panel { height: auto; max-height: 420px; }
  }
`
document.head.appendChild(style)

void refresh()
startPassiveRefresh()

