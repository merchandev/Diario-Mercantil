export default function PublicationStatus({ status }: { status?: string }) {
  const label = status === 'Pendiente' ? 'Borrador' : status === 'Publicado' ? 'Publicada' : status || 'Sin estado'
  const colors: Record<string, string> = {
    Borrador: 'bg-slate-100 text-slate-700', 'Por verificar': 'bg-amber-100 text-amber-800',
    'En trámite': 'bg-blue-100 text-blue-800', Publicada: 'bg-emerald-100 text-emerald-800',
    Rechazada: 'bg-rose-100 text-rose-800', Rechazado: 'bg-rose-100 text-rose-800',
  }
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[label] || colors.Borrador}`}>{label}</span>
}
