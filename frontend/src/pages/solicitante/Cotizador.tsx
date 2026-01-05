import { useEffect, useMemo, useState } from 'react'
import { getBcvRate, getSettings } from '../../lib/api'

export default function Cotizador(){
  const [settings, setSettings] = useState<any>({})
  const [bcv, setBcv] = useState<number>(0)
  const [tipo, setTipo] = useState<'Documento'|'Convocatoria'>('Documento')
  const [folios, setFolios] = useState(1)
  useEffect(()=>{ 
    getSettings()
      .then(r=>setSettings(r.settings||{}))
      .catch(err=>console.error('Error cargando configuración:', err))
    getBcvRate()
      .then(r=>setBcv(r.rate))
      .catch(err=>console.error('Error cargando tasa BCV:', err))
  },[])
  const usd = useMemo(()=> tipo==='Documento' ? (Number(settings.price_per_folio_usd||0) * Math.max(1,folios)) : Number(settings.convocatoria_usd||0), [settings, tipo, folios])
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Cotizador</h1>
      <p className="text-sm text-slate-700">Calcule el monto referencial de su publicación antes de generar la solicitud.</p>
      <div className="card p-4 grid md:grid-cols-3 gap-3 items-end">
        <label className="text-sm">Tipo de publicación
          <select className="input w-full mt-1" value={tipo} onChange={e=>setTipo(e.target.value as any)}>
            <option>Documento</option>
            <option>Convocatoria</option>
          </select>
        </label>
        {tipo==='Documento' && (
          <label className="text-sm">N.º de folios
            <input className="input w-full mt-1" type="number" min={1} value={folios} onChange={e=>setFolios(parseInt(e.target.value||'1'))} />
          </label>
        )}
        <div className="text-sm">
          <div>Monto referencial (USD): <span className="font-semibold">{usd.toFixed(2)}</span></div>
          <div className="text-slate-600">El pago se realiza en bolívares al tipo de cambio oficial del BCV vigente el día de la solicitud.</div>
        </div>
      </div>
    </section>
  )
}
