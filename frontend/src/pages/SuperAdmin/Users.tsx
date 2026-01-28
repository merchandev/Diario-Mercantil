import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Search, Trash2, Edit2, Shield, User as UserIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { listUsers, createUser, updateUser, deleteUser, UserSummary } from '../../lib/api'
import { verifySuperAdmin } from '../../lib/api'

export default function Users() {
    const [users, setUsers] = useState<UserSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingUser, setEditingUser] = useState<UserSummary | null>(null)
    const [formData, setFormData] = useState({
        document: '',
        name: '',
        email: '',
        password: '',
        role: 'solicitante',
        status: 'active'
    })

    const navigate = useNavigate()

    useEffect(() => {
        verifySuperAdmin().catch(() => navigate('/lotus/'))
        loadUsers()
    }, [navigate])

    async function loadUsers() {
        try {
            const res = await listUsers()
            setUsers(res.items)
        } catch (error) {
            console.error('Error loading users:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        try {
            if (editingUser) {
                await updateUser(editingUser.id, {
                    name: formData.name,
                    role: formData.role,
                    email: formData.email,
                    status: formData.status,
                    password: formData.password || undefined // Only send if not empty
                })
            } else {
                await createUser(formData)
            }
            setShowModal(false)
            setEditingUser(null)
            setEditingUser(null)
            setFormData({ document: '', name: '', email: '', password: '', role: 'solicitante', status: 'active' })
            loadUsers()
        } catch (error) {
            console.error('Error saving user:', error)
            alert('Error al guardar usuario')
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return
        try {
            await deleteUser(id)
            loadUsers()
        } catch (error) {
            console.error('Error deleting user:', error)
            alert('Error al eliminar usuario')
        }
    }

    function handleEdit(user: UserSummary) {
        setEditingUser(user)
        setFormData({
            document: user.document,
            name: user.name,
            email: user.email || '',
            password: '', // Password always empty on edit
            role: user.role,
            status: user.status || 'active'
        })
        setShowModal(true)
    }

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.document.toLowerCase().includes(searchTerm.toLowerCase())
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
                            <h1 className="text-xl font-bold text-white">Gestión de Usuarios</h1>
                        </div>
                        <button
                            onClick={() => {
                                setEditingUser(null)
                                setEditingUser(null)
                                setFormData({ document: '', name: '', email: '', password: '', role: 'solicitante', status: 'active' })
                                setShowModal(true)
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition-colors shadow-lg shadow-purple-900/20"
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo Usuario
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
                        placeholder="Buscar por nombre o documento..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 outline-none hover:border-purple-500/50 transition-colors"
                    />
                </div>

                {/* Users List */}
                <div className="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-purple-500/10 border-b border-purple-500/20">
                                <tr>
                                    <th className="px-6 py-4 text-purple-300 font-medium text-sm">Usuario</th>
                                    <th className="px-6 py-4 text-purple-300 font-medium text-sm">Documento</th>
                                    <th className="px-6 py-4 text-purple-300 font-medium text-sm">Rol/Estado</th>
                                    <th className="px-6 py-4 text-purple-300 font-medium text-sm text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-purple-500/10">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                                            Cargando usuarios...
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                                            No se encontraron usuarios
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-purple-500/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-white font-medium">{user.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-300 font-mono text-sm">
                                                {user.document}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-2 items-start">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${user.role === 'admin'
                                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                        }`}>
                                                        {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                                                        {user.role === 'admin' ? 'Administrador' : 'Solicitante'}
                                                    </span>
                                                    {user.status === 'suspended' && (
                                                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                                            Suspendido
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className="p-2 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user.id)}
                                                        className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-gray-800 border border-purple-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-6">
                            {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Documento</label>
                                <input
                                    type="text"
                                    required
                                    disabled={!!editingUser}
                                    value={formData.document}
                                    onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 outline-none disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 outline-none"
                                    placeholder="opcional@correo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Contraseña</label>
                                <input
                                    type="password"
                                    required={!editingUser} // Only required for new users
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Rol</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 outline-none"
                                    >
                                        <option value="solicitante">Solicitante</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Estado</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className={`w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 outline-none ${formData.status === 'suspended' ? 'text-red-400 border-red-500/50' : 'text-green-400'}`}
                                    >
                                        <option value="active">Activo</option>
                                        <option value="suspended">Suspendido</option>
                                    </select>
                                </div>
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
