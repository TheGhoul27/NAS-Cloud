import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:8000'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const certDir = path.resolve(__dirname, 'certs')
const keyPath = path.join(certDir, 'localhost+lan-key.pem')
const certPath = path.join(certDir, 'localhost+lan.pem')
const hasTrustedCert = fs.existsSync(keyPath) && fs.existsSync(certPath)

const httpsOptions = hasTrustedCert
  ? {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }
  : true

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_TYPE__: JSON.stringify('photos')
  },
  base: '/photos/',
  build: {
    outDir: 'dist-photos',
    copyPublicDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 3001,
    https: httpsOptions,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      }
    }
  }
})
