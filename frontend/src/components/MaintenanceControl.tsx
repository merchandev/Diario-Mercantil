import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { MAINTENANCE_CHANGED } from './MaintenanceGate'

export default function MaintenanceControl({ dark = false }: { dark?: boolean }) {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    try {
      const data = await api.get('/api/maintenance/status')
      setEnabled(data.enabled); setError('')
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo consultar el mantenimiento.') }
  }
  useEffect(() => { void load() }, [])

  async function toggle() {
    if (enabled === null || saving) return
    setSaving(true); setError(''); setMessage('')
    try {
      const next = !enabled
      const result = await api.post('/api/admin/maintenance', { enabled: next })
      if (result.enabled !== next) throw new Error('No se pudo confirmar el estado guardado.')
      setEnabled(result.enabled)
      setMessage(next ? 'Mantenimiento activado. Su navegador tiene acceso autorizado durante cuatro horas.' : 'Mantenimiento desactivado. El sitio está disponible para todos.')
      window.dispatchEvent(new Event(MAINTENANCE_CHANGED))
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo actualizar el mantenimiento.') }
    finally { setSaving(false) }
  }

  return <section aria-label="Mantenimiento programado" className={dark ? 'md:col-span-2 rounded-2xl border border-purple-500/30 bg-gray-800/50 p-5 text-white' : 'card p-5'}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Mantenimiento programado</h2>
        <p className={'text-sm ' + (dark ? 'text-gray-300' : 'text-slate-600')}>Restringe todo el sitio y sus documentos. Para entrar se requiere la contraseña vigente de un administrador. El acceso dura cuatro horas y permite usar cuentas de administrador y cliente.</p>
      </div>
      <button type="button" role="switch" aria-label="Mantenimiento programado" aria-checked={enabled === true} disabled={enabled === null || saving} onClick={() => void toggle()} className="flex shrink-0 items-center gap-3 rounded-lg p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">
        <span className={'relative inline-block h-7 w-12 rounded-full transition-colors ' + (enabled ? 'bg-brand-800' : 'bg-slate-400')}><span className={'absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ' + (enabled ? 'translate-x-5' : 'translate-x-0')} /></span>
        <span className="text-sm font-medium">{saving ? 'Guardando...' : enabled === null ? 'Cargando...' : enabled ? 'Activado' : 'Desactivado'}</span>
      </button>
    </div>
    {error && <div className="mt-3"><p role="alert" className={dark ? 'text-rose-300 text-sm' : 'text-red-700 text-sm'}>{error}</p><button type="button" className="text-sm underline" onClick={() => void load()}>Consultar de nuevo</button></div>}
    {message && <p role="status" className={'mt-3 text-sm ' + (dark ? 'text-gray-300' : 'text-slate-600')}>{message}</p>}
  </section>
}
