import { useEffect, useState } from 'react'
import { SeoMetadata, listSeoAdmin, saveSeoAdmin, deleteSeoAdmin } from '../lib/api'

export default function SeoManager() {
  const [items, setItems] = useState<SeoMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SeoMetadata | null>(null)
  
  const [form, setForm] = useState<SeoMetadata>({ path: '', title: '', description: '', og_image: '', robots: 'index, follow' })

  const load = async () => {
    setLoading(true)
    try {
      const res = await listSeoAdmin()
      setItems(res.items)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleEdit = (item: SeoMetadata) => {
    setSelected(item)
    setForm({ ...item })
  }

  const handleNew = () => {
    setSelected(null)
    setForm({ path: '/', title: '', description: '', og_image: '', robots: 'index, follow' })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await saveSeoAdmin(form)
      alert('Guardado exitosamente')
      load()
      handleNew()
    } catch (e: any) {
      alert('Error al guardar: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (path: string) => {
    if (!confirm('¿Seguro que deseas eliminar la regla SEO para ' + path + '?')) return
    setLoading(true)
    try {
      await deleteSeoAdmin(path)
      load()
      if (selected?.path === path) handleNew()
    } catch (e: any) {
      alert('Error al eliminar: ' + e.message)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestor SEO (Yoast)</h1>
          <p className="text-slate-500 text-sm">Controla cómo aparecen tus páginas en Google y Redes Sociales.</p>
        </div>
        <button onClick={handleNew} className="btn btn-primary">Añadir Regla SEO</button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* LIST */}
        <div className="card bg-white shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700">
            Reglas Configuradas
          </div>
          <div className="overflow-y-auto p-4 flex-1">
            {loading && items.length === 0 ? <p className="text-sm text-slate-500">Cargando...</p> : null}
            {!loading && items.length === 0 ? <p className="text-sm text-slate-500">No hay reglas SEO creadas.</p> : null}
            
            <div className="space-y-3">
              {items.map(item => (
                <div 
                  key={item.path} 
                  className={`p-3 rounded border transition-colors cursor-pointer ${form.path === item.path ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-300'}`}
                  onClick={() => handleEdit(item)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-800 text-white rounded">{item.path}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.path) }} 
                      className="text-rose-500 hover:text-rose-700 text-xs font-semibold"
                    >
                      Eliminar
                    </button>
                  </div>
                  <div className="text-sm font-semibold truncate">{item.title || '(Sin título)'}</div>
                  <div className="text-xs text-slate-500 truncate">{item.description || '(Sin descripción)'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FORM */}
        <div className="card bg-white shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700">
            {selected ? `Editar SEO: ${selected.path}` : 'Nueva Regla SEO'}
          </div>
          <form onSubmit={handleSave} className="p-4 flex-1 space-y-4">
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ruta (URL Path)</label>
              <input 
                type="text" 
                className="input w-full font-mono text-sm" 
                placeholder="Ej: /contacto, /ediciones" 
                value={form.path}
                onChange={e => setForm({...form, path: e.target.value})}
                required
                disabled={!!selected} // No se puede cambiar el path de una regla existente
              />
              <p className="text-xs text-slate-500 mt-1">Usa "/" para la página de inicio. Inicia siempre con "/".</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Título SEO</label>
              <input 
                type="text" 
                className="input w-full text-sm" 
                placeholder="El título que aparecerá en Google" 
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Meta Descripción</label>
              <textarea 
                className="input w-full text-sm h-24" 
                placeholder="Resumen atractivo para los buscadores (max 160 caracteres)" 
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
              />
              <p className="text-xs text-slate-500 mt-1 text-right">{form.description?.length || 0}/160</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Imagen (Open Graph)</label>
              <input 
                type="url" 
                className="input w-full text-sm" 
                placeholder="https://..." 
                value={form.og_image}
                onChange={e => setForm({...form, og_image: e.target.value})}
              />
              <p className="text-xs text-slate-500 mt-1">Imagen que se mostrará al compartir en WhatsApp/Facebook (1200x630px ideal).</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Indexación (Robots)</label>
              <select 
                className="input w-full text-sm" 
                value={form.robots}
                onChange={e => setForm({...form, robots: e.target.value})}
              >
                <option value="index, follow">index, follow (Predeterminado - Recomendado)</option>
                <option value="noindex, follow">noindex, follow</option>
                <option value="noindex, nofollow">noindex, nofollow (Ocultar completamente)</option>
              </select>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button type="submit" disabled={loading || !form.path.trim()} className="btn btn-primary">
                {loading ? 'Guardando...' : 'Guardar SEO'}
              </button>
            </div>

          </form>
        </div>
      </div>
      
      {/* PREVIEW */}
      {form.title && (
        <div className="card p-6 mt-6 max-w-2xl">
          <h3 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wider">Vista Previa (Google Search)</h3>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-sm text-[#202124] truncate flex items-center gap-2 mb-1">
              <span className="bg-slate-100 rounded-full w-6 h-6 inline-block"></span>
              <span>diariomercantil.com <span className="text-slate-500">› {form.path.replace(/^\//, '')}</span></span>
            </div>
            <div className="text-xl text-[#1a0dab] hover:underline cursor-pointer truncate mb-1">
              {form.title || 'Título de ejemplo de tu página web'}
            </div>
            <div className="text-sm text-[#4d5156] line-clamp-2 leading-snug">
              {form.description || 'Proporciona una meta descripción relevante y atractiva para que los usuarios hagan clic en tu resultado de búsqueda.'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
