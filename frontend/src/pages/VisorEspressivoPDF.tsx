import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import FlipbookViewer from '../components/FlipbookViewer'

type EditionDetail = {
  code: string
  edition_no?: number
  date?: string
  status?: string
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
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      })
      .then((data) => setEdition(data.edition))
      .catch((err) => setError(typeof err === 'string' ? err : err?.message || 'No se pudo cargar la edición'))
      .finally(() => setLoading(false))
  }, [code])

  const pdfUrl = useMemo(() => {
    if (!edition) return ''
    return edition.file_url || `/api/e/${encodeURIComponent(edition.code)}/download`
  }, [edition])

  const dateStr = edition?.date
    ? new Date(edition.date + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f13', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#e63d3d', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontSize: 15, fontWeight: 500 }}>Cargando edición…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f13', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 480, width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 40, textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📰</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Visor no disponible</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0f0f13 0%, #13101a 50%, #0a0a10 100%)', padding: '32px 16px 64px', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        .visor-fadein { animation: fadeUp 0.5s ease both; }
      `}</style>

      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* ── Header card ── */}
        <div
          className="visor-fadein"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20,
            padding: '24px 28px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            backdropFilter: 'blur(20px)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Eyebrow */}
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#e63d3d', fontWeight: 700 }}>
              Diario Mercantil
            </span>
            {/* Title */}
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>
              Edición {edition?.code ?? '—'}
            </h1>
            {/* Meta pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {edition?.edition_no && (
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'rgba(230,61,61,0.18)', color: '#ff8080', fontWeight: 600, border: '1px solid rgba(230,61,61,0.3)' }}>
                  Nro. {edition.edition_no}
                </span>
              )}
              {dateStr && (
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  📅 {dateStr}
                </span>
              )}
              {edition?.status && (
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.14)', color: '#86efac', border: '1px solid rgba(34,197,94,0.25)', fontWeight: 600 }}>
                  ✓ {edition.status.charAt(0).toUpperCase() + edition.status.slice(1)}
                </span>
              )}
            </div>
          </div>

          {/* Download button */}
          {edition?.file_id && (
            <a
              href={`${pdfUrl}?download=1`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 22px',
                borderRadius: 36,
                background: 'linear-gradient(135deg, #e63d3d 0%, #c02020 100%)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(230,61,61,0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              Descargar PDF
            </a>
          )}
        </div>

        {/* ── Viewer or no-pdf message ── */}
        {edition?.file_id ? (
          <div className="visor-fadein" style={{ animationDelay: '0.1s' }}>
            {/* Hint bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', width: 'fit-content' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Usa los botones <strong style={{ color: 'rgba(255,255,255,0.65)' }}>Anterior / Siguiente</strong> o las teclas ← → para navegar</span>
            </div>

            {/* THE VIEWER — plain div, no relative, no overflow */}
            <FlipbookViewer src={pdfUrl} />
          </div>
        ) : (
          <div
            className="visor-fadein"
            style={{ animationDelay: '0.1s', border: '1.5px dashed rgba(255,255,255,0.15)', borderRadius: 20, padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            El PDF aún no está disponible para esta edición.
          </div>
        )}

      </div>
    </div>
  )
}
