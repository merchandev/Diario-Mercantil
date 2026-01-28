import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Search, Trash2, Edit2, FileText, Eye, CheckCircle, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { listPublications, createPublication, updatePublication, deletePublication, Publication } from '../../lib/api'
import { verifySuperAdmin } from '../../lib/api'

export default function Publications() {
    const [publications, setPublications] = useState<Publication[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingPub, setEditingPub] = useState<Publication | null>(null)
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        status: 'published'
    })

    const navigate = useNavigate()

    useEffect(() => {
        verifySuperAdmin().catch(() => navigate('/lotus/'))
        loadPublications()
    }, [navigate])

    async function loadPublications() {
        try {
            const res = await listPublications()
            setPublications(res.items)
        } catch (error) {
            console.error('Error loading publications:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        try {
            if (editingPub) {
                await updatePublication(editingPub.id, {
                    title: formData.title,
                    content: formData.content,
                    status: formData.status
                })
            } else {
                await createPublication({
                    title: formData.title,
                    content: formData.content,
                    status: formData.status
                })
            }
            setShowModal(false)
            setEditingPub(null)
            setFormData({ title: '', content: '', status: 'published' })
            loadPublications()
        } catch (error) {
            console.error('Error saving publication:', error)
            alert('Error al guardar publicación')
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('¿Estás seguro de eliminar esta publicación y todo su contenido?')) return
        try {
            await deletePublication(id)
            loadPublications()
        } catch (error) {
            console.error('Error deleting publication:', error)
            alert('Error al eliminar publicación')
        }
    }

    function handleEdit(pub: Publication) {
        setEditingPub(pub)
        setFormData({
            title: pub.title,
            content: pub.content || '',
            status: pub.status
        })
        setShowModal(true)
    }

    const filteredPubs = publications.filter(pub =>
        pub.title.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
            {/* Header */}
            <header className="bg-gray-800/50 backdrop-blur-xl border-b border-purple-500/30 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/lotus/dashboard')}
                                className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className="text-xl font-bold text-white">Gestión de Publicaciones</h1>
                        </div>
                        <button
                            onClick={() => {
                                setEditingPub(null)
                                setFormData({ title: '', content: '', status: 'published' })
                                setShowModal(true)
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition-colors shadow-lg shadow-purple-900/20"
                        >
                            <Plus className="w-4 h-4" />
                            Nueva Publicación
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search */}
                <div className="mb-6 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar publicaciones..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 outline-none hover:border-purple-500/50 transition-colors"
                    />
                </div>

                {/* List */}
                <div className="grid gap-4">
                    {loading ? (
                        <div className="text-center py-12 text-gray-400">Cargando publicaciones...</div>
                    ) : filteredPubs.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">No hay publicaciones encontradas</div>
                    ) : (
                        filteredPubs.map((pub) => (
                            <div key={pub.id} className="bg-gray-800/50 backdrop-blur-xl border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/40 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-purple-500/10 rounded-lg">
                                            <FileText className="w-6 h-6 text-purple-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-1">{pub.title}</h3>
                                            <div className="flex items-center gap-3 text-sm text-gray-400">
                                                <span className="font-mono text-xs opacity-50">#{pub.id}</span>
                                                <span>•</span>
                                                <span>{new Date(pub.created_at).toLocaleDateString()}</span>
                                                <span>•</span>
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${pub.status === 'published'
                                                        ? 'bg-green-500/10 text-green-400'
                                                        : 'bg-yellow-500/10 text-yellow-400'
                                                    }`}>
                                                    {pub.status === 'published' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                    {pub.status === 'published' ? 'Publicada' : 'Borrador'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => window.open(`/publicaciones/${pub.id}/${pub.slug}`, '_blank')}
                                            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                                            title="Ver"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleEdit(pub)}
                                            className="p-2 hover:bg-blue-500/10 rounded-lg text-gray-400 hover:text-blue-400 transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(pub.id)}
                                            className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-gray-800 border border-purple-500/30 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-white mb-6">
                            {editingPub ? 'Editar Publicación' : 'Nueva Publicación'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Título</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Estado</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 outline-none"
                                    >
                                        <option value="published">Publicada</option>
                                        <option value="draft">Borrador</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Contenido</label>
                                <textarea
                                    rows={10}
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 outline-none font-mono text-sm"
                                    placeholder="Contenido en formato texto o HTML básico..."
                                />
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition-colors"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
