import { useEffect, useMemo, useState } from 'react'
import { PageBlock, PageDetail, PageRow, createPage, deletePage, getPage, listPages, updatePage } from '../lib/api'

function BlockEditor({block, onChange, onRemove, onMove}:{block:PageBlock; onChange:(b:PageBlock)=>void; onRemove:()=>void; onMove:(dir:-1|1)=>void}){
  if (block.type==='heading'){
    const p = block.props
    return (
      <div className="border rounded-lg p-3 space-y-2">
        <div className="text-xs font-semibold text-slate-600">Encabezado</div>
        <input className="input w-full" value={p.text} onChange={e=>onChange({...block, props:{...p, text:e.target.value}})} placeholder="Texto"/>
        <div className="flex gap-2">
          <select className="input" value={p.level} onChange={e=>onChange({...block, props:{...p, level: Number(e.target.value) as any}})}>
            {[1,2,3,4,5,6].map(n=> <option key={n} value={n}>H{n}</option>)}
          </select>
          <select className="input" value={p.align} onChange={e=>onChange({...block, props:{...p, align: e.target.value as any}})}>
            {['left','center','right'].map(a=> <option key={a} value={a}>{a}</option>)}
          </select>
          <div className="flex-1"/>
          <button className="btn btn-outline" onClick={()=>onMove(-1)}>↑</button>
          <button className="btn btn-outline" onClick={()=>onMove(1)}>↓</button>
          <button className="btn btn-danger" onClick={onRemove}>Eliminar</button>
        </div>
      </div>
    )
  }
  if (block.type==='paragraph'){
    const p = block.props
    return (
      <div className="border rounded-lg p-3 space-y-2">
        <div className="text-xs font-semibold text-slate-600">Párrafo</div>
        <textarea className="input w-full h-28" value={p.text} onChange={e=>onChange({...block, props:{...p, text:e.target.value}})} placeholder="Texto"/>
        <div className="flex gap-2 items-center">
          <select className="input" value={p.align} onChange={e=>onChange({...block, props:{...p, align: e.target.value as any}})}>
            {['left','center','right'].map(a=> <option key={a} value={a}>{a}</option>)}
          </select>
          <div className="flex-1"/>
          <button className="btn btn-outline" onClick={()=>onMove(-1)}>↑</button>
          <button className="btn btn-outline" onClick={()=>onMove(1)}>↓</button>
          <button className="btn btn-danger" onClick={onRemove}>Eliminar</button>
        </div>
      </div>
    )
  }
  // image
  const p:any = (block as any).props
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="text-xs font-semibold text-slate-600">Imagen</div>
      <input className="input w-full" value={p.url} onChange={e=>onChange({...block, props:{...p, url:e.target.value}})} placeholder="URL de la imagen"/>
      <input className="input w-full" value={p.alt||''} onChange={e=>onChange({...block, props:{...p, alt:e.target.value}})} placeholder="Texto alternativo"/>
      <div className="flex gap-2">
        <div className="flex-1"/>
        <button className="btn btn-outline" onClick={()=>onMove(-1)}>↑</button>
        <button className="btn btn-outline" onClick={()=>onMove(1)}>↓</button>
        <button className="btn btn-danger" onClick={onRemove}>Eliminar</button>
      </div>
    </div>
  )
}

function BlocksPreview({blocks}:{blocks:PageBlock[]}){
  return (
    <div className="space-y-4">
      {blocks.map(b=>{
        if (b.type==='heading'){
          const Tag = `h${b.props.level}` as any
          return <Tag key={b.id} className={{left:'text-left',center:'text-center',right:'text-right'}[b.props.align]}>{b.props.text}</Tag>
        }
        if (b.type==='paragraph'){
          return <p key={b.id} className={{left:'text-left',center:'text-center',right:'text-right'}[b.props.align]}>{b.props.text}</p>
        }
        return <img key={b.id} src={(b as any).props.url} alt={(b as any).props.alt||''} className="max-w-full rounded"/>
      })}
    </div>
  )
}

