// Simple global logging hooks to help diagnose blank screen issues

// eslint-disable-next-line no-console
console.log('[App] Booting...', {
  location: window.location.href,
  env: import.meta.env?.MODE,
})

window.addEventListener('error', (e)=>{
  // eslint-disable-next-line no-console
  console.error('[App] window.error:', e.error || e.message || e)
})

window.addEventListener('unhandledrejection', (e)=>{
  // eslint-disable-next-line no-console
  console.error('[App] unhandledrejection:', e.reason)
})
