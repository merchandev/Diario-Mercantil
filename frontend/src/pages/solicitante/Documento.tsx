import { useEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import { useNavigate } from 'react-router-dom'
import { addLegalPayment, attachLegalFile, createLegal, downloadLegal, getBcvRate, getSettings, listLegalFiles, me, type LegalFile, type LegalRequest, updateLegal, uploadFiles } from '../../lib/api'
import AlertDialog from '../../components/AlertDialog'

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
    'AutorizaciÃ³n Judicial',
    'Cambio de Denominación',
    'Cambio de Domicilio',
    'ConstituciÃ³n',
    'ConstituciÃ³n de Fondo de Comercio',
    'ConstituciÃ³n de Sucursal',
    'Contrato de Cuentas de ParticipaciÃ³n',
    'Contratos de AdhesiÃ³n',
    'DeclaraciÃ³n de AdjudicaciÃ³n',
    'DisoluciÃ³n',
    'DomiciliaciÃ³n de Expediente',
    'LiberaciÃ³n de Prenda Mercantil',
    'LiquidaciÃ³n',
    'ModificaciÃ³n al Documento Constitutivo',
    'ParticiÃ³n de Bienes de la Comunidad Conyugal',
    'Prendas Mercantiles',
    'PrÃ³rroga de DuraciÃ³n',
    'ReducciÃ³n de Capital',
    'Solicitud de Agregado',
    'TransacciÃ³n Judicial',
    'TransformaciÃ³n de Naturaleza JurÃ­dica',
    'Venta de Acciones'
  ],
  'Consorcio': [
    'Acta de Asamblea de Junta Directiva',
    'Acta de Asamblea de Socios o Accionistas',
    'Acta de Remate',
    'Aumento de Capital',
    'AutorizaciÃ³n Judicial',
    'Cambio de Denominación',
    'Cambio de Domicilio',
    'ConstituciÃ³n',
    'ConstituciÃ³n de Fondo de Comercio',
    'ConstituciÃ³n de Sucursal',
    'Contrato de Cuentas de ParticipaciÃ³n',
    'Contratos de AdhesiÃ³n',
    'DeclaraciÃ³n de AdjudicaciÃ³n',
    'DisoluciÃ³n',
    'DomiciliaciÃ³n de Expediente',
    'LiberaciÃ³n de Prenda Mercantil',
    'LiquidaciÃ³n',
    'ModificaciÃ³n al Documento Constitutivo',
    'ParticiÃ³n de Bienes de la Comunidad Conyugal',
    'Prendas Mercantiles',
    'PrÃ³rroga de DuraciÃ³n',
    'ReducciÃ³n de Capital',
    'Solicitud de Agregado',
    'TransacciÃ³n Judicial',
    'TransformaciÃ³n de Naturaleza JurÃ­dica',
    'Venta de Acciones'
  ],
  'Sociedades AnÃ³nimas (S.A.)': [
    'Acta de Asamblea de Junta Directiva',
    'Acta de Asamblea de Socios o Accionistas',
    'Acta de Remate',
    'Aumento de Capital',
    'AutorizaciÃ³n Judicial',
    'Cambio de Denominación',
    'Cambio de Domicilio',
    'ConstituciÃ³n',
    'ConstituciÃ³n de Fondo de Comercio',
    'ConstituciÃ³n de Sucursal',
    'Contrato de Cuentas de ParticipaciÃ³n',
    'Contratos de AdhesiÃ³n',
    'DeclaraciÃ³n de AdjudicaciÃ³n',
    'DisoluciÃ³n',
    'DomiciliaciÃ³n de Expediente',
    'LiberaciÃ³n de Prenda Mercantil',
    'LiquidaciÃ³n',
    'ModificaciÃ³n al Documento Constitutivo',
    'ParticiÃ³n de Bienes de la Comunidad Conyugal',
    'Prendas Mercantiles',
    'PrÃ³rroga de DuraciÃ³n',
    'ReducciÃ³n de Capital',
    'Solicitud de Agregado',
    'TransacciÃ³n Judicial',
    'TransformaciÃ³n de Naturaleza JurÃ­dica',
    'Venta de Acciones'
  ],
  'Sociedad en Comandita Simple (S.C.S.)': [
    'Acta de Asamblea de Junta Directiva',
    'Acta de Asamblea de Socios o Accionistas',
    'Acta de Remate',
    'Aumento de Capital',
    'AutorizaciÃ³n Judicial',
    'Cambio de Denominación',
    'Cambio de Domicilio',
    'ConstituciÃ³n',
    'ConstituciÃ³n de Fondo de Comercio',
    'ConstituciÃ³n de Sucursal',
    'Contrato de Cuentas de ParticipaciÃ³n',
    'Contratos de AdhesiÃ³n',
    'DeclaraciÃ³n de AdjudicaciÃ³n',
    'DisoluciÃ³n',
    'DomiciliaciÃ³n de Expediente',
    'LiberaciÃ³n de Prenda Mercantil',
    'LiquidaciÃ³n',
    'ModificaciÃ³n al Documento Constitutivo',
    'ParticiÃ³n de Bienes de la Comunidad Conyugal',
    'Prendas Mercantiles',
    'PrÃ³rroga de DuraciÃ³n',
    'ReducciÃ³n de Capital',
    'Solicitud de Agregado',
    'TransacciÃ³n Judicial',
    'TransformaciÃ³n de Naturaleza JurÃ­dica',
    'Venta de Acciones'
  ],
  'Sociedad en Comandita por Acciones (S.C.A.)': [
    'Acta de Asamblea de Junta Directiva',
    'Acta de Asamblea de Socios o Accionistas',
    'Acta de Remate',
    'Aumento de Capital',
    'AutorizaciÃ³n Judicial',
    'Cambio de Denominación',
    'Cambio de Domicilio',
    'ConstituciÃ³n',
    'ConstituciÃ³n de Fondo de Comercio',
    'ConstituciÃ³n de Sucursal',
    'Contrato de Cuentas de ParticipaciÃ³n',
    'Contratos de AdhesiÃ³n',
    'DeclaraciÃ³n de AdjudicaciÃ³n',
    'DisoluciÃ³n',
    'DomiciliaciÃ³n de Expediente',
    'LiberaciÃ³n de Prenda Mercantil',
    'LiquidaciÃ³n',
    'ModificaciÃ³n al Documento Constitutivo',
    'ParticiÃ³n de Bienes de la Comunidad Conyugal',
    'Prendas Mercantiles',
    'PrÃ³rroga de DuraciÃ³n',
    'ReducciÃ³n de Capital',
    'Solicitud de Agregado',
    'TransacciÃ³n Judicial',
    'TransformaciÃ³n de Naturaleza JurÃ­dica',
    'Venta de Acciones'
  ],
  'Sociedad Mercantil Extranjera': [
    'Acta de Asamblea de Junta Directiva',
    'Acta de Asamblea de Socios o Accionistas',
    'Acta de Remate',
    'Aumento de Capital',
    'AutorizaciÃ³n Judicial',
    'Cambio de Denominación',
    'Cambio de Domicilio',
    'ConstituciÃ³n',
    'ConstituciÃ³n de Fondo de Comercio',
    'ConstituciÃ³n de Sucursal',
    'Contrato de Cuentas de ParticipaciÃ³n',
    'Contratos de AdhesiÃ³n',
    'DeclaraciÃ³n de AdjudicaciÃ³n',
    'DisoluciÃ³n',
    'DomiciliaciÃ³n de Expediente',
    'LiberaciÃ³n de Prenda Mercantil',
    'LiquidaciÃ³n',
    'ModificaciÃ³n al Documento Constitutivo',
    'ParticiÃ³n de Bienes de la Comunidad Conyugal',
    'Prendas Mercantiles',
    'PrÃ³rroga de DuraciÃ³n',
    'ReducciÃ³n de Capital',
    'Solicitud de Agregado',
    'TransacciÃ³n Judicial',
    'TransformaciÃ³n de Naturaleza JurÃ­dica',
    'Venta de Acciones'
  ],
  'Sociedades de Responsabilidad Limitada (S.R.L.)': [
    'Acta de Asamblea de Junta Directiva',
    'Acta de Asamblea de Socios o Accionistas',
    'Acta de Remate',
    'Aumento de Capital',
    'AutorizaciÃ³n Judicial',
    'Cambio de Denominación',
    'Cambio de Domicilio',
    'ConstituciÃ³n',
    'ConstituciÃ³n de Fondo de Comercio',
    'ConstituciÃ³n de Sucursal',
    'Contrato de Cuentas de ParticipaciÃ³n',
    'Contratos de AdhesiÃ³n',
    'DeclaraciÃ³n de AdjudicaciÃ³n',
    'DisoluciÃ³n',
    'DomiciliaciÃ³n de Expediente',
    'LiberaciÃ³n de Prenda Mercantil',
    'LiquidaciÃ³n',
    'ModificaciÃ³n al Documento Constitutivo',
    'ParticiÃ³n de Bienes de la Comunidad Conyugal',
    'Prendas Mercantiles',
    'PrÃ³rroga de DuraciÃ³n',
    'ReducciÃ³n de Capital',
    'Solicitud de Agregado',
    'TransacciÃ³n Judicial',
    'TransformaciÃ³n de Naturaleza JurÃ­dica',
    'Venta de Acciones'
  ]
}

