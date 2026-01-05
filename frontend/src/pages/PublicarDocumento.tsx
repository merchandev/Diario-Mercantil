import { useEffect, useMemo, useState } from 'react'
import type React from 'react'
import { addLegalPayment, attachLegalFile, createLegal, getBcvRate, getSettings, type LegalRequest, updateLegal, uploadFiles } from '../lib/api'

const ESTADOS_VENEZUELA = [
  'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar', 'Carabobo', 'Cojedes',
  'Delta Amacuro', 'Distrito Capital', 'Falcón', 'Guárico', 'La Guaira', 'Lara', 'Mérida',
  'Miranda', 'Monagas', 'Nueva Esparta', 'Portuguesa', 'Sucre', 'Táchira', 'Trujillo',
  'Vargas', 'Yaracuy', 'Zulia'
]

const REGISTROS_POR_ESTADO: Record<string, string[]> = {
  'Amazonas': [
    '559 - Registro Mercantil del Estado Amazonas'
  ],
  'Anzoátegui': [
    '262 - Registro Mercantil Primero del Estado Anzoátegui',
    '263 - Registro Mercantil Segundo del Estado Anzoátegui',
    '264 - Registro Mercantil Tercero del Estado Anzoátegui'
  ],
  'Apure': [
    '272 - Registro Mercantil del Estado Apure',
    '490 - Registro Mercantil Segundo de la Circunscripción Judicial del Distrito Alto Apure'
  ],
  'Aragua': [
    '283 - Registro Mercantil Primero del Estado Aragua',
    '284 - Registro Mercantil Segundo del Estado Aragua'
  ],
  'Barinas': [
    '295 - Registro Mercantil Primero del Estado Barinas',
    '412 - Registro Mercantil Segundo del Estado Barinas'
  ],
  'Bolívar': [
    '303 - Registro Mercantil Primero del Estado Bolívar',
    '304 - Registro Mercantil Segundo del Estado Bolívar'
  ],
  'Carabobo': [
    '314 - Registro Mercantil Primero del Estado Carabobo',
    '315 - Registro Mercantil Segundo del Estado Carabobo',
    '316 - Registro Mercantil Tercero del Estado Carabobo'
  ],
  'Cojedes': [
    '325 - Registro Mercantil del Estado Cojedes'
  ],
  'Delta Amacuro': [
    '327 - Registro Mercantil del Estado Delta Amacuro'
  ],
  'Distrito Capital': [
    '220 - Registro Mercantil Primero del Distrito Capital',
    '221 - Registro Mercantil Segundo del Distrito Capital',
    '223 - Registro Mercantil Cuarto del Distrito Capital',
    '224 - Registro Mercantil Quinto del Distrito Capital',
    '225 - Registro Mercantil Séptimo del Distrito Capital'
  ],
  'Falcón': [
    '342 - Registro Mercantil Primero del Estado Falcón',
    '343 - Registro Mercantil Segundo del Estado Falcón'
  ],
  'Guárico': [
    '352 - Registro Mercantil Primero del Estado Guárico',
    '353 - Registro Mercantil Segundo del Estado Guárico',
    '354 - Registro Mercantil Tercero del Estado Guárico'
  ],
  'La Guaira': [
    '457 - Registro Mercantil del Estado La Guaira'
  ],
  'Lara': [
    '364 - Registro Mercantil Primero del Estado Lara',
    '365 - Registro Mercantil Segundo del Estado Lara'
  ],
  'Mérida': [
    '379 - Registro Mercantil Primero del Estado Mérida',
    '380 - Registro Mercantil Segundo del Estado Mérida'
  ],
  'Miranda': [
    '222 - Registro Mercantil Tercero de la Circunscripción Judicial del Distrito Capital y Estado Bolivariano de Miranda'
  ],
  'Monagas': [
    '391 - Registro Mercantil del Estado Monagas'
  ],
  'Nueva Esparta': [
    '399 - Registro Mercantil Primero del Estado Nueva Esparta',
    '400 - Registro Mercantil Segundo del Estado Nueva Esparta'
  ],
  'Portuguesa': [
    '410 - Registro Mercantil Primero del Estado Portuguesa',
    '411 - Registro Mercantil Segundo del Estado Portuguesa'
  ],
  'Sucre': [
    '424 - Registro Mercantil Primero del Estado Sucre'
  ],
  'Táchira': [
    '443 - Registro Mercantil Primero del Estado Táchira',
    '444 - Registro Mercantil Segundo del Estado Táchira',
    '445 - Registro Mercantil Tercero del Estado Táchira'
  ],
  'Trujillo': [
    '454 - Registro Mercantil Primero del Estado Trujillo'
  ],
  'Vargas': [
    '457 - Registro Mercantil del Estado La Guaira'
  ],
  'Yaracuy': [
    '466 - Registro Mercantil del Estado Yaracuy'
  ],
  'Zulia': [
    '483 - Registro Mercantil Primero del Estado Zulia',
    '484 - Registro Mercantil Segundo del Estado Zulia',
    '485 - Registro Mercantil Tercero del Estado Zulia',
    '486 - Registro Mercantil Cuarto del Estado Zulia',
    '487 - Registro Mercantil Quinto del Estado Zulia'
  ]
}

