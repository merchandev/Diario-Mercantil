import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBcvRate, listPagesPublic } from '../lib/api'

function HeroSlider({heightClass="h-28 md:h-32", labelPrefix="BANNER A"}:{heightClass?:string; labelPrefix?:string}){
  const slides = [1,2,3]
  const [idx, setIdx] = useState(0)
  const timer = useRef<number|undefined>(undefined)
  const go = (n:number)=> setIdx(((n%slides.length)+slides.length)%slides.length)
  useEffect(()=>{
    timer.current && clearInterval(timer.current)
    // @ts-ignore
    timer.current = setInterval(()=> go(idx+1), 5000)
    return ()=> { timer.current && clearInterval(timer.current) }
  }, [idx])
  return (
    <div className={`card relative overflow-hidden px-2 ${heightClass}`}>
      <div className="h-full w-full flex transition-transform duration-500" style={{ transform:`translateX(-${idx*100}%)` }}>
        {slides.map(i=> (
          <div key={i} className="shrink-0 w-full h-full grid place-items-center bg-slate-100 text-slate-500">
            <div className="text-sm">{labelPrefix} {i}</div>
          </div>
        ))}
      </div>
      <button aria-label="Anterior" onClick={()=>go(idx-1)} className="absolute left-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-icon bg-white/70 backdrop-blur border border-slate-200">‹</button>
      <button aria-label="Siguiente" onClick={()=>go(idx+1)} className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-icon bg-white/70 backdrop-blur border border-slate-200">›</button>
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1">
        {slides.map((_,i)=> (
          <button key={i} aria-label={`Ir al slide ${i+1}`} onClick={()=>go(i)} className={["w-2.5 h-2.5 rounded-full border", i===idx? 'bg-brand-600 border-brand-600':'bg-white/80 border-slate-300'].join(' ')} />
        ))}
      </div>
    </div>
  )
}