type Step = 1 | 2 | 3

export default function Documento() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [req, setReq] = useState<LegalRequest | undefined>()
  const [meta, setMeta] = useState<any>({})
  const [files, setFiles] = useState<LegalFile[]>([])
  const [settings, setSettings] = useState<any>({})
  const [bcv, setBcv] = useState<number>(0)
  const [accept, setAccept] = useState(false)
  const [pay, setPay] = useState({ name: '', document: '', phone: '', email: '', address: '', type: 'pago_movil', bank: '', ref: '', date: new Date().toISOString().slice(0, 10), amount_bs: '' as any, mobile_phone: '' })
  const [loading, setLoading] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [pdfAnalysis, setPdfAnalysis] = useState<{ folios: number; price_usd: number; price_bs: number; subtotal_bs: number; iva_bs: number; total_bs: number } | null>(null)
  const imgUrl = settings.instructions_documents_image_url as string | undefined
  const [showImg, setShowImg] = useState(false)
  const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' | 'warning' }>({ isOpen: false, title: '', message: '', variant: 'info' })

  useEffect(() => { getSettings().then(r => setSettings(r.settings || {})); getBcvRate().then(r => setBcv(r.rate)).catch(() => { }) }, [])
  useEffect(() => { (async () => { try { const r = await me(); const u = (r as any).user || {}; setPay(p => ({ ...p, document: p.document || u.document || '', name: p.name || u.name || '', phone: p.phone || u.phone || '', email: p.email || u.email || '' })); } catch { } })(); }, [])

  // Debug: rastrear cambios de step
  // useEffect(()=>{
  //   console.log('🔄 Step cambió a:', step)
  // }, [step])

  const ensureDraft = async () => {
    if (req) return req
    // Crear el borrador con el mínimo de campos para evitar fallos por metadatos
    const r = await createLegal({ status: 'Borrador', pub_type: 'Documento', name: '', document: '', date: new Date().toISOString().slice(0, 10) })
    const created: any = { id: (r as any).id, status: 'Borrador', pub_type: 'Documento', date: new Date().toISOString().slice(0, 10) }
    setReq(created)
    return created
  }

  const uploadPdfAnalysis = async (e: any) => {
    const input = e.target
    if (!input.files || input.files.length === 0) return
    const file = input.files[0]
    if (file.type !== 'application/pdf') {
      setAlertDialog({ isOpen: true, title: 'Error', message: 'Solo se permiten archivos PDF', variant: 'error' })
      input.value = ''
      return
    }

    // Validar tamaño del archivo (máximo 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      setAlertDialog({ isOpen: true, title: 'Error', message: 'El archivo es demasiado grande. Tamaño máximo: 50MB', variant: 'error' })
      input.value = ''
      return
    }

    setUploadingPdf(true)
    console.log('Analizando PDF del lado del cliente...', { name: file.name, size: file.size })

    try {
      // Paso 1: Analizar PDF localmente para contar páginas
      const folios = await countPdfPagesClient(file)
      console.log('Folios detectados (cliente):', folios)

      // Paso 2: Calcular precio localmente
      const pricePerFolio = Number(settings.price_per_folio_usd || 1.5)
      const bcvRate = bcv || Number(settings.bcv_rate || 36)
      const ivaPercent = Number(settings.iva_percent || 16)

      const priceUsd = folios * pricePerFolio
      const unitBs = pricePerFolio * bcvRate
      const subtotalBs = folios * unitBs
      const totalBs = subtotalBs * (1 + ivaPercent / 100)
      const ivaBs = subtotalBs * (ivaPercent / 100)

      // Paso 3: Subir al servidor
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/legal/upload-pdf', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error('Error del servidor al subir PDF:', errorText)
        setAlertDialog({ isOpen: true, title: 'Error', message: `Error al subir el PDF (${res.status}): Por favor intente nuevamente o contacte al administrador.`, variant: 'error' })
        setUploadingPdf(false)
        input.value = ''
        return
      }

      const data = await res.json()
      if (data.error) {
        setAlertDialog({ isOpen: true, title: 'Error', message: 'Error al subir el PDF: ' + data.error, variant: 'error' })
        setUploadingPdf(false)
        input.value = ''
        return
      }

      console.log('Respuesta del servidor:', data)

      // Usar el conteo del servidor si está disponible, sino usar el del cliente
      const serverFolios = data.folios || folios
      const serverPricing = data.pricing || {}

      // Paso 4: Guardar análisis en el estado
      setPdfAnalysis({
        folios: serverFolios,
        price_usd: serverFolios * pricePerFolio,
        price_bs: serverPricing.total_bs || totalBs,
        subtotal_bs: serverPricing.subtotal_bs || subtotalBs,
        iva_bs: serverPricing.iva_bs || ivaBs,
        total_bs: serverPricing.total_bs || totalBs
      })

      // Actualizar la solicitud con el ID del servidor y folios
      if (req && req.id) {
        await updateLegal(req.id, { folios: serverFolios })
        setReq({ ...req, folios: serverFolios })
      } else {
        setReq({ id: data.id, status: 'Borrador', pub_type: 'Documento', folios: serverFolios } as any)
      }

      setMeta({ ...meta, folios: serverFolios })
      setAlertDialog({ isOpen: true, title: 'Éxito', message: `✓ Documento analizado: ${serverFolios} folio${serverFolios !== 1 ? 's' : ''} detectado${serverFolios !== 1 ? 's' : ''}`, variant: 'success' })
      input.value = '' // Limpiar input
    } catch (err) {
      console.error('Error al analizar PDF:', err)
      setAlertDialog({ isOpen: true, title: 'Error', message: 'Error al procesar el PDF. Por favor intente nuevamente.', variant: 'error' })
      input.value = ''
    } finally {
      setUploadingPdf(false)
    }
  }

  // Función para contar páginas del PDF en el cliente
  const countPdfPagesClient = async (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer
          const data = new Uint8Array(arrayBuffer)
          const text = new TextDecoder('latin1').decode(data)

          // Estrategia 1: Buscar /Type /Page
          let pages = text.match(/\/Type[\s]*\/Page[^s]/g)
          if (pages && pages.length > 0) {
            console.log('Método 1 (Type/Page):', pages.length)
            resolve(pages.length)
            return
          }

          // Estrategia 2: Buscar /Count en el objeto Pages
          const countMatch = text.match(/\/Pages[\s\S]*?\/Count\s+(\d+)/)
          if (countMatch && countMatch[1]) {
            const count = parseInt(countMatch[1])
            console.log('Método 2 (Count):', count)
            resolve(count)
            return
          }

          // Estrategia 3: Contar delimitadores de página
          pages = text.match(/\/Page\s*<</g)
          if (pages && pages.length > 0) {
            console.log('Método 3 (Page delimiters):', pages.length)
            resolve(pages.length)
            return
          }

          // Si no se detecta ninguna página, asumir 1
          console.warn('No se pudo detectar páginas, asumiendo 1')
          resolve(1)
        } catch (error) {
          console.error('Error al parsear PDF:', error)
          reject(error)
        }
      }

      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'))
      }

      reader.readAsArrayBuffer(file)
    })
  }

  const saveStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // console.log('🚀 saveStep1 ejecutado', { meta, step })

    // Validar solo los campos más críticos
    if (!meta.razon_social || !meta.razon_social.trim()) {
      setAlertDialog({ isOpen: true, title: 'Campo requerido', message: 'Por favor ingrese la razón social', variant: 'warning' })
      return
    }

    if (!meta.tipo_sociedad) {
      setAlertDialog({ isOpen: true, title: 'Campo requerido', message: 'Por favor seleccione el tipo de sociedad', variant: 'warning' })
      return
    }

    if (!meta.tipo_acto) {
      setAlertDialog({ isOpen: true, title: 'Campo requerido', message: 'Por favor seleccione el tipo de trámite', variant: 'warning' })
      return
    }

    // console.log('✓ Validaciones pasadas, guardando...')
    setLoading(true)
    try {
      // Si ya existe una solicitud (creada en uploadPdf), solo actualizamos
      if (req && req.id) {
        // console.log('📝 Actualizando solicitud existente:', req.id)
        await updateLegal(req.id, {
          meta,
          name: meta.razon_social || '',
          document: meta.rif || '',
          date: meta.fecha || req.date
        })
        // console.log('✓ Solicitud actualizada, cambiando a paso 2')
      } else {
        // Si no existe, crear una nueva (modo borrador manual)
        // console.log('📄 Creando nueva solicitud')
        const r = await ensureDraft()
        // console.log('✓ Solicitud creada:', r)
        await updateLegal(r.id, {
          meta,
          name: meta.razon_social || '',
          document: meta.rif || '',
          date: meta.fecha || r.date
        })
        setReq(r) // Asegurar que req esté actualizado
        // console.log('✓ Solicitud actualizada')
      }

      // Cambiar al paso 2 DESPUÉS de todas las operaciones
      setLoading(false)
      setStep(2)

      // Scroll suave al paso 2
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
    } catch (err) {
      setLoading(false)
      // console.error('❌ Error en saveStep1:', err)
      let msg = 'Error al guardar. Por favor intente nuevamente.'
      try {
        const em = (err as any)?.message || ''
        if (em) {
          // Si el backend devolvió JSON, intenta extraer el campo error
          if (em.trim().startsWith('{')) {
            const parsed = JSON.parse(em)
            if (parsed?.error) msg = `Error al guardar: ${parsed.error}`
          } else {
            msg = `Error al guardar: ${em}`
          }
        }
      } catch { }
      setAlertDialog({ isOpen: true, title: 'Error', message: msg, variant: 'error' })
    }
  }

  const uploadStep2 = async (e: any) => {
    const input = e.target; if (!input.files || !req) return
    const arr = Array.from(input.files) as File[]
    const up = await uploadFiles(arr)
    const fileIds = (up.items || up).map((it: any) => it.id)
    for (const fid of fileIds) { await attachLegalFile(req.id, fid, 'document_folio') }
    const lf = await listLegalFiles(req.id); setFiles(lf.items)
  }

  const totals = useMemo(() => {
    const folios = Number(req?.folios || meta.folios || 1)
    const unitBs = Number(settings.price_per_folio_usd || 0) * (bcv || Number(settings.bcv_rate || 0))
    const sub = +(unitBs * folios).toFixed(2)
    const iva = +(sub * ((Number(settings.iva_percent || 16)) / 100)).toFixed(2)
    const total = +(sub + iva).toFixed(2)
    return { folios, unitBs, sub, iva, total }
  }, [req, meta, settings, bcv])

  const submitStep3 = async () => {
    if (!req || !pdfAnalysis) return
    setLoading(true)
    try {
      await updateLegal(req.id, {
        name: pay.name,
        document: pay.document,
        phone: pay.phone,
        email: pay.email,
        address: pay.address,
        folios: pdfAnalysis.folios,
        status: 'Por verificar'
      })
      await addLegalPayment(req.id, {
        type: pay.type === 'pago_movil' ? 'Pago móvil' : 'Transferencia',
        bank: pay.bank,
        ref: pay.ref,
        date: pay.date,
        amount_bs: Number(pdfAnalysis.total_bs),
        status: 'Por verificar',
        mobile_phone: pay.type === 'pago_movil' ? pay.mobile_phone : undefined
      })
      setLoading(false)
      setAlertDialog({ isOpen: true, title: 'Éxito', message: '¡Solicitud enviada exitosamente! Su documento será verificado y publicado en la próxima edición.', variant: 'success' })
      // Redirigir a Mis Publicaciones
      navigate('/solicitante/historial')
    } catch (err) {
      setLoading(false)
      let msg = 'Error al enviar la solicitud. Por favor intente nuevamente.'
      if (err instanceof Error) {
        const raw = err.message.trim()
        // Intentar parsear JSON retornado por backend
        if (raw.startsWith('{')) {
          try {
            const parsed = JSON.parse(raw)
            if (parsed.error) msg = 'Error: ' + parsed.error
          } catch { }
        } else if (/unauthorized/i.test(raw)) {
          msg = 'Sesión expirada. Inicie sesión nuevamente.'
        } else {
          msg = raw.slice(0, 180)
        }
      }
      setAlertDialog({ isOpen: true, title: 'Error', message: msg, variant: 'error' })
      console.error('submitStep3 error:', err)
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Solicitud de publicación de documento</h1>
      <div className="text-sm text-slate-700">¡Completa estos tres pasos y obtén la publicación de tu documento en la próxima edición!</div>

      {/* Paso 1 - Modernizado */}
      <div className="card p-6 space-y-4 shadow-md step-anim">
        <div className="flex items-center gap-3 pb-3 border-b">
          <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg">1</div>
          <div>
            <h2 className="font-bold text-lg">Datos del Documento</h2>
            <p className="text-sm text-slate-600">Complete los datos según el documento protocolizado</p>
          </div>
        </div>
        {imgUrl && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            💡 ¿Tienes dudas sobre dónde están los datos? <button type="button" className="font-semibold underline hover:no-underline" onClick={() => setShowImg(true)}>Ver imagen de ayuda</button>
          </div>
        )}
        <form onSubmit={saveStep1} className="grid md:grid-cols-2 gap-4">
          <div className="relative">
            <select className="input w-full" value={meta.tipo_sociedad || ''} onChange={e => setMeta({ ...meta, tipo_sociedad: e.target.value })}>
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
            <select className="input w-full" value={meta.tipo_acto || ''} onChange={e => setMeta({ ...meta, tipo_acto: e.target.value })} disabled={!meta.tipo_sociedad}>
              <option value="">Seleccione tipo de trámite</option>
              {meta.tipo_sociedad && TRAMITES_POR_TIPO[meta.tipo_sociedad]?.map((t: string) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <div className="flex absolute inset-y-0 right-0 items-center pr-3 pointer-events-none">
              <svg className="w-4 h-4 fill-brand-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                <path d="M207.029 381.476L12.686 187.132c-9.373-9.373-9.373-24.569 0-33.941l22.667-22.667c9.357-9.357 24.522-9.375 33.901-.04L224 284.505l154.745-154.021c9.379-9.335 24.544-9.317 33.901.04l22.667 22.667c9.373 9.373 9.373 24.569 0 33.941L240.971 381.476c-9.373 9.372-24.569 9.372-33.942 0z"></path>
              </svg>
            </div>
          </div>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700 mb-1 block">Razón o denominación social *</span>
            <input className="input w-full" placeholder="Razón social" value={meta.razon_social || ''} onChange={e => setMeta({ ...meta, razon_social: e.target.value })} required />
          </label>
          <div className="relative">
            <select className="input w-full" value={meta.estado || ''} onChange={e => setMeta({ ...meta, estado: e.target.value, oficina: '' })}>
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
            <select className="input w-full" value={meta.oficina || ''} onChange={e => setMeta({ ...meta, oficina: e.target.value })} disabled={!meta.estado}>
              <option value="">Seleccione registro mercantil</option>
              {meta.estado && REGISTROS_POR_ESTADO[meta.estado]?.map((reg: string) => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>
            <div className="flex absolute inset-y-0 right-0 items-center pr-3 pointer-events-none">
              <svg className="w-4 h-4 fill-brand-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                <path d="M207.029 381.476L12.686 187.132c-9.373-9.373-9.373-24.569 0-33.941l22.667-22.667c9.357-9.357 24.522-9.375 33.901-.04L224 284.505l154.745-154.021c9.379-9.335 24.544-9.317 33.901.04l22.667 22.667c9.373 9.373 9.373 24.569 0 33.941L240.971 381.476c-9.373 9.372-24.569 9.372-33.942 0z"></path>
              </svg>
            </div>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-1 block">Nombre del registrador(a) mercantil</span>
            <input className="input w-full" placeholder="Nombre del registrador" value={meta.registrador || ''} onChange={e => setMeta({ ...meta, registrador: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-1 block">Tipo de registrador(a) mercantil</span>
            <input className="input w-full" placeholder="Principal, Auxiliar, etc." value={meta.tipo_registrador || ''} onChange={e => setMeta({ ...meta, tipo_registrador: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-1 block">Tomo / Letra</span>
            <input className="input w-full" placeholder="Ej: A, B, 1, 2" value={meta.tomo || ''} onChange={e => setMeta({ ...meta, tomo: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-1 block">Número</span>
            <input className="input w-full" placeholder="Número" value={meta.numero || ''} onChange={e => setMeta({ ...meta, numero: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-1 block">Año</span>
            <input className="input w-full" placeholder="2024" value={meta.anio || ''} onChange={e => setMeta({ ...meta, anio: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-1 block">Número de expediente</span>
            <input className="input w-full" placeholder="Número de expediente" value={meta.expediente || ''} onChange={e => setMeta({ ...meta, expediente: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-1 block">Fecha</span>
            <input className="input w-full" type="date" value={meta.fecha || ''} onChange={e => setMeta({ ...meta, fecha: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-1 block">Número de planilla</span>
            <input className="input w-full" placeholder="Número de planilla" value={meta.planilla || ''} onChange={e => setMeta({ ...meta, planilla: e.target.value })} />
          </label>
          <div className="md:col-span-2 flex gap-3 pt-4">
            <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  Continuar al Paso 2
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Paso 2 - Carga de PDF con análisis */}
      <div className="card p-6 space-y-4 shadow-md step-anim">
        <div className="flex items-center gap-3 pb-3 border-b">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${step >= 2 ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-500'
            }`}>2</div>
          <div>
            <h2 className="font-bold text-lg">Cargar Documento PDF</h2>
            <p className="text-sm text-slate-600">Suba el documento completo en formato PDF</p>
          </div>
        </div>

        {step < 2 ? (
          <div className="text-center py-8 text-slate-400 step-anim">
            <svg className="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p>Complete el Paso 1 para continuar</p>
          </div>
        ) : !pdfAnalysis ? (
          <div className="space-y-4 step-anim">
            <div className="bg-gradient-to-r from-blue-50 to-brand-50 border border-brand-200 rounded-lg p-5">
              <div className="flex items-start gap-3">
                <div className="bg-brand-100 rounded-full p-2 mt-1">
                  <svg className="w-6 h-6 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-brand-900 mb-2">📄 Información importante</h3>
                  <ul className="text-sm text-brand-800 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-brand-600 mt-0.5">✓</span>
                      <span><strong>Formato aceptado:</strong> Solo archivos PDF (tamaño máximo 50MB)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-brand-600 mt-0.5">✓</span>
                      <span><strong>Análisis automático:</strong> El sistema contará las páginas del documento</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-brand-600 mt-0.5">✓</span>
                      <span><strong>Precio:</strong> ${settings.price_per_folio_usd || '1.50'} USD por folio + IVA ({settings.iva_percent || '16'}%)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-brand-600 mt-0.5">✓</span>
                      <span><strong>Tasa BCV:</strong> Bs. {bcv?.toFixed(2) || '36.00'} por USD</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-brand-300 rounded-xl p-10 hover:border-brand-500 hover:bg-brand-50/50 transition-all duration-200 text-center bg-gradient-to-b from-white to-brand-50/30">
                <svg className="w-16 h-16 mx-auto mb-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-xl font-semibold text-brand-900 mb-2">Cargar documento PDF</p>
                <p className="text-sm text-slate-600 mb-3">Haga clic aquí o arrastre el archivo</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="font-medium">Seleccionar archivo</span>
                </div>
                <input type="file" accept="application/pdf" onChange={uploadPdfAnalysis} className="hidden" disabled={uploadingPdf} />
              </div>
            </label>

            {uploadingPdf && (
              <div className="bg-white border border-brand-200 rounded-lg p-6 step-anim">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-200 border-t-brand-600"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-brand-900 mb-1">Procesando documento...</p>
                    <p className="text-sm text-slate-600">Analizando páginas y calculando precio</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5 step-anim">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 rounded-full p-2">
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-green-900 text-lg">¡Documento analizado exitosamente!</h3>
                  <p className="text-sm text-green-700">El sistema ha contado las páginas y calculado el precio</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-medium text-slate-600">Folios detectados</p>
                  </div>
                  <p className="text-3xl font-bold text-brand-700">{pdfAnalysis.folios}</p>
                  <p className="text-xs text-slate-500 mt-1">página{pdfAnalysis.folios !== 1 ? 's' : ''}</p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-slate-600">Precio USD</p>
                  </div>
                  <p className="text-3xl font-bold text-green-700">${pdfAnalysis.price_usd.toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-1">${(pdfAnalysis.price_usd / pdfAnalysis.folios).toFixed(2)} × {pdfAnalysis.folios}</p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm font-medium text-slate-600">Subtotal + IVA</p>
                  </div>
                  <p className="text-2xl font-bold text-amber-700">Bs. {pdfAnalysis.subtotal_bs.toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-1">+ Bs. {pdfAnalysis.iva_bs.toFixed(2)} IVA</p>
                </div>

                <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl p-4 shadow-md text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-sm font-semibold opacity-90">Total a Pagar</p>
                  </div>
                  <p className="text-3xl font-bold">Bs. {pdfAnalysis.total_bs.toFixed(2)}</p>
                  <p className="text-xs opacity-80 mt-1">≈ ${pdfAnalysis.price_usd.toFixed(2)} USD</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setPdfAnalysis(null); setMeta({ ...meta, folios: undefined }) }}
                className="btn bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                ← Cambiar documento
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn btn-primary flex-1 py-3 text-lg font-semibold"
              >
                Continuar al pago
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Paso 3 */}
      <div className={`card shadow-md transition-all step-anim ${step < 3 ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <div className="bg-gradient-to-r from-brand-50 to-brand-100 p-6 rounded-t-2xl border-b border-brand-200">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${step >= 3 ? 'bg-brand-600' : 'bg-gray-400'}`}>3</div>
            <div>
              <h2 className="text-xl font-bold text-brand-900">Datos de Pago</h2>
              <p className="text-sm text-brand-700">Complete su información y reporte el pago realizado</p>
            </div>
          </div>
        </div>

        {step < 3 ? (
          <div className="p-12 text-center text-gray-500 step-anim">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="font-medium">Complete el paso anterior para continuar</p>
          </div>
        ) : (
          <div className="p-6 space-y-6 step-anim">
            {/* Resumen de Precios */}
            {pdfAnalysis && (
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-brand-900">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Resumen de la Orden
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-300">
                    <span className="text-sm text-slate-600">Servicio de publicaciÃ³n - {meta.razon_social || 'Documento'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Folios:</span>
                    <span className="font-semibold">{pdfAnalysis.folios}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Precio por folio:</span>
                    <span className="font-semibold">Bs. {pdfAnalysis.price_bs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-300 pt-2">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-semibold">Bs. {pdfAnalysis.subtotal_bs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">IVA ({settings.iva_percent || 16}%):</span>
                    <span className="font-semibold">Bs. {pdfAnalysis.iva_bs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center border-t-2 border-brand-600 pt-3">
                    <span className="text-lg font-bold text-brand-900">TOTAL A PAGAR:</span>
                    <span className="text-2xl font-bold text-brand-600">Bs. {pdfAnalysis.total_bs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mt-4">
                    <strong>Importante:</strong> El pago debe realizarse por el monto exacto indicado, sin redondeos.
                  </div>
                </div>
              </div>
            )}

            {/* Datos Personales */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-brand-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Datos del Solicitante
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 mb-1 block">Nombre completo *</span>
                  <input className="input w-full" placeholder="Nombre completo" value={pay.name} onChange={e => setPay({ ...pay, name: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 mb-1 block">C.I. / RIF *</span>
                  <input className="input w-full" placeholder="V-12345678 o J-12345678-9" value={pay.document} onChange={e => setPay({ ...pay, document: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 mb-1 block">TelÃ©fono *</span>
                  <input className="input w-full" placeholder="0412-1234567" value={pay.phone} onChange={e => setPay({ ...pay, phone: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 mb-1 block">Correo electrÃ³nico *</span>
                  <input className="input w-full" type="email" placeholder="correo@ejemplo.com" value={pay.email} onChange={e => setPay({ ...pay, email: e.target.value })} />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-slate-700 mb-1 block">DirecciÃ³n</span>
                  <input className="input w-full" placeholder="DirecciÃ³n completa" value={pay.address} onChange={e => setPay({ ...pay, address: e.target.value })} />
                </label>
              </div>
            </div>

            {/* Datos del Pago */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-brand-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                InformaciÃ³n del Pago Realizado
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 mb-1 block">Tipo de operaciÃ³n *</span>
                  <select className="input w-full" value={pay.type} onChange={e => setPay({ ...pay, type: e.target.value })}>
                    <option value="pago_movil">Pago MÃ³vil</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 mb-1 block">Banco emisor *</span>
                  <input className="input w-full" placeholder="Nombre del banco" value={pay.bank} onChange={e => setPay({ ...pay, bank: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 mb-1 block">NÂ° de Referencia *</span>
                  <input className="input w-full" placeholder="123456789" value={pay.ref} onChange={e => setPay({ ...pay, ref: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 mb-1 block">Fecha del pago *</span>
                  <input className="input w-full" type="date" value={pay.date} onChange={e => setPay({ ...pay, date: e.target.value })} />
                </label>
                {pay.type === 'pago_movil' && (
                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-slate-700 mb-1 block">TelÃ©fono desde donde realizÃ³ el pago mÃ³vil *</span>
                    <input className="input w-full" placeholder="0424-1234567" value={pay.mobile_phone} onChange={e => setPay({ ...pay, mobile_phone: e.target.value })} />
                  </label>
                )}
              </div>
            </div>

            {/* TÃ©rminos y condiciones */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 w-5 h-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500" checked={accept} onChange={e => setAccept(e.target.checked)} />
                <span className="text-sm text-slate-700">
                  Al hacer clic en <strong>"REPORTAR Y PUBLICAR"</strong>, confirmo que he realizado el pago por el monto exacto indicado y acepto los <span className="text-brand-600 font-medium">TÃ©rminos y Condiciones</span> del Diario Mercantil de Venezuela.
                </span>
              </label>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                className="btn btn-primary flex-1 h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!accept || loading || !pay.name || !pay.document || !pay.phone || !pay.email || !pay.bank || !pay.ref}
                onClick={submitStep3}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enviando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    REPORTAR Y PUBLICAR
                  </>
                )}
              </button>
              {req && (
                <button
                  className="btn bg-slate-100 hover:bg-slate-200 text-slate-700 h-12"
                  onClick={async () => {
                    const b = await downloadLegal(req.id);
                    const url = URL.createObjectURL(b);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `orden-servicio-${req.id}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url)
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descargar Orden
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showImg && imgUrl && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setShowImg(false)}>
          <img src={imgUrl} className="max-h-[90vh] max-w-[90vw] rounded shadow-lg" />
        </div>
      )}

      <AlertDialog {...alertDialog} onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })} />
    </section>
  )
}
