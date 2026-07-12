import type { LegalRequest } from '../lib/api'
import type React from 'react'

type Props = {
  item: LegalRequest;
  meta: any;
}

export default function LegalRequestDetails({ item, meta }: Props) {
  const isPublicada = item.status === 'Publicada'
  
  const fechaSolicitud = (() => {
    const raw = (item as any).submitted_at || (item as any).created_at || item.date
    if (!raw) return '-'
    return raw.slice(0, 10).split('-').reverse().join('/')
  })()

  return (
    <>
      <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 text-brand-800">Información de la Orden</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">N° de Orden</label>
              <div className="font-mono font-semibold text-brand-700">{item.order_no || String(item.id).padStart(8, '0')}</div>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Estado</label>
              <span className={`pill ${item.status === 'Publicada' ? 'bg-green-100 text-green-700' :
                item.status === 'En trámite' ? 'bg-blue-100 text-blue-700' :
                  item.status === 'Por verificar' ? 'bg-yellow-100 text-yellow-700' :
                    item.status === 'Rechazado' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                }`}>
                {item.status}
              </span>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Fecha de Solicitud</label>
              <div className="font-medium">{fechaSolicitud}</div>
            </div>
            {isPublicada && item.publish_date && (
              <div>
                <label className="block text-sm text-slate-600 mb-1">Fecha de Publicación</label>
                <div className="font-medium">{item.publish_date}</div>
              </div>
            )}
            <div>
              <label className="block text-sm text-slate-600 mb-1">Tipo de Publicación</label>
              <div className="font-medium">{item.pub_type || 'Documento'}</div>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">N° de Folios</label>
              <div className="font-medium">{item.folios || 1}</div>
            </div>
          </div>
        </div>

        {Object.keys(meta).length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4 text-brand-800">Datos Registrales del Documento</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {meta.tipo_sociedad && (
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Tipo de Sociedad</label>
                  <div className="font-medium">{meta.tipo_sociedad}</div>
                </div>
              )}
              {meta.tipo_acto && (
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Tipo de Acto Inscrito</label>
                  <div className="font-medium">{meta.tipo_acto}</div>
                </div>
              )}
              {meta.tipo_convocatoria && (
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Tipo de Convocatoria</label>
                  <div className="font-medium">{meta.tipo_convocatoria}</div>
                </div>
              )}
              {(meta.razon_denominacion_social || meta.razon_social) && (
                <div className="sm:col-span-2">
                  <label className="block text-sm text-slate-600 mb-1">Razón / Denominación Social</label>
                  <div className="font-medium">{meta.razon_denominacion_social || meta.razon_social}</div>
                </div>
              )}
              {meta.estado && (
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Estado</label>
                  <div className="font-medium">{meta.estado}</div>
                </div>
              )}
              {meta.oficina && (
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Oficina de Registro Mercantil</label>
                  <div className="font-medium">{meta.oficina}</div>
                </div>
              )}
              {meta.registrador && (
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Registrador Mercantil</label>
                  <div className="font-medium">{meta.registrador}</div>
                </div>
              )}
              {meta.tomo && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Tomo</label>
                    <div className="font-medium">{meta.tomo}</div>
                  </div>
                  {meta.numero && (
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Número</label>
                      <div className="font-medium">{meta.numero}</div>
                    </div>
                  )}
                </div>
              )}
              {meta.anio && (
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Año</label>
                  <div className="font-medium">{meta.anio}</div>
                </div>
              )}
              {meta.fecha_registro && (
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Fecha de Registro</label>
                  <div className="font-medium">{meta.fecha_registro}</div>
                </div>
              )}
              {meta.expediente && (
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Número de Expediente</label>
                  <div className="font-medium">{meta.expediente}</div>
                </div>
              )}
              {meta.planilla && (
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Número de Planilla (PUB)</label>
                  <div className="font-medium">{meta.planilla}</div>
                </div>
              )}
              {(meta.representante || meta.ci_representante || meta.ci_rep) && (
                <div className="sm:col-span-2 pt-4 border-t mt-2">
                  <label className="block text-sm text-slate-600 mb-1">Representante Legal</label>
                  <div className="font-medium">
                    {meta.representante} {meta.ci_representante ? `(C.I. ${meta.ci_representante})` : meta.ci_rep ? `(C.I. ${meta.ci_rep})` : ''}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
    </>
  )
}
