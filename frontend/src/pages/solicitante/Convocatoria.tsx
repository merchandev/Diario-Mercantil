import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { addLegalPayment, attachLegalFile, createLegal, getBcvRate, getSettings, listLegalFiles, me, getLegal, type LegalFile, type LegalRequest, updateLegal, uploadFiles, listPayments, type PaymentMethod } from '../../lib/api'
import YearPicker from '../../components/YearPicker'

type ConvocatoriaPaymentForm = {
  type: 'transferencia' | 'pago_movil'
  bank: string
  ref: string
  date: string
  amount_bs: string
  mobile_phone: string
  document?: string
}

export default function Convocatoria() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')
  const [req, setReq] = useState<LegalRequest | undefined>()
  const [meta, setMeta] = useState<any>({})
  const [files, setFiles] = useState<LegalFile[]>([])
  const [settings, setSettings] = useState<any>({})
  const [bcv, setBcv] = useState<number>(0)
  const [accept, setAccept] = useState(false)
  const [pay, setPay] = useState<ConvocatoriaPaymentForm>({ type: 'transferencia', bank: '', ref: '', date: new Date().toISOString().slice(0, 10), amount_bs: '' as any, mobile_phone: '' })
  const [user, setUser] = useState<any>({})
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])

  useEffect(() => { getSettings().then(r => setSettings(r.settings || {})); getBcvRate().then(r => setBcv(r.rate)).catch(() => { }); listPayments().then(r => setPaymentMethods(r.items)).catch(() => { }) }, [])
  useEffect(() => { (async () => { try { const r = await me(); const u = (r as any).user || {}; setUser(u); setPay(p => ({ ...p, document: p.document || u.document || '', mobile_phone: p.mobile_phone || u.phone || '', })); } catch { } })(); }, [])

  useEffect(() => {
    if (!editId) return;
    getLegal(Number(editId)).then(data => {
      setReq(data.item);
      let parsedMeta = {};
      try { parsedMeta = typeof data.item.meta === 'string' ? JSON.parse(data.item.meta) : data.item.meta || {} } catch { }
      setMeta(parsedMeta);
      listLegalFiles(data.item.id).then(r => setFiles(r.items));
      if (data.payments && data.payments.length > 0) {
        const last = data.payments[0];
        setPay(prev => ({
          ...prev,
          type: last.type === 'Pago móvil' ? 'pago_movil' : 'transferencia',
          bank: last.bank || '',
          ref: last.ref || '',
          date: last.date || new Date().toISOString().slice(0, 10),
          amount_bs: String(last.amount_bs) as any,
          mobile_phone: last.mobile_phone || ''
        }));
      }
    }).catch(console.error)
  }, [editId])

  const ensureDraft = async () => {
    if (req) return req
    const r = await createLegal({ status: 'Borrador', pub_type: 'Convocatoria', name: '', document: '', date: new Date().toISOString().slice(0, 10), meta })
    const created: any = { id: (r as any).id, status: 'Borrador', pub_type: 'Convocatoria', date: new Date().toISOString().slice(0, 10) }
    setReq(created)
    return created
  }

  const onUpload = async (kind: string, filesList: FileList | null) => {
    if (!filesList) return; const r = await ensureDraft(); const arr = Array.from(filesList) as File[]
    const up = await uploadFiles(arr)
    const ids = (up.items || up).map((x: any) => x.id)
    for (const fid of ids) await attachLegalFile(r.id, fid, kind)
    const lf = await listLegalFiles(r.id); setFiles(lf.items)
  }

  const totals = useMemo(() => {
    const usd = Number(settings.convocatoria_usd || 0)
    const unitBs = usd * (bcv || Number(settings.bcv_rate || 0))
    const sub = +unitBs.toFixed(2)
    const iva = +(sub * ((Number(settings.iva_percent || 16)) / 100)).toFixed(2)
    const total = +(sub + iva).toFixed(2)
    return { unitBs, sub, iva, total }
  }, [settings, bcv])

  const submit = async () => {
    if (!req) return

    if (!pay.bank || !pay.ref) {
      alert('Por favor complete todos los datos del pago (banco y referencia) antes de continuar.')
      return
    }

    await updateLegal(req.id, { status: 'Por verificar', meta, name: meta.razon_social || '', document: meta.rif || '' })
    await addLegalPayment(req.id, { type: pay.type, bank: pay.bank, ref: pay.ref, date: pay.date, amount_bs: Number(pay.amount_bs || totals.total), status: 'Verificado', mobile_phone: pay.type === 'pago_movil' ? pay.mobile_phone : undefined })
    alert('Solicitud de convocatoria enviada para verificación')
    navigate('/solicitante/historial')
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Solicitud de publicación de convocatoria</h1>
      <div className="text-sm text-slate-700">¡Completa estos tres pasos y obtén la publicación de tu convocatoria en la próxima edición!</div>

      <div className="card p-4 space-y-3">
        <h2 className="font-semibold">Paso 1. Datos de la convocatoria</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <input className="input" placeholder="TIPO DE SOCIEDAD" value={meta.tipo_sociedad || ''} onChange={e => setMeta({ ...meta, tipo_sociedad: e.target.value.toUpperCase() })} />
          <select className="input" value={meta.tipo_convocatoria || ''} onChange={e => setMeta({ ...meta, tipo_convocatoria: e.target.value })}>
            <option value="">Tipo de convocatoria</option>
            <option>Asamblea Ordinaria de accionistas o socios</option>
            <option>Asamblea Extraordinaria de accionistas o socios</option>
            <option>Cartel o Edicto Judicial</option>
          </select>
          <input className="input md:col-span-2" placeholder="RAZÓN O DENOMINACIÓN SOCIAL" value={meta.razon_social || ''} onChange={e => setMeta({ ...meta, razon_social: e.target.value.toUpperCase() })} />
          <input className="input" placeholder="RIF" value={meta.rif || ''} onChange={e => setMeta({ ...meta, rif: e.target.value.toUpperCase() })} />
          <input className="input" placeholder="ESTADO" value={meta.estado || ''} onChange={e => setMeta({ ...meta, estado: e.target.value.toUpperCase() })} />
          <input className="input" placeholder="OFICINA DE REGISTRO MERCANTIL" value={meta.oficina || ''} onChange={e => setMeta({ ...meta, oficina: e.target.value.toUpperCase() })} />
          <input className="input" placeholder="TOMO (Máx 3)" maxLength={3} value={meta.tomo || ''} onChange={e => setMeta({ ...meta, tomo: e.target.value.replace(/\D/g, '') })} />
          <input className="input" placeholder="NÚMERO" value={meta.numero || ''} onChange={e => setMeta({ ...meta, numero: e.target.value.replace(/\D/g, '') })} />
          <YearPicker
            value={meta.anio}
            onChange={(y) => setMeta({ ...meta, anio: y })}
            placeholder="Año"
          />
          <input className="input" placeholder="Número de expediente" value={meta.expediente || ''} onChange={e => setMeta({ ...meta, expediente: e.target.value })} />
          <input className="input" type="date" placeholder="Fecha" value={meta.fecha || ''} onChange={e => setMeta({ ...meta, fecha: e.target.value })} />
          <input className="input md:col-span-2" placeholder="Nombres y apellidos del representante legal" value={meta.representante || ''} onChange={e => setMeta({ ...meta, representante: e.target.value })} />
          <input className="input" placeholder="Documento de identidad del representante" value={meta.ci_representante || ''} onChange={e => setMeta({ ...meta, ci_representante: e.target.value })} />
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <h2 className="font-semibold">Paso 2. Adjuntar archivos de la convocatoria</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <label className="text-sm block">
            <span className="font-medium text-slate-700">Convocatoria digitalizada (imagen)</span>
            <input className="input w-full mt-1" type="file" accept="image/*" onChange={e => onUpload('convocatoria_scan', e.target.files)} />
            {files.find(f => f.kind === 'convocatoria_scan') && (
              <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Archivo cargado: {files.find(f => f.kind === 'convocatoria_scan')?.name}
              </div>
            )}
          </label>
          <label className="text-sm block">
            <span className="font-medium text-slate-700">Texto de la convocatoria (Word)</span>
            <input className="input w-full mt-1" type="file" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e => onUpload('convocatoria_word', e.target.files)} />
            {files.find(f => f.kind === 'convocatoria_word') && (
              <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Archivo cargado: {files.find(f => f.kind === 'convocatoria_word')?.name}
              </div>
            )}
          </label>
          <label className="text-sm block">
            <span className="font-medium text-slate-700">Logo de la sociedad (opcional)</span>
            <input className="input w-full mt-1" type="file" accept="image/*" onChange={e => onUpload('convocatoria_logo', e.target.files)} />
            {files.find(f => f.kind === 'convocatoria_logo') && (
              <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Archivo cargado: {files.find(f => f.kind === 'convocatoria_logo')?.name}
              </div>
            )}
          </label>
        </div>
      </div>

      <div className="card p-4 space-y-6">
        <h2 className="font-semibold text-lg border-b pb-2">Paso 3. Reportar el pago de la publicación</h2>

        {/* Datos de Cuentas Bancarias - NUEVO */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-bold text-base mb-3 flex items-center gap-2 text-blue-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Instrucciones para el Pago
          </h3>
          <p className="text-sm text-blue-800 mb-3">
            Realice el pago a una de las siguientes cuentas antes de registrar su referencia:
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {paymentMethods.map(pm => (
              <div key={pm.id} className="bg-white p-3 rounded-lg shadow-sm border border-blue-100 text-xs">
                <div className="font-bold text-blue-900 mb-1">{pm.bank}</div>
                <div className="flex justify-between"><span className="text-slate-500">Tipo:</span> <span className="font-medium">{pm.type}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Cuenta:</span> <span className="font-mono font-medium">{pm.account || pm.phone}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Titular:</span> <span className="font-medium">{pm.holder}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">RIF:</span> <span className="font-medium">{pm.rif}</span></div>
              </div>
            ))}
            {paymentMethods.length === 0 && <p className="text-slate-500 italic text-sm">No hay métodos configurados.</p>}
          </div>
        </div>

        {/* Resumen de la Orden */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <h3 className="font-bold text-base mb-3 text-slate-800">Resumen de la Orden</h3>

          {/* Datos del Solicitante */}
          <div className="mb-4 bg-white rounded p-3 border border-slate-200">
            <h4 className="font-semibold text-slate-700 mb-2 text-xs uppercase tracking-wide border-b pb-1">Datos del Solicitante</h4>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="flex flex-col"><span className="text-slate-500 text-xs">Nombre:</span> <span className="font-medium">{user.name}</span></div>
              <div className="flex flex-col"><span className="text-slate-500 text-xs">Documento:</span> <span className="font-medium">{user.document}</span></div>
              <div className="flex flex-col"><span className="text-slate-500 text-xs">Email:</span> <span>{user.email}</span></div>
              <div className="flex flex-col"><span className="text-slate-500 text-xs">Teléfono:</span> <span>{user.phone}</span></div>
              <div className="sm:col-span-2 flex flex-col"><span className="text-slate-500 text-xs">Dirección:</span> <span>{user.address || <span className="text-slate-400 italic">No registrada</span>}</span></div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="p-2 bg-white rounded border border-slate-200 text-slate-600">
              Servicio de publicación - {meta.tipo_convocatoria || 'Convocatoria'} ({meta.razon_social})
            </div>

            <div className="flex justify-between items-center border-t border-slate-300 pt-2">
              <span className="text-slate-600">Precio USD:</span>
              <span className="font-medium">${Number(settings.convocatoria_usd || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Tasa BCV:</span>
              <span className="font-medium">Bs. {bcv?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-300 pt-2">
              <span className="text-slate-600">Precio USD:</span>
              <span className="font-medium">${Number(settings.convocatoria_usd || 0).toFixed(2)}</span>
            </div>
            {/* Subtotal e IVA ocultos a petición del cliente */}
            <div className="flex justify-between items-center border-t-2 border-brand-600 pt-2 mt-2">
              <span className="text-base font-bold text-brand-900">TOTAL A PAGAR:</span>
              <div className="text-right">
                <span className="text-xl font-bold text-brand-600 block">Bs. {totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-[10px] text-slate-400">Tasa: Bs. {bcv?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario de Pago */}
        <div className="space-y-4 pt-2">
          <h3 className="font-semibold text-slate-800">Registrar Pago</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-sm block">
              <span className="block text-slate-600 mb-1">Tipo de operación</span>
              <select className="input w-full" value={pay.type} onChange={e => setPay({ ...pay, type: e.target.value as ConvocatoriaPaymentForm['type'] })}>
                <option value="transferencia">Transferencia</option>
                <option value="pago_movil">Pago Móvil</option>
              </select>
            </label>
            <label className="text-sm block">
              <span className="block text-slate-600 mb-1">Banco Origen</span>
              <input className="input w-full" value={pay.bank} onChange={e => setPay({ ...pay, bank: e.target.value })} placeholder="Banco desde donde pagó" />
            </label>
            <label className="text-sm block">
              <span className="block text-slate-600 mb-1">Últimos 4 dígitos Referencia *</span>
              <input 
                className="input w-full" 
                maxLength={4} 
                value={pay.ref} 
                onChange={e => setPay({ ...pay, ref: e.target.value.replace(/\D/g, '') })} 
                placeholder="0000" 
              />
            </label>
            <label className="text-sm block">
              <span className="block text-slate-600 mb-1">Fecha</span>
              <input className="input w-full" type="date" value={pay.date} onChange={e => setPay({ ...pay, date: e.target.value })} />
            </label>
            {pay.type === 'pago_movil' && (
              <label className="text-sm md:col-span-2 block">
                <span className="block text-slate-600 mb-1">Teléfono origen (Pago Móvil) *</span>
                <div className="flex gap-2">
                   <select className="input w-28 text-xs">
                     <option>0412</option>
                     <option>0414</option>
                     <option>0416</option>
                     <option>0424</option>
                     <option>0426</option>
                   </select>
                   <input 
                    className="input flex-1" 
                    maxLength={7} 
                    value={pay.mobile_phone} 
                    onChange={e => setPay({ ...pay, mobile_phone: e.target.value.replace(/\D/g, '') })} 
                    placeholder="1234567" 
                   />
                </div>
                <p className="text-[10px] text-brand-600 mt-1">* Debe admitir solo 7 dígitos numéricos</p>
              </label>
            )}
          </div>

          <div className="pt-4">
            <label className="flex items-start gap-2 text-sm cursor-pointer p-3 bg-slate-50 rounded border border-slate-200">
              <input type="checkbox" className="mt-1" checked={accept} onChange={e => setAccept(e.target.checked)} />
              <span>Al hacer clic en “REPORTAR Y PUBLICAR”, confirmo que he realizado el pago por el monto exacto y acepto los Términos y Condiciones.</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-primary w-full py-3 font-bold text-lg shadow-lg" disabled={!accept || !pay.bank || !pay.ref || !pay.date || (pay.type === 'pago_movil' && !pay.mobile_phone)} onClick={submit}>
              Reportar pago
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
