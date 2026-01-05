import React, { useEffect, useMemo, useState } from 'react'
import { listEditions, type Edition } from '../lib/api'
import { Link } from 'react-router-dom'

export default function EdicionesPublic(){
  const [rows, setRows] = useState<Edition[]>([])
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async()=>{
    setLoading(true)
    try {
      const r = await listEditions()
      setRows(r.items ?? [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }
  useEffect(()=>{ load() },[])

  const filtered = useMemo(()=>{
    const fFrom = from ? new Date(from) : null
    const fTo = to ? new Date(to) : null
    return [...rows]
      .filter(ed=>{
        const t = (String(ed.code||'') + ' ' + String(ed.edition_no||'') + ' ' + String(ed.status||'')).toLowerCase()
        if (q && !t.includes(q.toLowerCase())) return false
        const d = ed.date ? new Date(ed.date) : (ed.created_at ? new Date(ed.created_at) : null)
        if (fFrom && d && d < fFrom) return false
        if (fTo && d && d > new Date(new Date(to).getTime()+24*60*60*1000-1)) return false
        return true
      })
      .sort((a,b)=>{
        const da = a.date ? new Date(a.date).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0)
        const db = b.date ? new Date(b.date).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0)
        return db - da
      })
  }, [rows,q,from,to])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl p-6 space-y-4">
        <h1 className="text-xl font-semibold">Ediciones</h1>
        <p className="text-sm text-slate-700">Consulta las ediciones publicadas, filtra por fechas y abre el PDF con efecto revista.</p>

        <div className="card p-4 grid md:grid-cols-[1fr,auto,auto,auto] gap-3 items-end">
          <label className="text-sm">Buscar
            <input className="input w-full mt-1" placeholder="Codigo, numero o estado" value={q} onChange={e=>setQ(e.target.value)} />
          </label>
          <label className="text-sm">Desde
            <input type="date" className="input mt-1" value={from} onChange={e=>setFrom(e.target.value)} />
          </label>
          <label className="text-sm">Hasta
            <input type="date" className="input mt-1" value={to} onChange={e=>setTo(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <button onClick={load} className="btn btn-outline">Actualizar</button>
            <button onClick={()=>{setQ(''); setFrom(''); setTo('')}} className="btn btn-ghost">Limpiar</button>
          </div>
        </div>

        <div className="card overflow-auto">
          {loading ? (
            <div className="p-6 text-sm text-slate-600">Cargando...</div>
          ) : filtered.length===0 ? (
            <div className="p-6 text-sm text-slate-600">No hay ediciones para mostrar.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Edicion</th>
                  <th className="p-3">Codigo</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ed:any)=>{
                  const dateTxt = ed.date || ed.created_at
                  const pdfUrl = ed.file_url || (ed.code ? `/api/e/${encodeURIComponent(ed.code)}/download` : '')
                  const hasPdf = Boolean(ed.file_id || ed.file_url)
                  return (
                    <tr key={ed.id||ed.code} className="border-b last:border-0">
                      <td className="p-3 whitespace-nowrap">{dateTxt ? new Date(dateTxt).toLocaleDateString('es-VE') : '-'}</td>
                      <td className="p-3">{ed.edition_no ? `Nro ${ed.edition_no}` : '-'}</td>
                      <td className="p-3 font-mono">{ed.code||'-'}</td>
                      <td className="p-3">{ed.status||'-'}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          {ed.code && <Link className="btn btn-outline h-9 text-xs" to={`/edicion/${encodeURIComponent(ed.code)}`}>Ver en linea</Link>}
                          {hasPdf ? (
                            <a className="btn btn-primary h-9 text-xs" href={`${pdfUrl}?download=1`} target="_blank" rel="noreferrer">Descargar</a>
                          ) : (
                            <span className="text-xs text-slate-500">Sin PDF</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
