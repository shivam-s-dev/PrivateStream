import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { redis } from '../services/redis'

const router = Router()

// POST /sessions/open — buyer opens an MPP session for a dataset
router.post('/open', requireAuth, async (req, res) => {
  const { datasetId, budgetUsdc } = req.body
  const user = req.user!

  const dataset = await prisma.dataset.findUnique({
    where: { id: datasetId, isActive: true }
  })
  if (!dataset) {
    res.status(404).json({ error: 'Dataset not found' })
    return
  }

  // Create session record
  const session = await prisma.session.create({
    data: {
      buyerId: user.id,
      datasetId,
      channelAddress: '',  // filled after MPP channel opens
      budgetUsdc,
      status: 'OPEN',
    }
  })

  // The actual MPP channel opening happens client-side via the SDK
  // This endpoint returns the session ID and payment details
  res.json({
    sessionId: session.id,
    pricePerSecond: dataset.pricePerSecond,
    recipientAddress: process.env.STELLAR_RECIPIENT_PUBLIC,
    commitmentPublicKey: process.env.COMMITMENT_PUBKEY,
  })
})

// GET /sessions/:id/stream — the actual data stream endpoint (MPP gated)
// This is the endpoint buyers hit — MPP handles the 402 flow automatically
router.get('/:sessionId/stream', async (req, res) => {
  const sessionId = req.params.sessionId as string

  // Check session state from Redis (fast)
  const stateRaw = await redis.get(`session:${sessionId}:state`)
  if (!stateRaw) {
    res.status(404).json({ error: 'Session not found or expired' })
    return
  }

  const state = JSON.parse(stateRaw)

  // Check budget remaining
  if (state.spent >= state.budget) {
    res.status(402).json({ error: 'Budget exhausted', spent: state.spent })
    return
  }

  // Fetch dataset endpoint (never exposed to client)
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { dataset: true }
  })

  if (!session) {
    res.status(404).json({ error: 'Session not found' })
    return
  }

  try {
    // Proxy the data request to the provider's actual endpoint
    const data = await fetch(session.dataset.endpointUrl)
    const json = await data.json()

    // Increment data point counter
    await redis.incr(`session:${sessionId}:dataPoints`)

    res.json(json)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch from provider endpoint' })
  }
})

// POST /sessions/:id/close — buyer explicitly closes a session
router.post('/:sessionId/close', requireAuth, async (req, res) => {
  const sessionId = req.params.sessionId as string
  // MPP SDK handles the on-chain settlement automatically
  // This just marks it closed in our DB
  await prisma.session.update({
    where: { id: sessionId },
    data: { status: 'CLOSED', closedAt: new Date() }
  })
  res.json({ success: true })
})

export default router
