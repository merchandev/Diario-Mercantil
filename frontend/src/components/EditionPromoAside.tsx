import React, { useEffect, useState } from 'react'
import { getBcvRate, getSettings } from '../lib/api'

export default function EditionPromoAside(){
  const [priceUsd, setPriceUsd] = useState<number|undefined>(undefined)
  const [rate, setRate] = useState<number|undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(()=>{
    setLoading(true)
    const pSettings = getSettings().then(r=> {
      const v = Number(r.settings?.price_per_folio_usd)
      if (isFinite(v) && v > 0) setPriceUsd(v)
      else setPriceUsd(1.5)
    }).catch(()=>{ setPriceUsd(1.5) })

    const pRate = getBcvRate().then(r=>{
      let val: number | undefined = undefined
      if (typeof r.rate === 'number' && isFinite(r.rate) && r.rate > 0) val = r.rate
      else if (r.usd && typeof r.usd.value === 'number' && isFinite(r.usd.value) && r.usd.value > 0) val = r.usd.value
      else if (r.usd && typeof r.usd.raw === 'string'){
        const parsed = Number(r.usd.raw.replace(/\./g,'').replace(',', '.'))
        if (isFinite(parsed) && parsed > 0) val = parsed
      }
      if (val) setRate(val)
    }).catch(()=>{})

    Promise.allSettled([pSettings, pRate]).then(()=> setLoading(false))
  }, [])

  const priceBs = (typeof priceUsd === 'number' && typeof rate === 'number') ? (priceUsd*rate) : undefined
  const todayText = new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <aside className="card p-3 md:p-4 pb-4 md:pb-5 flex flex-col gap-2 items-end text-right h-28 md:h-32">
      <div className="text-[11px] text-slate-600 text-right">Caracas, {todayText}</div>
      <div className="flex items-center justify-end gap-2 shrink-0">
        <a aria-label="Instagram" className="h-8 w-8 grid place-items-center rounded-full border border-slate-200 bg-white text-slate-900"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.5" y2="6.5"/></svg></a>
        <a aria-label="Facebook" className="h-8 w-8 grid place-items-center rounded-full border border-slate-200 bg-white text-slate-900"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-3h2.5V9.5A3.5 3.5 0 0 1 14 6h3v3h-3a1 1 0 0 0-1 1V12H17l-.5 3h-3v7A10 10 0 0 0 22 12"/></svg></a>
        <a aria-label="X" className="h-8 w-8 grid place-items-center rounded-full border border-slate-200 bg-white text-slate-900"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h3l5 7 5-7h5l-8 11 7 7h-3l-5-6-5 6H2l8-10-7-8z"/></svg></a>
        <a aria-label="LinkedIn" className="h-8 w-8 grid place-items-center rounded-full border border-slate-200 bg-white text-slate-900"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM0 8h5v16H0zM8 8h4.8v2.2h.1c.6-1.1 2.1-2.2 4.3-2.2 4.6 0 5.4 3 5.4 6.8V24h-5v-7.7c0-1.8 0-4.1-2.5-4.1s-2.9 1.9-2.9 3.9V24H8z"/></svg></a>
      </div>
      <hr className="border-slate-200 w-full self-stretch mb-1" />
      <div className="w-full flex justify-center">
        <div className="inline-flex items-center rounded-md border border-brand-600 text-brand-700 text-[11px] px-3 py-1 font-semibold bg-transparent">
          {loading ? (
            <div className="flex items-center gap-3">
              <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
            </div>
          ) : (
            <>
              <span className="mr-2">PRECIO POR FOLIO:</span>
              <span className="font-semibold">{priceBs? priceBs.toFixed(2):'--'} Bs.</span>
              <span className="mx-2">/</span>
              <span className="font-semibold">{priceUsd? priceUsd.toFixed(2):'--'} USD</span>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
