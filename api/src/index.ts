import express from 'express'
import cors from 'cors'
import 'dotenv/config'

import datasetRoutes from './routes/datasets'
import sessionRoutes from './routes/sessions'

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())

// API prefix
app.use('/api/datasets', datasetRoutes)
app.use('/api/sessions', sessionRoutes)

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    network: process.env.STELLAR_NETWORK || 'testnet',
    contract: process.env.CONTRACT_MARKETPLACE,
  })
})

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`[PrivateStream API] Listening on port ${PORT}`)
  console.log(`[PrivateStream API] Stellar network: ${process.env.STELLAR_NETWORK || 'testnet'}`)
  console.log(`[PrivateStream API] Marketplace contract: ${process.env.CONTRACT_MARKETPLACE}`)
})
