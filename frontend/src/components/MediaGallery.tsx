import { useEffect, useState, useRef } from 'react'
import { listFiles, uploadFiles, FileRow } from '../lib/api'
import { IconUpload, IconSearch, IconDocs, IconCheck } from './icons'
import { LoadingSpinner } from './LoadingSpinner'

interface MediaGalleryProps {
    onSelect?: (file: FileRow) => void
    selectable?: boolean
}

export default function MediaGallery({ onSelect, selectable }: MediaGalleryProps) {
    const [files, setFiles] = useState<FileRow[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [search, setSearch] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const load = () => {
        setLoading(true)
        listFiles({ q: search })
            .then(res => setFiles(res.items))
            .catch(console.error)
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        const timer = setTimeout(load, 300)
        return () => clearTimeout(timer)
    }, [search])

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return
        setUploading(true)
        try {
            const filesToUpload = Array.from(e.target.files)
            await uploadFiles(filesToUpload)
            load() // Reload list
        } catch (error) {
            console.error(error)
            alert('Error al subir archivos')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const copyUrl = (id: number) => {
        const url = `${import.meta.env.VITE_BACKEND_URL || ''}/api/uploads/${id}`
        navigator.clipboard.writeText(url)
        alert('URL copiada al portapapeles')
    }

    const isImage = (type: string) => ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(type.toLowerCase())

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Search Bar */}
                <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar archivos por nombre..."
                        className="input pl-10 w-full"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <input
                        type="file"
                        multiple
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleUpload}
                        accept="image/*,application/pdf"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-outline flex items-center gap-2"
                        disabled={uploading}
                    >
                        {uploading ? <LoadingSpinner className="w-4 h-4" /> : <IconUpload className="w-4 h-4" />}
                        Subir
                    </button>
                </div>
            </div>

            {/* Gallery Grid */}
            {loading && files.length === 0 ? (
                <div className="p-12 text-center">
                    <LoadingSpinner className="mx-auto mb-2" />
                    <p className="text-slate-500">Cargando medios...</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-1">
                    {files.map(file => (
                        <div
                            key={file.id}
                            className={`group relative aspect-square bg-slate-100 rounded-lg border border-slate-200 overflow-hidden hover:shadow-md transition-all cursor-pointer ${selectable ? 'hover:ring-2 hover:ring-brand-500' : ''}`}
                            onClick={() => selectable && onSelect?.(file)}
                        >
                            {isImage(file.type) ? (
                                <img
                                    src={`${import.meta.env.VITE_BACKEND_URL || ''}/api/uploads/${file.id}`}
                                    alt={file.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2">
                                    <IconDocs className="w-12 h-12 mb-2" />
                                    <span className="text-xs text-center break-all font-medium uppercase">{file.type}</span>
                                </div>
                            )}

                            {/* Overlay */}
                            {!selectable && (
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-white" onClick={e => e.stopPropagation()}>
                                    <p className="text-xs font-medium truncate mb-1" title={file.name}>{file.name}</p>
                                    <div className="flex gap-2 text-xs">
                                        <button
                                            onClick={() => copyUrl(file.id)}
                                            className="flex-1 bg-white/20 hover:bg-white/30 py-1 rounded text-center transition-colors"
                                        >
                                            Copiar URL
                                        </button>
                                    </div>
                                </div>
                            )}
                            {selectable && (
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-brand-500 text-white p-1 rounded-full shadow-lg">
                                        <IconCheck className="w-4 h-4" />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {!loading && files.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                            No se encontraron archivos.
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
