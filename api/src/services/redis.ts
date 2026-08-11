import 'dotenv/config'

// Minimal mock to prevent API crashes when Redis isn't running
export const redis = {
  get: async (key: string) => null,
  setex: async (key: string, ttl: number, val: string) => "OK",
  pipeline: () => ({
    incr: () => {},
    expire: () => {},
    exec: async () => [[null, 1]]
  }),
  on: (event: string, handler: any) => {}
} as any

// Helper: atomic increment with expiry
export async function incrementWithExpiry(key: string, ttl: number) {
  const pipeline = redis.pipeline()
  pipeline.incr(key)
  pipeline.expire(key, ttl)
  const results = await pipeline.exec()
  return results?.[0]?.[1] as number
}

// Helper: rate limiting
export async function checkRateLimit(ip: string, limit = 60): Promise<boolean> {
  const key = `rate:${ip}`
  const count = await incrementWithExpiry(key, 60)
  return count <= limit
}
