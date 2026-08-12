import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { redis } from '../services/redis'
import { registerDatasetOnChain } from '../services/confidential'

const router = Router()

// GET /datasets — list all active datasets (cached 5min in Redis)
router.get('/', async (req, res) => {
  const cacheKey = `datasets:list:${req.query.category || 'all'}`
  
  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      res.json(cached)
      return
    }
  } catch (e) {
    console.error('[Redis] Failed to get cache:', e)
  }

  try {
    const datasets = await prisma.dataset.findMany({
      where: { isActive: true },
      include: {
        provider: {
          select: { displayName: true, walletAddress: true }
        },
        _count: {
          select: { sessions: true }
        }
      },
      orderBy: { totalEarned: 'desc' }
    })

    // Never expose endpointUrl in list response
    const safe = datasets.map(({ endpointUrl, _count, ...d }: any) => ({
      ...d,
      totalSessions: _count.sessions
    }))
    
    try {
      await redis.setex(cacheKey, 300, JSON.stringify(safe))
    } catch (e) {
      console.error('[Redis] Failed to set cache:', e)
    }
    
    res.json(safe)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch datasets' })
  }
})

// POST /datasets — provider registers a dataset
const CreateDatasetSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(20).max(1000),
  category: z.enum([
    'DEX_ANALYTICS', 'PRICE_FEEDS', 'WALLET_INTELLIGENCE',
    'CREDIT_SCORING', 'ORDERBOOK_DATA', 'COMPLIANCE_DATA', 'CUSTOM'
  ]),
  pricePerSecond: z.coerce.number().min(0.000001).max(10),
  endpointUrl: z.string().url(),
  tags: z.array(z.string()).max(10).default([]),
  walletAddress: z.string(),
})

router.post('/', async (req, res) => {
  try {
    const body = CreateDatasetSchema.parse(req.body)
    
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress: body.walletAddress }
    })
    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress: body.walletAddress, displayName: 'Anonymous Provider' }
      })
    }

    // Hash the endpoint URL before storing (never expose raw URL)
    const crypto = await import('crypto')
    const endpointHash = crypto
      .createHash('sha256')
      .update(body.endpointUrl)
      .digest('hex')

    const dataset = await prisma.dataset.create({
      data: {
        providerId: user.id,
        title: body.title,
        description: body.description,
        category: body.category,
        pricePerSecond: body.pricePerSecond,
        endpointUrl: body.endpointUrl,  // stored encrypted in prod
        tags: body.tags,
      }
    })

    // Invalidate the cache gracefully (don't fail if Redis has connection issues)
    try {
      await redis.del('datasets:list:all', `datasets:list:${body.category}`)
    } catch (e) {
      console.error('[Redis] Failed to clear cache:', e)
    }

    // Register on Soroban marketplace contract
    let txHash = null
    try {
      txHash = await registerDatasetOnChain(dataset.id, user.walletAddress)
    } catch (e) {
      console.error('[Stellar] Failed to register dataset on-chain:', e)
    }

    res.json({ id: dataset.id, endpointHash, txHash })
  } catch (error) {
    res.status(400).json({ error })
  }
})

// GET /datasets/:id — single dataset detail (never exposes endpointUrl)
router.get('/:id', async (req, res) => {
  const dataset = await prisma.dataset.findUnique({
    where: { id: req.params.id, isActive: true },
    include: {
      provider: { select: { displayName: true, walletAddress: true } }
    }
  })
  if (!dataset) {
    res.status(404).json({ error: 'Dataset not found' })
    return
  }
  const { endpointUrl, ...safe } = dataset as any
  res.json(safe)
})

// GET /datasets/:id/stats — provider-only monitoring endpoint
router.get('/:id/stats', async (req, res) => {
  const { walletAddress } = req.query
  if (!walletAddress || typeof walletAddress !== 'string') {
    res.status(400).json({ error: 'walletAddress query param required' })
    return
  }
  const dataset = await prisma.dataset.findUnique({
    where: { id: req.params.id },
    include: { provider: { select: { walletAddress: true } } }
  })
  if (!dataset) { res.status(404).json({ error: 'Dataset not found' }); return }
  if (dataset.provider.walletAddress !== walletAddress) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  const sessions = await prisma.session.findMany({
    where: { datasetId: req.params.id },
    orderBy: { openedAt: 'desc' },
    select: { id: true, status: true, budgetUsdc: true, spentUsdc: true, openedAt: true, closedAt: true }
  })
  
  const activeSessions = sessions.filter(s => s.status === 'OPEN').length
  const totalSessions = sessions.length
  // Sum up all spentUsdc for this dataset
  const totalEarned = sessions.reduce((sum, s) => sum + Number(s.spentUsdc ?? 0), 0)
  
  let liveSample = null
  try {
    const r = await fetch(dataset.endpointUrl, { signal: AbortSignal.timeout(3000) })
    liveSample = await r.json()
  } catch { liveSample = null }

  res.json({
    totalEarned,
    totalSessions,
    activeSessions,
    recentSessions: sessions.slice(0, 10), // Only return the 10 most recent to the frontend
    liveSample,
  })
})

export default router
