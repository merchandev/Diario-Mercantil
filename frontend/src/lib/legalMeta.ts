export function normalizeLegalMeta(value: unknown): Record<string, any> {
  let source: any = value || {}
  if (typeof source === 'string') { try { source = JSON.parse(source) } catch { source = {} } }
  if (!source || typeof source !== 'object' || Array.isArray(source)) source = {}
  const meta = { ...source }
  meta.fecha = source.fecha_registro ?? source.fecha ?? ''
  meta.expediente = source.numero_expediente ?? source.expediente ?? ''
  meta.planilla = source.numero_planilla ?? source.planilla ?? ''
  meta.reference_type = source.reference_type || (source.numero_tramite ? 'tramite' : 'pub')
  meta.numero_tramite = source.numero_tramite ?? ''
  meta.anio = source.anio ?? source['año'] ?? ''
  meta.razon_social = source.razon_social ?? source.razon_denominacion_social ?? ''
  for (const key of ['tipo_sociedad', 'tipo_acto', 'estado', 'oficina', 'registrador', 'tipo_registrador', 'letra', 'razon_social']) {
    if (typeof meta[key] === 'string') meta[key] = meta[key].trim().toLocaleUpperCase('es-VE')
  }
  return meta
}
export function legalCompany(value: any): string {
  const meta = normalizeLegalMeta(value.meta)
  return String(meta.razon_social || meta.razon_social_convocatoria || value.name || '').toLocaleUpperCase('es-VE')
}
