import { useEffect, useState } from 'react'
import type React from 'react'
import { createPayment, deletePayment, listPayments, type PaymentMethod } from '../lib/api'
import ConfirmDialog from '../components/ConfirmDialog'

export default function MediosPago(){
  const [rows, setRows] = useState<PaymentMethod[]>([])
  const [form, setForm] = useState<Partial<PaymentMethod>>({ type:'transfer', bank:'', account:'', holder:'', rif:'', phone:'' })
  const [loading, setLoading] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{isOpen:boolean; title:string; message:string; onConfirm:()=>void}>({isOpen:false, title:'', message:'', onConfirm:()=>{}})
  const load = ()=> listPayments().then(r=>setRows(r.items))
  useEffect(()=>{ load() },[])

  const onCreate = async(e:React.FormEvent)=>{
    e.preventDefault(); setLoading(true)
    await createPayment(form)
    setForm({ type:'transfer', bank:'', account:'', holder:'', rif:'', phone:'' })
    setLoading(false); load()
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Medios de Pago</h1>
      <form onSubmit={onCreate} className="card p-4 grid md:grid-cols-5 gap-2 items-end">
        <input className="input" placeholder="Banco" value={form.bank||''} onChange={e=>setForm({...form, bank:e.target.value})} />
        <input className="input" placeholder="Cuenta" value={form.account||''} onChange={e=>setForm({...form, account:e.target.value})} />
        <input className="input" placeholder="Titular" value={form.holder||''} onChange={e=>setForm({...form, holder:e.target.value})} />
        <input className="input" placeholder="RIF" value={form.rif||''} onChange={e=>setForm({...form, rif:e.target.value})} />
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Teléfono" value={form.phone||''} onChange={e=>setForm({...form, phone:e.target.value})} />
          <button className="btn btn-primary" disabled={loading}>Agregar</button>
        </div>
      </form>
      <div className="card overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-brand-800 text-white">
              <th className="text-left px-4 py-2">Banco</th>
              <th className="text-left px-4 py-2">Cuenta</th>
              <th className="text-left px-4 py-2">Titular</th>
              <th className="text-left px-4 py-2">RIF</th>
              <th className="text-left px-4 py-2">Teléfono</th>
              <th className="text-right px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=> (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.bank}</td>
                <td className="px-4 py-2">{r.account}</td>
                <td className="px-4 py-2">{r.holder}</td>
                <td className="px-4 py-2">{r.rif}</td>
                <td className="px-4 py-2">{r.phone}</td>
                <td className="px-4 py-2 text-right"><button className="text-rose-700 hover:underline" onClick={()=>setConfirmDialog({isOpen:true, title:'Eliminar medio de pago', message:'¿Está seguro de eliminar este medio de pago?', onConfirm:async()=>{await deletePayment(r.id); load()}})}>Eliminar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message} variant="danger" onConfirm={confirmDialog.onConfirm} onCancel={()=>setConfirmDialog({...confirmDialog,isOpen:false})} />
    </section>
  )
}