export default function Paginas(){
  const [rows, setRows] = useState<PageRow[]>([])
  const [selId, setSelId] = useState<number|undefined>()
  const [item, setItem] = useState<PageDetail|undefined>()
  const [loading, setLoading] = useState(false)

  const reload = ()=> listPages()
    .then(r=> setRows(r.items.filter(it=> it.slug !== 'contacto')))
    .catch(()=>setRows([]))
  useEffect(()=>{ reload() },[])

  const load = async(id:number)=>{
    setSelId(id); setLoading(true)
    try { const it = await getPage(id); setItem(it as any) } finally { setLoading(false) }
  }

  const newPage = async()=>{
    const r = await createPage({ title:'Nueva página', body_blocks:[] })
    reload(); load(r.id)
  }

  const update = async(partial: Partial<PageDetail>)=>{
    if (!item) return
    const upd = { ...item, ...partial }
    setItem(upd)
  }

  const save = async()=>{
    if (!item) return
    setLoading(true)
    try {
      await updatePage(item.id, { title:item.title, slug:item.slug, header_html:item.header_html||'', footer_html:item.footer_html||'', status:item.status, body_blocks:item.body_blocks })
      reload()
      alert('Guardado')
    } catch (e:any) {
      const msg = (e?.message||'').includes('slug_reserved') ? 'El slug "contacto" está reservado. Usa otro slug.' : 'Error al guardar'
      alert(msg)
    } finally { setLoading(false) }
  }

  const remove = async(id:number)=>{
    if (!confirm('¿Eliminar esta página?')) return
    await deletePage(id)
    setItem(undefined); setSelId(undefined); reload()
  }

  const addBlock = (type: PageBlock['type'])=>{
    if (!item) return
    const id = Math.random().toString(36).slice(2,10)
    const def: any = type==='heading' ? { id, type, props:{ text:'Título', level:2, align:'left' } }
      : type==='paragraph' ? { id, type, props:{ text:'Texto del párrafo', align:'left' } }
      : { id, type, props:{ url:'https://via.placeholder.com/800x400?text=Imagen', alt:'' } }
    setItem({ ...item, body_blocks:[...(item.body_blocks||[]), def] })
  }

  const setBlock = (idx:number, blk:PageBlock)=>{
    if (!item) return
    const copy = [...(item.body_blocks||[])]
    copy[idx] = blk
    setItem({ ...item, body_blocks:copy })
  }
  const moveBlock = (idx:number, dir:-1|1)=>{
    if (!item) return
    const copy = [...(item.body_blocks||[])]
    const j = idx + dir
    if (j<0 || j>=copy.length) return
    const tmp = copy[idx]; copy[idx] = copy[j]; copy[j] = tmp
    setItem({ ...item, body_blocks: copy })
  }
  const removeBlock = (idx:number)=>{
    if (!item) return
    const copy = [...(item.body_blocks||[])]
    copy.splice(idx,1)
    setItem({ ...item, body_blocks: copy })
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Páginas</h1>
        <button className="btn btn-primary" onClick={newPage}>Nueva página</button>
      </div>
      <div className="grid md:grid-cols-[320px,1fr] gap-4">
        <div className="card p-3">
          <div className="text-sm font-medium mb-2">Listado</div>
          <div className="divide-y">
            {rows.map(r=> (
              <div key={r.id} className={`py-2 px-2 rounded cursor-pointer ${selId===r.id?'bg-slate-100':''}`} onClick={()=>load(r.id)}>
                <div className="text-sm font-semibold">{r.title}</div>
                <div className="text-xs text-slate-600">/{r.slug}</div>
                <div className="text-[11px] text-slate-500">{r.status} · {new Date(r.updated_at).toLocaleString()}</div>
                <div className="mt-1 text-xs"><button className="text-rose-600 hover:underline" onClick={(e)=>{e.stopPropagation(); remove(r.id)}}>Eliminar</button></div>
              </div>
            ))}
            {rows.length===0 && <div className="text-sm text-slate-500 p-2">No hay páginas</div>}
          </div>
        </div>
        <div className="card p-4 space-y-3">
          {!item ? (
            <div className="text-sm text-slate-600">Seleccione una página para editar</div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600">Título</label>
                  <input className="input w-full" value={item.title} onChange={e=>update({ title:e.target.value })}/>
                </div>
                <div>
                  <label className="text-xs text-slate-600">Slug</label>
                  <input className="input w-full" value={item.slug} onChange={e=>update({ slug:e.target.value })}/>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600">Cabecera (HTML opcional)</label>
                  <textarea className="input w-full h-28" value={item.header_html||''} onChange={e=>update({ header_html:e.target.value })}/>
                </div>
                <div>
                  <label className="text-xs text-slate-600">Pie de página (HTML opcional)</label>
                  <textarea className="input w-full h-28" value={item.footer_html||''} onChange={e=>update({ footer_html:e.target.value })}/>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Cuerpo</div>
                  <div className="flex gap-2">
                    <button className="btn btn-outline" onClick={()=>addBlock('heading')}>+ Encabezado</button>
                    <button className="btn btn-outline" onClick={()=>addBlock('paragraph')}>+ Párrafo</button>
                    <button className="btn btn-outline" onClick={()=>addBlock('image')}>+ Imagen</button>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    {(item.body_blocks||[]).map((b,idx)=> (
                      <BlockEditor key={b.id} block={b} onChange={(nb)=>setBlock(idx,nb)} onMove={(d)=>moveBlock(idx,d)} onRemove={()=>removeBlock(idx)} />
                    ))}
                    {item.body_blocks?.length===0 && <div className="text-sm text-slate-500">Agrega bloques para construir esta página.</div>}
                  </div>
                  <div className="p-3 border rounded-xl bg-white">
                    <div className="prose max-w-none">
                      {item.header_html ? <div dangerouslySetInnerHTML={{__html:item.header_html}}/> : null}
                      <BlocksPreview blocks={item.body_blocks||[]}/>
                      {item.footer_html ? <div dangerouslySetInnerHTML={{__html:item.footer_html}}/> : null}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button className="btn btn-primary" disabled={loading} onClick={save}>{loading?'Guardando...':'Guardar'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
