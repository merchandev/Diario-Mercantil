import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EditionPromoAside from '../components/EditionPromoAside'
import { getSettings } from '../lib/api'
import { IconDocs, IconSearch, IconUserCircle, IconClose } from '../components/icons'
import { SEO } from '../components/SEO'

function BannerBox({ settingKey, className }: { settingKey: string; className?: string }) {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    getSettings()
      .then(r => {
        const value = (r.settings as Record<string, unknown>)[settingKey]
        if (typeof value === 'string' && value.trim()) setUrl(value)
      })
      .catch(() => setUrl(undefined))
  }, [settingKey])

  if (!url) return null

  return (
    <div className={`card overflow-hidden ${className || ''}`}>
      <img src={url} alt="Promoción del Diario Mercantil" className="w-full h-full object-cover" />
    </div>
  )
}

function PromoPopup() {
  const [url, setUrl] = useState<string>()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('dm_promo_dismissed') === '1') return
    getSettings()
      .then(r => {
        const value = r.settings?.promo_popup
        if (typeof value === 'string' && value.trim()) {
          setUrl(value)
          setOpen(true)
        }
      })
      .catch(() => undefined)
  }, [])

  if (!open || !url) return null

  const close = () => {
    sessionStorage.setItem('dm_promo_dismissed', '1')
    setOpen(false)
  }

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Promoción">
      <div className="relative max-w-3xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <button type="button" onClick={close} className="absolute right-3 top-3 z-10 w-10 h-10 rounded-full bg-white/95 border border-slate-200 shadow flex items-center justify-center text-slate-700 hover:text-brand-700" aria-label="Cerrar promoción">
          <IconClose className="w-5 h-5" />
        </button>
        <img src={url} alt="Promoción" className="w-full max-h-[75vh] object-contain bg-slate-50" />
      </div>
    </div>
  )
}

const services = [
  {
    title: 'Publicar documento legal',
    description: 'Carga el documento protocolizado, completa los datos registrales y reporta tu Pago Móvil desde un flujo guiado.',
    to: '/solicitante/documento',
    icon: IconDocs,
    action: 'Iniciar solicitud',
  },
  {
    title: 'Consultar ediciones',
    description: 'Busca ediciones publicadas por CVE, fecha o razón social y consulta el PDF oficial disponible.',
    to: '/ediciones',
    icon: IconSearch,
    action: 'Ver ediciones',
  },
  {
    title: 'Directorio legal',
    description: 'Accede a la sección del Directorio Legal y a la información profesional publicada en el portal.',
    to: '/p/directorio-legal',
    icon: IconUserCircle,
    action: 'Abrir directorio',
  },
]

export default function Home() {
  return (
    <div className="bg-slate-50/60 min-h-screen">
      <SEO
        title="Diario Mercantil Venezuela | Avisos Legales y Edictos"
        description="Publica avisos legales, edictos, actas y balances en el Diario Mercantil digital líder en Venezuela. Válido para Registros Mercantiles."
      />
      <PromoPopup />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-7 md:py-10 space-y-8">
        <BannerBox settingKey="banner_main_1" className="aspect-[16/6] md:aspect-[21/7]" />

        <section className="grid lg:grid-cols-[1fr_310px] gap-7 items-start">
          <div className="space-y-7">
            <div className="card p-6 md:p-8 bg-white border border-slate-200">
              <p className="text-xs font-bold tracking-[0.18em] uppercase text-brand-700 mb-3">Diario Mercantil de Venezuela</p>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 max-w-3xl">Publicaciones legales y ediciones digitales en un solo lugar</h1>
              <p className="text-slate-600 mt-4 max-w-3xl leading-relaxed">
                Gestiona solicitudes de publicación, consulta su estado y accede a las ediciones publicadas mediante su Código de Verificación Electrónica (CVE).
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                <Link to="/register" className="btn btn-primary">Crear cuenta</Link>
                <Link to="/ediciones" className="btn btn-outline">Consultar ediciones</Link>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {services.map(({ title, description, to, icon: Icon, action }) => (
                <article key={title} className="card p-5 bg-white border border-slate-200 flex flex-col">
                  <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="font-semibold text-lg text-slate-900">{title}</h2>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed flex-1">{description}</p>
                  <Link to={to} className="text-sm font-semibold text-brand-700 hover:text-brand-900 mt-5">{action} →</Link>
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24">
            <EditionPromoAside />
            <div className="card p-5 bg-white border border-slate-200">
              <h2 className="font-semibold text-slate-900">Última edición disponible</h2>
              <p className="text-sm text-slate-600 mt-2">Consulta el archivo digital, el CVE y descarga el PDF de la edición publicada.</p>
              <Link to="/ediciones" className="btn btn-primary w-full mt-4 justify-center">Ver ediciones</Link>
            </div>
            <BannerBox settingKey="banner_sidebar" className="aspect-[3/5]" />
          </aside>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 mt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-2 md:items-center md:justify-between text-sm text-slate-500">
          <div className="flex flex-col gap-1">
            <span>© 2026 Diario Mercantil. Todos los derechos reservados.</span>
            <span className="text-xs text-slate-400 max-w-2xl">Derechos de desarrollo reservados para Merchan.Dev y Epressivo Venezuela, C.A. Queda prohibido cualquier uso sin autorización por escrito, reproducción, copia o plagio de cualquier elemento o flujo de trabajo desarrollado en este proyecto.</span>
          </div>
          <div className="flex gap-4">
            <Link to="/p/preguntas-frecuentes" className="hover:text-brand-700">Preguntas frecuentes</Link>
            <Link to="/contacto" className="hover:text-brand-700">Contacto</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
