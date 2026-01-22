import { useEffect, useState } from 'react'
import type React from 'react'
import { addLegalPayment, attachLegalFile, createLegal, getBcvRate, getSettings, updateLegal, uploadFiles } from '../lib/api'

const TIPO_CONV_OPTS = [
  'Asamblea Ordinaria de accionistas o socios',
  'Asamblea Extraordinaria de accionistas o socios',
  'Cartel o Edicto Judicial'
]

const ESTADOS_VENEZUELA = [
  'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar', 'Carabobo', 'Cojedes', 'Delta Amacuro',
  'Distrito Capital', 'Falcón', 'Guárico', 'Lara', 'Mérida', 'Miranda', 'Monagas', 'Nueva Esparta', 'Portuguesa',
  'Sucre', 'Táchira', 'Trujillo', 'La Guaira', 'Yaracuy', 'Zulia'
]

const REGISTROS_POR_ESTADO: Record<string, string[]> = {
  // Using generic list or the one from PublicarDocumento if available. 
  // For now using empty or basic if not shared. 
  // Assuming the user fills it manually if not selected, OR we copy the map from PublicarDocumento.
  // Ideally this constant should be in a shared file. 
  // Copying the behavior of text input for simplicity if the constant isn't available, but user asked for "Oficina de registro mercantil"
  // In `PublicarDocumento` it is a select. Let's assume we use input for now or copy the list if I had it.
  // I will use input for flexibility unless I see the list is critical. 
  // Actually, looking at previous file content, `PublicarDocumento.tsx` had `REGISTROS_POR_ESTADO`.
  // I will leave it as an input that suggests values if possible or just an input to be safe, 
  // or duplicate the list if I had it in context. 
  // Since I don't want to bloat this file with a huge list without seeing it all, I'll use a simple input for now 
  // but labeled correctly. The user requirements didn't explicitly say "dropdown" for Oficina in Convocatorias, but implied "Campos: ... Oficina".
  // `PublicarDocumento` has it as a dropdown. I will check if I can grab it. 
  // To stay safe and concise I'll use text input for "Oficina" unless I can easily get the list.
}

// Re-using the types from PublicarDocumento for consistency
const SOCIEDAD_OPTS = [
  "Firma Personal (F.P.)", "Compañía Anónima (C.A.)", "Compañía de Responsabilidad Limitada (C.R.L.)",
  "Compañía en Comandita Simple (C.C.S.)", "Compañía en Comandita por Acciones (C.C.A.)", "Consorcio",
  "Sociedades Anónimas (S.A.)", "Sociedad en Comandita Simple (S.C.S.)", "Sociedad en Comandita por Acciones (S.C.A.)",
  "Sociedad Mercantil Extranjera", "Sociedades de Responsabilidad Limitada (S.R.L.)"
]

