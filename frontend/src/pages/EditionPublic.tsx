import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { IconSearch, IconCalendar, IconBuilding, IconChevronRight } from '@tabler/icons-react'
import { listPublicEditions, type Edition as ApiEdition } from '../lib/api'
import { SEO } from '../components/SEO'

type Edition = ApiEdition & { seo?: { title?: string, description?: string, og_image?: string } }
type Order = { id: number; name: string; document: string; status: string; date: string }

export default function EditionPublic() {
  const { code, fullCode } = useParams()
  const activeCode = code || (fullCode?.startsWith('e-') ? fullCode.slice(2) : fullCode)
  const [edition, setEdition] = useState<Edition | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [err, setErr] = useState('')
  const [recentEditions, setRecentEditions] = useState<Edition[]>([])

  const navigate = useNavigate()
  const [searchCve, setSearchCve] = useState('')
  const [searchDate, setSearchDate] = useState('')
  const [searchRazon, setSearchRazon] = useState('')

  useEffect(() => {
    if (!activeCode) return
    fetch(`/api/dm/e-${encodeURIComponent(activeCode)}`)
      .then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json() })
      .then(d => { setEdition(d.edition); setOrders(d.orders || []) })
      .catch(e => setErr(typeof e === 'string' ? e : (e?.message || 'Error')))
  }, [activeCode])

  useEffect(() => {
    // Cargar ediciones recientes para los widgets de abajo
    listPublicEditions().then(res => {
      setRecentEditions(res.items.filter(e => e.code !== activeCode && e.status === 'Publicada').slice(0, 4))
    }).catch(console.error)
  }, [activeCode])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    const queryParts = []
    if (searchCve) queryParts.push(searchCve)
    if (searchRazon) queryParts.push(searchRazon)

    if (queryParts.length > 0) params.set('q', queryParts.join(' '))
    if (searchDate) {
      params.set('from', searchDate)
      params.set('to', searchDate)
    }
    navigate(`/ediciones?${params.toString()}`)
  }

  const pdfUrl = useMemo(() => edition ? (edition.file_url || `/api/e/code/${encodeURIComponent(edition.code)}/download`) : '', [edition])

  if (err) return <div className="max-w-4xl mx-auto p-6"><div className="card p-6">{err}</div></div>
  if (!edition) return <div className="max-w-4xl mx-auto p-6"><div className="card p-6">Cargando...</div></div>

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SEO
        title={edition.seo?.title || `Edición N° ${edition.edition_no} | Diario Mercantil Venezuela`}
        description={edition.seo?.description || `Consulte el archivo digital de la edición ${edition.edition_no} de fecha ${edition.date} del Diario Mercantil Venezuela.`}
        ogImage={edition.seo?.og_image}
      />
      {/* 1. Barra de Búsqueda Superior */}
      <div className="bg-white border-b border-slate-200 shadow-sm z-10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 items-end">
            <div className="flex-1 w-full relative">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Código (CVE)</label>
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ej. dm120..."
                  className="input w-full !pl-10 bg-slate-50 focus:bg-white"
                  value={searchCve}
                  onChange={e => setSearchCve(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 w-full relative">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Fecha</label>
              <div className="relative">
                <IconCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  className="input w-full !pl-10 bg-slate-50 focus:bg-white"
                  value={searchDate}
                  onChange={e => setSearchDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 w-full relative">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Razón Social</label>
              <div className="relative">
                <IconBuilding className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Nombre de la empresa"
                  className="input w-full !pl-10 bg-slate-50 focus:bg-white"
                  value={searchRazon}
                  onChange={e => setSearchRazon(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary whitespace-nowrap md:w-auto w-full h-[42px]">
              Buscar Ediciones
            </button>
          </form>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">

        {/* Encabezado e Info */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:px-6 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              Edición {edition.code}
              {edition.status === 'Publicada' ?
                <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-medium">Publicada</span> :
                <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-medium">{edition.status}</span>
              }
            </h1>
            <div className="text-sm text-slate-500 mt-1 flex gap-4">
              <span>📅 Fecha: {edition.date}</span>
              <span>📰 Número: {edition.edition_no}</span>
            </div>
          </div>
          <div>
            <a className="btn btn-outline text-brand-700 border-brand-200 hover:bg-brand-50" href={`${pdfUrl}?download=1`} target="_blank" rel="noreferrer">
              Descargar PDF
            </a>
          </div>
        </div>

        {/* 2. Revista PDF Central */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 sm:p-4 overflow-hidden h-[800px]">
          {edition.file_id ? (
            <iframe src={`${pdfUrl}#view=FitH`} className="w-full h-full border-0 rounded" title={`Edición ${edition.edition_no}`} />
          ) : (
            <div className="p-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200 h-full flex flex-col items-center justify-center">
              <IconSearch className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              Esta edición aún no tiene un archivo PDF disponible para visualizar.
            </div>
          )}
        </div>

        {/* 3. Ediciones Anteriores Widgets */}
        {recentEditions.length > 0 && (
          <div className="pt-8 pb-4">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center justify-between">
              Últimas Ediciones Publicadas
              <Link to="/ediciones" className="text-sm font-medium text-brand-600 hover:text-brand-800 flex items-center hover:underline">
                Ver todas <IconChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentEditions.map(ed => (
                <Link key={ed.id} to={`/edicion/${ed.code}`} className="group card flex flex-col hover:border-brand-300 transition-all hover:shadow-md bg-white p-4 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-slate-400">{ed.code}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{ed.date}</span>
                  </div>
                  <div className="font-bold text-lg text-slate-800 group-hover:text-brand-700 transition-colors mt-2">
                    Edición N° {ed.edition_no}
                  </div>
                  <div className="mt-4 text-sm font-semibold text-brand-600 group-hover:text-brand-800 flex items-center">
                    Ver Edición <IconChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
