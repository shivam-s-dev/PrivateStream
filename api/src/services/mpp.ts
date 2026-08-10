import { createServer } from 'http'
import express from 'express'
import { Mppx } from 'mppx/server'
import { stellar } from '@stellar/mpp/channel/server'
import { Keypair } from '@stellar/stellar-sdk'
import { redis } from './redis'
import { prisma } from '../lib/prisma'
import { settleConfidentialPayment } from './confidential'

const COMMITMENT_SECRET = process.env.MPP_COMMITMENT_SECRET || 'SBUDDQW4C6N2K7WQY2T5QZQ6Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q'
const commitmentKey = Keypair.fromSecret(COMMITMENT_SECRET)

// MPP channel server configuration
export const mppMethods = [
  stellar.channel({
    commitmentKey,
    // @ts-ignore: Mocked API for mppx/server
    async onProgress(event: any) {
      switch (event.type) {
        case 'channel-opened':
          // Store channel state in Redis
          await redis.setex(
            `session:${event.channelId}:state`,
            3600,
            JSON.stringify({
              channelId: event.channelId,
              buyerAddress: event.buyerAddress,
              budget: event.amount,
              spent: 0,
              openedAt: Date.now(),
            })
          )
          // Persist to NeonDB
          await prisma.session.updateMany({
            where: { channelAddress: event.channelId },
            data: { status: 'OPEN' }
          })
          break

        case 'payment-received':
          // Update Redis with latest commitment
          const key = `session:${event.channelId}:state`
          const stateRaw = await redis.get(key)
          if (stateRaw) {
            const state = JSON.parse(stateRaw)
            state.spent = event.cumulativeAmount
            state.lastPayment = Date.now()
            await redis.setex(key, 3600, JSON.stringify(state))
            await redis.setex(
              `session:${event.channelId}:commitment`,
              3600,
              event.commitment
            )
          }
          // Write payment to DB (batch every 10 payments for performance)
          await redis.incr(`session:${event.channelId}:paymentCount`)
          const count = await redis.get(`session:${event.channelId}:paymentCount`)
          if (parseInt(count || '0') % 10 === 0) {
            await flushPaymentsToDB(event.channelId)
          }
          break

        case 'channel-closed':
          // Final settlement
          await settleSession(event.channelId, event.finalAmount)
          break
      }
    }
  })
]

async function flushPaymentsToDB(channelId: string) {
  const state = JSON.parse(await redis.get(`session:${channelId}:state`) || '{}')
  await prisma.session.updateMany({
    where: { channelAddress: channelId },
    data: { spentUsdc: state.spent }
  })
}

async function settleSession(channelId: string, finalAmount: number) {
  const session = await prisma.session.findFirst({
    where: { channelAddress: channelId },
    include: { dataset: { include: { provider: true } } }
  })
  if (!session) return

  // Route final payment through confidential layer
  await settleConfidentialPayment(
    session.dataset.provider.walletAddress,
    finalAmount
  )

  await prisma.session.update({
    where: { id: session.id },
    data: { status: 'CLOSED', closedAt: new Date(), spentUsdc: finalAmount }
  })

  // Clear Redis cache
  await redis.del(`session:${channelId}:state`)
  await redis.del(`session:${channelId}:commitment`)
}
