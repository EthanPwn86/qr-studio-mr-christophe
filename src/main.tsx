import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './style.css'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const announceReady = () => {
    if (navigator.serviceWorker.controller) window.dispatchEvent(new Event('qr-offline-ready'))
  }
  navigator.serviceWorker.addEventListener('controllerchange', announceReady)
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      announceReady()
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'activated') announceReady()
        })
      })
    }).catch(() => window.dispatchEvent(new Event('qr-offline-failed')))
  })
}
