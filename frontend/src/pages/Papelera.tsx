import { useState, useEffect } from 'react'
import { listTrashedLegal, restoreLegal, permanentDeleteLegal, emptyTrash, type LegalRequest } from '../lib/api'
import { IconTrash, IconArrowLeft } from '../components/icons'
import ConfirmDialog from '../components/ConfirmDialog'

export default function Papelera() {
  const [items, setItems] = useState<LegalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [confirmDialog, setConfirmDialog] = useState<{isOpen:boolean; title:string; message:string; variant:'danger'|'warning'|'info'; onConfirm:()=>void}>({isOpen:false, title:'', message:'', variant:'info', onConfirm:()=>{}})

  const loadTrash = async () => {
    setLoading(true)
    try {
      const r = await listTrashedLegal()
      setItems(r.items)
    } catch (e: any) {
      alert('Error al cargar papelera: ' + (e.message || 'Error desconocido'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrash()
  }, [])

  const handleRestore = async (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Restaurar publicación',
      message: '¿Restaurar esta publicación?',
      variant: 'info',
      onConfirm: async()=>{
        try {
          await restoreLegal(id)
          loadTrash()
          setSelected(new Set())
        } catch (e: any) {
          alert('Error: ' + (e.message || 'No se pudo restaurar'))
        }
      }
    })
  }

  const handlePermanentDelete = async (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar permanentemente',
      message: '⚠️ ADVERTENCIA: Esta acción eliminará permanentemente la publicación y NO se puede deshacer.\n\n¿Estás seguro de que deseas continuar?',
      variant: 'danger',
      onConfirm: async()=>{
        try {
          await permanentDeleteLegal(id)
          loadTrash()
          setSelected(new Set())
        } catch (e: any) {
          alert('Error: ' + (e.message || 'No se pudo eliminar'))
        }
      }
    })
  }

  const handleEmptyTrash = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Vaciar papelera',
      message: `⚠️ ADVERTENCIA: Esta acción eliminará permanentemente ${items.length} publicación(es) de la papelera y NO se puede deshacer.\n\n¿Estás completamente seguro?`,
      variant: 'danger',
      onConfirm: async()=>{
        try {
          const r = await emptyTrash()
          alert(r.message || `Se eliminaron ${r.count} publicaciones`)
          loadTrash()
          setSelected(new Set())
        } catch (e: any) {
          alert('Error: ' + (e.message || 'No se pudo vaciar la papelera'))
        }
      }
    })
  }

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return alert('No hay publicaciones seleccionadas')
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar seleccionadas',
      message: `⚠️ ADVERTENCIA: Esta acción eliminará permanentemente ${selected.size} publicación(es) y NO se puede deshacer.\n\n¿Estás seguro?`,
      variant: 'danger',
      onConfirm: async()=>{
        try {
          for (const id of Array.from(selected)) {
            await permanentDeleteLegal(id)
          }
          loadTrash()
          setSelected(new Set())
        } catch (e: any) {
          alert('Error: ' + (e.message || 'No se pudieron eliminar todas las publicaciones'))
          loadTrash()
        }
      }
    })
  }

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  const toggleSelectAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(items.map(i => i.id)))
    }
  }

  const prettyDate = (s?: string) => s ? s.split('-').reverse().join('/') : '-'
  const prettyStatus = (s?: string) => {
    if (!s) return '-'
    if (s === 'Borrador' || s === 'Pendiente') return 'Pendiente'
    if (s === 'Publicada' || s === 'Publicado') return 'Publicado'
    return s
  }

  const daysSinceDeleted = (deletedAt: string) => {
    const deleted = new Date(deletedAt)
    const now = new Date()
    const diff = now.getTime() - deleted.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    return days
  }

  const daysUntilAutoDelete = (deletedAt: string) => {
    return 30 - daysSinceDeleted(deletedAt)
  }

  return (
    <section className="space-y-4">
      <ConfirmDialog {...confirmDialog} onCancel={()=> setConfirmDialog({...confirmDialog, isOpen:false})} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <IconTrash className="w-6 h-6" />
            Papelera de reciclaje
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Las publicaciones se eliminarán automáticamente después de 30 días
          </p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button
              className="btn bg-red-600 text-white hover:bg-red-700"
              onClick={handleDeleteSelected}
            >
              Eliminar seleccionadas ({selected.size})
            </button>
          )}
          {items.length > 0 && (
            <button
              className="btn bg-red-700 text-white hover:bg-red-800"
              onClick={handleEmptyTrash}
            >
              🗑️ Vaciar papelera ({items.length})
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="card p-8 text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full mb-2"></div>
          <p className="text-slate-600">Cargando papelera...</p>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="card p-8 text-center">
          <IconTrash className="w-16 h-16 mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">La papelera está vacía</h3>
          <p className="text-slate-600">No hay publicaciones eliminadas</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="card overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-brand-800 text-white">
                <th className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selected.size === items.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4"
                  />
                </th>
                <th className="text-left px-4 py-2">N° orden</th>
                <th className="text-left px-4 py-2">Razón social</th>
                <th className="text-left px-4 py-2">Tipo</th>
                <th className="text-left px-4 py-2">Estado</th>
                <th className="text-left px-4 py-2">Fecha solicitud</th>
                <th className="text-left px-4 py-2">Eliminado hace</th>
                <th className="text-left px-4 py-2">Auto-eliminación</th>
                <th className="text-right px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const daysDeleted = daysSinceDeleted(item.deleted_at!)
                const daysLeft = daysUntilAutoDelete(item.deleted_at!)
                const isUrgent = daysLeft <= 7

                return (
                  <tr key={item.id} className={`border-t ${isUrgent ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-2 font-mono">{item.order_no || item.id}</td>
                    <td className="px-4 py-2">{item.name}</td>
                    <td className="px-4 py-2">{item.pub_type || 'Documento'}</td>
                    <td className="px-4 py-2">{prettyStatus(item.status)}</td>
                    <td className="px-4 py-2">{prettyDate(item.date)}</td>
                    <td className="px-4 py-2">
                      {daysDeleted === 0 ? 'Hoy' : daysDeleted === 1 ? '1 día' : `${daysDeleted} días`}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`font-semibold ${isUrgent ? 'text-red-700' : 'text-slate-600'}`}>
                        {daysLeft <= 0 ? 'Hoy' : daysLeft === 1 ? '1 día' : `${daysLeft} días`}
                        {isUrgent && ' ⚠️'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="text-emerald-700 hover:underline inline-flex items-center gap-1 text-xs"
                          onClick={() => handleRestore(item.id)}
                          title="Restaurar publicación"
                        >
                          <IconArrowLeft />
                          <span>Restaurar</span>
                        </button>
                        <button
                          className="text-red-700 hover:underline inline-flex items-center gap-1 text-xs"
                          onClick={() => handlePermanentDelete(item.id)}
                          title="Eliminar permanentemente"
                        >
                          <IconTrash />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="card p-4 bg-amber-50 border-amber-200">
          <h3 className="font-semibold text-amber-900 mb-2">ℹ️ Información importante</h3>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• Las publicaciones eliminadas se conservan durante <strong>30 días</strong></li>
            <li>• Después de 30 días, se eliminarán automáticamente de forma permanente</li>
            <li>• Puedes restaurar publicaciones individuales haciendo clic en "Restaurar"</li>
            <li>• Puedes seleccionar varias publicaciones y eliminarlas manualmente</li>
            <li>• El botón "Vaciar papelera" elimina TODAS las publicaciones permanentemente</li>
            <li>• Las publicaciones marcadas con ⚠️ se eliminarán en menos de 7 días</li>
          </ul>
        </div>
      )}
    </section>
  )
}
