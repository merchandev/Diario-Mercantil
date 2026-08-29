import { useEffect, useState } from 'react'
import type React from 'react'
import { createPayment, deletePayment, listPayments, type PaymentMethod } from '../lib/api'
import ConfirmDialog from '../components/ConfirmDialog'
import { BANCOS_VENEZUELA } from '../constants/banks'

export default function MediosPago() {
  const [rows, setRows] = useState<PaymentMethod[]>([])
  const [form, setForm] = useState<Partial<PaymentMethod>>({ type: 'pago_movil', bank: '', account: '', holder: '', rif: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => { } })
  const load = () => listPayments().then(r => setRows(r.items))
  useEffect(() => { load() }, [])

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createPayment({ ...form, type: 'pago_movil' })
      setForm({ type: 'pago_movil', bank: '', account: '', holder: '', rif: '', phone: '' })
      await load()
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Medios de Pago</h1>
      <form onSubmit={onCreate} className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <label className="block">
          <span className="block text-sm font-medium mb-1">Banco</span>
          <select className="input w-full" value={form.bank || ''} onChange={e => setForm({ ...form, bank: e.target.value })} required>
            <option value="" disabled>Seleccione el banco</option>
            {BANCOS_VENEZUELA.map(bank => <option key={bank} value={bank}>{bank}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Titular</span>
          <input className="input w-full" placeholder="Nombre del titular" value={form.holder || ''} onChange={e => setForm({ ...form, holder: e.target.value })} required />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">RIF</span>
          <input className="input w-full" placeholder="J-12345678-9" maxLength={20} value={form.rif || ''} onChange={e => setForm({ ...form, rif: e.target.value.toUpperCase() })} required />
        </label>
        <div className="flex flex-col w-full gap-1 lg:col-span-1 sm:col-span-2 md:col-span-1">
          <span className="block text-sm font-medium">Teléfono Pago Móvil</span>
          <div className="flex gap-2">
            <input className="input w-full" inputMode="numeric" maxLength={11} pattern="04(12|14|16|22|24|26)\d{7}" placeholder="04121234567" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })} required />
            <button className="btn btn-primary whitespace-nowrap" disabled={loading}>Agregar</button>
          </div>
        </div>
      </form>
      <div className="card overflow-x-auto pb-2 pt-1">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-brand-800 text-white">
              <th className="text-left px-4 py-2">Banco</th>
              <th className="text-left px-4 py-2">Titular</th>
              <th className="text-left px-4 py-2">RIF</th>
              <th className="text-left px-4 py-2">Teléfono</th>
              <th className="text-right px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.bank}</td>
                <td className="px-4 py-2">{r.holder}</td>
                <td className="px-4 py-2">{r.rif}</td>
                <td className="px-4 py-2">{r.phone}</td>
                <td className="px-4 py-2 text-right"><button className="text-rose-700 hover:underline" onClick={() => setConfirmDialog({ isOpen: true, title: 'Eliminar medio de pago', message: '¿Está seguro de eliminar este medio de pago?', onConfirm: async () => { await deletePayment(r.id); load() } })}>Eliminar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message} variant="danger" onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} />
    </section>
  )
}
