import { useEffect, useState } from 'react'
import { me, logout, getSettings, getBcvRate } from '../lib/api'
import { IconLogout, IconUsers } from './icons'

export default function Topbar(){
  const [user, setUser] = useState<{name:string; role?:string}|null>(null)
  const [ticker, setTicker] = useState<{price?:number; rate?:number}>({})
  useEffect(()=>{
    me().then(r=>setUser(r.user)).catch(()=>{})
    // Load price from settings (still configurable)
    getSettings().then(r=>{
      setTicker(t=>({ ...t, price: r.settings.price_per_folio_usd as any }))
    }).catch(()=>{})
    // Load BCV rate live and refresh periodically
    const fetchRate = ()=>{
      getBcvRate().then(r=>{
        setTicker(t=>({ ...t, rate: r.rate }))
        // Also mirror into the legacy #dolar snippet if present
        const el = document.querySelector('#dolar strong');
        if (el) el.textContent = r.rate.toFixed(6).replace('.', ',');
      }).catch(()=>{})
    }
    fetchRate()
    const id = setInterval(fetchRate, 5*60*1000)
    return ()=> clearInterval(id)
  }, [])

  const onLogout = async()=>{
    try { 
      await logout() 
    } catch (err) {
      console.error('Error en logout:', err)
    }
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    location.href = '/login'
  }

  return (
    <header className="sticky top-0 z-20">
      {/* Price strip in brand 800 (#520b11) flush to top */}
      <div className="bg-color1-800 w-full px-3 py-2">
        <div className="flex justify-center">
          <div className="text-xs font-bold uppercase text-white text-center">
            Precio por Folio: <span className="font-bold">
              {(() => {
                const usd = typeof ticker.price === 'number' ? ticker.price : undefined
                const rate = typeof ticker.rate === 'number' ? ticker.rate : undefined
                const bs = usd && rate ? (usd * rate) : undefined
                const fmt = (n?:number)=> n===undefined ? '—' : n.toFixed(2).replace('.', ',')
                return `${fmt(bs)} Bs. / ${fmt(usd)} USD`
              })()}
            </span>
          </div>
        </div>
      </div>
      {/* Info row on white background */}
      <div className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-4">
        <div className="flex-1" />
        <div className="hidden md:flex items-center gap-2">
          <div className="text-xs text-slate-600">Tasa BCV: {ticker.rate?.toFixed?.(2) ?? '—'} Bs/USD</div>
          <div className="text-xs text-slate-600">Caracas, {new Date().toLocaleDateString('es-VE', {dateStyle:'full'})}</div>
        </div>
        {/* Hidden legacy snippet to support external selectors */}
        <div id="dolar" className="hidden">
          <div className="field-content">
            <div className="row recuadrotsmc">
              <div className="col-sm-6 col-xs-6"><span>USD</span></div>
              <div className="col-sm-6 col-xs-6 centrado"><strong>{(ticker.rate ?? 0).toFixed(6).replace('.', ',')}</strong></div>
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {user?.name && (
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
              <span>{`Hola, ${user.name}`}</span>
              {user?.role && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.role==='admin' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {user.role==='admin' ? 'Admin' : 'Solicitante'}
                </span>
              )}
            </div>
          )}
          {user?.role==='admin' && (
            <a href="/dashboard/usuarios" className="btn btn-outline inline-flex items-center gap-2">
              <IconUsers/> <span>Usuarios</span>
            </a>
          )}
          <button onClick={onLogout} className="btn btn-ghost inline-flex items-center gap-2"><IconLogout/> <span>Salir</span></button>
        </div>
        </div>
      </div>
    </header>
  )
}
