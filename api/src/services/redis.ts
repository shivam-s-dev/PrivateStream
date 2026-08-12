import 'dotenv/config'
import { Redis } from '@upstash/redis'

// Real Upstash Redis client using REST API (works on both local and Render)
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Expose a compatible del() method (Upstash SDK uses .del())
export async function incrementWithExpiry(key: string, ttl: number) {
  const count = await redis.incr(key)
  await redis.expire(key, ttl)
  return count
}

export async function checkRateLimit(ip: string, limit = 60): Promise<boolean> {
  const count = await incrementWithExpiry(`rate:${ip}`, 60)
  return count <= limit
}
