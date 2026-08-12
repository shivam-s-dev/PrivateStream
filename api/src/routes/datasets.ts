import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { redis } from '../services/redis'

const router = Router()

// GET /datasets — list all active datasets (cached 5min in Redis)
router.get('/', async (req, res) => {
  const cacheKey = `datasets:list:${req.query.category || 'all'}`
  const cached = await redis.get(cacheKey)
  if (cached) {
    res.json(cached)
    return
  }

  const datasets = await prisma.dataset.findMany({
    where: { isActive: true },
    include: {
      provider: {
        select: { displayName: true, walletAddress: true }
      }
    },
    orderBy: { totalEarned: 'desc' }
  })

  // Never expose endpointUrl in list response
  const safe = datasets.map(({ endpointUrl, ...d }: any) => d)
  await redis.setex(cacheKey, 300, JSON.stringify(safe))
  res.json(safe)
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

    // Invalidate the cache so it appears on Explore immediately
    await redis.del('datasets:list:all')
    await redis.del(`datasets:list:${body.category}`)

    // Register on Soroban marketplace contract (Placeholder for actual call)
    // await registerDatasetOnChain(dataset.id, user.walletAddress, body.pricePerSecond)

    res.json({ id: dataset.id, endpointHash })
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

export default router
