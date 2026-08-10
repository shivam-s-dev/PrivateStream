import express from 'express'
import cors from 'cors'
import 'dotenv/config'

import datasetRoutes from './routes/datasets'
import sessionRoutes from './routes/sessions'
import { mppMethods } from './services/mpp'

const app = express()

app.use(cors())
app.use(express.json())

// Mount MPP routes/methods (Placeholder for how mppx/server attaches to Express)
// If mppx provides an Express middleware, it would be attached here.
// For now, we'll assume it's custom integrated or a simple endpoint.

app.use('/datasets', datasetRoutes)
app.use('/sessions', sessionRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`[API] Server listening on port ${PORT}`)
})
