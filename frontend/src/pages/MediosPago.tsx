import { useEffect, useState } from 'react'
import type React from 'react'
import { createPayment, deletePayment, deletePaymentQr, listPayments, updatePayment, uploadPaymentQr, type PaymentMethod } from '../lib/api'
import ConfirmDialog from '../components/ConfirmDialog'
import { BANCOS_VENEZUELA } from '../constants/banks'
import { useDialog } from '../contexts/DialogContext'

const EMPTY_FORM: Partial<PaymentMethod> = { type: 'pago_movil', bank: '', account: '', holder: '', rif: '', phone: '' }

export default function MediosPago({ embedded = false }: { embedded?: boolean }) {
  const { showAlert } = useDialog()
  const [rows, setRows] = useState<PaymentMethod[]>([])
  const [form, setForm] = useState<Partial<PaymentMethod>>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedQr, setSelectedQr] = useState<File | null>(null)
  const [qrPreview, setQrPreview] = useState('')
  const [existingQrUrl, setExistingQrUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => { } })
  const load = async () => {
    try {
      const response = await listPayments()
      setRows(response.items)
      setLoadError('')
    } catch (error: any) {
      setLoadError(error?.data?.message || error?.message || 'No se pudieron cargar los medios de pago.')
    }
  }
  useEffect(() => { void load() }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    let paymentSaved = false
    let targetId = editingId
    try {
      if (editingId) {
        await updatePayment(editingId, { ...form, type: 'pago_movil' })
      } else {
        const created = await createPayment({ ...form, type: 'pago_movil' }) as { id?: number }
        targetId = Number(created.id || 0)
        if (!targetId) throw new Error('El servidor no confirmó el medio de pago creado.')
      }
      paymentSaved = true
      if (selectedQr && targetId) await uploadPaymentQr(targetId, selectedQr)
      setForm(EMPTY_FORM)
      setEditingId(null)
      setSelectedQr(null)
      if (qrPreview) URL.revokeObjectURL(qrPreview)
      setQrPreview('')
      setExistingQrUrl(null)
      await load()
      await showAlert(editingId ? 'Los datos bancarios fueron actualizados.' : 'El medio de pago fue registrado.', { title: 'Guardado' })
    } catch (error: any) {
      if (paymentSaved && selectedQr) {
        if (!editingId && targetId) setEditingId(targetId)
        await load()
        await showAlert(`Los datos bancarios se guardaron, pero el QR no pudo cargarse: ${error?.data?.message || error?.message || 'error de carga'}. Puede reintentarlo sin volver a crear el medio de pago.`, { title: 'QR pendiente' })
      } else {
        await showAlert(error?.data?.message || error?.message || 'No se pudo guardar el medio de pago.', { title: 'Error' })
      }
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (row: PaymentMethod) => {
    setEditingId(row.id)
    setForm({ type: 'pago_movil', bank: row.bank, account: '', holder: row.holder, rif: row.rif, phone: row.phone })
    setSelectedQr(null)
    if (qrPreview) URL.revokeObjectURL(qrPreview)
    setQrPreview('')
    setExistingQrUrl(row.qr_url || null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSelectedQr(null)
    if (qrPreview) URL.revokeObjectURL(qrPreview)
    setQrPreview('')
    setExistingQrUrl(null)
  }

  const selectQr = (file: File | null) => {
    if (qrPreview) URL.revokeObjectURL(qrPreview)
    setSelectedQr(file)
    setQrPreview(file ? URL.createObjectURL(file) : '')
  }

  return (
    <section className="space-y-4">
      {!embedded && <h1 className="text-xl font-semibold">Medios de Pago</h1>}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        Estos datos se mostrarán a los solicitantes en el paso 3 para que realicen el Pago Móvil.
      </div>
      <form onSubmit={onSubmit} className={`${embedded ? 'border rounded-lg' : 'card'} p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end`}>
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
            <button className="btn btn-primary whitespace-nowrap" disabled={loading}>{loading ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Agregar'}</button>
          </div>
        </div>
        <label className="block sm:col-span-2 lg:col-span-3">
          <span className="block text-sm font-medium mb-1">QR bancario (opcional)</span>
          <input className="input w-full" type="file" accept="image/png,image/jpeg" onChange={e => selectQr(e.target.files?.[0] || null)} />
          <span className="mt-1 block text-xs text-slate-500">PNG o JPG, máximo 3 MB. Al reemplazarlo, verifique que corresponda al banco, teléfono y RIF mostrados.</span>
        </label>
        {(qrPreview || existingQrUrl) && (
          <div className="sm:col-span-2 lg:col-span-1 rounded-lg border border-slate-200 bg-white p-2">
            <img className="mx-auto h-32 w-32 object-contain" src={qrPreview || existingQrUrl || ''} alt="Vista previa del QR bancario" />
            {editingId && existingQrUrl && !qrPreview && <p className="mt-1 text-center text-xs text-amber-700">QR actual. Si modifica los datos bancarios, confirme que la imagen siga vigente.</p>}
          </div>
        )}
        {editingId && (
          <div className="sm:col-span-2 lg:col-span-4 text-right">
            <button type="button" className="text-sm text-slate-600 hover:underline" onClick={cancelEdit} disabled={loading}>Cancelar edición</button>
          </div>
        )}
      </form>
      {loadError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {loadError} <button type="button" className="font-semibold underline" onClick={() => void load()}>Reintentar</button>
        </div>
      )}
      <div className="card overflow-x-auto pb-2 pt-1">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-brand-800 text-white">
              <th className="text-left px-4 py-2">Banco</th>
              <th className="text-left px-4 py-2">Titular</th>
              <th className="text-left px-4 py-2">RIF</th>
              <th className="text-left px-4 py-2">Teléfono</th>
              <th className="text-left px-4 py-2">QR</th>
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
                <td className="px-4 py-2">
                  {r.qr_url ? <a href={r.qr_url} target="_blank" rel="noreferrer"><img className="h-14 w-14 rounded border object-contain" src={`${r.qr_url}?v=${encodeURIComponent(r.qr_updated_at || '')}`} alt={`QR de ${r.bank}`} /></a> : <span className="text-slate-400">Sin QR</span>}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button type="button" className="text-brand-700 hover:underline mr-3" onClick={() => startEdit(r)}>Editar</button>
                  {r.qr_url && <button type="button" className="text-amber-700 hover:underline mr-3" onClick={() => setConfirmDialog({ isOpen: true, title: 'Eliminar QR bancario', message: '¿Desea retirar la imagen QR de este medio de pago?', onConfirm: async () => {
                    try {
                      await deletePaymentQr(r.id)
                      if (editingId === r.id) setExistingQrUrl(null)
                      await load()
                    } catch (error: any) {
                      await showAlert(error?.data?.message || error?.message || 'No se pudo eliminar el QR.', { title: 'Error' })
                    }
                  } })}>Quitar QR</button>}
                  <button type="button" className="text-rose-700 hover:underline" onClick={() => setConfirmDialog({ isOpen: true, title: 'Eliminar medio de pago', message: '¿Está seguro de eliminar este medio de pago?', onConfirm: async () => {
                    try {
                      await deletePayment(r.id)
                      if (editingId === r.id) cancelEdit()
                      await load()
                    } catch (error: any) {
                      await showAlert(error?.data?.message || error?.message || 'No se pudo eliminar el medio de pago.', { title: 'Error' })
                    }
                  } })}>Eliminar</button>
                </td>
              </tr>
            ))}
            {!loadError && rows.length === 0 && (
              <tr><td className="px-4 py-6 text-center text-slate-500" colSpan={6}>Aún no hay medios de pago registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message} variant="danger" onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} />
    </section>
  )
}
