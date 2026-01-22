import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { addLegalPayment, attachLegalFile, createLegal, getBcvRate, getSettings, listLegalFiles, me, getLegal, type LegalFile, type LegalRequest, updateLegal, uploadFiles } from '../../lib/api'

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
  useEffect(() => { getSettings().then(r => setSettings(r.settings || {})); getBcvRate().then(r => setBcv(r.rate)).catch(() => { }) }, [])
  useEffect(() => { (async () => { try { const r = await me(); const u = (r as any).user || {}; setPay(p => ({ ...p, document: p.document || u.document || '', mobile_phone: p.mobile_phone || u.phone || '', })); } catch { } })(); }, [])

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
          <input className="input" placeholder="Tipo de sociedad" value={meta.tipo_sociedad || ''} onChange={e => setMeta({ ...meta, tipo_sociedad: e.target.value })} />
          <select className="input" value={meta.tipo_convocatoria || ''} onChange={e => setMeta({ ...meta, tipo_convocatoria: e.target.value })}>
            <option value="">Tipo de convocatoria</option>
            <option>Asamblea Ordinaria de accionistas o socios</option>
            <option>Asamblea Extraordinaria de accionistas o socios</option>
            <option>Cartel o Edicto Judicial</option>
          </select>
          <input className="input md:col-span-2" placeholder="Razón o denominación social" value={meta.razon_social || ''} onChange={e => setMeta({ ...meta, razon_social: e.target.value })} />
          <input className="input" placeholder="RIF" value={meta.rif || ''} onChange={e => setMeta({ ...meta, rif: e.target.value })} />
          <input className="input" placeholder="Estado" value={meta.estado || ''} onChange={e => setMeta({ ...meta, estado: e.target.value })} />
          <input className="input" placeholder="Oficina de registro mercantil" value={meta.oficina || ''} onChange={e => setMeta({ ...meta, oficina: e.target.value })} />
          <input className="input" placeholder="Tomo / Letra" value={meta.tomo || ''} onChange={e => setMeta({ ...meta, tomo: e.target.value })} />
          <input className="input" placeholder="Número" value={meta.numero || ''} onChange={e => setMeta({ ...meta, numero: e.target.value })} />
          <input className="input" placeholder="Año" value={meta.anio || ''} onChange={e => setMeta({ ...meta, anio: e.target.value })} />
          <input className="input" placeholder="Número de expediente" value={meta.expediente || ''} onChange={e => setMeta({ ...meta, expediente: e.target.value })} />
          <input className="input" type="date" placeholder="Fecha" value={meta.fecha || ''} onChange={e => setMeta({ ...meta, fecha: e.target.value })} />
          <input className="input md:col-span-2" placeholder="Nombres y apellidos del representante legal" value={meta.representante || ''} onChange={e => setMeta({ ...meta, representante: e.target.value })} />
          <input className="input" placeholder="Documento de identidad del representante" value={meta.ci_representante || ''} onChange={e => setMeta({ ...meta, ci_representante: e.target.value })} />
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <h2 className="font-semibold">Paso 2. Adjuntar archivos de la convocatoria</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <label className="text-sm">Convocatoria digitalizada (imagen)
            <input className="input w-full" type="file" accept="image/*" onChange={e => onUpload('convocatoria_scan', e.target.files)} />
          </label>
          <label className="text-sm">Texto de la convocatoria (Word)
            <input className="input w-full" type="file" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e => onUpload('convocatoria_word', e.target.files)} />
          </label>
          <label className="text-sm">Logo de la sociedad (opcional)
            <input className="input w-full" type="file" accept="image/*" onChange={e => onUpload('convocatoria_logo', e.target.files)} />
          </label>
        </div>
        {req && <div className="text-sm text-slate-600">Archivos cargados: {files.length}</div>}
      </div>

      <div className="card p-4 space-y-3">
        <h2 className="font-semibold">Paso 3. Reportar el pago de la publicación</h2>
        <div className="text-sm">Servicio de publicación electrónica en el Diario Mercantil de Venezuela de una convocatoria de {meta.tipo_convocatoria || '[tipo de convocatoria]'} de la sociedad mercantil {meta.razon_social || ''}</div>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm">Tipo de operación
            <select className="input w-full" value={pay.type} onChange={e => setPay({ ...pay, type: e.target.value as ConvocatoriaPaymentForm['type'] })}>
              <option value="transferencia">transferencia</option>
              <option value="pago_movil">pago móvil</option>
            </select>
          </label>
          <label className="text-sm">Banco<input className="input w-full" value={pay.bank} onChange={e => setPay({ ...pay, bank: e.target.value })} /></label>
          <label className="text-sm">Referencia<input className="input w-full" value={pay.ref} onChange={e => setPay({ ...pay, ref: e.target.value })} /></label>
          <label className="text-sm">Fecha<input className="input w-full" type="date" value={pay.date} onChange={e => setPay({ ...pay, date: e.target.value })} /></label>
          {pay.type === 'pago_movil' && (
            <label className="text-sm md:col-span-2">Número de teléfono desde donde realizó el pago móvil<input className="input w-full" value={pay.mobile_phone} onChange={e => setPay({ ...pay, mobile_phone: e.target.value })} /></label>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} /> Al hacer clic en “REPORTAR Y PUBLICAR”, confirmo que acepto y cumplo con los Términos y Condiciones del Diario Mercantil de Venezuela.</label>
        <div className="flex gap-2">
          <button className="btn btn-primary" disabled={!accept} onClick={submit}>REPORTAR Y PUBLICAR</button>
        </div>
      </div>
    </section>
  )
}
