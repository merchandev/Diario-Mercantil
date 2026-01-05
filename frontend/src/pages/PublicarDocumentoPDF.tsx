import { useEffect, useState } from 'react'
import type React from 'react'
import { addLegalPayment, downloadLegal, listPayments, type PaymentMethod, uploadLegalPdf } from '../lib/api'

export default function PublicarDocumentoPDF(){
  const [step, setStep] = useState<1|2>(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [requestId, setRequestId] = useState<number|null>(null)
  const [folios, setFolios] = useState<number>(0)
  const [pricing, setPricing] = useState<{unit_bs:number; subtotal_bs:number; iva_percent:number; iva_bs:number; total_bs:number} | null>(null)
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [pay, setPay] = useState<{type:string; bank:string; ref:string; date:string; amount_bs:string; mobile_phone?:string}>(
    { type:'transferencia', bank:'', ref:'', date: new Date().toISOString().slice(0,10), amount_bs:'' }
  )
  const [accepted, setAccepted] = useState(false)

  useEffect(()=>{ listPayments().then(r=>setMethods(r.items)).catch(()=>setMethods([])) },[])

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>)=>{
    const file = e.currentTarget.files?.[0]
    if (!file) return
    setError(null)
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')){
      setError('Solo se permiten archivos PDF.')
      return
    }
    setBusy(true)
    try {
      const res = await uploadLegalPdf(file)
      setRequestId(res.id)
      setFolios(res.folios)
      setPricing({
        unit_bs: res.pricing.unit_bs,
        subtotal_bs: res.pricing.subtotal_bs,
        iva_percent: res.pricing.iva_percent,
        iva_bs: res.pricing.iva_bs,
        total_bs: res.pricing.total_bs,
      })
      setPay(p=>({...p, amount_bs: String(res.pricing.total_bs)}))
      setStep(2)
    } catch (e:any) {
      setError(e.message || 'Error al subir el PDF')
    } finally {
      setBusy(false)
    }
  }

  const submitPayment = async (e:React.FormEvent)=>{
    e.preventDefault()
    if (!accepted) { alert('Debe aceptar los Términos y Condiciones.'); return }
    if (!requestId) return
    setBusy(true)
    try {
      await addLegalPayment(requestId, {
        type: pay.type,
        bank: pay.bank,
        ref: pay.ref,
        date: pay.date,
        amount_bs: Number(pay.amount_bs || pricing?.total_bs || 0),
        mobile_phone: pay.type === 'pago móvil' ? (pay.mobile_phone||'') : undefined,
        status: 'Pendiente'
      })
      alert('Pago reportado. Su solicitud está por verificar.')
    } catch (e:any) {
      alert(e.message || 'No se pudo reportar el pago')
    } finally { setBusy(false) }
  }

  const onDownloadOrder = async()=>{
    if (!requestId) return
    const blob = await downloadLegal(requestId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orden-servicio-${requestId}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Publicar Documento en PDF</h1>
      {step===1 && (
        <div className="card p-4 space-y-3">
          <p className="text-sm text-slate-600">Cargue su documento en formato PDF. Contaremos las páginas automáticamente para calcular el monto a pagar.</p>
          <input type="file" accept="application/pdf" onChange={onPick} disabled={busy} className="input" />
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </div>
      )}
      {step===2 && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="font-semibold mb-2">Resumen</div>
            <div className="text-sm grid md:grid-cols-2 gap-2">
              <div>N.º de folios: <span className="font-medium">{folios}</span></div>
              <div>Precio unitario (Bs.): <span className="font-medium">{pricing?.unit_bs.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
              <div>Subtotal (Bs.): <span className="font-medium">{pricing?.subtotal_bs.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
              <div>IVA ({pricing?.iva_percent}%): <span className="font-medium">{pricing?.iva_bs.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
              <div className="md:col-span-2">TOTAL (Bs.): <span className="font-semibold">{pricing?.total_bs.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
            </div>
            <div className="mt-3">
              <button className="btn" onClick={onDownloadOrder}>Descargar orden de servicio</button>
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <div className="font-semibold">Medios de pago</div>
            {methods.length===0 ? (
              <div className="text-sm text-slate-600">Aún no hay medios de pago configurados.</div>
            ) : (
              <ul className="text-sm space-y-1">
                {methods.map(m=> (
                  <li key={m.id} className="border rounded p-2">
                    <div className="font-medium">{m.type}</div>
                    <div className="text-slate-600">Banco: {m.bank || '-'}</div>
                    {m.account && <div className="text-slate-600">Cuenta: {m.account}</div>}
                    {m.holder && <div className="text-slate-600">Titular: {m.holder}</div>}
                    {m.rif && <div className="text-slate-600">RIF: {m.rif}</div>}
                    {m.phone && <div className="text-slate-600">Teléfono: {m.phone}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={submitPayment} className="card p-4 space-y-3">
            <div className="font-semibold">Reportar pago</div>
            <div className="grid md:grid-cols-3 gap-2">
              <select className="input" value={pay.type} onChange={e=>setPay({...pay, type:e.target.value})}>
                <option>transferencia</option>
                <option>pago móvil</option>
                <option>depósito</option>
              </select>
              <input className="input" placeholder="Banco" value={pay.bank} onChange={e=>setPay({...pay, bank:e.target.value})} />
              <input className="input" placeholder="Referencia" value={pay.ref} onChange={e=>setPay({...pay, ref:e.target.value})} />
              <input className="input" type="date" value={pay.date} onChange={e=>setPay({...pay, date:e.target.value})} />
              <input className="input" type="number" step="0.01" placeholder="Monto (Bs.)" value={pay.amount_bs} onChange={e=>setPay({...pay, amount_bs:e.target.value})} />
              {pay.type === 'pago móvil' && (
                <input className="input" placeholder="Teléfono desde el que realizó el pago móvil" value={pay.mobile_phone||''} onChange={e=>setPay({...pay, mobile_phone:e.target.value})} />
              )}
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} />
              <span>Confirmo que acepto los Términos y Condiciones del Diario Mercantil de Venezuela.</span>
            </label>
            <div className="flex gap-2">
              <button type="button" className="btn" onClick={()=>setStep(1)}>Atrás</button>
              <button className="btn btn-primary" disabled={busy || !requestId}>Reportar pago</button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
