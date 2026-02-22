import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerServiceWorker, requestNotificationPermission, setupInstallPrompt } from './service-worker-register.js'

// Register service worker for PWA functionality
registerServiceWorker()

// Request notification permission for updates
requestNotificationPermission()

// Setup install prompt for PWA installation
setupInstallPrompt()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
