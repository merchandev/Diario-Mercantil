// Global error hooks to help diagnose runtime failures without logging user data.

window.addEventListener('error', (e)=>{
  // eslint-disable-next-line no-console
  console.error('[App] window.error:', e.error || e.message || e)
})

window.addEventListener('unhandledrejection', (e)=>{
  // eslint-disable-next-line no-console
  console.error('[App] unhandledrejection:', e.reason)
})
