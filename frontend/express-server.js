import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'

const appType = process.env.APP_TYPE || 'drive'
const port = Number(process.env.PORT || (appType === 'photos' ? 3001 : 3000))
const backendTarget = process.env.BACKEND_URL || 'http://localhost:8000'

const rootDir = path.resolve('.')
const distDir = path.resolve(rootDir, appType === 'photos' ? 'dist-photos' : 'dist-drive')
const certDir = path.resolve(rootDir, 'certs')
const keyPath = path.join(certDir, 'localhost+lan-key.pem')
const certPath = path.join(certDir, 'localhost+lan.pem')

if (!fs.existsSync(distDir)) {
  console.error(`[Express] Build output not found: ${distDir}`)
  console.error('[Express] Run build first: npm run build:drive or npm run build:photos')
  process.exit(1)
}

const app = express()

app.use('/api', createProxyMiddleware({
  target: backendTarget,
  changeOrigin: true,
  secure: false,
  ws: true,
}))

// Serve mkcert root CA cert so network devices can install it and trust the HTTPS cert
const caCertPath = path.join(certDir, 'rootCA.crt')
if (fs.existsSync(caCertPath)) {
  app.get('/ca.crt', (_req, res) => {
    res.setHeader('Content-Type', 'application/x-x509-ca-cert')
    res.setHeader('Content-Disposition', 'attachment; filename="NASCloud-CA.crt"')
    res.sendFile(caCertPath)
  })
  console.log('[Express] Root CA cert available at /ca.crt')
}

app.use(express.static(distDir, { index: false }))

app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const key = fs.readFileSync(keyPath)
  const cert = fs.readFileSync(certPath)
  const server = https.createServer({ key, cert }, app)

  server.on('error', (error) => {
    if (error?.code === 'EADDRINUSE') {
      console.error(`[Express] Port ${port} is already in use. ${appType} may already be running.`)
      console.error('[Express] Stop the existing process on this port or use start-all.ps1 to manage startup.')
      process.exit(1)
    }

    console.error('[Express] Server failed to start:', error)
    process.exit(1)
  })

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Express] ${appType} app running at https://localhost:${port}`)
  })
} else {
  console.error('[Express] Trusted cert files missing in frontend/certs')
  console.error('[Express] Run: ..\\setup-https-mkcert.ps1')
  process.exit(1)
}
