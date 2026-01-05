import React from 'react'
import EditionPromoAside from '../components/EditionPromoAside'

function BannerBox({label, className}:{label:string;className?:string}){
  return (
    <div className={`card grid place-items-center aspect-[16/5] text-slate-500 ${className||''}`}>
      <span className="text-sm">{label}</span>
    </div>
  )
}
export default function Home(){
  // eslint-disable-next-line no-console
  console.log('[Home] Component rendering')
  return (
    <div>
      <main className="mx-auto max-w-7xl px-4 py-6 grid gap-6 lg:grid-cols-[220px_1fr_300px] items-start">
        <div className="space-y-6 order-2 lg:order-1">
          <BannerBox label="BANNER B" className="aspect-[9/20]" />
          <BannerBox label="BANNER B2" className="aspect-[9/16]" />
          <BannerBox label="BANNER B3" className="aspect-[9/16]" />
        </div>

        <section className="order-1 lg:order-2 space-y-6">
          <BannerBox label="BANNER C (principal)" className="aspect-[21/9]" />
          <div className="grid sm:grid-cols-2 gap-6">
            <article className="card p-4">
              <div className="aspect-video rounded-xl bg-slate-100 mb-3" />
              <h3 className="font-semibold text-lg mb-1">Titular destacado</h3>
              <p className="text-slate-600 text-sm">Resumen breve de la noticia para invitar a leer más.</p>
            </article>
            <article className="card p-4">
              <div className="aspect-video rounded-xl bg-slate-100 mb-3" />
              <h3 className="font-semibold text-lg mb-1">Otra noticia relevante</h3>
              <p className="text-slate-600 text-sm">Resumen breve de la noticia para invitar a leer más.</p>
            </article>
          </div>
        </section>

        <aside className="order-3 space-y-6 lg:sticky lg:top-28">
          <EditionPromoAside />
          <div className="card p-4 bg-gradient-to-br from-brand-50 to-white">
            <h3 className="font-semibold mb-2">¡Consulta nuestra última edición!</h3>
            <p className="text-sm text-slate-600 mb-3">Accede al PDF completo de hoy.</p>
            <button className="btn btn-primary w-full">Ver edición</button>
          </div>
          <BannerBox label="BANNER D" />
          <BannerBox label="BANNER E" />
        </aside>
      </main>

      <section className="mx-auto max-w-7xl px-4 pb-10">
        <div className="grid md:grid-cols-3 gap-6">
          {[1,2,3].map(i=> (
            <article key={i} className="card p-4">
              <div className="aspect-[4/3] rounded-xl bg-slate-100 mb-3" />
              <h3 className="font-semibold">Nota #{i}</h3>
              <p className="text-sm text-slate-600">Descripción breve de la nota para ver estilo de tarjetas.</p>
            </article>
          ))}
        </div>
      </section>
      <footer className="bg-white border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-8 grid md:grid-cols-2 gap-6 items-center">
          <div>
            <div className="text-lg font-semibold">Suscríbete al boletín</div>
            <p className="text-sm text-slate-600">Recibe lo más importante cada mañana.</p>
          </div>
          <form className="flex gap-2">
            <input type="email" placeholder="tu@correo.com" className="input flex-1" />
            <button className="btn btn-primary">Suscribirme</button>
          </form>
        </div>
        <div className="text-center text-xs text-slate-500 py-4">© {new Date().getFullYear()} Diario — Hecho con React + Tailwind</div>
      </footer>
    </div>
  )
}
