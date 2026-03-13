const express = require('express')
const cors = require('cors')
const path = require('path')
const dotenv = require('dotenv')
const { initializeDatabase } = require('./config/db')

dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const authRoutes = require('./routes/auth.routes')
const userRoutes = require('./routes/user.routes')
const searchRoutes = require('./routes/search.routes')
const adminRoutes = require('./routes/admin.routes')
const aiRoutes = require('./routes/ai.routes')
const { startAutonomousWorker } = require('./services/autonomousAgentRuntime')

const app = express()
app.use(cors())
app.use(express.json())

// Mount routes
app.use('/api/auth', authRoutes)
app.use('/api', userRoutes)
app.use('/api', searchRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api', aiRoutes)

// Start server
const port = process.env.PORT || 4000
initializeDatabase().then(() => {
  startAutonomousWorker(15000)
  app.listen(port, () => console.log('API server listening on', port))
}).catch(err => {
  console.error('DB init failed', err)
  process.exit(1)
})

