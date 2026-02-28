import { useEffect, useState, useRef } from 'react'
import { listFiles, uploadFiles, FileRow, deleteFile, listTrashedFiles, restoreFile, permanentDeleteFile, emptyFileTrash } from '../lib/api'
import { IconUpload, IconSearch, IconDocs, IconCheck, IconTrash } from './icons'
import { LoadingSpinner } from './LoadingSpinner'
import ConfirmDialog from './ConfirmDialog'

interface MediaGalleryProps {
    onSelect?: (file: FileRow) => void
    selectable?: boolean
}

export default function MediaGallery({ onSelect, selectable }: MediaGalleryProps) {
    const [files, setFiles] = useState<FileRow[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [search, setSearch] = useState('')
    const [viewMode, setViewMode] = useState<'active' | 'trash'>('active')
    const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => { } })
    const fileInputRef = useRef<HTMLInputElement>(null)

    const load = () => {
        setLoading(true)
        if (viewMode === 'trash') {
            listTrashedFiles()
                .then(res => setFiles(res.items))
                .catch(console.error)
                .finally(() => setLoading(false))
        } else {
            listFiles({ q: search })
                .then(res => setFiles(res.items))
                .catch(console.error)
                .finally(() => setLoading(false))
        }
    }

    useEffect(() => {
        const timer = setTimeout(load, 300)
        return () => clearTimeout(timer)
    }, [search, viewMode])

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

    const openUrl = (id: number) => {
        const url = `${import.meta.env.VITE_BACKEND_URL || ''}/api/uploads/${id}`
        window.open(url, '_blank')
    }

    const isImage = (type: string) => ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(type.toLowerCase())

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Search Bar & Tabs */}
                <div className="flex flex-1 items-center gap-2">
                    {!selectable && (
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button className={`px-3 py-1.5 text-sm font-medium rounded-md ${viewMode === 'active' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setViewMode('active')}>Activos</button>
                            <button className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1 ${viewMode === 'trash' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setViewMode('trash')}><IconTrash className="w-4 h-4" /> Papelera</button>
                        </div>
                    )}
                    {viewMode === 'active' && (
                        <div className="relative flex-1 max-w-sm">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar archivos..."
                                className="input pl-10 w-full"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    {viewMode === 'trash' && files.length > 0 && !selectable && (
                        <button className="btn btn-danger text-sm px-3 flex items-center gap-1" onClick={() => setConfirmDialog({ isOpen: true, title: 'Vaciar papelera', message: '¿Estás seguro de eliminar todos los archivos de la papelera permanentemente?', onConfirm: async () => { await emptyFileTrash(); load() } })}>
                            <IconTrash className="w-4 h-4" /> Vaciar
                        </button>
                    )}
                    {viewMode === 'active' && (
                        <>
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
                        </>
                    )}
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
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-3 bg-slate-50">
                                    <IconDocs className="w-10 h-10 mb-2 text-slate-400" />
                                    <span className="text-xs text-center break-words font-medium line-clamp-3 w-full" title={file.name}>{file.name}</span>
                                    <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{file.type}</span>
                                </div>
                            )}

                            {/* Overlay */}
                            {!selectable && viewMode === 'active' && (
                                <div className="absolute inset-0 bg-slate-900/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-white" onClick={e => e.stopPropagation()}>
                                    <p className="text-xs font-medium truncate mb-2" title={file.name}>{file.name}</p>
                                    <div className="flex gap-2 text-xs">
                                        <button onClick={() => openUrl(file.id)} className="flex-[2] bg-white/20 hover:bg-white/30 py-1.5 rounded text-center transition-colors font-semibold">
                                            Abrir
                                        </button>
                                        <button onClick={() => setConfirmDialog({ isOpen: true, title: 'Eliminar archivo', message: '¿Enviar este archivo a la papelera?', onConfirm: async () => { await deleteFile(file.id); load() } })} className="flex-1 bg-red-500/80 hover:bg-red-500 py-1.5 rounded flex items-center justify-center transition-colors text-white" title="Eliminar">
                                            <IconTrash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                            {!selectable && viewMode === 'trash' && (
                                <div className="absolute inset-0 bg-slate-900/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-white" onClick={e => e.stopPropagation()}>
                                    <p className="text-xs font-medium truncate mb-2" title={file.name}>{file.name}</p>
                                    <div className="flex gap-2 text-xs">
                                        <button onClick={async () => { await restoreFile(file.id); load() }} className="flex-1 bg-green-500/80 hover:bg-green-500 py-1.5 rounded text-center transition-colors font-semibold">
                                            Restaurar
                                        </button>
                                        <button onClick={() => setConfirmDialog({ isOpen: true, title: 'Eliminar definitivamente', message: '¿Eliminar permanentemente este archivo?', onConfirm: async () => { await permanentDeleteFile(file.id); load() } })} className="flex-1 bg-red-500/80 hover:bg-red-500 py-1.5 rounded text-center flex justify-center items-center transition-colors text-white" title="Eliminar">
                                            <IconTrash className="w-4 h-4" />
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
            {confirmDialog.isOpen && <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} />}
        </div>
    )
}
