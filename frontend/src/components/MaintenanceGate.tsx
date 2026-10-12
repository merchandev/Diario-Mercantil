import { useCallback, useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react'
import { Helmet } from 'react-helmet-async'
import { LockKeyhole, Wrench } from 'lucide-react'
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
  return <main className="min-h-screen bg-slate-950 flex items-center justify-center px-5 py-12">
    <Helmet><title>Mantenimiento programado | Diario Mercantil de Venezuela</title><meta name="robots" content="noindex, nofollow" /></Helmet>
    <section className="w-full max-w-lg rounded-3xl bg-white p-7 sm:p-10 shadow-2xl">
      <img src="/Logotipo_Diario_Mercantil.svg" alt="Diario Mercantil de Venezuela" className="h-auto w-64 max-w-full" />
      <div className="mt-8 mb-5 inline-flex rounded-2xl bg-slate-100 p-4 text-brand-800"><Wrench size={32} aria-hidden="true" /></div>
      <h1 className="text-3xl font-semibold text-slate-900">Mantenimiento programado</h1>
      <p className="mt-4 text-slate-600 leading-relaxed">Estamos realizando mejoras en el sistema. El acceso al sitio está temporalmente restringido.</p>
      <form onSubmit={unlock} className="mt-8 space-y-4">
        <label className="block text-sm font-medium text-slate-800" htmlFor="maintenance-password">Contraseña de administrador</label>
        <input id="maintenance-password" className="input w-full" type="password" required maxLength={1024} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={busy} />
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="btn btn-primary w-full flex items-center justify-center gap-2"><LockKeyhole size={18} aria-hidden="true" />{busy ? 'Verificando...' : 'Autorizar acceso'}</button>
        {error && <button type="button" onClick={() => void check()} className="text-sm underline text-brand-800">Comprobar disponibilidad</button>}
      </form>
    </section>
  </main>
}