export default function PublicarConvocatoria() {
  const [step, setStep] = useState(1)
  const [requestId, setRequestId] = useState<number | null>(null)
  const [settings, setSettings] = useState<any>({})
  const [rate, setRate] = useState<number | undefined>()
  const [busy, setBusy] = useState(false)

  // Step 1 fields
  const [f1, setF1] = useState<any>({
    tipo_sociedad: '', tipo_convocatoria: '', nombre: '', rif: '', estado: '', oficina: '', tomo: '', numero: '', anio: '', expediente: '', fecha: '', representante: '', ci_rep: ''
  })

  // Step 2 files
  const [upState, setUpState] = useState<{ img?: number; doc?: number; logo?: number }>({})

  // Step 3 payment
  const [folios, setFolios] = useState(1)
  const [pay, setPay] = useState<any>({ a_nombre: '', rif: '', telefono: '', email: '', direccion: '', fecha_solicitud: new Date().toISOString().slice(0, 10), tipo_operacion: 'transferencia', banco: '', ref: '', date: new Date().toISOString().slice(0, 10), amount_bs: '' as any, mobile_phone: '' })
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    getSettings()
      .then(r => setSettings(r.settings))
      .catch(err => console.error('Error cargando configuración:', err))
    getBcvRate()
      .then(r => setRate(r.rate))
      .catch(err => console.error('Error cargando tasa BCV:', err))
  }, [])

  const priceUsd = Number(settings.convocatoria_usd || 0)
  const unitBs = rate ? +(priceUsd * rate).toFixed(2) : undefined
  const subTotal = unitBs && folios ? +(unitBs * folios).toFixed(2) : undefined
  const ivaPct = Number(settings.iva_percent || 16)
  const ivaAmt = subTotal !== undefined ? +(subTotal * (ivaPct / 100)).toFixed(2) : undefined
  const total = subTotal !== undefined && ivaAmt !== undefined ? +(subTotal + ivaAmt).toFixed(2) : undefined

  const nextToStep2 = async () => {
    setBusy(true)
    try {
      if (!requestId) {
        const res = await createLegal({ status: 'Borrador', name: f1.nombre, document: f1.rif || '', date: f1.fecha || new Date().toISOString().slice(0, 10), pub_type: 'Convocatoria', meta: f1 })
        setRequestId((res as any).id || (res as any).lastId || 0)
      } else {
        await updateLegal(requestId, { meta: f1 })
      }
      setStep(2)
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleUpload = async (file: File | null, kind: 'convocatoria_imagen' | 'convocatoria_texto' | 'logo') => {
    if (!file || !requestId) return
    setBusy(true)
    try {
      const up = await uploadFiles([file])
      const id = (up.items?.[0]?.id) || (up[0]?.id) || up.id
      if (id) {
        await attachLegalFile(requestId, id, kind)
        setUpState(s => ({ ...s, [kind === 'convocatoria_imagen' ? 'img' : (kind === 'convocatoria_texto' ? 'doc' : 'logo')]: id }))
        // alert('Archivo adjuntado.') // Optional feedback
      }
    } catch (e: any) {
      alert('Error subiendo archivo: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accepted) { alert('Debe aceptar los Términos y Condiciones.'); return }
    if (!requestId) return
    setBusy(true)
    try {
      await updateLegal(requestId, {
        name: pay.a_nombre || f1.nombre,
        document: pay.rif || f1.rif || '',
        phone: pay.telefono || '',
        email: pay.email || '',
        address: pay.direccion || '',
        date: pay.fecha_solicitud || new Date().toISOString().slice(0, 10),
        pub_type: 'Convocatoria',
        meta: f1,
        status: 'Por verificar',
        folios
      })
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
      alert('Error enviando solicitud: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">SOLICITUD DE PUBLICACIÓN DE CONVOCATORIA. ¡Completa estos tres pasos y obtén la publicación de tu convocatoria en la próxima edición!</h1>
      <div className="card p-4 space-y-3">
        <div className="flex gap-2 text-sm">
          <span className={"pill " + (step === 1 ? 'bg-brand-100 text-brand-800' : '')}>Paso 1</span>
          <span className={"pill " + (step === 2 ? 'bg-brand-100 text-brand-800' : '')}>Paso 2</span>
          <span className={"pill " + (step === 3 ? 'bg-brand-100 text-brand-800' : '')}>Paso 3</span>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg">Paso 1. Datos de la convocatoria</h2>
            <p className="text-sm text-slate-600">Estimado(a) usuario: seleccione el tipo de convocatoria que desea publicar y complete los campos solicitados con los datos de la sociedad mercantil.</p>
            <p className="text-sm text-slate-600">Asegúrese de que la información suministrada coincida con lo que consta en los documentos protocolizados o en los estatutos sociales de la sociedad mercantil.</p>

            <div className="grid md:grid-cols-2 gap-2">
              <select className="input w-full" value={f1.tipo_sociedad} onChange={e => setF1({ ...f1, tipo_sociedad: e.target.value })}>
                <option value="">Tipo de sociedad</option>
                {SOCIEDAD_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>

              <select className="input w-full" value={f1.tipo_convocatoria} onChange={e => setF1({ ...f1, tipo_convocatoria: e.target.value })}>
                <option value="">Tipo de convocatoria</option>
                {TIPO_CONV_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>

              <input className="input md:col-span-2" placeholder="Razón o denominación social (nombre de la sociedad mercantil)" value={f1.nombre} onChange={e => setF1({ ...f1, nombre: e.target.value })} />
              <input className="input" placeholder="RIF" value={f1.rif} onChange={e => setF1({ ...f1, rif: e.target.value })} />

              <select className="input w-full" value={f1.estado} onChange={e => setF1({ ...f1, estado: e.target.value })}>
                <option value="">Estado</option>
                {ESTADOS_VENEZUELA.map(e => <option key={e} value={e}>{e}</option>)}
              </select>

              <input className="input" placeholder="Oficina de registro mercantil" value={f1.oficina} onChange={e => setF1({ ...f1, oficina: e.target.value })} />
              <input className="input" placeholder="Tomo / Letra" value={f1.tomo} onChange={e => setF1({ ...f1, tomo: e.target.value })} />
              <input className="input" placeholder="Número" value={f1.numero} onChange={e => setF1({ ...f1, numero: e.target.value })} />
              <input className="input" placeholder="Año" value={f1.anio} onChange={e => setF1({ ...f1, anio: e.target.value })} />
              <input className="input" placeholder="Número de expediente" value={f1.expediente} onChange={e => setF1({ ...f1, expediente: e.target.value })} />
              <input className="input" type="date" placeholder="Fecha" value={f1.fecha} onChange={e => setF1({ ...f1, fecha: e.target.value })} />

              <input className="input" placeholder="Nombres y apellidos del representante legal de la sociedad" value={f1.representante} onChange={e => setF1({ ...f1, representante: e.target.value })} />
              <input className="input" placeholder="Número de documento de identidad" value={f1.ci_rep} onChange={e => setF1({ ...f1, ci_rep: e.target.value })} />
            </div>

            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={nextToStep2} disabled={busy}>{busy ? 'Procesando...' : 'Continuar'}</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg">Paso 2. Adjuntar archivos de la convocatoria</h2>
            <p className="text-sm text-slate-600">En este paso deberá digitalizar y adjuntar el documento que contiene la convocatoria.</p>

            <div className="bg-slate-50 border rounded p-3 text-sm">
              <div className="font-semibold">Instrucciones: Convocatorias</div>
              <div className="mt-2 whitespace-pre-wrap">{settings.instructions_convocatorias_text || 'Por favor, siga cuidadosamente las siguientes instrucciones para garantizar que los archivos cumplan con los requisitos establecidos.'}</div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <label className="block border p-3 rounded hover:bg-slate-50">
                <span className="text-sm font-semibold block mb-1">Convocatoria digitalizada (firmada y sellada)</span>
                <span className="text-xs text-slate-500 block mb-2">Formato de imagen (fotografía o escáner nítido)</span>
                <input className="input w-full text-sm" type="file" accept="image/*" disabled={busy} onChange={e => handleUpload(e.currentTarget.files?.[0] || null, 'convocatoria_imagen')} />
                {upState.img && <span className="text-xs text-green-600 block mt-1">✓ Archivo cargado</span>}
              </label>

              <label className="block border p-3 rounded hover:bg-slate-50">
                <span className="text-sm font-semibold block mb-1">Texto de la convocatoria</span>
                <span className="text-xs text-slate-500 block mb-2">Formato Word (editable y completo)</span>
                <input className="input w-full text-sm" type="file" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={busy} onChange={e => handleUpload(e.currentTarget.files?.[0] || null, 'convocatoria_texto')} />
                {upState.doc && <span className="text-xs text-green-600 block mt-1">✓ Archivo cargado</span>}
              </label>

              <label className="block border p-3 rounded hover:bg-slate-50">
                <span className="text-sm font-semibold block mb-1">Logo de la sociedad mercantil (opcional)</span>
                <span className="text-xs text-slate-500 block mb-2">Formato de imagen en una óptima resolución</span>
                <input className="input w-full text-sm" type="file" accept="image/*" disabled={busy} onChange={e => handleUpload(e.currentTarget.files?.[0] || null, 'logo')} />
                {upState.logo && <span className="text-xs text-green-600 block mt-1">✓ Archivo cargado</span>}
              </label>
            </div>

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
                <div className="mt-1">Servicio de publicación electrónica en el Diario Mercantil de Venezuela de una convocatoria de {f1.tipo_convocatoria || '[tipo de convocatoria]'} de la sociedad mercantil {f1.nombre || '[Razón o denominación social (nombre de la sociedad mercantil)]'}</div>
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
                  <input className="input" placeholder="Banco" value={pay.banco} onChange={e => setPay({ ...pay, banco: e.target.value })} />
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
