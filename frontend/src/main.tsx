import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { HelmetProvider } from 'react-helmet-async'
import './setupLogging'
import './index.css'
import { DialogProvider } from './contexts/DialogContext'

// Diagnostic: Force cache invalidation (Nov 18, 2025 02:58 UTC)
console.log('🚀 [main.tsx] Module loaded, mounting React app...')
console.log('🚀 App Version: 2026-01-30 FIX (X-Auth-Token)')

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <DialogProvider>
            <App />
          </DialogProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
