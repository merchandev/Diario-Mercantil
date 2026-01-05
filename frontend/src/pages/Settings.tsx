import { useEffect, useState } from 'react'
import type React from 'react'
import { getSettings, saveSettings } from '../lib/api'

export default function Settings(){
  const [s, setS] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string|null>(null)
  useEffect(()=>{ 
    getSettings()
      .then(r=>setS(r.settings||{}))
      .catch(err=>{
        console.error('Error cargando configuración:', err)
        setError('No se pudo cargar la configuración')
      }) 
  },[])
  const onSave = async(e:React.FormEvent)=>{
    e.preventDefault(); setSaving(true)
    await saveSettings(s); setSaving(false)
    alert('Guardado')
  }
  return (
    <form onSubmit={onSave} className="card p-6 space-y-4">
      <h2 className="text-xl font-semibold">Configuración</h2>
      <div className="grid md:grid-cols-3 gap-3">
        <label className="block"><span className="text-sm">Precio por folio (USD)</span><input className="input w-full" type="number" step="0.01" value={s.price_per_folio_usd||''} onChange={e=>setS({...s, price_per_folio_usd:e.target.value})} /></label>
        <label className="block"><span className="text-sm">Convocatoria (USD)</span><input className="input w-full" type="number" step="0.01" value={s.convocatoria_usd||''} onChange={e=>setS({...s, convocatoria_usd:e.target.value})} /></label>
        <label className="block"><span className="text-sm">IVA (%)</span><input className="input w-full" type="number" step="0.01" value={s.iva_percent||''} onChange={e=>setS({...s, iva_percent:e.target.value})} /></label>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="block"><span className="text-sm">Instrucciones: Documentos (texto)</span><textarea className="input w-full h-40" value={s.instructions_documents_text||''} onChange={e=>setS({...s, instructions_documents_text:e.target.value})} /></label>
        <label className="block"><span className="text-sm">Imagen de ayuda (URL)</span><input className="input w-full" placeholder="https://..." value={s.instructions_documents_image_url||''} onChange={e=>setS({...s, instructions_documents_image_url:e.target.value})} /></label>
      </div>
      <div>
        <label className="block"><span className="text-sm">Instrucciones: Convocatorias (texto)</span><textarea className="input w-full h-40" value={s.instructions_convocatorias_text||''} onChange={e=>setS({...s, instructions_convocatorias_text:e.target.value})} /></label>
      </div>
      <div className="flex gap-2"><button className="btn btn-primary" disabled={saving}>Guardar</button></div>
    </form>
  )
}