const TRAMITES_POR_TIPO: Record<string, string[]> = {
  'Firma Personal (F.P.)': [
    'Aumento de Capital de Firma Personal',
    'Cambio de Denominación de Firma Personal',
    'Cambio de Domicilio Nacional de Firma Personal',
    'Constitución de Firma Personal',
    'Disolución de Firma Personal',
    'Domiciliación de Expediente de Firma Personal',
    'Liquidación de Firma Personal',
    'Modificación al Documento Constitutivo de Firma Personal',
    'Prórroga de Duración de Firma Personal',
    'Reducción de Capital de Firma Personal'
  ],
  'Compañía Anónima (C.A.)': [
    'Acta de Asamblea de Junta Directiva',
    'Acta de Asamblea de Socios o Accionistas',
    'Acta de Remate',
    'Aumento de Capital',
    'Autorización Judicial',
    'Cambio de Denominación',
    'Cambio de Domicilio',
    'Constitución',
    'Constitución de Fondo de Comercio',
    'Constitución de Sucursal',
    'Contrato de Cuentas de Participación',
    'Contratos de Adhesión',
    'Declaración de Adjudicación',
    'Disolución',
    'Domiciliación de Expediente',
    'Liberación de Prenda Mercantil',
    'Liquidación',
    'Modificación al Documento Constitutivo',
    'Partición de Bienes de la Comunidad Conyugal',
    'Prendas Mercantiles',
    'Prórroga de Duración',
    'Reducción de Capital',
    'Solicitud de Agregado',
    'Transacción Judicial',
    'Transformación de Naturaleza Jurídica',
    'Venta de Acciones'
  ],
  'Compañía de Responsabilidad Limitada (C.R.L.)': [
    'Acta de Asamblea de Junta Directiva',
    'Acta de Asamblea de Socios o Accionistas',
    'Acta de Remate',
    'Aumento de Capital',
    'Autorización Judicial',
    'Cambio de Denominación',
    'Cambio de Domicilio',
    'Constitución',
    'Constitución de Fondo de Comercio',
    'Constitución de Sucursal',
    'Contrato de Cuentas de Participación',
    'Contratos de Adhesión',
    'Declaración de Adjudicación',
    'Disolución',
    'Domiciliación de Expediente',
    'Liberación de Prenda Mercantil',
    'Liquidación',
    'Modificación al Documento Constitutivo',
    'Partición de Bienes de la Comunidad Conyugal',
    'Prendas Mercantiles',
    'Prórroga de Duración',
    'Reducción de Capital',
    'Solicitud de Agregado',
    'Transacción Judicial',
    'Transformación de Naturaleza Jurídica',
    'Venta de Acciones'
  ],
  'Compañía en Comandita Simple (C.C.S.)': [
    'Acta de Asamblea de Junta Directiva',
    'Acta de Asamblea de Socios o Accionistas',
    'Acta de Remate',
    'Aumento de Capital',
    'Autorización Judicial',
    'Cambio de Denominación',
    'Cambio de Domicilio',
    'Constitución',
    'Constitución de Fondo de Comercio',
    'Constitución de Sucursal',
    'Contrato de Cuentas de Participación',
    'Contratos de Adhesión',
    'Declaración de Adjudicación',
    'Disolución',
    'Domiciliación de Expediente',
    'Liberación de Prenda Mercantil',
    'Liquidación',
    'Modificación al Documento Constitutivo',
    'Partición de Bienes de la Comunidad Conyugal',
    'Prendas Mercantiles',
    'Prórroga de Duración',
    'Reducción de Capital',
    'Solicitud de Agregado',
    'Transacción Judicial',
    'Transformación de Naturaleza Jurídica',
    'Venta de Acciones'
  ],
  'Compañía en Comandita por Acciones (C.C.A.)': [
    'Acta de Asamblea de Junta Directiva',
    'Acta de Asamblea de Socios o Accionistas',
    'Acta de Remate',
    'Aumento de Capital',
    'Autorización Judicial',
    'Cambio de Denominación',
    'Cambio de Domicilio',
    'Constitución',
    'Constitución de Fondo de Comercio',
    'Constitución de Sucursal',
    'Contrato de Cuentas de Participación',
    'Contratos de Adhesión',
    'Declaración de Adjudicación',
    'Disolución',
    'Domiciliación de Expediente',
    'Liberación de Prenda Mercantil',
    'Liquidación',
    'Modificación al Documento Constitutivo',
    'Partición de Bienes de la Comunidad Conyugal',
    'Prendas Mercantiles',
    'Prórroga de Duración',
    'Reducción de Capital',
    'Solicitud de Agregado',
    'Transacción Judicial',
    'Transformación de Naturaleza Jurídica',
    'Venta de Acciones'
  ],
  'Consorcio': [
    'Acta de Asamblea de Junta Directiva',
    'Acta de Asamblea de Socios o Accionistas',
    'Acta de Remate',
    'Aumento de Capital',
    'Autorización Judicial',
    'Cambio de Denominación',
    'Cambio de Domicilio',
    'Constitución',
    'Constitución de Fondo de Comercio',
    'Constitución de Sucursal',
    'Contrato de Cuentas de Participación',
    'Contratos de Adhesión',
    'Declaración de Adjudicación',
    'Disolución',
    'Domiciliación de Expediente',
    'Liberación de Prenda Mercantil',
    'Liquidación',
    'Modificación al Documento Constitutivo',
    'Partición de Bienes de la Comunidad Conyugal',
    'Prendas Mercantiles',
    'Prórroga de Duración',
    'Reducción de Capital',
    'Solicitud de Agregado',
    'Transacción Judicial',
    'Transformación de Naturaleza Jurídica',
    'Venta de Acciones'
  ],
  'Sociedades Anónimas (S.A.)': [
    'Acta de Asamblea de Junta Directiva',
    'Acta de Asamblea de Socios o Accionistas',
    'Acta de Remate',
    'Aumento de Capital',
    'Autorización Judicial',
    'Cambio de Denominación',
    'Cambio de Domicilio',
    'Constitución',
    'Constitución de Fondo de Comercio',
    'Constitución de Sucursal',
    'Contrato de Cuentas de Participación',
    'Contratos de Adhesión',
    'Declaración de Adjudicación',
    'Disolución',
    'Domiciliación de Expediente',
    'Liberación de Prenda Mercantil',
    'Liquidación',
    'Modificación al Documento Constitutivo',
    'Partición de Bienes de la Comunidad Conyugal',
    'Prendas Mercantiles',
    'Prórroga de Duración',
    'Reducción de Capital',
    'Solicitud de Agregado',
    'Transacción Judicial',
    'Transformación de Naturaleza Jurídica',
    'Venta de Acciones'
  ],
  'Sociedad en Comandita Simple (S.C.S.)': [
    'Acta de Asamblea de Junta Directiva',
    'Acta de Asamblea de Socios o Accionistas',
    'Acta de Remate',
    'Aumento de Capital',
    'Autorización Judicial',
    'Cambio de Denominación',
    'Cambio de Domicilio',
    'Constitución',
    'Constitución de Fondo de Comercio',
    'Constitución de Sucursal',
    'Contrato de Cuentas de Participación',
    'Contratos de Adhesión',
    'Declaración de Adjudicación',
    'Disolución',
    'Domiciliación de Expediente',
    'Liberación de Prenda Mercantil',
    'Liquidación',
    'Modificación al Documento Constitutivo',
    'Partición de Bienes de la Comunidad Conyugal',
    'Prendas Mercantiles',
    'Prórroga de Duración',
    'Reducción de Capital',
    'Solicitud de Agregado',
    'Transacción Judicial',
    'Transformación de Naturaleza Jurídica',
    'Venta de Acciones'
  ],
  'Sociedad en Comandita por Acciones (S.C.A.)': [
    'Acta de Asamblea de Junta Directiva',
    'Acta de Asamblea de Socios o Accionistas',
    'Acta de Remate',
    'Aumento de Capital',
    'Autorización Judicial',
    'Cambio de Denominación',
    'Cambio de Domicilio',
    'Constitución',
    'Constitución de Fondo de Comercio',
    'Constitución de Sucursal',
    'Contrato de Cuentas de Participación',
    'Contratos de Adhesión',
    'Declaración de Adjudicación',
    'Disolución',
    'Domiciliación de Expediente',
    'Liberación de Prenda Mercantil',
    'Liquidación',
    'Modificación al Documento Constitutivo',
    'Partición de Bienes de la Comunidad Conyugal',
    'Prendas Mercantiles',
    'Prórroga de Duración',
    'Reducción de Capital',
    'Solicitud de Agregado',
    'Transacción Judicial',
    'Transformación de Naturaleza Jurídica',
    'Venta de Acciones'
  ],
  'Sociedad Mercantil Extranjera': [
    'Acta de Asamblea de Junta Directiva',
    'Acta de Asamblea de Socios o Accionistas',
    'Acta de Remate',
    'Aumento de Capital',
    'Autorización Judicial',
    'Cambio de Denominación',
    'Cambio de Domicilio',
    'Constitución',
    'Constitución de Fondo de Comercio',
    'Constitución de Sucursal',
    'Contrato de Cuentas de Participación',
    'Contratos de Adhesión',
    'Declaración de Adjudicación',
    'Disolución',
    'Domiciliación de Expediente',
    'Liberación de Prenda Mercantil',
    'Liquidación',
    'Modificación al Documento Constitutivo',
    'Partición de Bienes de la Comunidad Conyugal',
    'Prendas Mercantiles',
    'Prórroga de Duración',
    'Reducción de Capital',
    'Solicitud de Agregado',
    'Transacción Judicial',
    'Transformación de Naturaleza Jurídica',
    'Venta de Acciones'
  ],
  'Sociedades de Responsabilidad Limitada (S.R.L.)': [
    'Acta de Asamblea de Junta Directiva',
    'Acta de Asamblea de Socios o Accionistas',
    'Acta de Remate',
    'Aumento de Capital',
    'Autorización Judicial',
    'Cambio de Denominación',
    'Cambio de Domicilio',
    'Constitución',
    'Constitución de Fondo de Comercio',
    'Constitución de Sucursal',
    'Contrato de Cuentas de Participación',
    'Contratos de Adhesión',
    'Declaración de Adjudicación',
    'Disolución',
    'Domiciliación de Expediente',
    'Liberación de Prenda Mercantil',
    'Liquidación',
    'Modificación al Documento Constitutivo',
    'Partición de Bienes de la Comunidad Conyugal',
    'Prendas Mercantiles',
    'Prórroga de Duración',
    'Reducción de Capital',
    'Solicitud de Agregado',
    'Transacción Judicial',
    'Transformación de Naturaleza Jurídica',
    'Venta de Acciones'
  ]
}

