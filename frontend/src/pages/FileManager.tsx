import { FormEvent, useCallback, useEffect, useState } from 'react'
import { listFiles, type FileRow } from '../lib/api'
import FileTable from '../components/FileTable'
import { IconRefresh, IconSearch } from '../components/icons'

export default function FileManager() {
    const [files, setFiles] = useState<FileRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const response = await listFiles({ q: search.trim(), status })
            setFiles(response.items)
        } catch (loadError: any) {
            setError(loadError?.message || 'No se pudo cargar el gestor de archivos.')
        } finally {
            setLoading(false)
        }
    }, [search, status])

    useEffect(() => { void load() }, [])

    const onFilter = (event: FormEvent) => {
        event.preventDefault()
        void load()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Gestor de Archivos</h1>
                    <p className="text-sm text-slate-600">Explora los archivos subidos al sistema.</p>
                </div>
            </div>

            <form className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end" onSubmit={onFilter}>
                <label className="block flex-1">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Buscar por nombre</span>
                    <span className="relative block">
                        <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input className="input w-full !pl-9" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nombre del archivo" />
                    </span>
                </label>
                <label className="block sm:w-56">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Estado</span>
                    <select className="input w-full" value={status} onChange={event => setStatus(event.target.value)}>
                        <option value="">Todos los estados</option>
                        <option value="uploaded">Cargado</option>
                        <option value="processed">Procesado</option>
                        <option value="replaced">Reemplazado</option>
                        <option value="processing_failed">Error de procesamiento</option>
                        <option value="validation_failed">Error de validación</option>
                    </select>
                </label>
                <button className="btn btn-primary justify-center" type="submit" disabled={loading}>Filtrar</button>
                <button className="btn btn-outline justify-center" type="button" onClick={() => void load()} disabled={loading}>
                    <IconRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
                </button>
            </form>

            <div className="card p-0 overflow-hidden">
                {error && (
                    <div className="border-b border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
                        {error}
                    </div>
                )}
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Cargando archivos...</div>
                ) : (
                    <FileTable rows={files} />
                )}
            </div>
        </div>
    )
}
