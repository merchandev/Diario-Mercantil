import { isUnchangedPayment, paymentIdempotency } from '../../lib/legalPayment'
import { normalizeLegalMeta } from '../../lib/legalMeta'
import { editorialToday } from '../../lib/editorialDate'
import { includedVat } from '../../lib/pricing'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { addLegalPayment, attachLegalFile, createLegal, getBcvRate, getSettings, listLegalFiles, me, getLegal, type LegalFile, type LegalRequest, updateLegal, uploadFiles, submitLegal } from '../../lib/api'
import YearPicker from '../../components/YearPicker'
import { BANCOS_VENEZUELA } from '../../constants/banks'
import { useDialog } from '../../contexts/DialogContext'
import PaymentMethodsPanel from '../../components/PaymentMethodsPanel'

type ConvocatoriaPaymentForm = {
  type: 'pago_movil'
  bank: string
  ref: string
  date: string
  amount_bs: string
  mobile_phone: string
  mobile_phone_prefix: string
  document?: string
}

export default function Convocatoria() {
  const { showAlert } = useDialog()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const editId = searchParams.get('id')
  const loadedId = useRef<number | null>(null)
  const [draftStatus, setDraftStatus] = useState<{ state: 'idle' | 'saving' | 'saved' | 'error'; at?: string; message?: string }>({ state: 'idle' })
  const [req, setReq] = useState<LegalRequest | undefined>()
  const [meta, setMeta] = useState<any>({})
  const [files, setFiles] = useState<LegalFile[]>([])
  const [settings, setSettings] = useState<any>({})
  const [bcv, setBcv] = useState<number>(0)
  const [accept, setAccept] = useState(false)
  const [originalPayment, setOriginalPayment] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const [pay, setPay] = useState<ConvocatoriaPaymentForm>({ type: 'pago_movil', bank: '', ref: '', date: editorialToday(), amount_bs: '' as any, mobile_phone: '', mobile_phone_prefix: '' })
  const [user, setUser] = useState<any>({})

  useEffect(() => { getSettings().then(r => setSettings(r.settings || {})); getBcvRate().then(r => setBcv(r.rate)).catch(() => { }) }, [])
  useEffect(() => { (async () => { try { const r = await me(); const u = (r as any).user || {}; setUser(u); } catch { } })(); }, [])

  useEffect(() => {
    if (!editId || loadedId.current === Number(editId)) return;
    loadedId.current = Number(editId)
    getLegal(Number(editId)).then(data => {
      setReq(data.item);
      let parsedMeta = {};
      try { parsedMeta = typeof data.item.meta === 'string' ? JSON.parse(data.item.meta) : data.item.meta || {} } catch { }
      setMeta(normalizeLegalMeta(parsedMeta));
      listLegalFiles(data.item.id).then(r => setFiles(r.items));
      if (data.payments && data.payments.length > 0) {
        const last = data.payments[0];
        setOriginalPayment(last);
        const storedMobile = String(last.mobile_phone || '').replace(/\D/g, '')
        setPay(prev => ({
          ...prev,
          type: 'pago_movil',
          bank: last.bank || '',
          ref: last.ref || '',
          date: last.date || editorialToday(),
          amount_bs: String(last.amount_bs) as any,
          mobile_phone_prefix: /^04(12|14|16|22|24|26)/.test(storedMobile) ? storedMobile.slice(0, 4) : '',
          mobile_phone: storedMobile.length === 11 ? storedMobile.slice(4) : ''
        }));
      }
    }).catch(console.error)
  }, [editId])

  const draftMeta = () => ({ ...meta, fecha_registro: meta.fecha, numero_expediente: meta.expediente, numero_planilla: meta.planilla })

  // Persists the step 1 data before anything is attached, so a draft reopened
  // later never has files without the data that was typed for it.
  const saveDraft = async (): Promise<LegalRequest> => {
    setDraftStatus({ state: 'saving' })
    try {
      let saved = req
      if (saved) {
        await updateLegal(saved.id, { meta: draftMeta() })
      } else {
        const r = await createLegal({ status: 'Borrador', pub_type: 'Convocatoria', meta: draftMeta() })
        saved = { id: Number((r as any).id), status: 'Borrador', pub_type: 'Convocatoria', date: editorialToday() } as LegalRequest
        setReq(saved)
        loadedId.current = saved.id
        setSearchParams({ id: String(saved.id) }, { replace: true })
      }
      setDraftStatus({ state: 'saved', at: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) })
      return saved
    } catch (e: any) {
      setDraftStatus({ state: 'error', message: e?.message || 'No se pudo guardar el borrador.' })
      throw e
    }
  }

  const onUpload = async (kind: string, input: HTMLInputElement) => {
    const filesList = input.files
    if (!filesList || filesList.length === 0) return
    try {
      const r = await saveDraft()
      const up = await uploadFiles(Array.from(filesList) as File[])
      const fileIds = (up.created || []).map((it: any) => it.fileId)
      for (const fid of fileIds) await attachLegalFile(r.id, fid, kind)
      const lf = await listLegalFiles(r.id); setFiles(lf.items)
    } catch (e: any) {
      await showAlert(e?.message || 'No se pudo cargar el archivo.', { title: 'No se pudo guardar' })
    } finally {
      input.value = ''
    }
  }

  const totals = useMemo(() => {
    const usd = Number(req?.subtotal_usd ?? settings.convocatoria_usd ?? 0)
    const unitBs = usd * (Number(req?.tasa_bcv) || bcv || Number(settings.bcv_rate || 0))
    const { sub, iva, total } = includedVat(Number(req?.total_bs) || unitBs, Number(req?.porcentaje_iva ?? settings.iva_percent ?? 16))
    return { unitBs, sub, iva, total }
  }, [req, settings, bcv])

  const submit = async () => {
    if (!req || sending) return
    const paymentUnchanged = isUnchangedPayment(originalPayment, pay)
    if (!accept) { void showAlert('Acepte los Términos y condiciones.', { title: 'Aceptación requerida' }); return }
    if (!paymentUnchanged && (!pay.bank || !/^\d{6}$/.test(pay.ref) || !/^\d{7}$/.test(pay.mobile_phone) || !/^04(12|14|16|22|24|26)$/.test(pay.mobile_phone_prefix))) {
      void showAlert('Complete banco, referencia de 6 dígitos y teléfono de 7 dígitos.', { title: 'Datos incompletos' })
      return
    }
    if (!pay.date || pay.date > editorialToday()) {
      void showAlert('La fecha del pago no puede ser futura.', { title: 'Fecha inválida' })
      return
    }

    setSending(true)
    try {
    await updateLegal(req.id, { meta: draftMeta() })
    if (!paymentUnchanged) await addLegalPayment(req.id, { type: 'pago_movil', bank: pay.bank, ref: pay.ref, date: pay.date, amount_bs: Number(pay.amount_bs || totals.total), status: 'Por verificar', mobile_phone: pay.mobile_phone_prefix + pay.mobile_phone }, paymentIdempotency(req.id, pay))
    await submitLegal(req.id)
    await showAlert('Solicitud de convocatoria enviada para verificación.', { title: 'Solicitud enviada' })
    navigate('/solicitante/historial')
    } catch (e: any) { await showAlert(e.message || 'No se pudo enviar la solicitud.', { title: 'Error' }) } finally { setSending(false) }
  }

  return (
    <section className="space-y-4">
      {req?.status === 'Borrador' && req.comment && <div className="rounded border border-amber-300 bg-amber-50 p-4"><strong>Solicitud devuelta</strong><p>{req.comment}</p></div>}
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
          <input className="input" placeholder="TOMO (Máx 3)"
                 maxLength={3}
                 pattern="^\d{1,3}$"
                 title="Debe ingresar hasta 3 números"
                 value={meta.tomo || ''} onChange={e => setMeta({ ...meta, tomo: e.target.value.replace(/\D/g, '') })} />
          <input className="input" placeholder="NÚMERO" maxLength={3} value={meta.numero || ''} onChange={e => setMeta({ ...meta, numero: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
          <YearPicker
            value={meta.anio}
            onChange={(y) => setMeta({ ...meta, anio: y })}
            placeholder="Año"
          />
          <input className="input" placeholder="Número de expediente"
                 maxLength={12}
                 pattern="^\d{3}-\d{1,8}$"
                 title="Formato: 3 dígitos, un guion, y hasta 8 dígitos (Ej. 391-456987)"
                 value={meta.expediente || ''} onChange={e => setMeta({ ...meta, expediente: e.target.value.toUpperCase() })} />
          <input className="input" type="date" placeholder="Fecha"
                 max={editorialToday()}
                 value={meta.fecha || ''} onChange={e => setMeta({ ...meta, fecha: e.target.value })} />
          <input className="input md:col-span-2" placeholder="Nombres y apellidos del representante legal" value={meta.representante || ''} onChange={e => setMeta({ ...meta, representante: e.target.value })} />
          <input className="input" placeholder="Documento de identidad del representante" value={meta.ci_representante || ''} onChange={e => setMeta({ ...meta, ci_representante: e.target.value })} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-outline" disabled={draftStatus.state === 'saving'} onClick={() => { saveDraft().catch(() => { }) }}>
            {draftStatus.state === 'saving' ? 'Guardando...' : 'Guardar borrador'}
          </button>
          <span role="status" className={'text-sm ' + (draftStatus.state === 'error' ? 'text-rose-700' : 'text-green-700')}>
            {draftStatus.state === 'saved' && `Borrador guardado a las ${draftStatus.at}.`}
            {draftStatus.state === 'error' && `No se guardó el borrador: ${draftStatus.message}`}
          </span>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <h2 className="font-semibold">Paso 2. Adjuntar archivos de la convocatoria</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <label className="text-sm block">
            <span className="font-medium text-slate-700">Convocatoria digitalizada (imagen)</span>
            <input className="input w-full mt-1" type="file" accept="image/*" onChange={e => onUpload('convocatoria_scan', e.currentTarget)} />
            {files.find(f => f.kind === 'convocatoria_scan') && (
              <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Archivo cargado: {files.find(f => f.kind === 'convocatoria_scan')?.name}
              </div>
            )}
          </label>
          <label className="text-sm block">
            <span className="font-medium text-slate-700">Texto de la convocatoria (Word)</span>
            <input className="input w-full mt-1" type="file" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e => onUpload('convocatoria_word', e.currentTarget)} />
            {files.find(f => f.kind === 'convocatoria_word') && (
              <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Archivo cargado: {files.find(f => f.kind === 'convocatoria_word')?.name}
              </div>
            )}
          </label>
          <label className="text-sm block">
            <span className="font-medium text-slate-700">Logo de la sociedad (opcional)</span>
            <input className="input w-full mt-1" type="file" accept="image/*" onChange={e => onUpload('convocatoria_logo', e.currentTarget)} />
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

        {/* Resumen de la orden */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <h3 className="font-bold text-base mb-3 text-slate-800">Resumen de la orden</h3>

          {/* Datos del solicitante */}
          <div className="mb-4 bg-white rounded p-3 border border-slate-200">
            <h4 className="font-semibold text-slate-700 mb-2 text-base uppercase tracking-wide border-b pb-1">Datos del solicitante</h4>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-base">
              <div className="flex flex-col"><span className="text-slate-500 text-base">Nombre:</span> <span className="font-medium">{user.name}</span></div>
              <div className="flex flex-col"><span className="text-slate-500 text-base">Documento:</span> <span className="font-medium">{user.document}</span></div>
              <div className="flex flex-col"><span className="text-slate-500 text-base">Email:</span> <span>{user.email}</span></div>
              <div className="flex flex-col"><span className="text-slate-500 text-base">Teléfono:</span> <span>{user.phone}</span></div>
              <div className="sm:col-span-2 flex flex-col"><span className="text-slate-500 text-base">Dirección:</span> <span>{user.address || <span className="text-slate-400 italic">No registrada</span>}</span></div>
            </div>
          </div>

          <div className="space-y-2 text-base">
            <div className="p-2 bg-white rounded border border-slate-200 text-slate-600">
              Servicio de publicación - {meta.tipo_convocatoria || 'Convocatoria'} ({meta.razon_social})
            </div>

            <div className="flex justify-between items-center border-t-2 border-brand-600 pt-2 mt-2">
              <span className="text-base font-bold text-brand-900">TOTAL A PAGAR:</span>
              <div className="text-right">
                <span className="text-xl font-bold text-brand-600 block">Bs. {totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-base text-slate-400">Tasa: Bs. {(Number(req?.tasa_bcv) || bcv)?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <PaymentMethodsPanel amountBs={totals.total} />

        {/* Formulario de Pago */}
        <div className="space-y-4 pt-2">
          <h3 className="font-semibold text-slate-800">Información del pago realizado</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-sm block">
              <span className="block text-slate-600 mb-1">Banco emisor del pago</span>
              <select className="input w-full" value={pay.bank} onChange={e => setPay({ ...pay, bank: e.target.value })} required>
                <option value="">Seleccione un banco</option>
                {BANCOS_VENEZUELA.map(bank => <option key={bank} value={bank}>{bank}</option>)}
              </select>
            </label>
            <label className="text-sm block">
                <span className="block text-slate-600 mb-1">Teléfono origen (Pago Móvil) *</span>
                <div className="flex gap-2">
                   <select className="input w-28 text-xs" value={pay.mobile_phone_prefix} onChange={e => setPay({ ...pay, mobile_phone_prefix: e.target.value })}>
                     <option value="">Seleccione</option>
                        <option>0412</option>
                     <option>0414</option>
                     <option>0416</option>
                     <option>0422</option>
                     <option>0424</option>
                     <option>0426</option>
                   </select>
                   <input
                    className="input flex-1 min-w-0"
                    maxLength={7}
                    value={pay.mobile_phone}
                    onChange={e => setPay({ ...pay, mobile_phone: e.target.value.replace(/\D/g, '') })}
                    placeholder="1234567"
                   />
                </div>
                <p className="text-sm text-brand-600 mt-1">Ingrese los 7 dígitos después del prefijo.</p>
              </label>
            <label className="text-sm block">
              <span className="block text-slate-600 mb-1">Fecha del pago</span>
              <input className="input w-full" type="date" max={editorialToday()} value={pay.date} onChange={e => setPay({ ...pay, date: e.target.value })} />
            </label>
            <label className="text-sm block">
              <span className="block text-slate-600 mb-1">Últimos 6 dígitos de la referencia *</span>
              <input
                className="input w-full"
                maxLength={6}
                value={pay.ref}
                onChange={e => setPay({ ...pay, ref: e.target.value.replace(/\D/g, '') })}
                placeholder="000000"
              />
            </label>
          </div>

          <div className="pt-4">
            <label className="flex items-start gap-2 text-sm cursor-pointer p-3 bg-slate-50 rounded border border-slate-200">
              <input type="checkbox" className="mt-1" checked={accept} onChange={e => setAccept(e.target.checked)} />
              <span>Al reportar la solicitud, confirmo que he realizado el pago por el monto exacto y acepto los <a href="/p/terminos-y-condiciones" target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">Términos y condiciones</a>.</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-primary w-full py-3 font-bold text-lg shadow-lg" disabled={!accept || sending} onClick={submit}>
              Reportar solicitud
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
