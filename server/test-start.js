// Simple test to identify startup issues
console.log('[TEST] Starting...')

try {
  console.log('[TEST] Requiring express...')
  const express = require('express')
  console.log('[TEST] Express loaded')
  
  console.log('[TEST] Requiring database config...')
  const { initializeDatabase } = require('./config/db')
  console.log('[TEST] Database config loaded')
  
  console.log('[TEST] Creating express app...')
  const app = express()
  console.log('[TEST] App created')
  
  console.log('[TEST] Adding middleware...')
  app.use(express.json())
  console.log('[TEST] Middleware added')
  
  console.log('[TEST] Initializing database...')
  initializeDatabase().then(() => {
    console.log('[TEST] Database initialized successfully')
    const port = 4000
    app.listen(port, () => {
      console.log('[TEST] Server is listening on port', port)
    })
  }).catch(err => {
    console.error('[TEST] Database init failed:', err)
    process.exit(1)
  })
  
} catch (err) {
  console.error('[TEST] Startup error:', err.message)
  console.error('[TEST] Stack:', err.stack)
  process.exit(1)
}
