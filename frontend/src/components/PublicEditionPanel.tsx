import { Link } from 'react-router-dom'
import FlipbookViewer from './FlipbookViewer'
import type { Edition } from '../lib/api'

export default function PublicEditionPanel({ edition, link = false }: { edition: Edition; link?: boolean }) {
  const pdf = edition.file_url || ''
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:px-6 rounded-xl shadow-sm border border-slate-200">
      <div><h2 className="text-2xl font-bold text-slate-800 flex flex-wrap items-center gap-3">Edición {edition.code}<span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-medium">{edition.status}</span></h2>
      <div className="text-sm text-slate-600 mt-2 flex flex-wrap gap-4"><span>Fecha: {edition.date}</span><span>Número: {edition.code}</span></div></div>
      <div className="flex gap-2 flex-wrap">{link && <Link className="btn btn-outline" to={'/edicion/' + encodeURIComponent(edition.cve || edition.code)}>Ver en línea</Link>}
        {pdf && <a className="btn btn-primary" href={pdf + (pdf.includes('?') ? '&' : '?') + 'download=1'} target="_blank" rel="noreferrer">Descargar PDF</a>}
      </div>
    </div>
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 sm:p-4 overflow-hidden">
      {pdf ? <div className="bg-neutral-900 rounded-lg overflow-hidden flex flex-col p-2 sm:p-4"><FlipbookViewer src={pdf} className="w-full h-full" minHeight={800} /></div> : <p className="p-10 text-center text-slate-600">El PDF aún no está disponible.</p>}
    </div>
  </section>
}
