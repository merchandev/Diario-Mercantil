import { useEffect, useState } from 'react'
import { getAdminSettings, saveSettings } from '../lib/api'

export default function RegistrationControl({ dark = false }: { dark?: boolean }) {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  async function load() {
    setError(null)
    setEnabled(null)
    try {
      const { settings } = await getAdminSettings()
      setEnabled(settings.registration_enabled === true || String(settings.registration_enabled) === '1')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo consultar el estado del registro.')
    }
  }

  useEffect(() => { void load() }, [])

  async function toggle() {
    if (enabled === null || saving) return
    const next = !enabled
    setSaving(true)
    setMessage('')
    setError(null)
    try {
      await saveSettings({ registration_enabled: next })
      const { settings } = await getAdminSettings()
      const persisted = settings.registration_enabled === true || String(settings.registration_enabled) === '1'
      if (persisted !== next) throw new Error('El cambio no quedó guardado. Consulta nuevamente el estado del registro.')
      setEnabled(persisted)
      setMessage(persisted ? 'Registro activado. Los cambios ya están guardados.' : 'Registro desactivado. Los cambios ya están guardados.')
    } catch (error) {
      setEnabled(null)
      setError(error instanceof Error ? error.message : 'No se pudo actualizar el registro.')
    } finally {
      setSaving(false)
    }
  }

  return <section aria-label="Control de registro de usuarios" className={dark ? 'md:col-span-2 rounded-2xl border border-purple-500/30 bg-gray-800/50 p-5 text-white' : 'card p-5'}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">Registro de usuarios</h2>
          {enabled !== null && <span className={'rounded-full px-3 py-1 text-xs font-semibold ' + (enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900')}>{enabled ? 'Activado' : 'Desactivado'}</span>}
        </div>
        <p className={'text-sm ' + (dark ? 'text-gray-300' : 'text-slate-600')}>Controla la creación de nuevas cuentas desde el formulario público. Las cuentas existentes pueden seguir iniciando sesión.</p>
      </div>
      {!error && <button type="button" className={'btn shrink-0 whitespace-nowrap disabled:opacity-50 ' + (enabled ? 'btn-outline' + (dark ? ' bg-white' : '') : 'btn-primary')} disabled={enabled === null || saving} onClick={() => void toggle()}>{saving ? 'Guardando...' : enabled === null ? 'Cargando registro...' : enabled ? 'Desactivar registro' : 'Activar registro'}</button>}
    </div>
    {error && <div className="mt-3 flex flex-wrap items-center gap-3"><p role="alert" className={'text-sm ' + (dark ? 'text-rose-300' : 'text-rose-700')}>{error}</p><button type="button" className={'btn btn-outline' + (dark ? ' bg-white' : '')} disabled={saving} onClick={() => void load()}>Consultar de nuevo</button></div>}
    {message && <p role="status" className={'mt-3 text-sm ' + (dark ? 'text-gray-300' : 'text-slate-600')}>{message}</p>}
  </section>
}
