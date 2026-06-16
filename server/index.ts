import cors from 'cors'
import express from 'express'
import type { InteractionRequest } from '../src/types/index.js'
import { EvoLifeRuntime, isSupportedInteractionAction } from '../src/runtime.js'

const app = express()
const runtime = new EvoLifeRuntime()
const port = Number(process.env.PORT ?? 3001)

app.use(cors())
app.use(express.json())

app.get('/api/state', async (_request, response) => {
  response.json(await runtime.getSnapshot())
})

app.get('/api/debug/latest', (_request, response) => {
  response.json(runtime.getLatestDebug())
})

app.post('/api/tick', async (_request, response) => {
  response.json(await runtime.advanceTick())
})

app.post('/api/reset', async (_request, response) => {
  response.json(await runtime.reset())
})

app.post('/api/interact', (request, response) => {
  const body = request.body as Partial<InteractionRequest>

  if (!body.actionType) {
    response.status(400).json({ error: 'Missing actionType' })
    return
  }

  if (!isSupportedInteractionAction(body.actionType)) {
    response.status(400).json({ error: 'Unsupported actionType' })
    return
  }

  runtime.requestInteraction({ actionType: body.actionType })
  response.json({ ok: true, pendingRequestedActionType: body.actionType })
})

app.listen(port, () => {
  console.log(`EvoLife API listening on http://localhost:${port}`)
})
