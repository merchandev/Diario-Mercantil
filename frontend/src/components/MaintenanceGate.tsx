import { useCallback, useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react'
import { Helmet } from 'react-helmet-async'
import LoadingFallback from './LoadingFallback'

const API_BASE = import.meta.env.VITE_BACKEND_URL || ''
export const MAINTENANCE_CHANGED = 'dm-maintenance-changed'
type GateStatus = { enabled: boolean; unlocked: boolean; expires_at: number | null; remaining_seconds?: number }

export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GateStatus | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const mounted = useRef(false)
  const sequence = useRef(0)
  const check = useCallback(async () => {
    const request = ++sequence.current
    try {
      const res = await fetch(API_BASE + '/api/maintenance/status', { credentials: 'include', cache: 'no-store' })
      if (!res.ok) throw new Error('No se pudo comprobar el acceso. Intente de nuevo.')
      const data: GateStatus = await res.json()
      if (typeof data.enabled !== 'boolean' || typeof data.unlocked !== 'boolean') throw new Error('Respuesta de acceso inválida.')
      if (mounted.current && sequence.current === request) { setStatus(data); setError('') }
    } catch (failure) {
      if (mounted.current && sequence.current === request) {
        setStatus({ enabled: true, unlocked: false, expires_at: null })
        setError(failure instanceof Error ? failure.message : 'No se pudo comprobar el acceso.')
      }
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    void check()
    const interval = window.setInterval(() => { if (!document.hidden) void check() }, 30_000)
    const visibility = () => { if (!document.hidden) void check() }
    const lock = () => {
      // Hide content immediately when any protected API rejects this browser.
      ++sequence.current
      setStatus({ enabled: true, unlocked: false, expires_at: null })
      void check()
    }
    window.addEventListener(MAINTENANCE_CHANGED, visibility)
    window.addEventListener('dm-maintenance-required', lock)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      mounted.current = false
      ++sequence.current
      clearInterval(interval)
      window.removeEventListener(MAINTENANCE_CHANGED, visibility)
      window.removeEventListener('dm-maintenance-required', lock)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [check])

  useEffect(() => {
    if (!status?.enabled || !status.unlocked || !status.expires_at) return
    const remaining = status.remaining_seconds === undefined ? status.expires_at * 1000 - Date.now() : status.remaining_seconds * 1000
    const timer = window.setTimeout(() => {
      setStatus({ enabled: true, unlocked: false, expires_at: null })
      void check()
    }, Math.max(0, remaining))
    return () => clearTimeout(timer)
  }, [status, check])

  async function unlock(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await fetch(API_BASE + '/api/maintenance/unlock', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'No se pudo autorizar el acceso.')
      setPassword('')
      await check()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo autorizar el acceso.')
    } finally { setBusy(false) }
  }

  if (!status) return <LoadingFallback />
  if (!status.enabled || status.unlocked) return <>{children}</>
  return <main className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_#1b2435_0%,_#020617_70%)] px-5 py-10 sm:py-14">
    <Helmet><title>Mantenimiento programado | Diario Mercantil de Venezuela</title><meta name="robots" content="noindex, nofollow" /></Helmet>
    <section className="w-full max-w-xl rounded-[2rem] border border-white/70 bg-white px-7 py-10 shadow-[0_28px_90px_rgba(0,0,0,0.3)] sm:px-12 sm:py-12">
      <img src="/Logotipo_Diario_Mercantil.svg" alt="Diario Mercantil de Venezuela" className="mx-auto block h-auto w-full max-w-[25rem]" />
      <div className="mt-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem]">Mantenimiento programado</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-500 sm:text-base">Estamos realizando mejoras en el sistema. El acceso al sitio está temporalmente restringido.</p>
      </div>
      <form onSubmit={unlock} className="mt-8 space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="maintenance-password">Contraseña de administrador</label>
          <input id="maintenance-password" className="input h-12 w-full rounded-xl bg-slate-50/70 px-4" type="password" required maxLength={1024} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={busy} />
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="btn btn-primary h-12 w-full rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-800 disabled:cursor-wait disabled:opacity-70">{busy ? 'Verificando...' : 'Autorizar acceso'}</button>
        {error && <button type="button" onClick={() => void check()} className="block w-full text-center text-sm underline text-brand-800">Comprobar disponibilidad</button>}
      </form>
    </section>
  </main>
}
