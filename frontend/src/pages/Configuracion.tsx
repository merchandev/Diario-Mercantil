import { useEffect, useState } from 'react'
import { getSettings, getAdminSettings, saveSettings, type Settings, listDirAreas, listDirColleges, createDirArea, updateDirArea, deleteDirArea, createDirCollege, updateDirCollege, deleteDirCollege } from '../lib/api'
import { useDialog } from '../contexts/DialogContext'

export default function Configuracion() {
  const { showAlert, confirmAction, requestText } = useDialog()
  const [s, setS] = useState<Partial<Settings>>({})
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'General' | 'Medios de pago' | 'Directorio Legal' | 'Preguntas y Respuestas' | 'Instrucciones: Documentos' | 'Instrucciones: Convocatorias'>('Directorio Legal')
  const [areas, setAreas] = useState<{ id: number; name: string }[]>([])
  const [colleges, setColleges] = useState<{ id: number; name: string }[]>([])
  const [selectedAreaId, setSelectedAreaId] = useState(0)
  const [selectedCollegeId, setSelectedCollegeId] = useState(0)

  useEffect(() => { getAdminSettings().then(r => setS(r.settings)).catch(() => { }) }, [])
  const loadDir = async () => {
    try {
      const [a, c] = await Promise.all([listDirAreas(), listDirColleges()])
      setAreas(a.items); setColleges(c.items)
    } catch { }
  }
  useEffect(() => { if (tab === 'Directorio Legal') loadDir() }, [tab])
  const onSave = async () => {
    setSaving(true)
    try {
      await saveSettings(s)
      const persisted = await getAdminSettings()
      setS(persisted.settings)
      await showAlert(`Configuración guardada. Precio por folio vigente: USD ${Number(persisted.settings.price_per_folio_usd).toFixed(2)}.`, { title: 'Guardado' })
    } catch (error: any) {
      void showAlert(error?.message || 'No se pudo guardar la configuración.', { title: 'Error' })
    } finally {
      setSaving(false)
    }
  }
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Configuración</h1>
      <div className="card p-4">
        <div className="tabs flex gap-2 border-b mb-4">
          {(['General', 'Medios de pago', 'Directorio Legal', 'Preguntas y Respuestas', 'Instrucciones: Documentos', 'Instrucciones: Convocatorias'] as typeof tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className={["px-3 py-2 rounded-t-lg bg-white text-slate-700 border-b-2", tab === t ? 'border-brand-800' : 'border-transparent hover:border-brand-800/30'].join(' ')}>{t}</button>
          ))}
        </div>
        {tab === 'General' && (
          <div className="space-y-6">
            <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
              <h3 className="font-bold text-brand-900 mb-3">💰 Precios y Tasas</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <label className="text-sm">
                  <span className="font-semibold text-slate-700 block mb-1">Precio por Folio (USD) *</span>
                  <input
                    className="input w-full"
                    type="number"
                    step="0.01"
                    value={s.price_per_folio_usd ?? 1.5}
                    onChange={e => setS({ ...s, price_per_folio_usd: parseFloat(e.target.value) || 1.5 })}
                    placeholder="1.50"
                  />
                  <span className="text-xs text-slate-500 mt-1 block">Precio base por cada folio (página) del documento</span>
                </label>
                <label className="text-sm">
                  <span className="font-semibold text-slate-700 block mb-1">Tasa Referencial BCV (Bs/USD)</span>
                  <input className="input w-full" type="number" step="0.01" value={s.bcv_rate ?? ''} onChange={e => setS({ ...s, bcv_rate: parseFloat(e.target.value) || 0 })} placeholder="36.50" />
                  <span className="text-xs text-slate-500 mt-1 block">Se actualiza automáticamente desde el BCV</span>
                </label>
                <label className="text-sm">
                  <span className="font-semibold text-slate-700 block mb-1">Precio de Convocatoria (USD)</span>
                  <input className="input w-full" type="number" step="0.01" value={s.convocatoria_usd ?? ''} onChange={e => setS({ ...s, convocatoria_usd: parseFloat(e.target.value) || 0 })} placeholder="50.00" />
                </label>
                <label className="text-sm">
                  <span className="font-semibold text-slate-700 block mb-1">IVA (%)</span>
                  <input className="input w-full" type="number" step="0.01" value={s.iva_percent ?? 16} onChange={e => setS({ ...s, iva_percent: parseFloat(e.target.value) || 16 })} placeholder="16" />
                </label>
                <label className="text-sm">
                  <span className="font-semibold text-slate-700 block mb-1">Unidad Tributaria (Bs)</span>
                  <input className="input w-full" type="number" step="0.01" value={s.unit_tax_bs ?? ''} onChange={e => setS({ ...s, unit_tax_bs: parseFloat(e.target.value) || 0 })} placeholder="43" />
                </label>
              </div>
            </div>
          </div>
        )}

        {tab === 'Instrucciones: Documentos' && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
            <h3 className="font-bold text-slate-900 mb-3">📝 Instrucciones para Documentos</h3>
            <label className="text-sm block">
              <span className="font-semibold text-slate-700 block mb-1">Instrucciones: Documentos (texto)</span>
              <textarea className="input w-full h-28" value={s.instructions_documents_text ?? ''} onChange={e => setS({ ...s, instructions_documents_text: e.target.value })} placeholder="Escriba las instrucciones para los usuarios..." />
            </label>
            <label className="text-sm block">
              <span className="font-semibold text-slate-700 block mb-1">URL de imagen guía (Documentos)</span>
              <input className="input w-full" value={s.instructions_documents_image_url ?? ''} onChange={e => setS({ ...s, instructions_documents_image_url: e.target.value })} placeholder="https://ejemplo.com/imagen-guia.png" />
            </label>
          </div>
        )}

        {tab === 'Instrucciones: Convocatorias' && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
            <h3 className="font-bold text-slate-900 mb-3">📝 Instrucciones para Convocatorias</h3>
            <label className="text-sm block">
              <span className="font-semibold text-slate-700 block mb-1">Instrucciones: Convocatorias (texto)</span>
              <textarea className="input w-full h-28" value={s.instructions_convocatorias_text ?? ''} onChange={e => setS({ ...s, instructions_convocatorias_text: e.target.value })} placeholder="Escriba las instrucciones para convocatorias..." />
            </label>
          </div>
        )}

        {tab === 'Directorio Legal' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2"><div className="font-medium">Áreas de Ejercicio Profesional</div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-outline flex-1 sm:flex-none" onClick={async () => {
                    if (!selectedAreaId) return; const cur = areas.find(a => a.id === selectedAreaId); const name = await requestText('Nombre del área profesional.', { title: 'Modificar área', initialValue: cur?.name || '' }); if (name) { await updateDirArea(selectedAreaId, name); await loadDir() }
                  }}>Modificar</button>
                  <button className="btn btn-primary flex-1 sm:flex-none" onClick={async () => { const name = await requestText('Nombre del área profesional.', { title: 'Nueva área' }); if (name) { await createDirArea(name); await loadDir() } }}>Nueva Área</button>
                </div>
              </div>
              <select id="areas-list" className="w-full h-64 border rounded p-2" size={12} value={selectedAreaId || ''} onChange={event => setSelectedAreaId(Number(event.target.value))}>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <div className="mt-2 text-right"><button className="text-rose-700 hover:underline" onClick={async () => { if (selectedAreaId && await confirmAction('¿Eliminar el área seleccionada?', { title: 'Eliminar área', danger: true })) { await deleteDirArea(selectedAreaId); setSelectedAreaId(0); await loadDir() } }}>Eliminar</button></div>
            </div>
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2"><div className="font-medium">Colegios</div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-outline flex-1 sm:flex-none" onClick={async () => {
                    if (!selectedCollegeId) return; const cur = colleges.find(c => c.id === selectedCollegeId); const name = await requestText('Nombre del colegio profesional.', { title: 'Modificar colegio', initialValue: cur?.name || '' }); if (name) { await updateDirCollege(selectedCollegeId, name); await loadDir() }
                  }}>Modificar</button>
                  <button className="btn btn-primary flex-1 sm:flex-none" onClick={async () => { const name = await requestText('Nombre del colegio profesional.', { title: 'Nuevo colegio' }); if (name) { await createDirCollege(name); await loadDir() } }}>Nuevo Colegio</button>
                </div>
              </div>
              <select id="colegios-list" className="w-full h-64 border rounded p-2" size={12} value={selectedCollegeId || ''} onChange={event => setSelectedCollegeId(Number(event.target.value))}>
                {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="mt-2 text-right"><button className="text-rose-700 hover:underline" onClick={async () => { if (selectedCollegeId && await confirmAction('¿Eliminar el colegio seleccionado?', { title: 'Eliminar colegio', danger: true })) { await deleteDirCollege(selectedCollegeId); setSelectedCollegeId(0); await loadDir() } }}>Eliminar</button></div>
            </div>
          </div>
        )}

        {tab !== 'Directorio Legal' && (
          <div className="mt-4"><button onClick={onSave} className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button></div>
        )}
      </div>
    </section>
  )
}
