import { useEffect, useState } from 'react'
import { listPayments, type PaymentMethod } from '../lib/api'

export default function MediosPagoInfo(){
  const [items, setItems] = useState<PaymentMethod[]>([])
  useEffect(()=>{ listPayments().then(r=>setItems(r.items)).catch(()=>setItems([])) },[])
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Medios de pago</h1>
      <div className="card p-4">
        {items.length===0 ? (
          <div className="text-sm text-slate-600">Aún no hay medios de pago publicados por el administrador.</div>
        ) : (
          <ul className="grid md:grid-cols-2 gap-3">
            {items.map(m=> (
              <li key={m.id} className="border rounded p-3 text-sm">
                <div className="font-semibold">{m.type}</div>
                {m.bank && <div className="text-slate-600">Banco: {m.bank}</div>}
                {m.account && <div className="text-slate-600">Cuenta: {m.account}</div>}
                {m.holder && <div className="text-slate-600">Titular: {m.holder}</div>}
                {m.rif && <div className="text-slate-600">RIF: {m.rif}</div>}
                {m.phone && <div className="text-slate-600">Teléfono: {m.phone}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
