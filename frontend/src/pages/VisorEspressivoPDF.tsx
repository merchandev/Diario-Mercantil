import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import FlipbookViewer from '../components/FlipbookViewer'

type EditionDetail = {
  code: string
  edition_no?: number
  date?: string
  file_id?: number | null
  file_url?: string | null
  file_name?: string | null
}

export default function VisorEspressivoPDF() {
  const { code } = useParams<{ code: string }>()
  const [edition, setEdition] = useState<EditionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!code) {
      setError('Código de edición inválido')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    fetch(`/api/dm/e-${encodeURIComponent(code)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await res.text())
        }
        return res.json()
      })
      .then((data) => {
        setEdition(data.edition)
      })
      .catch((err) => {
        setError(typeof err === 'string' ? err : err?.message || 'No se pudo cargar la edición')
      })
      .finally(() => setLoading(false))
  }, [code])

  const pdfUrl = useMemo(() => {
    if (!edition) return ''
    return edition.file_url || `/api/e/${encodeURIComponent(edition.code)}/download`
  }, [edition])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
        <div className="text-center text-slate-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/60 mx-auto mb-4"></div>
          <p className="text-lg">Preparando el Visor Espressivo-PDF...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
        <div className="max-w-xl w-full bg-white/5 border border-white/10 backdrop-blur rounded-2xl p-8 text-center text-slate-200">
          <h1 className="text-2xl font-semibold mb-2">Visor no disponible</h1>
          <p className="text-sm text-slate-300">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="border rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase text-slate-500 tracking-widest">Edición {edition?.code}</p>
              <h1 className="text-3xl font-semibold text-white">Visor Espressivo-PDF</h1>
              <p className="text-sm text-slate-400">
                {edition?.edition_no ? `Edición #${edition.edition_no}` : 'Edición oficial'}
              </p>
            </div>
            <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-slate-200">Vista tipo revista</span>
          </div>
          {edition?.file_id ? (
            <div className="space-y-3">
              <div className="relative">
                <FlipbookViewer src={pdfUrl} />
              </div>
              <div className="flex flex-wrap items-center justify-between mt-4">
                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="px-2 py-1 rounded bg-white/10">Arrastra o clic para pasar página</span>
                  <span className="px-2 py-1 rounded bg-white/10">Usa la rueda para navegar</span>
                </div>
                <a
                  href={`${pdfUrl}?download=1`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary shadow-lg inline-flex items-center gap-2 px-4 py-2 shrink-0 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                  <span>Descargar Edición (PDF)</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-white/30 rounded-xl p-6 bg-white/5 text-center text-sm text-slate-300">
              El PDF aún no está disponible para esta edición.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
