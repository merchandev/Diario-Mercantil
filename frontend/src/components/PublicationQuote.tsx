import { useEffect, useRef, useState } from 'react'
import { getBcvRate, getSettings } from '../lib/api'

export default function PublicationQuote() {
  const [settings, setSettings] = useState<any>()
  const [rate, setRate] = useState(0)
  const [type, setType] = useState('Documento')
  const [mode, setMode] = useState('manual')
  const [folios, setFolios] = useState(1)
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const sequence = useRef(0)
  const fileInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    Promise.all([getSettings(), getBcvRate()]).then(([s,r]) => { setSettings(s.settings); setRate(r.rate) }).catch(e => setError(e.message || 'No se pudo obtener la tarifa.'))
  }, [])
  const analyze = async (file?: File) => {
    const current = ++sequence.current
    setError(''); setFileName('')
    if (!file) { setBusy(false); return }
    if (!file.name.toLowerCase().endsWith('.pdf') || file.size > 50 * 1024 * 1024) { setError('Seleccione un PDF de hasta 50 MB.'); return }
    setBusy(true)
    try {
      const { countPublicationPdf } = await import('../lib/publicationPdf')
      const count = await countPublicationPdf(file)
      if (current === sequence.current) { setFolios(count); setFileName(file.name) }
    } catch { if (current === sequence.current) setError('No se pudo contar el PDF. Compruebe que no está dañado o protegido con contraseña.') }
    finally { if (current === sequence.current) setBusy(false) }
  }
  const valid = Number.isInteger(folios) && folios > 0 && (type === 'Convocatoria' || mode === 'manual' || !!fileName)
  const price = Number(type === 'Documento' ? settings?.price_per_folio_usd : settings?.convocatoria_usd)
  const amount = valid && Number.isFinite(price) ? price * (type === 'Documento' ? folios : 1) : 0
  const money = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return <section className="space-y-5">
    <h1 className="text-2xl font-bold text-brand-800">Cotizador</h1><p className="text-slate-600">Calcule el monto estimado de su publicación. Puede indicar los folios o contarlos desde un PDF.</p>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-800">{error}</p>}
    <div className="card p-5 space-y-4">
      <label className="block text-sm">Tipo de publicación<select className="input ml-3" value={type} onChange={e => setType(e.target.value)}><option>Documento</option><option>Convocatoria</option></select></label>
      {type === 'Documento' && <>
        <div className="flex gap-3"><button type="button" className={'btn ' + (mode === 'manual' ? 'btn-primary' : 'btn-outline')} onClick={() => { sequence.current++; setBusy(false); setMode('manual') }}>Indicar folios</button><button type="button" className={'btn ' + (mode === 'pdf' ? 'btn-primary' : 'btn-outline')} onClick={() => setMode('pdf')}>Contar desde PDF</button></div>
        {mode === 'manual' ? <label className="block text-sm">Número de folios<input type="number" className="input ml-3" min={1} step={1} value={folios} onChange={e => setFolios(Number(e.target.value))} /></label> :
          <div className="rounded-lg border-2 border-dashed border-brand-200 p-5"><label className="block text-sm">Documento PDF<input ref={fileInput} type="file" accept=".pdf,application/pdf" className="block mt-2 max-w-full" onChange={e => void analyze(e.target.files?.[0])} /></label>{busy && <p role="status">Contando folios...</p>}{fileName && <p className="text-sm mt-2">{fileName} · {folios} folios <button type="button" className="underline text-brand-700" onClick={() => { sequence.current++; setFileName(''); setBusy(false); if (fileInput.current) fileInput.current.value = '' }}>Quitar archivo</button></p>}<p className="text-xs text-slate-500 mt-2">El archivo se cuenta en su navegador y no crea una solicitud.</p></div>}
      </>}
    </div>
    {settings && valid && !busy && <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="card p-5"><p className="text-sm text-slate-600">{type === 'Documento' ? 'Folios' : 'Publicación'}</p><p className="text-3xl font-bold">{type === 'Documento' ? folios : 1}</p></div>
      <div className="card p-5"><p className="text-sm text-slate-600">{type === 'Documento' ? 'Precio por folio' : 'Precio de convocatoria'}</p><p className="text-2xl font-bold">USD {money(price)}</p></div>
      <div className="card p-5"><p className="text-sm text-slate-600">Subtotal del servicio</p><p className="text-2xl font-bold">USD {money(amount)}</p></div>
      <div className="rounded-xl bg-brand-800 text-white p-5"><p className="text-sm">Total estimado</p><p className="text-2xl font-bold">{rate > 0 ? 'Bs. ' + money(amount * rate) : 'USD ' + money(amount)}</p></div>
    </div>}
    <p className="text-sm text-slate-600">La tarifa configurada incluye IVA. El monto definitivo y la tasa vigente se confirman al generar la orden de servicio.</p>
  </section>
}
