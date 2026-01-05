import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
// Avoid TS type error for `process` in config context
declare const process: any

// Allow overriding the backend URL via env (useful in Docker)
const backendTarget = process.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  build: {
    manifest: true, // Generate manifest.json for WordPress theme integration
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        manualChunks: {
          // React core libraries (most frequently used)
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // PDF.js library (very heavy ~170KB)
          'pdfjs': ['pdfjs-dist'],
          // Icon library
          'icons': ['lucide-react'],
          // QR code libraries
          'qr': ['qrcode', 'qrcode.react'],
          // Page flip library
          'pageflip': ['react-pageflip']
        }
      }
    }
  },
  server: {
    host: true, // bind to 0.0.0.0 so it's reachable from host
    port: 5173,
    strictPort: true,
    hmr: { clientPort: 5173 },
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        ws: true
      }
    }
  }
})
