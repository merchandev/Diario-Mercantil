import { useState, useEffect } from 'react'
import { ArrowLeft, Activity as ActivityIcon, FileText, User, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { listPublications, listUsers, verifySuperAdmin } from '../../lib/api'

export default function Activity() {
    const [activities, setActivities] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        verifySuperAdmin().catch(() => navigate('/lotus/'))
        loadActivity()
    }, [navigate])

    async function loadActivity() {
        try {
            const [pubs, users] = await Promise.all([
                listPublications(),
                listUsers()
            ])

            // Mock activity feed from actual data
            const pubEvents = pubs.items.map(p => ({
                id: `pub-${p.id}`,
                type: 'publication',
                title: 'Nueva Publicación',
                description: `Se ha creado/modificado "${p.title}"`,
                date: new Date(p.updated_at),
                icon: FileText,
                color: 'text-green-400',
                bg: 'bg-green-500/10'
            }))

            const userEvents = users.items.map(u => ({
                id: `user-${u.id}`,
                type: 'user',
                title: 'Usuario Registrado',
                description: `Usuario ${u.name} (${u.role}) activo en el sistema`,
                date: new Date(), // API doesn't return created_at for users listing, using now as fallback or we could fetch detail
                icon: User,
                color: 'text-blue-400',
                bg: 'bg-blue-500/10'
            }))

            const allEvents = [...pubEvents, ...userEvents]
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .slice(0, 20)

            setActivities(allEvents)
        } catch (error) {
            console.error('Error loading activity:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
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
                            <h1 className="text-xl font-bold text-white">Registro de Actividad</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <ActivityIcon className="w-5 h-5 text-purple-400" />
                        Actividad Reciente
                    </h2>

                    <div className="space-y-6">
                        {loading ? (
                            <div className="text-gray-400 text-center py-4">Cargando actividad...</div>
                        ) : activities.length === 0 ? (
                            <div className="text-gray-400 text-center py-4">No hay actividad reciente</div>
                        ) : (
                            activities.map((item, index) => {
                                const Icon = item.icon
                                return (
                                    <div key={item.id} className="flex gap-4 relative">
                                        {/* Timeline line */}
                                        {index !== activities.length - 1 && (
                                            <div className="absolute left-5 top-10 bottom-[-24px] w-0.5 bg-gray-700" />
                                        )}

                                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.bg}`}>
                                            <Icon className={`w-5 h-5 ${item.color}`} />
                                        </div>

                                        <div className="flex-1 pt-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="text-white font-medium">{item.title}</h4>
                                                <span className="text-xs text-gray-500">{item.date.toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-gray-400 text-sm">{item.description}</p>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
