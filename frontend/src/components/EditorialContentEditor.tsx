import { useEffect, useState } from 'react'
import { createPage, getPage, listPages, updatePage, type PageBlock, type PageDetail } from '../lib/api'
import { useDialog } from '../contexts/DialogContext'

type Faq = { question: string; answer: string }
export default function EditorialContentEditor({ slug, title, faq = false }: { slug: string; title: string; faq?: boolean }) {
  const { showAlert, confirmAction } = useDialog()
  const [page, setPage] = useState<PageDetail>()
  const [text, setText] = useState('')
  const [questions, setQuestions] = useState<Faq[]>([])
  const [status, setStatus] = useState('draft')
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const load = async () => {
    setBusy(true); setError('')
    try {
      const { items } = await listPages()
      const row = items.find(p => p.slug === slug)
      const data = row ? await getPage(row.id) : undefined
      setPage(data); setStatus(data?.status || 'draft')
      const htmlText = (html: string) => {
        const document = new DOMParser().parseFromString(html, 'text/html')
        document.querySelectorAll('p,br,li,h1,h2,h3,h4,h5,h6').forEach(node => node.append(document.createTextNode('\n')))
        return (document.body.textContent || '').trim()
      }
      setText([htmlText(data?.header_html || ''), (data?.body_blocks || []).filter(b => b.type !== 'image').map(b => (b.type === 'heading' ? '#'.repeat(b.props.level) + ' ' : '') + b.props.text).join('\n\n'), htmlText(data?.footer_html || '')].filter(Boolean).join('\n\n'))
      const entries: Faq[] = []
      for (const block of data?.body_blocks || []) {
        if (block.type === 'heading') entries.push({ question: block.props.text, answer: '' })
        else if (block.type === 'paragraph' && entries.length) entries[entries.length - 1].answer += (entries[entries.length - 1].answer ? '\n\n' : '') + block.props.text
      }
      setQuestions(entries)
    } catch (e: any) { setError(e.message || 'No se pudo cargar el contenido.') }
    finally { setBusy(false) }
  }
  useEffect(() => { void load() }, [slug])
  const save = async () => {
    if (faq && questions.some(q => !q.question.trim() || !q.answer.trim())) { setError('Complete pregunta y respuesta en cada registro.'); return }
    if (!faq && !text.trim()) { setError('Introduzca el contenido completo.'); return }
    setBusy(true); setError('')
    try {
      const body_blocks: PageBlock[] = faq ? questions.flatMap(q => [
        { id: crypto.randomUUID(), type: 'heading' as const, props: { text: q.question.trim(), level: 2 as const, align: 'left' as const } },
        { id: crypto.randomUUID(), type: 'paragraph' as const, props: { text: q.answer.trim(), align: 'left' as const } },
      ]) : text.split(/\n\s*\n/).filter(Boolean).map(part => {
        const match = /^(#{1,6})\s+([\s\S]*)$/.exec(part)
        return match ? { id: crypto.randomUUID(), type: 'heading' as const, props: { text: match[2], level: match[1].length as 1|2|3|4|5|6, align: 'left' as const } } : { id: crypto.randomUUID(), type: 'paragraph' as const, props: { text: part, align: 'left' as const } }
      })
      if (page) {
        const current = await getPage(page.id)
        if (JSON.stringify(current.body_blocks) !== JSON.stringify(page.body_blocks) || current.header_html !== page.header_html || current.footer_html !== page.footer_html || current.updated_at !== page.updated_at) throw new Error('El contenido cambió en otra sesión. Recargue antes de guardar.')
        await updatePage(page.id, { body_blocks, status, ...(!faq ? { header_html: '', footer_html: '' } : {}) })
      } else {
        await createPage({ slug, title, body_blocks, status })
      }
      await load()
      await showAlert('Contenido guardado. La página pública muestra los cambios cuando su estado es Publicado.', { title: 'Guardado' })
    } catch (e: any) { setError(e.message || 'No se pudo guardar.') }
    finally { setBusy(false) }
  }
  return <section className="space-y-4">
    <div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-semibold">{title}</h2><a href={'/p/' + slug} target="_blank" rel="noreferrer" className="text-brand-700 underline">Consultar página pública</a></div>
    {error && <p role="alert" className="rounded bg-rose-50 p-3 text-rose-700">{error}</p>}
    {busy && <p>Cargando/guardando contenido...</p>}
    <fieldset disabled={busy} className="space-y-4">
      <label className="block text-sm">Estado de la página<select className="input ml-3" value={status} onChange={e => setStatus(e.target.value)}><option value="draft">Borrador</option><option value="published">Publicado</option></select></label>
      {faq ? <div className="space-y-4">{questions.map((q, i) => <div key={i} className="rounded border p-4 space-y-2">
        <label className="block text-sm">Pregunta<input className="input w-full mt-1" value={q.question} onChange={e => setQuestions(questions.map((v,j) => j === i ? { ...v, question: e.target.value } : v))} /></label>
        <label className="block text-sm">Respuesta<textarea className="input w-full mt-1 h-28" value={q.answer} onChange={e => setQuestions(questions.map((v,j) => j === i ? { ...v, answer: e.target.value } : v))} /></label>
        <button type="button" className="text-rose-700 underline" onClick={async () => { if (await confirmAction('¿Eliminar esta pregunta? Guarde después para aplicar el cambio.', { title: 'Eliminar pregunta', danger: true })) setQuestions(questions.filter((_,j) => j !== i)) }}>Eliminar</button>
      </div>)}<button type="button" className="btn btn-outline" onClick={() => setQuestions([...questions, { question: '', answer: '' }])}>Agregar pregunta</button></div> :
        <label className="block text-sm">Contenido completo<textarea className="input w-full min-h-[360px] mt-2" value={text} onChange={e => setText(e.target.value)} placeholder="Pegue el texto completo. Separe párrafos con una línea vacía. Puede usar ## para los títulos." /></label>}
      <div className="flex gap-3"><button type="button" className="btn btn-primary" onClick={() => void save()}>Guardar contenido</button><button type="button" className="btn btn-outline" onClick={() => void load()}>Recargar</button></div>
    </fieldset>
  </section>
}
