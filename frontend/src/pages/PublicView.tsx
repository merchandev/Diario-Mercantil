import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicationPublic } from '../lib/api'

export default function PublicView(){
  const { slug } = useParams()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [notFound, setNotFound] = useState(false)
  useEffect(()=>{
    if (!slug) return
    getPublicationPublic(slug).then(r=>{ setTitle(r.publication.title); setContent(r.publication.content||'') }).catch(()=> setNotFound(true))
  }, [slug])

  if (notFound) return <div className="min-h-screen grid place-items-center p-8"><div className="text-center"><div className="text-2xl font-semibold mb-2">Publicación no encontrada</div><a className="text-brand-700 underline" href="/">Volver</a></div></div>

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto p-6">
        <div className="text-center mb-8">
          <div className="text-3xl font-serif tracking-widest text-slate-800">DIARIO MERCANTIL</div>
          <div className="text-xs tracking-[0.4em] text-slate-500">DE VENEZUELA</div>
        </div>
        <article className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h1 className="text-2xl font-semibold">{title || 'Cargando…'}</h1>
          {content && <p className="text-slate-700 whitespace-pre-wrap">{content}</p>}
        </article>
      </div>
    </div>
  )
}
