import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAuth, type LegalRequest } from '../../lib/api'
import { legalCompany } from '../../lib/legalMeta'
import { useAuth } from '../../hooks/useAuth'
import AdvertisingSlider from '../../components/AdvertisingSlider'
import PublishChoiceModal from '../../components/PublishChoiceModal'

export default function Inicio() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<{ total: number; counts: Record<string, number>; notices: LegalRequest[] }>()
  const [error, setError] = useState('')
  const [choice, setChoice] = useState(false)
  const [dismissed, setDismissed] = useState<number[]>([])
  const key = 'dm-publication-notices-' + user?.id
  useEffect(() => {
    let active = true
    fetchAuth('/api/legal/summary').then(r => r.json()).then(data => { if (active) setSummary(data) }).catch(e => { if (active) setError(e.message) })
    try { setDismissed(JSON.parse(localStorage.getItem(key) || '[]')) } catch { setDismissed([]) }
    return () => { active = false }
  }, [key])
  const close = (id: number) => { const next = [...dismissed, id]; setDismissed(next); localStorage.setItem(key, JSON.stringify(next)) }
  const cards = [
    ['Total de publicaciones', summary?.total],
    ['En trámite', summary?.counts['En trámite'] || 0],
    ['Por verificar', summary?.counts['Por verificar'] || 0],
    ['Publicadas', summary?.counts.Publicada || 0],
  ]
  return <section className="space-y-6">
    <div className="flex flex-wrap justify-between gap-4"><div><h1 className="text-2xl font-bold text-brand-800">Bienvenido(a), {user?.name}</h1><p className="text-slate-600">Consulte el estado de sus solicitudes y sus publicaciones disponibles.</p></div><button className="btn btn-primary" onClick={() => setChoice(true)}>Nueva publicación</button></div>
    <PublishChoiceModal open={choice} onClose={() => setChoice(false)} />
    <AdvertisingSlider />
    {error && <p role="alert" className="text-rose-700">{error}</p>}
    {!summary && !error && <p>Cargando resumen...</p>}
    {summary && <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{cards.map(([title, count]) => <Link key={title} to="/solicitante/historial" className="card p-5"><p className="text-sm text-slate-600">{title}</p><p className="text-3xl font-bold text-brand-800">{count}</p></Link>)}</div>}
    {summary?.notices.filter(n => !dismissed.includes(n.id)).map(n => <div key={n.id} className={'rounded-xl border p-4 ' + (n.status === 'Publicada' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200')}>
      <div className="flex justify-between gap-4"><div><h2 className="font-semibold">{n.status === 'Publicada' ? '¡Publicación realizada!' : 'Solicitud devuelta'}</h2><p>{n.status === 'Publicada' ? 'El documento de la empresa ' + legalCompany(n) + ' ha sido publicado exitosamente.' : n.comment}</p></div><button className="text-sm underline" onClick={() => close(n.id)}>Ocultar</button></div>
      <Link className="text-brand-700 underline mt-2 inline-block" to={'/solicitante/publicaciones/' + n.id}>Ver detalle</Link>
    </div>)}
    <Link to="/solicitante/historial" className="btn btn-outline">Ver mis publicaciones</Link>
  </section>
}
