import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteFile, getFile, retryFile, type FileRow } from '../lib/api'
import { subscribeEvents } from '../lib/sse'
import StatusPill from '../components/StatusPill'
import { IconArrowLeft, IconDownload, IconExternal, IconRefresh, IconTrash } from '../components/icons'
import { useDialog } from '../contexts/DialogContext'
import { fileContentUrl } from '../lib/fileRoutes'

type FileEvent = { ts: string; type: string; message: string }

export default function FileDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmAction, showAlert } = useDialog()
  const fileId = Number(id)
  const [data, setData] = useState<{ file: FileRow; events: FileEvent[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!Number.isInteger(fileId) || fileId < 1) {
      setError('El identificador del archivo no es válido.')
      setLoading(false)
      return
    }
    setError('')
    try {
      setData(await getFile(fileId))
    } catch (loadError: any) {
      setError(loadError?.status === 404 ? 'El archivo no existe o fue eliminado.' : loadError?.message || 'No se pudo cargar el archivo.')
    } finally {
      setLoading(false)
    }
  }, [fileId])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!Number.isInteger(fileId) || fileId < 1) return
    const off = subscribeEvents(event => { if (Number(event.file_id) === fileId) void load() })
    return off
  }, [fileId, load])

  if (loading) return <div className="card p-8 text-center text-slate-500">Cargando archivo...</div>
  if (error || !data) {
    return (
      <div className="card space-y-4 p-6">
        <h1 className="text-xl font-semibold text-slate-900">Archivo no disponible</h1>
        <p className="text-sm text-rose-700" role="alert">{error}</p>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-outline" type="button" onClick={() => { setLoading(true); void load() }}><IconRefresh /> Reintentar</button>
          <Link className="btn btn-primary" to="/dashboard/archivos"><IconArrowLeft /> Volver al gestor</Link>
        </div>
      </div>
    )
  }
  const { file, events } = data
  const available = file.file_exists !== false
  const contentUrl = file.content_url || (available ? fileContentUrl(file.id) : '')
  const downloadUrl = file.download_url || (available ? fileContentUrl(file.id, true) : '')
  const canRetry = ['processing_failed', 'validation_failed', 'upload_failed'].includes(file.status)

  async function onRetry() {
    setBusy(true)
    try {
      await retryFile(file.id)
      await load()
    } catch (retryError: any) {
      await showAlert(retryError?.message || 'No se pudo reintentar el procesamiento.', { title: 'Error' })
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    const confirmed = await confirmAction(`¿Enviar “${file.name}” a la papelera?`, { title: 'Eliminar archivo', danger: true, confirmText: 'Enviar a papelera' })
    if (!confirmed) return
    setBusy(true)
    try {
      await deleteFile(file.id)
      navigate('/dashboard/archivos', { replace: true })
    } catch (deleteError: any) {
      await showAlert(deleteError?.message || 'No se pudo eliminar el archivo.', { title: 'Archivo no eliminado' })
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900" to="/dashboard/archivos">
        <IconArrowLeft className="h-4 w-4" /> Volver al gestor
      </Link>
      <div className="card flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="break-words text-xl font-semibold">{file.name}</h1>
          <div className="mt-1 text-sm text-slate-500">ID #{file.id} • {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.toUpperCase()}</div>
          {!available && <p className="mt-2 text-sm font-medium text-rose-700">El archivo físico no está disponible en el almacenamiento.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={file.status} />
          {contentUrl && <a className="btn btn-outline" href={contentUrl} target="_blank" rel="noreferrer"><IconExternal /> Abrir</a>}
          {downloadUrl && <a className="btn btn-outline" href={downloadUrl}><IconDownload /> Descargar</a>}
          {canRetry && <button className="btn btn-outline" type="button" onClick={() => void onRetry()} disabled={busy}><IconRefresh /> Reintentar</button>}
          <button className="btn bg-rose-600 text-white hover:bg-rose-700" type="button" onClick={() => void onDelete()} disabled={busy}><IconTrash /> Papelera</button>
        </div>
      </div>
      <div className="card p-5">
        <h2 className="mb-3 font-medium">Historial del archivo</h2>
        <ul className="space-y-2 text-sm">
          {events.map((event, index) => (
            <li key={`${event.ts}-${index}`} className="flex flex-col gap-1 border-t border-slate-100 py-2 first:border-0 sm:flex-row sm:items-center sm:justify-between">
              <div><span className="font-medium">{event.type}:</span> {event.message}</div>
              <time className="text-slate-500">{new Date(event.ts).toLocaleString()}</time>
            </li>
          ))}
          {events.length === 0 && <li className="py-4 text-slate-500">Este archivo todavía no registra eventos.</li>}
        </ul>
      </div>
    </div>
  )
}
