import { useEffect, useState } from 'react'
import { getSettings, saveSettings, type Settings, listDirAreas, listDirColleges, createDirArea, updateDirArea, deleteDirArea, createDirCollege, updateDirCollege, deleteDirCollege } from '../lib/api'

export default function Configuracion(){
  const [s, setS] = useState<Partial<Settings>>({})
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'General'|'Medios de pago'|'Directorio Legal'|'Preguntas y Respuestas'|'Instrucciones: Documentos'|'Instrucciones: Convocatorias'>('Directorio Legal')
  const [areas, setAreas] = useState<{id:number; name:string}[]>([])
  const [colleges, setColleges] = useState<{id:number; name:string}[]>([])

  useEffect(()=>{ getSettings().then(r=>setS(r.settings)).catch(()=>{}) },[])
  const loadDir = async()=>{
    try {
      const [a,c] = await Promise.all([listDirAreas(), listDirColleges()])
      setAreas(a.items); setColleges(c.items)
    } catch {}
  }
  useEffect(()=>{ if (tab==='Directorio Legal') loadDir() }, [tab])
  const onSave = async()=>{
    setSaving(true)
    await saveSettings(s)
    setSaving(false)
  }
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Configuración</h1>
      <div className="card p-4">
        <div className="tabs flex gap-2 border-b mb-4">
          {(['General','Medios de pago','Directorio Legal','Preguntas y Respuestas','Instrucciones: Documentos','Instrucciones: Convocatorias'] as typeof tab[]).map(t=> (
            <button key={t} onClick={()=>setTab(t)} className={["px-3 py-2 rounded-t-lg bg-white text-slate-700 border-b-2", tab===t?'border-brand-800':'border-transparent hover:border-brand-800/30'].join(' ')}>{t}</button>
          ))}
        </div>
        {tab==='General' && (
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
                  value={s.price_per_folio_usd??1.5} 
                  onChange={e=>setS({...s, price_per_folio_usd: parseFloat(e.target.value) || 1.5})} 
                  placeholder="1.50"
                />
                <span className="text-xs text-slate-500 mt-1 block">Precio base por cada folio (página) del documento</span>
              </label>
              <label className="text-sm">
                <span className="font-semibold text-slate-700 block mb-1">Tasa Referencial BCV (Bs/USD)</span>
                <input className="input w-full" type="number" step="0.01" value={s.bcv_rate??''} onChange={e=>setS({...s, bcv_rate: parseFloat(e.target.value) || 0})} placeholder="36.50" />
                <span className="text-xs text-slate-500 mt-1 block">Se actualiza automáticamente desde el BCV</span>
              </label>
              <label className="text-sm">
                <span className="font-semibold text-slate-700 block mb-1">Precio de Convocatoria (USD)</span>
                <input className="input w-full" type="number" step="0.01" value={s.convocatoria_usd??''} onChange={e=>setS({...s, convocatoria_usd: parseFloat(e.target.value) || 0})} placeholder="50.00" />
              </label>
              <label className="text-sm">
                <span className="font-semibold text-slate-700 block mb-1">IVA (%)</span>
                <input className="input w-full" type="number" step="0.01" value={s.iva_percent??16} onChange={e=>setS({...s, iva_percent: parseFloat(e.target.value) || 16})} placeholder="16" />
              </label>
              <label className="text-sm">
                <span className="font-semibold text-slate-700 block mb-1">Unidad Tributaria (Bs)</span>
                <input className="input w-full" type="number" step="0.01" value={s.unit_tax_bs ?? ''} onChange={e=>setS({...s, unit_tax_bs: parseFloat(e.target.value) || 0})} placeholder="43" />
              </label>
            </div>
          </div>
          
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="font-bold text-slate-900 mb-3">📝 Instrucciones para Usuarios</h3>
            <div className="space-y-4">
              <label className="text-sm block">
                <span className="font-semibold text-slate-700 block mb-1">Instrucciones: Documentos (texto)</span>
                <textarea className="input w-full h-28" value={s.instructions_documents_text??''} onChange={e=>setS({...s, instructions_documents_text: e.target.value})} placeholder="Escriba las instrucciones para los usuarios..." />
              </label>
              <label className="text-sm block">
                <span className="font-semibold text-slate-700 block mb-1">URL de imagen guía (Documentos)</span>
                <input className="input w-full" value={s.instructions_documents_image_url??''} onChange={e=>setS({...s, instructions_documents_image_url: e.target.value})} placeholder="https://ejemplo.com/imagen-guia.png" />
              </label>
              <label className="text-sm block">
                <span className="font-semibold text-slate-700 block mb-1">Instrucciones: Convocatorias (texto)</span>
                <textarea className="input w-full h-28" value={s.instructions_convocatorias_text??''} onChange={e=>setS({...s, instructions_convocatorias_text: e.target.value})} placeholder="Escriba las instrucciones para convocatorias..." />
              </label>
            </div>
          </div>
        </div>
        )}

        {tab==='Directorio Legal' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2"><div className="font-medium">Áreas de Ejercicio Profesional</div>
                <div className="flex gap-2">
                  <button className="btn btn-outline" onClick={()=>{
                    const sel = (document.getElementById('areas-list') as HTMLSelectElement); const id = Number(sel?.value||0); if (!id) return; const cur = areas.find(a=>a.id===id); const name = prompt('Modificar área', cur?.name||''); if (name && name.trim()) updateDirArea(id, name.trim()).then(loadDir)
                  }}>Modificar</button>
                  <button className="btn btn-primary" onClick={()=>{ const name = prompt('Nueva área'); if (name && name.trim()) createDirArea(name.trim()).then(loadDir) }}>Nueva Área</button>
                </div>
              </div>
              <select id="areas-list" multiple className="w-full h-64 border rounded p-2" size={12}>
                {areas.map(a=> <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <div className="mt-2 text-right"><button className="text-rose-700 hover:underline" onClick={()=>{ const sel=(document.getElementById('areas-list') as HTMLSelectElement); const id=Number(sel?.value||0); if(id && confirm('¿Eliminar área?')) deleteDirArea(id).then(loadDir) }}>Eliminar</button></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2"><div className="font-medium">Colegios</div>
                <div className="flex gap-2">
                  <button className="btn btn-outline" onClick={()=>{
                    const sel = (document.getElementById('colegios-list') as HTMLSelectElement); const id = Number(sel?.value||0); if (!id) return; const cur = colleges.find(c=>c.id===id); const name = prompt('Modificar colegio', cur?.name||''); if (name && name.trim()) updateDirCollege(id, name.trim()).then(loadDir)
                  }}>Modificar</button>
                  <button className="btn btn-primary" onClick={()=>{ const name = prompt('Nuevo colegio'); if (name && name.trim()) createDirCollege(name.trim()).then(loadDir) }}>Nuevo Colegio</button>
                </div>
              </div>
              <select id="colegios-list" multiple className="w-full h-64 border rounded p-2" size={12}>
                {colleges.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="mt-2 text-right"><button className="text-rose-700 hover:underline" onClick={()=>{ const sel=(document.getElementById('colegios-list') as HTMLSelectElement); const id=Number(sel?.value||0); if(id && confirm('¿Eliminar colegio?')) deleteDirCollege(id).then(loadDir) }}>Eliminar</button></div>
            </div>
          </div>
        )}

        {tab!=='Directorio Legal' && (
          <div className="mt-4"><button onClick={onSave} className="btn btn-primary" disabled={saving}>{saving? 'Guardando...':'Guardar'}</button></div>
        )}
      </div>
    </section>
  )
}
