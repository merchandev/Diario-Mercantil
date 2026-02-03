import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchAuth } from '../lib/api'

export default function PublicLegalRequest() {
    const { order } = useParams()
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!order) return
        fetch(`/api/legal/public/${order}`)
            .then(async res => {
                if (!res.ok) throw new Error('Publicación no encontrada')
                return res.json()
            })
            .then(json => setData(json.item))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false))
    }, [order])

    if (loading) return <div className="min-h-screen grid place-items-center">Cargando...</div>

    if (error || !data) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <h1 className="text-4xl font-bold text-slate-800 mb-2">404</h1>
                <p className="text-slate-600 mb-6">{error || 'Publicación no encontrada'}</p>
                <a href="/" className="btn btn-primary">Ir al inicio</a>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <div className="bg-white shadow-sm border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <img src="/Logotipo_Diario_Mercantil.svg" alt="Diario Mercantil" className="h-10" />
                    <div className="text-xs text-slate-500 uppercase tracking-widest hidden sm:block">Verificación de Publicación</div>
                </div>
            </div>

            <main className="max-w-3xl mx-auto px-4 py-12">
                <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
                    <div className="bg-slate-900 text-white px-8 py-6 flex justify-between items-start">
                        <div>
                            <div className="text-white/60 text-xs font-bold tracking-wider uppercase mb-1">Publicación Oficial</div>
                            <h1 className="text-2xl font-serif font-medium">{data.name || 'Sin Título'}</h1>
                        </div>
                        {data.status === 'Publicada' ? (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                Verificada
                            </span>
                        ) : (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                {data.status}
                            </span>
                        )}
                    </div>

                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <dt className="text-xs uppercase text-slate-400 font-bold tracking-wider mb-1">N° de Orden</dt>
                                <dd className="text-lg font-mono text-slate-700">{data.order_no || data.id}</dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase text-slate-400 font-bold tracking-wider mb-1">Fecha de Publicación</dt>
                                <dd className="text-lg text-slate-700">{data.publish_date || data.date}</dd>
                            </div>
                            <div className="md:col-span-2">
                                <dt className="text-xs uppercase text-slate-400 font-bold tracking-wider mb-1">Solicitante / Empresa</dt>
                                <dd className="text-lg text-slate-700">{data.name}</dd>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">Contenido del Documento</h3>
                            {data.document && (
                                <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 text-sm font-mono whitespace-pre-wrap leading-relaxed text-slate-600">
                                    {data.document}
                                </div>
                            )}
                        </div>

                        <div className="text-center pt-4">
                            <p className="text-xs text-slate-400">
                                Este documento es una copia digital fiel de la publicación realizada en el Diario Mercantil de Venezuela.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