export default function PublicarDocumento(){
  const [step, setStep] = useState(1)
  const [requestId, setRequestId] = useState<number|null>(null)
  const [settings, setSettings] = useState<any>({})
  const [rate, setRate] = useState<number|undefined>()
  const [showImage, setShowImage] = useState(false)
  // Step 1 fields
  const [f1, setF1] = useState<any>({
    tipo_sociedad:'', tipo_acto:'', nombre:'', estado:'', oficina:'', registrador_nombre:'', registrador_tipo:'',
    tomo:'', numero:'', anio:'', expediente:'', fecha:'', planilla:''
  })
  // Step 2 files count -> folios
  const [folios, setFolios] = useState<number>(1)
  // Step 3 payment fields
  const [pay, setPay] = useState<any>({ a_nombre:'', rif:'', telefono:'', email:'', direccion:'', fecha_solicitud: new Date().toISOString().slice(0,10), tipo_operacion:'transferencia', banco:'', ref:'', date: new Date().toISOString().slice(0,10), amount_bs:'' as any, mobile_phone:'' })
  const [accepted, setAccepted] = useState(false)
  const priceUsd = Number(settings.price_per_folio_usd || 0)
  const unitBs = rate ? +(priceUsd * rate).toFixed(2) : undefined
  const subTotal = unitBs ? +(unitBs * Math.max(1, folios)).toFixed(2) : undefined
  const ivaPct = Number(settings.iva_percent || 16)
  const ivaAmt = subTotal!==undefined ? +(subTotal * (ivaPct/100)).toFixed(2) : undefined
  const total = subTotal!==undefined && ivaAmt!==undefined ? +(subTotal + ivaAmt).toFixed(2) : undefined

  useEffect(()=>{ 
    getSettings()
      .then(r=>setSettings(r.settings))
      .catch(err=>console.error('Error cargando configuración:', err))
    getBcvRate()
      .then(r=>setRate(r.rate))
      .catch(err=>console.error('Error cargando tasa BCV:', err))
  },[])

  const nextToStep2 = async()=>{
    // create draft if not exists
    if (!requestId) {
      const res = await createLegal({ status:'Borrador', name:f1.nombre, document:'', date: f1.fecha || new Date().toISOString().slice(0,10), pub_type:'Documento', meta: f1 })
      setRequestId((res as any).id || (res as any).lastId || 0)
    }
    setStep(2)
  }

  const onUploadFolios = async(files: FileList | null)=>{
    if (!files || !requestId) return
    const arr = Array.from(files)
    const up = await uploadFiles(arr)
    const ids: number[] = (up.items || up || []).map((x:any)=>x.id)
    for (const id of ids) { await attachLegalFile(requestId, id, 'folio') }
    setFolios(prev=>Math.max(prev, ids.length))
    alert('Folios adjuntados correctamente.')
  }

  const submitPayment = async(e:React.FormEvent)=>{
    e.preventDefault()
    if (!accepted) { alert('Debe aceptar los Términos y Condiciones.'); return }
    // update request with all details
    if (!requestId) return
    const body: Partial<LegalRequest> = {
      name: pay.a_nombre || f1.nombre,
      document: pay.rif || '',
      phone: pay.telefono || '',
      email: pay.email || '',
      address: pay.direccion || '',
      date: pay.fecha_solicitud || new Date().toISOString().slice(0,10),
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
      mobile_phone: pay.tipo_operacion?.toLowerCase?.()==='pago móvil' ? pay.mobile_phone : undefined,
      status: 'Pendiente'
    })
    alert('¡Tu solicitud fue enviada! Está Por verificar.')
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">SOLICITUD DE PUBLICACIÓN DE DOCUMENTO. ¡Completa estos tres pasos y obtén la publicación de tu documento en la próxima edición!</h1>
      <div className="card p-4 space-y-3">
        <div className="flex gap-2 text-sm">
          <span className={"pill "+(step===1? 'bg-brand-100 text-brand-800':'')}>Paso 1</span>
          <span className={"pill "+(step===2? 'bg-brand-100 text-brand-800':'')}>Paso 2</span>
          <span className={"pill "+(step===3? 'bg-brand-100 text-brand-800':'')}>Paso 3</span>
        </div>
        {step===1 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Estimado(a) usuario, por favor complete los campos según los datos que constan en el documento debidamente protocolizado.</p>
            <div className="grid md:grid-cols-2 gap-2">
              <div className="relative">
                <select className="input w-full" value={f1.tipo_sociedad} onChange={e=>setF1({...f1,tipo_sociedad:e.target.value})}>
                  <option value="">Seleccione tipo de sociedad</option>
                  <option value="Firma Personal (F.P.)">Firma Personal (F.P.)</option>
                  <option value="Compañía Anónima (C.A.)">Compañía Anónima (C.A.)</option>
                  <option value="Compañía de Responsabilidad Limitada (C.R.L.)">Compañía de Responsabilidad Limitada (C.R.L.)</option>
                  <option value="Compañía en Comandita Simple (C.C.S.)">Compañía en Comandita Simple (C.C.S.)</option>
                  <option value="Compañía en Comandita por Acciones (C.C.A.)">Compañía en Comandita por Acciones (C.C.A.)</option>
                  <option value="Consorcio">Consorcio</option>
                  <option value="Sociedades Anónimas (S.A.)">Sociedades Anónimas (S.A.)</option>
                  <option value="Sociedad en Comandita Simple (S.C.S.)">Sociedad en Comandita Simple (S.C.S.)</option>
                  <option value="Sociedad en Comandita por Acciones (S.C.A.)">Sociedad en Comandita por Acciones (S.C.A.)</option>
                  <option value="Sociedad Mercantil Extranjera">Sociedad Mercantil Extranjera</option>
                  <option value="Sociedades de Responsabilidad Limitada (S.R.L.)">Sociedades de Responsabilidad Limitada (S.R.L.)</option>
                </select>
                <div className="flex absolute inset-y-0 right-0 items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 fill-brand-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                    <path d="M207.029 381.476L12.686 187.132c-9.373-9.373-9.373-24.569 0-33.941l22.667-22.667c9.357-9.357 24.522-9.375 33.901-.04L224 284.505l154.745-154.021c9.379-9.335 24.544-9.317 33.901.04l22.667 22.667c9.373 9.373 9.373 24.569 0 33.941L240.971 381.476c-9.373 9.372-24.569 9.372-33.942 0z"></path>
                  </svg>
                </div>
              </div>
              <div className="relative">
                <select className="input w-full" value={f1.tipo_acto} onChange={e=>setF1({...f1,tipo_acto:e.target.value})} disabled={!f1.tipo_sociedad}>
                  <option value="">Seleccione tipo de trámite</option>
                  {f1.tipo_sociedad && TRAMITES_POR_TIPO[f1.tipo_sociedad]?.map((t:string) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="flex absolute inset-y-0 right-0 items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 fill-brand-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                    <path d="M207.029 381.476L12.686 187.132c-9.373-9.373-9.373-24.569 0-33.941l22.667-22.667c9.357-9.357 24.522-9.375 33.901-.04L224 284.505l154.745-154.021c9.379-9.335 24.544-9.317 33.901.04l22.667 22.667c9.373 9.373 9.373 24.569 0 33.941L240.971 381.476c-9.373 9.372-24.569 9.372-33.942 0z"></path>
                  </svg>
                </div>
              </div>
              <input className="input md:col-span-2" placeholder="Razón o denominación social (nombre de la sociedad mercantil)" value={f1.nombre} onChange={e=>setF1({...f1,nombre:e.target.value})}/>
              <div className="relative">
                <select className="input w-full" value={f1.estado} onChange={e=>setF1({...f1,estado:e.target.value,oficina:''})}>
                  <option value="">Seleccione estado</option>
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
                <select className="input w-full" value={f1.oficina} onChange={e=>setF1({...f1,oficina:e.target.value})} disabled={!f1.estado}>
                  <option value="">Seleccione registro mercantil</option>
                  {f1.estado && REGISTROS_POR_ESTADO[f1.estado]?.map((reg:string) => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </select>
                <div className="flex absolute inset-y-0 right-0 items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 fill-brand-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                    <path d="M207.029 381.476L12.686 187.132c-9.373-9.373-9.373-24.569 0-33.941l22.667-22.667c9.357-9.357 24.522-9.375 33.901-.04L224 284.505l154.745-154.021c9.379-9.335 24.544-9.317 33.901.04l22.667 22.667c9.373 9.373 9.373 24.569 0 33.941L240.971 381.476c-9.373 9.372-24.569 9.372-33.942 0z"></path>
                  </svg>
                </div>
              </div>
              <input className="input" placeholder="Nombre del (de la) registrador(a) mercantil" value={f1.registrador_nombre} onChange={e=>setF1({...f1,registrador_nombre:e.target.value})}/>
              <input className="input" placeholder="Tipo de registrador(a) mercantil" value={f1.registrador_tipo} onChange={e=>setF1({...f1,registrador_tipo:e.target.value})}/>
              <input className="input" placeholder="Tomo / Letra" value={f1.tomo} onChange={e=>setF1({...f1,tomo:e.target.value})}/>
              <input className="input" placeholder="Número" value={f1.numero} onChange={e=>setF1({...f1,numero:e.target.value})}/>
              <input className="input" placeholder="Año" value={f1.anio} onChange={e=>setF1({...f1,anio:e.target.value})}/>
              <input className="input" placeholder="Número de expediente" value={f1.expediente} onChange={e=>setF1({...f1,expediente:e.target.value})}/>
              <input className="input" type="date" placeholder="Fecha" value={f1.fecha} onChange={e=>setF1({...f1,fecha:e.target.value})}/>
              <input className="input" placeholder="Número de planilla" value={f1.planilla} onChange={e=>setF1({...f1,planilla:e.target.value})}/>
            </div>
            <div className="bg-slate-50 border rounded p-3 text-sm">
              <div className="flex items-center justify-between">
                <div>¿Tienes dudas sobre dónde están los datos? Haz clic en la imagen y guíate fácilmente para completar el formulario.</div>
                {settings.instructions_documents_image_url && (
                  <button className="btn" onClick={()=>setShowImage(true)}>Ver imagen</button>
                )}
              </div>
              {settings.instructions_documents_text && (
                <p className="mt-2 whitespace-pre-wrap">{settings.instructions_documents_text}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={nextToStep2}>Continuar</button>
            </div>
            {showImage && (
              <div className="fixed inset-0 bg-black/60 grid place-items-center" onClick={()=>setShowImage(false)}>
                <img src={settings.instructions_documents_image_url} alt="Instrucciones" className="max-h-[90vh] max-w-[90vw] rounded"/>
              </div>
            )}
          </div>
        )}
        {step===2 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Estimado(a) usuario: para continuar con la solicitud, deberá digitalizar todos los folios (páginas) del documento y adjuntarlos en este paso.</p>
            <div className="bg-slate-50 border rounded p-3 text-sm whitespace-pre-wrap">{settings.instructions_documents_text || 'Por favor, siga cuidadosamente las instrucciones para garantizar que los archivos cumplan con los requisitos establecidos.'}</div>
            <label className="block">
              <span className="text-sm">Adjuntar folios (puede seleccionar múltiples archivos)</span>
              <input className="input" type="file" accept="image/*,application/pdf" multiple onChange={e=>onUploadFolios(e.currentTarget.files)} />
            </label>
            <div className="flex gap-2">
              <button className="btn" onClick={()=>setStep(1)}>Atrás</button>
              <button className="btn btn-primary" onClick={()=>setStep(3)}>Continuar</button>
            </div>
          </div>
        )}
        {step===3 && (
          <form onSubmit={submitPayment} className="space-y-3">
            <p className="text-sm text-slate-600">Estimado(a) usuario: a continuación, se muestra el detalle de su orden de servicio y el monto correspondiente a cancelar.</p>
            <div className="border rounded p-3 bg-gray-50 text-sm space-y-1">
              <div><span className="font-semibold">A nombre de:</span> <input className="input inline-block w-full md:w-auto" value={pay.a_nombre} onChange={e=>setPay({...pay,a_nombre:e.target.value})}/></div>
              <div><span className="font-semibold">C.I./RIF:</span> <input className="input inline-block w-full md:w-auto" value={pay.rif} onChange={e=>setPay({...pay,rif:e.target.value})}/></div>
              <div><span className="font-semibold">Teléfono:</span> <input className="input inline-block w-full md:w-auto" value={pay.telefono} onChange={e=>setPay({...pay,telefono:e.target.value})}/></div>
              <div><span className="font-semibold">Correo electrónico:</span> <input className="input inline-block w-full md:w-auto" type="email" value={pay.email} onChange={e=>setPay({...pay,email:e.target.value})}/></div>
              <div><span className="font-semibold">Dirección:</span> <input className="input inline-block w-full" value={pay.direccion} onChange={e=>setPay({...pay,direccion:e.target.value})}/></div>
              <div><span className="font-semibold">Fecha de la solicitud:</span> <input className="input inline-block w-full md:w-auto" type="date" value={pay.fecha_solicitud} onChange={e=>setPay({...pay,fecha_solicitud:e.target.value})}/></div>
            </div>
            <div className="border rounded overflow-hidden">
              <div className="px-3 py-2 bg-brand-800 text-white text-sm font-semibold">ORDEN DE SERVICIO N.º</div>
              <div className="p-3 text-sm">
                <div className="font-semibold">DESCRIPCIÓN | N.º DE FOLIOS | PRECIO UNITARIO (BS.) | PRECIO TOTAL (BS.)</div>
                <div className="mt-1">Servicio de publicación electrónica en el Diario Mercantil de Venezuela de un documento protocolizado que corresponde a la razón social {f1.nombre || '[Razón social]'}</div>
                <div className="mt-1 whitespace-pre-wrap text-slate-600">
                  {`Datos de registro mercantil:\nOficina de registro mercantil: ${f1.oficina || '[****]'}\nTomo: ${f1.tomo || '[****]'}\nNúmero: ${f1.numero || '[****]'}\nAño: ${f1.anio || '[****]'}\nNúmero de expediente: ${f1.expediente || '[****]'}`}
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2 items-center">
                  <div>Servicio</div>
                  <div><input className="input" type="number" min={1} value={folios} onChange={e=>setFolios(Math.max(1, Number(e.target.value||1)))} /></div>
                  <div>{unitBs!==undefined ? unitBs.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'}</div>
                  <div>{subTotal!==undefined ? subTotal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'}</div>
                  <div className="col-span-3">IVA ({ivaPct}%)</div>
                  <div>{ivaAmt!==undefined ? ivaAmt.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'}</div>
                  <div className="col-span-3 font-semibold">TOTAL</div>
                  <div className="font-semibold">{total!==undefined ? total.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'}</div>
                </div>
                <div className="mt-3 text-sm space-y-1">
                  <div className="font-semibold">Datos bancarios para efectuar el pago correspondiente al monto antes señalado:</div>
                  <div className="text-slate-600">Importante: el pago debe realizarse por el monto exacto indicado en el total de la orden de servicio, sin realizar redondeos ni modificaciones.</div>
                  <div className="text-slate-600">Por favor, reporte el pago realizado completando los datos que se indican a continuación:</div>
                </div>
                <div className="mt-2 grid md:grid-cols-3 gap-2">
                  <input className="input" placeholder="Banco" value={pay.banco} onChange={e=>setPay({...pay,banco:e.target.value})}/>
                  <select className="input" value={pay.tipo_operacion} onChange={e=>setPay({...pay,tipo_operacion:e.target.value})}>
                    <option>transferencia</option>
                    <option>pago móvil</option>
                    <option>depósito</option>
                  </select>
                  <input className="input" placeholder="Referencia" value={pay.ref} onChange={e=>setPay({...pay,ref:e.target.value})}/>
                  <input className="input" type="date" value={pay.date} onChange={e=>setPay({...pay,date:e.target.value})}/>
                  <input className="input" type="number" step="0.01" placeholder="Monto (Bs.)" value={pay.amount_bs} onChange={e=>setPay({...pay,amount_bs:e.target.value})}/>
                  {pay.tipo_operacion === 'pago móvil' && (
                    <input className="input" placeholder="Número de teléfono desde donde realizó el pago móvil" value={pay.mobile_phone} onChange={e=>setPay({...pay,mobile_phone:e.target.value})}/>
                  )}
                </div>
                <label className="mt-3 flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} />
                  <span>Al hacer clic en “REPORTAR Y PUBLICAR”, confirmo que acepto y cumplo con los Términos y Condiciones del Diario Mercantil de Venezuela.</span>
                </label>
                <div className="mt-3 flex gap-2">
                  <button type="button" className="btn" onClick={()=>setStep(2)}>Atrás</button>
                  <button className="btn btn-primary uppercase">Reportar y Publicar</button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
