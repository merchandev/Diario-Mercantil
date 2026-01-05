import { useEffect, useState } from 'react'
import { getBcvRate } from '../lib/api'

export default function BcvCard(){
  const [usd, setUsd] = useState<number|null>(null)
  const [eur, setEur] = useState<number|null>(null)
  const [fromCache, setFromCache] = useState<boolean>(false)
  const [ts, setTs] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const nf = new Intl.NumberFormat('es-VE', { minimumFractionDigits:2, maximumFractionDigits:2 })

  const load = async (force=false)=>{
    try{
      setLoading(true)
      const r = await getBcvRate({force})
      const u = (typeof r.usd?.value === 'number' && isFinite(r.usd.value)) ? r.usd.value : null
      const e = (typeof r.eur?.value === 'number' && isFinite(r.eur.value)) ? r.eur.value : null
      setUsd(u)
      setEur(e)
      setFromCache(!!r.from_cache)
      setTs(r.fetched_at || new Date().toISOString())
    }catch(_e){
      // ignore
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{ load(false) },[])

  return (
    <div className="card p-4 flex items-center justify-between gap-4">
      <div>
        <div className="text-sm text-slate-500">Tasa BCV (auto)</div>
        <div className="text-xl font-semibold flex items-center gap-3">
          <span>USD: {usd!==null? nf.format(usd) : '—'}</span>
          <span className="text-slate-400">|</span>
          <span>EUR: {eur!==null? nf.format(eur) : '—'}</span>
        </div>
        <div className="text-xs text-slate-500 mt-1">Origen: {fromCache? 'cache' : 'live'} · {ts? new Date(ts).toLocaleString('es-VE') : ''}</div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={()=>load(true)} className="btn btn-outline h-9 text-xs" disabled={loading}>
          {loading? 'Actualizando…' : 'Actualizar ahora'}
        </button>
      </div>
    </div>
  )
}
