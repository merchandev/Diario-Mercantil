const API_BASE = import.meta.env.VITE_BACKEND_URL || ''
export async function fetchApi(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' && input.startsWith('/') ? API_BASE + input : input
  const response = await fetch(url, { credentials: 'include', ...init })
  if (response.status === 503) {
    try {
      const data = await response.clone().json()
      if (data?.error === 'maintenance_required') window.dispatchEvent(new Event('dm-maintenance-required'))
    } catch { /* Infrastructure errors are not maintenance authorization errors. */ }
  }
  return response
}
