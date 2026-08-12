import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { redis } from '../services/redis'
import { settleConfidentialPayment } from '../services/confidential'

const router = Router()

// GET /sessions?walletAddress=G... — list all sessions for a wallet
router.get('/', async (req, res) => {
  const { walletAddress } = req.query
  if (!walletAddress || typeof walletAddress !== 'string') {
    res.status(400).json({ error: 'walletAddress query param required' })
    return
  }
  const user = await prisma.user.findUnique({ where: { walletAddress } })
  if (!user) {
    res.json([]) // new user has no sessions yet
    return
  }
  const sessions = await prisma.session.findMany({
    where: { buyerId: user.id },
    include: { dataset: { select: { title: true } } },
    orderBy: { openedAt: 'desc' },
    take: 50,
  })
  res.json(sessions)
})

// POST /sessions/open — buyer opens an MPP session for a dataset
// Note: auth is wallet-address based; the frontend passes the walletAddress in the body
router.post('/open', async (req, res) => {
  const { datasetId, budgetUsdc, walletAddress } = req.body
  if (!datasetId || !budgetUsdc || !walletAddress) {
    res.status(400).json({ error: 'datasetId, budgetUsdc, and walletAddress are required' })
    return
  }

  const dataset = await prisma.dataset.findUnique({
    where: { id: datasetId, isActive: true },
    include: { provider: { select: { walletAddress: true } } }
  })
  if (!dataset) {
    res.status(404).json({ error: 'Dataset not found' })
    return
  }

  // Upsert user so we always have a record
  const user = await prisma.user.upsert({
    where: { walletAddress },
    update: {},
    create: { walletAddress, displayName: walletAddress.slice(0, 8) }
  })

  const session = await prisma.session.create({
    data: {
      buyerId: user.id,
      datasetId,
      channelAddress: '',
      budgetUsdc,
      status: 'OPEN',
    }
  })

  // Seed Redis with initial state so the /state endpoint works immediately
  try {
    await redis.setex(
      `session:${session.id}:state`,
      3600,
      {
        status: 'OPEN',
        spent: 0,
        budget: Number(budgetUsdc),
        dataPoints: 0,
        duration: 0,
        openedAt: Date.now(),
      }
    )
  } catch (e) {
    console.error('[Redis] Failed to seed session state:', e)
  }

  res.json({
    sessionId: session.id,
    pricePerSecond: dataset.pricePerSecond,
    providerAddress: dataset.provider.walletAddress,
    recipientAddress: process.env.STELLAR_RECIPIENT_PUBLIC,
  })
})

// GET /sessions/:id/state — frontend polls this to get live session state
router.get('/:sessionId/state', async (req, res) => {
  const sessionId = req.params.sessionId

  let state = null
  try {
    state = await redis.get(`session:${sessionId}:state`)
  } catch (e) {
    console.error('[Redis] Failed to get session state:', e)
  }
  if (state) {
    res.json(state)
    return
  }

  // Fallback: read from DB if Redis has expired
  const session = await prisma.session.findUnique({ where: { id: sessionId } })
  if (!session) {
    res.status(404).json({ error: 'Session not found' })
    return
  }

  res.json({
    status: session.status,
    spent: session.spentUsdc ?? 0,
    budget: session.budgetUsdc,
    dataPoints: 0,
    duration: session.closedAt
      ? Math.floor((session.closedAt.getTime() - session.openedAt.getTime()) / 1000)
      : Math.floor((Date.now() - session.openedAt.getTime()) / 1000),
  })
})

// GET /sessions/:id/stream — the actual data stream endpoint (MPP gated)
router.get('/:sessionId/stream', async (req, res) => {
  const sessionId = req.params.sessionId

  let stateRaw = null
  try {
    stateRaw = await redis.get(`session:${sessionId}:state`)
  } catch (e) {
    console.error('[Redis] Failed to get session stream state:', e)
  }
  if (!stateRaw) {
    res.status(404).json({ error: 'Session not found or expired' })
    return
  }

  const state = stateRaw as any
  if (state.status === 'CLOSED') {
    res.status(402).json({ error: 'Session is closed' })
    return
  }

  if (state.spent >= state.budget) {
    res.status(402).json({ error: 'Budget exhausted', spent: state.spent })
    return
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { dataset: true }
  })
  if (!session) {
    res.status(404).json({ error: 'Session not found' })
    return
  }

  try {
    const data = await fetch(session.dataset.endpointUrl, { signal: AbortSignal.timeout(3000) })
    const json = await data.json()

    // Update spend in Redis (price ticks per poll)
    const newSpent = Math.min(state.spent + session.dataset.pricePerSecond.toNumber() * 2, Number(state.budget))
    const newDataPoints = (state.dataPoints ?? 0) + 1
    const newDuration = (state.duration ?? 0) + 2
    const newState = { ...state, spent: newSpent, dataPoints: newDataPoints, duration: newDuration }
    try {
      await redis.set(`session:${sessionId}:state`, JSON.stringify(newState))
    } catch (e) {
      console.error('[Redis] Failed to update session spend:', e)
    }

    res.json(json)
  } catch {
    res.status(500).json({ error: 'Failed to fetch from provider endpoint' })
  }
})

// POST /sessions/:id/close — buyer closes a session and triggers real on-chain settlement
router.post('/:sessionId/close', async (req, res) => {
  const sessionId = req.params.sessionId
  const spentFromClient = parseFloat(req.body?.spent) || 0

  // Fetch session + provider address from DB
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { dataset: { include: { provider: { select: { walletAddress: true } } } } }
  })
  if (!session) {
    res.status(404).json({ error: 'Session not found' })
    return
  }

  // Use Redis spent amount if available, otherwise use client-reported amount
  let finalSpent = spentFromClient
  let stateRaw = null
  try {
    stateRaw = await redis.get(`session:${sessionId}:state`)
  } catch (e) {
    console.error('[Redis] Failed to get final session state:', e)
  }
  if (stateRaw) {
    const state = stateRaw as any
    finalSpent = state.spent ?? spentFromClient
  }

  // Mark session closed in DB
  await prisma.session.update({
    where: { id: sessionId },
    data: { status: 'CLOSED', closedAt: new Date(), spentUsdc: finalSpent }
  })

  // Clear Redis session state
  try {
    await redis.del(`session:${sessionId}:state`)
  } catch (e) {
    console.error('[Redis] Failed to clear session state:', e)
  }

  // Submit real on-chain settlement transaction
  try {
    const providerWallet = session.dataset.provider.walletAddress
    const hash = await settleConfidentialPayment(providerWallet, finalSpent, sessionId)
    res.json({ success: true, hash, spent: finalSpent })
  } catch (err: any) {
    console.error('[Sessions] Settlement error:', err.message)
    res.status(500).json({ error: 'Settlement could not be completed. Please try again in a moment.' })
  }
})

export default router
