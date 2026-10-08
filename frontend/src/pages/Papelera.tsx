import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listTrashedLegal, listRetiredEditions, restoreLegal, restoreEdition, permanentDeleteLegal, permanentDeleteEdition, getTrashedLegal, getTrashedEdition, type LegalRequest, type Edition } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { useDialog } from '../contexts/DialogContext'
import { IconTrash } from '../components/icons'

type Preview = { title: string; description: string; links: { title: string; url: string }[]; rows: string[] }

export default function Papelera() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'ediciones' ? 'ediciones' : 'publicaciones'
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showAlert, confirmAction } = useDialog()
  const [publications, setPublications] = useState<LegalRequest[]>([])
  const [editions, setEditions] = useState<Edition[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [pubs, eds] = await Promise.all([listTrashedLegal(), listRetiredEditions()])
      setPublications(pubs.items); setEditions(eds.items)
    } catch (error) {
      await showAlert(error instanceof Error ? error.message : 'No se pudo cargar la papelera.', { title: 'Error' })
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  async function restore(id: number, edition: boolean) {
    const message = edition
      ? 'La edición volverá a Borrador con el mismo CVE. Verifica sus publicaciones y carga nuevamente el PDF final antes de publicar. Si su número fue reutilizado o una publicación pertenece a otra edición activa, se informará el conflicto.'
      : 'La publicación volverá a Por verificar y conservará sus pagos y documentos. Se abrirá su ficha para corregirla y verificarla nuevamente.'
    if (!await confirmAction(message, { title: 'Restaurar para editar', confirmText: 'Restaurar y editar' })) return
    setBusy(true)
    try {
      if (edition) await restoreEdition(id)
      else await restoreLegal(id)
      navigate(edition ? '/dashboard/ediciones?edition=' + id : '/dashboard/publicaciones/' + id)
    } catch (error) {
      await showAlert(error instanceof Error ? error.message : 'No se pudo restaurar.', { title: 'No se pudo restaurar' })
    } finally { setBusy(false) }
  }

  async function remove(id: number, edition: boolean) {
    if (!await confirmAction('Esta eliminación es definitiva y no se puede deshacer. Se eliminará su historial propio. Los archivos usados por otros registros se conservarán. ¿Continuar?', { title: 'Eliminar definitivamente', confirmText: 'Eliminar definitivamente' })) return
    setBusy(true)
    try {
      if (edition) await permanentDeleteEdition(id)
      else await permanentDeleteLegal(id)
      setPreview(null); await load()
    } catch (error) {
      await showAlert(error instanceof Error ? error.message : 'No se pudo eliminar.', { title: 'No se pudo eliminar' })
    } finally { setBusy(false) }
  }

  async function inspect(id: number, edition: boolean) {
    setBusy(true)
    try {
      if (edition) {
        const data = await getTrashedEdition(id)
        setPreview({ title: data.edition.code, description: 'Composición conservada de la edición en papelera.',
          links: data.edition.file_url ? [{ title: 'Consultar PDF conservado', url: data.edition.file_url }] : [],
          rows: data.orders.map(o => (o.order_no || '#' + o.id) + ' — ' + o.name + ' · ' + o.status + (o.deleted_at ? ' · En papelera' : '')) })
      } else {
        const data = await getTrashedLegal(id)
        setPreview({ title: data.item.name, description: 'Documentos y pagos conservados. Restaura la publicación para editarla.',
          links: data.files.map(f => ({ title: f.name, url: '/api/uploads/' + f.file_id })),
          rows: data.payments.map(p => 'Pago ' + (p.ref || '#' + p.id) + ' · Bs. ' + p.amount_bs + ' · ' + p.status) })
      }
    } catch (error) {
      await showAlert(error instanceof Error ? error.message : 'No se pudo cargar el detalle.', { title: 'Error' })
    } finally { setBusy(false) }
  }

  return <section className="space-y-5">
    <header>
      <h1 className="text-2xl font-semibold flex items-center gap-2"><IconTrash /> Papelera</h1>
      <p className="text-sm text-slate-600 mt-2">Los elementos se conservan hasta que decidas restaurarlos o eliminarlos definitivamente. No se borran automáticamente.</p>
    </header>
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tipo de papelera">
      <button role="tab" aria-selected={tab === 'publicaciones'} className={'btn ' + (tab === 'publicaciones' ? 'btn-primary' : 'btn-outline')} onClick={() => { setParams({ tab: 'publicaciones' }); setPreview(null) }}>Publicaciones ({publications.length})</button>
      <button role="tab" aria-selected={tab === 'ediciones'} className={'btn ' + (tab === 'ediciones' ? 'btn-primary' : 'btn-outline')} onClick={() => { setParams({ tab: 'ediciones' }); setPreview(null) }}>Ediciones ({editions.length})</button>
    </div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      Al enviar una edición a la papelera, sus publicaciones vuelven a <strong>Por verificar</strong>. Tras verificarlas, podrás seleccionarlas nuevamente. Restaurar una edición conserva su CVE y exige un nuevo PDF final.
    </div>
    {loading ? <p role="status">Cargando papelera…</p> : <div className="card overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead><tr className="border-b bg-slate-50"><th className="p-4">{tab === 'ediciones' ? 'Edición / CVE' : 'Publicación'}</th><th className="p-4">Estado anterior</th><th className="p-4">En papelera desde</th><th className="p-4">Acciones</th></tr></thead>
        <tbody>
          {tab === 'ediciones' ? editions.map(e => <tr key={e.id} className="border-b">
            <td className="p-4"><strong>{e.code}</strong><div className="font-mono text-xs">{e.cve}</div><div>{e.orders_count} publicaciones · {e.date}</div></td>
            <td className="p-4">{e.status}</td><td className="p-4">{e.deleted_at}</td>
            <td className="p-4"><div className="flex flex-wrap gap-2">
              <button className="btn btn-outline" disabled={busy} onClick={() => inspect(e.id, true)}>Ver detalle</button>
              <button className="btn btn-primary" disabled={busy} onClick={() => restore(e.id, true)}>Restaurar y editar</button>
              {e.can_permanently_delete && user?.role === 'superadmin' && <button className="btn btn-danger" disabled={busy} onClick={() => remove(e.id, true)}>Eliminar definitivamente</button>}
            </div></td>
          </tr>) : publications.map(p => <tr key={p.id} className="border-b">
            <td className="p-4"><strong>{p.name}</strong><div>{p.order_no || '#' + p.id} · {p.pub_type || 'Documento'}</div></td>
            <td className="p-4">{p.status}</td><td className="p-4">{p.deleted_at}</td>
            <td className="p-4"><div className="flex flex-wrap gap-2">
              <button className="btn btn-outline" disabled={busy} onClick={() => inspect(p.id, false)}>Ver detalle</button>
              <button className="btn btn-primary" disabled={busy} onClick={() => restore(p.id, false)}>Restaurar y editar</button>
              {p.can_permanently_delete && user?.role === 'superadmin' && <button className="btn btn-danger" disabled={busy} onClick={() => remove(p.id, false)}>Eliminar definitivamente</button>}
            </div></td>
          </tr>)}
          {(tab === 'ediciones' ? editions : publications).length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-500">No hay {tab} en la papelera.</td></tr>}
        </tbody>
      </table>
    </div>}
    {preview && <aside className="card p-5 space-y-3" aria-label="Detalle en papelera">
      <div className="flex justify-between gap-3"><h2 className="font-semibold">{preview.title}</h2><button className="btn btn-outline" onClick={() => setPreview(null)}>Cerrar detalle</button></div>
      <p>{preview.description}</p>
      <ul className="space-y-2">{preview.rows.map((row, i) => <li key={i}>{row}</li>)}</ul>
      <div className="flex flex-wrap gap-3">{preview.links.map(link => <a key={link.url} className="text-brand-700 underline" href={link.url} target="_blank" rel="noreferrer">{link.title}</a>)}</div>
    </aside>}
  </section>
}
