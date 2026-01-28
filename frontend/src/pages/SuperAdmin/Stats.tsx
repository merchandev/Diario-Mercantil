import { useState, useEffect } from 'react'
import { ArrowLeft, Users, FileText, BookOpen, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getStats, verifySuperAdmin } from '../../lib/api'

export default function Stats() {
    const [stats, setStats] = useState({ publications: 0, editions: 0, users_active: 0 })
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        verifySuperAdmin().catch(() => navigate('/lotus/'))
        loadStats()
    }, [navigate])

    async function loadStats() {
        setLoading(true)
        try {
            const res = await getStats()
            setStats(res)
        } catch (error) {
            console.error('Error loading stats:', error)
        } finally {
            setLoading(false)
        }
    }

    const StatCard = ({ title, value, icon: Icon, color, subtext }: any) => (
        <div className="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 relative overflow-hidden group hover:scale-105 transition-transform duration-300">
            <div className={`absolute -right-6 -top-6 w-32 h-32 bg-gradient-to-br ${color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="text-gray-400 font-medium mb-1">{title}</p>
                    <h3 className="text-4xl font-bold text-white mb-2">{value}</h3>
                    {subtext && <p className="text-sm text-purple-300">{subtext}</p>}
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${color} bg-opacity-20`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </div>
    )

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
                            <h1 className="text-xl font-bold text-white">Estadísticas del Sistema</h1>
                        </div>
                        <button
                            onClick={loadStats}
                            className="p-2 hover:bg-white/10 rounded-lg text-purple-300 hover:text-white transition-colors"
                            title="Recargar"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        title="Usuarios Activos"
                        value={stats.users_active}
                        icon={Users}
                        color="from-blue-500 to-cyan-500"
                        subtext="Registrados en el sistema"
                    />
                    <StatCard
                        title="Publicaciones"
                        value={stats.publications}
                        icon={FileText}
                        color="from-green-500 to-emerald-500"
                        subtext="Total histórico"
                    />
                    <StatCard
                        title="Ediciones PDF"
                        value={stats.editions}
                        icon={BookOpen}
                        color="from-purple-500 to-pink-500"
                        subtext="Digitales generadas"
                    />
                </div>

                {/* Placeholder for future charts */}
                <div className="mt-8 bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-8 text-center">
                    <div className="max-w-md mx-auto">
                        <h3 className="text-xl font-bold text-white mb-2">Análisis Detallado</h3>
                        <p className="text-gray-400">
                            Próximamente se mostrarán gráficos de actividad diaria, ingresos estimados y tendencias de registro de usuarios.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    )
}
