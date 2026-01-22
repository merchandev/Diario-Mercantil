import { useEffect, useState } from 'react'
import type React from 'react'
import { addLegalPayment, attachLegalFile, createLegal, getBcvRate, getSettings, type LegalRequest, listLegal, updateLegal, uploadFiles } from '../lib/api'
import { ESTADOS_VENEZUELA, REGISTROS_MERCANTILES, TIPOS_SOCIEDAD, TIPOS_TRAMITE, BANCOS_VENEZUELA } from '../lib/constants'

export default function PublicarDocumento() {
  const [step, setStep] = useState(1)
  const [requestId, setRequestId] = useState<number | null>(null)
  const [settings, setSettings] = useState<any>({})
  const [rate, setRate] = useState<number | undefined>()
  const [showImage, setShowImage] = useState(false)
  const [busy, setBusy] = useState(false)

  // Step 1 fields
  const [f1, setF1] = useState<any>({
    tipo_sociedad: '', tipo_acto: '', nombre: '', estado: '', oficina: '', registrador_nombre: '', registrador_tipo: '',
    tomo: '', numero: '', anio: '', expediente: '', fecha: '', planilla: ''
  })

  // Resume draft logic
  // Resume draft logic
  useEffect(() => {
    listLegal({ status: 'Borrador', pub_type: 'Documento', limit: 1 }).then(res => {
      if (res && res.items && res.items.length > 0) {
        const draft = res.items[0]
        console.log('📝 Resuming draft:', draft.id)
        setRequestId(draft.id)
        if (draft.meta) {
          setF1((prev: any) => ({ ...prev, ...draft.meta }))
        }
      }
    }).catch(console.error)
  }, [])

  const [registrosDisponibles, setRegistrosDisponibles] = useState<string[]>([])

  // Cascading logic
  useEffect(() => {
    if (f1.estado && REGISTROS_MERCANTILES[f1.estado]) {
      setRegistrosDisponibles(REGISTROS_MERCANTILES[f1.estado])
      // Only clear office if current selection is not in the new list
      if (f1.oficina && !REGISTROS_MERCANTILES[f1.estado].includes(f1.oficina)) {
        setF1((Prev: any) => ({ ...Prev, oficina: '' }))
      }
    } else {
      setRegistrosDisponibles([])
      if (f1.oficina) setF1((Prev: any) => ({ ...Prev, oficina: '' }))
    }
  }, [f1.estado])

  // Step 2 files count -> folios
  const [folios, setFolios] = useState<number>(1)
  // Step 3 payment fields
  const [pay, setPay] = useState<any>({ a_nombre: '', rif: '', telefono: '', email: '', direccion: '', fecha_solicitud: new Date().toISOString().slice(0, 10), tipo_operacion: 'transferencia', banco: '', ref: '', date: new Date().toISOString().slice(0, 10), amount_bs: '' as any, mobile_phone: '' })
  const [accepted, setAccepted] = useState(false)
  const priceUsd = Number(settings.price_per_folio_usd || 0)
  const unitBs = rate ? +(priceUsd * rate).toFixed(2) : undefined
  const subTotal = unitBs ? +(unitBs * Math.max(1, folios)).toFixed(2) : undefined
  const ivaPct = Number(settings.iva_percent || 16)
  const ivaAmt = subTotal !== undefined ? +(subTotal * (ivaPct / 100)).toFixed(2) : undefined
  const total = subTotal !== undefined && ivaAmt !== undefined ? +(subTotal + ivaAmt).toFixed(2) : undefined

  useEffect(() => {
    getSettings()
      .then(r => setSettings(r.settings))
      .catch(err => console.error('Error cargando configuración:', err))
    getBcvRate()
      .then(r => setRate(r.rate))
      .catch(err => console.error('Error cargando tasa BCV:', err))
  }, [])

  const nextToStep2 = async () => {
    if (busy) return
    setBusy(true)
    try {
      // create draft if not exists
      if (!requestId) {
        const res = await createLegal({ status: 'Borrador', name: f1.nombre, document: '', date: f1.fecha || new Date().toISOString().slice(0, 10), pub_type: 'Documento', meta: f1 })
        setRequestId((res as any).id || (res as any).lastId || 0)
      } else {
        // Update existing draft
        await updateLegal(requestId, { meta: f1 })
      }
      setStep(2)
    } catch (e: any) {
      alert('Error al crear solicitud: ' + (e.message || 'Error desconocido'))
    } finally {
      setBusy(false)
    }
  }

  const onUploadFolios = async (files: FileList | null) => {
    if (!files || !requestId) return
    if (busy) return
    setBusy(true)
    try {
      const arr = Array.from(files)
      const up = await uploadFiles(arr)
      const ids: number[] = (up.items || up || []).map((x: any) => x.id)
      for (const id of ids) { await attachLegalFile(requestId, id, 'folio') }
      setFolios(prev => Math.max(prev, ids.length))
      alert('Folios adjuntados correctamente.')
    } catch (e: any) {
      alert('Error al subir archivos: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accepted) { alert('Debe aceptar los Términos y Condiciones.'); return }
    if (!requestId) return
    if (busy) return
    setBusy(true)
    try {
      // update request with all details
      const body: Partial<LegalRequest> = {
        name: pay.a_nombre || f1.nombre,
        document: pay.rif || '',
        phone: pay.telefono || '',
        email: pay.email || '',
        address: pay.direccion || '',
        date: pay.fecha_solicitud || new Date().toISOString().slice(0, 10),
        folios,
        pub_type: 'Documento',
        meta: f1,
        status: 'Por verificar'
      }
      await updateLegal(requestId, body)
      await addLegalPayment(requestId, {
        ref: pay.ref,
        date: pay.date,
        bank: pay.banco,
        type: pay.tipo_operacion,
        amount_bs: Number(pay.amount_bs || total || 0),
        mobile_phone: pay.tipo_operacion?.toLowerCase?.() === 'pago móvil' ? pay.mobile_phone : undefined,
        status: 'Pendiente'
      })
      alert('¡Tu solicitud fue enviada! Está Por verificar.')
    } catch (e: any) {
      alert('Error al enviar solicitud: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">SOLICITUD DE PUBLICACIÓN DE DOCUMENTO. ¡Completa estos tres pasos y obtén la publicación de tu documento en la próxima edición!</h1>
      <div className="card p-4 space-y-3">
        <div className="flex gap-2 text-sm">
          <span className={"pill " + (step === 1 ? 'bg-brand-100 text-brand-800' : '')}>Paso 1</span>
          <span className={"pill " + (step === 2 ? 'bg-brand-100 text-brand-800' : '')}>Paso 2</span>
          <span className={"pill " + (step === 3 ? 'bg-brand-100 text-brand-800' : '')}>Paso 3</span>
        </div>
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg">Paso 1. Datos de registro del documento</h2>
            <p className="text-sm text-slate-600">Estimado(a) usuario: complete los campos con los datos que constan en el documento legalmente registrado.</p>
            <div className="grid md:grid-cols-2 gap-2">
              <div className="relative">
                <select className="input w-full" value={f1.tipo_sociedad} onChange={e => setF1({ ...f1, tipo_sociedad: e.target.value })}>
                  <option value="">Tipo de sociedad</option>
                  {TIPOS_SOCIEDAD.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <div className="flex absolute inset-y-0 right-0 items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 fill-brand-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                    <path d="M207.029 381.476L12.686 187.132c-9.373-9.373-9.373-24.569 0-33.941l22.667-22.667c9.357-9.357 24.522-9.375 33.901-.04L224 284.505l154.745-154.021c9.379-9.335 24.544-9.317 33.901.04l22.667 22.667c9.373 9.373 9.373 24.569 0 33.941L240.971 381.476c-9.373 9.372-24.569 9.372-33.942 0z"></path>
                  </svg>
                </div>
              </div>
              <div className="relative">
                <select className="input w-full" value={f1.tipo_acto} onChange={e => setF1({ ...f1, tipo_acto: e.target.value })}>
                  <option value="">Tipo de acto inscrito</option>
                  {TIPOS_TRAMITE.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="flex absolute inset-y-0 right-0 items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 fill-brand-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                    <path d="M207.029 381.476L12.686 187.132c-9.373-9.373-9.373-24.569 0-33.941l22.667-22.667c9.357-9.357 24.522-9.375 33.901-.04L224 284.505l154.745-154.021c9.379-9.335 24.544-9.317 33.901.04l22.667 22.667c9.373 9.373 9.373 24.569 0 33.941L240.971 381.476c-9.373 9.372-24.569 9.372-33.942 0z"></path>
                  </svg>
                </div>
              </div>
              <input className="input md:col-span-2" placeholder="Razón o denominación social (nombre de la sociedad mercantil)" value={f1.nombre} onChange={e => setF1({ ...f1, nombre: e.target.value })} />
              <input className="input" placeholder="RIF" value={f1.rif} onChange={e => setF1({ ...f1, rif: e.target.value })} />

              <input className="input" placeholder="Nombre completo del registrador" value={f1.registrador_nombre} onChange={e => setF1({ ...f1, registrador_nombre: e.target.value })} />
              <select className="input" value={f1.registrador_tipo} onChange={e => setF1({ ...f1, registrador_tipo: e.target.value })}>
                <option value="">Tipo de registrador</option>
                <option>Titular</option>
                <option>Accidental</option>
              </select>

              <div className="relative">
                <select className="input w-full" value={f1.estado} onChange={e => setF1({ ...f1, estado: e.target.value })}>
                  <option value="">Estado</option>
                  {ESTADOS_VENEZUELA.map(est => (
                    <option key={est} value={est}>{est}</option>
                  ))}
                </select>
                <div className="flex absolute inset-y-0 right-0 items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 fill-brand-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                    <path d="M207.029 381.476L12.686 187.132c-9.373-9.373-9.373-24.569 0-33.941l22.667-22.667c9.357-9.357 24.522-9.375 33.901-.04L224 284.505l154.745-154.021c9.379-9.335 24.544-9.317 33.901.04l22.667 22.667c9.373 9.373 9.373 24.569 0 33.941L240.971 381.476c-9.373 9.372-24.569 9.372-33.942 0z"></path>
                  </svg>
                </div>
              </div>
              <div className="relative">
                <select className="input w-full" value={f1.oficina} onChange={e => setF1({ ...f1, oficina: e.target.value })} disabled={!f1.estado}>
                  <option value="">Oficina de registro mercantil</option>
                  {registrosDisponibles.map((reg: string) => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </select>
                <div className="flex absolute inset-y-0 right-0 items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 fill-brand-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                    <path d="M207.029 381.476L12.686 187.132c-9.373-9.373-9.373-24.569 0-33.941l22.667-22.667c9.357-9.357 24.522-9.375 33.901-.04L224 284.505l154.745-154.021c9.379-9.335 24.544-9.317 33.901.04l22.667 22.667c9.373 9.373 9.373 24.569 0 33.941L240.971 381.476c-9.373 9.372-24.569 9.372-33.942 0z"></path>
                  </svg>
                </div>
              </div>
              <input className="input" placeholder="Tomo / Letra" value={f1.tomo} onChange={e => setF1({ ...f1, tomo: e.target.value })} />
              <input className="input" placeholder="Número" value={f1.numero} onChange={e => setF1({ ...f1, numero: e.target.value })} />
              <input className="input" placeholder="Año" value={f1.anio} onChange={e => setF1({ ...f1, anio: e.target.value })} />
              <input className="input" placeholder="Número de expediente" value={f1.expediente} onChange={e => setF1({ ...f1, expediente: e.target.value })} />
              <input className="input" type="date" placeholder="Fecha" value={f1.fecha} onChange={e => setF1({ ...f1, fecha: e.target.value })} />
              <input className="input" placeholder="Número de planilla" value={f1.planilla} onChange={e => setF1({ ...f1, planilla: e.target.value })} />
            </div>
            <div className="bg-slate-50 border rounded p-3 text-sm">
              <div className="flex items-center justify-between">
                <div>¿Tienes dudas sobre dónde están los datos? Haz clic en la imagen y guíate fácilmente para completar el formulario.</div>
                {settings.instructions_documents_image_url && (
                  <button className="btn" onClick={() => setShowImage(true)}>Ver imagen</button>
                )}
              </div>
              {settings.instructions_documents_text && (
                <p className="mt-2 whitespace-pre-wrap">{settings.instructions_documents_text}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={nextToStep2} disabled={busy}>
                {busy ? 'Procesando...' : 'Continuar'}
              </button>
            </div>
            {showImage && (
              <div className="fixed inset-0 bg-black/60 grid place-items-center" onClick={() => setShowImage(false)}>
                <img src={settings.instructions_documents_image_url} alt="Instrucciones" className="max-h-[90vh] max-w-[90vw] rounded" />
              </div>
            )}
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg">Paso 2. Adjuntar archivos</h2>
            <p className="text-sm text-slate-600">Estimado(a) usuario: para continuar con la solicitud, deberá digitalizar todos los folios (páginas) del documento y adjuntarlos en este paso.</p>
            <div className="bg-slate-50 border rounded p-3 text-sm whitespace-pre-wrap">{settings.instructions_documents_text || 'Por favor, siga cuidadosamente las instrucciones para garantizar que los archivos cumplan con los requisitos establecidos.'}</div>
            <label className="block">
              <span className="text-sm text-slate-600 font-medium mb-1 block">Adjuntar folios (puede seleccionar múltiples archivos)</span>
              <input className="input w-full" type="file" accept="image/*,application/pdf" multiple onChange={e => onUploadFolios(e.currentTarget.files)} disabled={busy} />
              {busy && <span className="text-xs text-blue-600 mt-1 block">Subiendo archivos...</span>}
            </label>
            <div className="flex gap-2">
              <button className="btn" onClick={() => setStep(1)} disabled={busy}>Atrás</button>
              <button className="btn btn-primary" onClick={() => setStep(3)} disabled={busy}>Continuar</button>
            </div>
          </div>
        )}
        {step === 3 && (
          <form onSubmit={submitPayment} className="space-y-3">
            <h2 className="font-semibold text-lg">Paso 3. Reportar el pago de la publicación</h2>
            <p className="text-sm text-slate-600">Estimado(a) usuario: a continuación, se muestra el detalle de su orden de servicio y el monto correspondiente a cancelar.</p>
            <div className="border rounded p-3 bg-gray-50 text-sm space-y-1">
              <div><span className="font-semibold">A nombre de:</span> <input className="input inline-block w-full md:w-auto" value={pay.a_nombre} onChange={e => setPay({ ...pay, a_nombre: e.target.value })} /></div>
              <div><span className="font-semibold">C.I./RIF:</span> <input className="input inline-block w-full md:w-auto" value={pay.rif} onChange={e => setPay({ ...pay, rif: e.target.value })} /></div>
              <div><span className="font-semibold">Teléfono:</span> <input className="input inline-block w-full md:w-auto" value={pay.telefono} onChange={e => setPay({ ...pay, telefono: e.target.value })} /></div>
              <div><span className="font-semibold">Correo electrónico:</span> <input className="input inline-block w-full md:w-auto" type="email" value={pay.email} onChange={e => setPay({ ...pay, email: e.target.value })} /></div>
              <div><span className="font-semibold">Dirección:</span> <input className="input inline-block w-full" value={pay.direccion} onChange={e => setPay({ ...pay, direccion: e.target.value })} /></div>
              <div><span className="font-semibold">Fecha de la solicitud:</span> <input className="input inline-block w-full md:w-auto" type="date" value={pay.fecha_solicitud} onChange={e => setPay({ ...pay, fecha_solicitud: e.target.value })} /></div>
            </div>
            <div className="border rounded overflow-hidden">
              <div className="px-3 py-2 bg-brand-800 text-white text-sm font-semibold">ORDEN DE SERVICIO N.º</div>
              <div className="p-3 text-sm">
                <div className="font-semibold">DESCRIPCIÓN | N.º DE FOLIOS | PRECIO UNITARIO (BS.) | PRECIO TOTAL (BS.)</div>
                <div className="mt-1">Servicio de publicación electrónica en el Diario Mercantil de Venezuela de un documento protocolizado que corresponde a la razón social {f1.nombre || '[Razón o denominación social]'}</div>
                <div className="mt-1 whitespace-pre-wrap text-slate-600">
                  {`Datos de registro mercantil:\nOficina de registro mercantil: ${f1.oficina || '[****]'}\nTomo: ${f1.tomo || '[****]'}\nNúmero: ${f1.numero || '[****]'}\nAño: ${f1.anio || '[****]'}\nNúmero de expediente: ${f1.expediente || '[****]'}`}
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2 items-center">
                  <div>Servicio</div>
                  <div><input className="input w-20" type="number" min={1} value={folios} onChange={e => setFolios(Math.max(1, Number(e.target.value || 1)))} /></div>
                  <div>{unitBs !== undefined ? unitBs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</div>
                  <div>{subTotal !== undefined ? subTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</div>
                  <div className="col-span-3">IVA ({ivaPct}%)</div>
                  <div>{ivaAmt !== undefined ? ivaAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</div>
                  <div className="col-span-3 font-semibold">TOTAL</div>
                  <div className="font-semibold">{total !== undefined ? total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</div>
                </div>
                <div className="mt-3 text-sm space-y-1">
                  <div className="font-semibold">Datos bancarios para efectuar el pago correspondiente al monto antes señalado:</div>
                  <div className="text-slate-600">Importante: el pago debe realizarse por el monto exacto indicado en el total de la orden de servicio, sin realizar redondeos ni modificaciones.</div>
                  <div className="text-slate-600">Por favor, reporte el pago realizado completando los datos que se indican a continuación:</div>
                </div>
                <div className="mt-2 grid md:grid-cols-3 gap-2">
                  <select className="input" value={pay.banco} onChange={e => setPay({ ...pay, banco: e.target.value })}>
                    <option value="">Banco</option>
                    {BANCOS_VENEZUELA.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <select className="input" value={pay.tipo_operacion} onChange={e => setPay({ ...pay, tipo_operacion: e.target.value })}>
                    <option>transferencia</option>
                    <option>pago móvil</option>
                    <option>depósito</option>
                  </select>
                  <input className="input" placeholder="Referencia" value={pay.ref} onChange={e => setPay({ ...pay, ref: e.target.value })} />
                  <input className="input" type="date" value={pay.date} onChange={e => setPay({ ...pay, date: e.target.value })} />
                  <input className="input" type="number" step="0.01" placeholder="Monto (Bs.)" value={pay.amount_bs} onChange={e => setPay({ ...pay, amount_bs: e.target.value })} />
                  {pay.tipo_operacion === 'pago móvil' && (
                    <input className="input md:col-span-3" placeholder="Número de teléfono desde donde realizó el pago móvil" value={pay.mobile_phone} onChange={e => setPay({ ...pay, mobile_phone: e.target.value })} />
                  )}
                </div>
                <label className="mt-3 flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
                  <span>Al hacer clic en “REPORTAR Y PUBLICAR”, confirmo que acepto y cumplo con los Términos y Condiciones del Diario Mercantil de Venezuela.</span>
                </label>
                <div className="mt-3 flex gap-2">
                  <button type="button" className="btn" onClick={() => setStep(2)} disabled={busy}>Atrás</button>
                  <button className="btn btn-primary uppercase" disabled={busy}>{busy ? 'Enviando...' : 'REPORTAR Y PUBLICAR'}</button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