function TopBannerRow(){
  const [priceUsd, setPriceUsd] = useState<number|undefined>(undefined)
  const [rate, setRate] = useState<number|undefined>(undefined)
  useEffect(()=>{
    fetch('/api/settings')
      .then(async res=> res.ok ? res.json() : Promise.reject(res.status))
      .then((r:any)=> setPriceUsd(Number(r.settings?.price_per_folio_usd||0)))
      .catch(()=>{})
    getBcvRate().then(r=> setRate(Number(r.rate||0))).catch(()=>{})
  }, [])
  const priceBs = priceUsd && rate ? (priceUsd*rate) : undefined
  const todayText = new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <div className="mx-auto max-w-7xl px-4 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 md:gap-5 items-stretch">
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center h-28 md:h-32">
            <Link to="/" aria-label="Inicio">
              <img src="/Logotipo_Diario_Mercantil.svg" alt="Diario Mercantil" className="h-16 w-auto" />
            </Link>
          </div>
          <div className="flex-1">
            <HeroSlider heightClass="h-28 md:h-32" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PublicHeader(){
  const today = new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const [usd, setUsd] = useState<string|undefined>(undefined)
  const [eur, setEur] = useState<string|undefined>(undefined)
  const [unitTax, setUnitTax] = useState<string|undefined>(undefined)
  const DEFAULT_MENU = [
    {label:'INICIO', to:'/'},
    {label:'SOBRE EL DIARIO', to:'/p/sobre-el-diario'},
    {label:'CÓMO PUBLICAR', to:'/p/como-publicar'},
    {label:'EDICIONES', to:'/ediciones'},
    {label:'DIRECTORIO LEGAL', to:'/p/directorio-legal'},
    {label:'CONTACTO', to:'/contacto'},
    {label:'PREGUNTAS FRECUENTES', to:'/p/preguntas-frecuentes'},
  ] as const
  const [menu, setMenu] = useState<{label:string; to:string}[]>([...DEFAULT_MENU])
  useEffect(()=>{
    getBcvRate({force:true}).then(r=>{
      const f = (n?:number|null)=> typeof n==='number' && isFinite(n) ? new Intl.NumberFormat('es-VE', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(n) : undefined
      // Only show live parsed values; avoid stale fallback to stored 'rate'
      setUsd(f(r.usd?.value ?? undefined))
      setEur(f(r.eur?.value ?? undefined))
    }).catch(()=>{})
    // Fetch UT from settings (default to 43 if absent)
    fetch('/api/settings')
      .then(async res=> res.ok ? res.json() : Promise.reject(res.status))
      .then((r:any)=>{
        const ut = Number((r as any).settings?.unit_tax_bs ?? 43)
        if (isFinite(ut)) setUnitTax(new Intl.NumberFormat('es-VE', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(ut))
      }).catch(()=>{
        setUnitTax(new Intl.NumberFormat('es-VE', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(43))
      })
    // Build menu from published pages (excluding contacto), with special routes
    listPagesPublic().then(({items})=>{
      const order = ['inicio','sobre-el-diario','como-publicar','ediciones','directorio-legal','preguntas-frecuentes']
      const bySlug = new Map(items.map(it=>[it.slug, it]))
      const sorted = [
        ...order.filter(s=>bySlug.has(s)).map(slug=>bySlug.get(slug)!) ,
        ...items.filter(it=>!order.includes(it.slug)).sort((a,b)=> a.title.localeCompare(b.title))
      ]
      const linkFor = (slug:string)=> slug==='inicio' ? '/' : slug==='ediciones' ? '/ediciones' : `/p/${slug}`
      const m = sorted.map(it=> ({ label: it.title.toUpperCase(), to: linkFor(it.slug) }))
      // Insert contacto link before preguntas-frecuentes, or at end if not present
      const pos = m.findIndex(x=>x.to.endsWith('/p/preguntas-frecuentes'))
      const contacto = { label:'CONTACTO', to:'/contacto' }
      if (pos>=0) m.splice(pos, 0, contacto); else m.push(contacto)
      setMenu(m)
    }).catch(()=>{
      // Keep default, no visual blink
      setMenu([...DEFAULT_MENU])
    })
  },[])
  return (
    <>
      <TopBannerRow />
  <nav className="bg-white/90 backdrop-blur border-y border-slate-200 sticky top-0 z-40 mt-4 py-2.5">
        <div className="mx-auto max-w-7xl px-4 h-12 flex items-center gap-6 overflow-x-auto">
          {menu.map((it)=> (
            <Link key={it.label} to={it.to} className="text-[13px] whitespace-nowrap font-medium tracking-wide text-slate-700 hover:text-brand-700">
              {it.label}
            </Link>
          ))}
          <div className="ml-auto hidden md:flex items-center gap-2 shrink-0">
            <Link to="/login" className="btn btn-outline h-9 text-xs">Iniciar sesión</Link>
            <Link to="/login" className="btn btn-primary h-9 text-xs">Crear cuenta</Link>
          </div>
        </div>
      </nav>

      <section className="bg-slate-100 py-[10px]">
        <div className="mx-auto max-w-7xl px-4 flex items-center gap-4 text-sm">
          <span className="px-2 py-1 rounded-lg bg-brand-600 text-white text-xs">EN DIRECTO</span>
          <div className="flex-1 flex gap-6 overflow-x-auto">
            <div className="text-slate-600">Tipo de cambio (BCV) hoy: <span className="font-medium text-slate-900">{usd? `Bs/USD ${usd}` : '—'}</span> | <span className="font-medium text-slate-900">{eur? `Bs/EUR ${eur}` : '—'}</span></div>
            <div className="text-slate-600">Unidad tributaria (SENIAT): <span className="font-medium text-slate-900">{unitTax? `${unitTax} Bs.` : '—'}</span></div>
          </div>
        </div>
      </section>
    </>
  )
}
