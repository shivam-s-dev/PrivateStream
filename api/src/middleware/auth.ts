import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: any
    }
  }
}

// Stellar wallet auth: frontend signs a challenge with Freighter
// Backend verifies the signature to confirm wallet ownership

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    res.status(401).json({ error: 'No token' })
    return
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-here') as any
    const user = await prisma.user.findUnique({
      where: { walletAddress: payload.walletAddress }
    })
    if (!user) {
      res.status(401).json({ error: 'User not found' })
      return
    }
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
