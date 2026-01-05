import { useEffect, useMemo, useState } from 'react'
import { getBcvRate, getSettings } from '../lib/api'

export default function Cotizador(){
  const [kind, setKind] = useState<'Documento'|'Convocatoria'>('Documento')
  const [folios, setFolios] = useState(1)
  const [settings, setSettings] = useState<any>({})
  const [rate, setRate] = useState<number|undefined>()
  useEffect(()=>{ 
    getSettings()
      .then(r=>setSettings(r.settings))
      .catch(err=>console.error('Error cargando configuración:', err))
    getBcvRate()
      .then(r=>setRate(r.rate))
      .catch(err=>console.error('Error cargando tasa BCV:', err))
  },[])
  const usd = useMemo(()=>{
    if (kind==='Documento') return (Number(settings.price_per_folio_usd||0) * Math.max(1, folios))
    return Number(settings.convocatoria_usd || 0)
  },[kind,folios,settings])
  const bs = rate ? usd * rate : undefined
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">COTIZADOR. Calcula de forma rápida y sencilla el monto referencial de tu publicación antes de generar la solicitud.</h1>
      <div className="card p-4 space-y-3 text-sm">
        <p>En este apartado podrá calcular de forma rápida y sencilla el monto estimado de su publicación antes de generar la solicitud.</p>
        <div className="grid md:grid-cols-3 gap-2 items-end">
          <label className="block">
            <span className="text-sm">Tipo de publicación</span>
            <select className="input" value={kind} onChange={e=>setKind(e.target.value as any)}>
              <option value="Documento">Documento</option>
              <option value="Convocatoria">Convocatoria</option>
            </select>
          </label>
          {kind==='Documento' && (
            <label className="block">
              <span className="text-sm">Número de folios</span>
              <input className="input" type="number" min={1} value={folios} onChange={e=>setFolios(Math.max(1, Number(e.target.value||1)))} />
            </label>
          )}
          <div className="p-3 bg-slate-50 rounded border">
            <div className="text-xs text-slate-600">Resultado</div>
            <div className="text-sm">Monto referencial en dólares: <span className="font-semibold">{usd.toFixed(2)}</span> USD</div>
          </div>
        </div>
        <div className="text-sm text-slate-700 space-y-1">
          <div>• El sistema mostrará el monto total referencial en dólares.</div>
          <div>• El pago se realiza exclusivamente en bolívares, calculado al tipo de cambio oficial del Banco Central de Venezuela (BCV) vigente el día en que se genera la solicitud, que debe ser el mismo día del pago.</div>
          <div>• El monto final en bolívares dependerá de la tasa oficial Bs/USD del día de la solicitud y será el utilizado para el pago.</div>
        </div>
        <div className="text-xs text-slate-600">Nota: El monto mostrado por la calculadora es solo referencial en dólares. El valor definitivo en bolívares se confirmará al generar su orden de servicio, de acuerdo con la tasa oficial vigente publicada por el BCV para ese día.</div>
      </div>
      <div className="card p-4">
        <div className="text-sm text-slate-600">Tasa BCV de referencia: {rate? rate.toFixed(2): '—'} Bs/USD</div>
        <div className="text-sm">Monto estimado en bolívares: <span className="font-semibold">{bs? bs.toFixed(2): '—'}</span> Bs.</div>
      </div>
    </section>
  )
}
