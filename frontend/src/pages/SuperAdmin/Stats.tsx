import { useState, useEffect } from 'react'
import { ArrowLeft, Users, FileText, BookOpen, RefreshCw, DollarSign, Clock, CheckCircle, AlertCircle, UserCheck, UserX, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getStats, verifySuperAdmin } from '../../lib/api'

interface Stats {
    users_total: number
    users_active: number
    users_suspended: number
    users_admin: number
    publications: number
    publications_pending: number
    publications_documents: number
    publications_convocations: number
    publications_recent_30d: number
    editions: number
    revenue_total_usd: number
    revenue_pending_usd: number
    transactions_completed: number
}

export default function Stats() {
    const [stats, setStats] = useState<Stats>({
        users_total: 0,
        users_active: 0,
        users_suspended: 0,
        users_admin: 0,
        publications: 0,
        publications_pending: 0,
        publications_documents: 0,
        publications_convocations: 0,
        publications_recent_30d: 0,
        editions: 0,
        revenue_total_usd: 0,
        revenue_pending_usd: 0,
        transactions_completed: 0
    })
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
            setStats(res as Stats)
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

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* User Statistics */}
                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">Usuarios</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="Total de Usuarios"
                            value={stats.users_total}
                            icon={Users}
                            color="from-blue-500 to-cyan-500"
                            subtext="Registrados en el sistema"
                        />
                        <StatCard
                            title="Usuarios Activos"
                            value={stats.users_active}
                            icon={UserCheck}
                            color="from-green-500 to-emerald-500"
                            subtext="Con acceso habilitado"
                        />
                        <StatCard
                            title="Usuarios Suspendidos"
                            value={stats.users_suspended}
                            icon={UserX}
                            color="from-red-500 to-rose-500"
                            subtext="Acceso bloqueado"
                        />
                        <StatCard
                            title="Administradores"
                            value={stats.users_admin}
                            icon={Shield}
                            color="from-purple-500 to-pink-500"
                            subtext="Con privilegios admin"
                        />
                    </div>
                </section>

                {/* Publication Statistics */}
                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">Publicaciones</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="Total Publicadas"
                            value={stats.publications}
                            icon={CheckCircle}
                            color="from-green-500 to-emerald-500"
                            subtext="Completadas y públicas"
                        />
                        <StatCard
                            title="Pendientes"
                            value={stats.publications_pending}
                            icon={Clock}
                            color="from-yellow-500 to-orange-500"
                            subtext="En proceso de verificación"
                        />
                        <StatCard
                            title="Documentos"
                            value={stats.publications_documents}
                            icon={FileText}
                            color="from-blue-500 to-cyan-500"
                            subtext="Tipo: Documento"
                        />
                        <StatCard
                            title="Convocatorias"
                            value={stats.publications_convocations}
                            icon={AlertCircle}
                            color="from-purple-500 to-pink-500"
                            subtext="Tipo: Convocatoria"
                        />
                    </div>
                    <div className="mt-6">
                        <StatCard
                            title="Publicaciones Recientes (30 días)"
                            value={stats.publications_recent_30d}
                            icon={Clock}
                            color="from-indigo-500 to-blue-500"
                            subtext="Actividad del último mes"
                        />
                    </div>
                </section>

                {/* Financial Statistics */}
                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">Información de Pagos</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            title="Ingresos Totales"
                            value={`$${stats.revenue_total_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            icon={DollarSign}
                            color="from-green-500 to-emerald-500"
                            subtext="USD acumulados"
                        />
                        <StatCard
                            title="Ingresos Pendientes"
                            value={`$${stats.revenue_pending_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            icon={Clock}
                            color="from-yellow-500 to-orange-500"
                            subtext="Pendientes de confirmación"
                        />
                        <StatCard
                            title="Transacciones Completadas"
                            value={stats.transactions_completed}
                            icon={CheckCircle}
                            color="from-blue-500 to-cyan-500"
                            subtext="Pagos procesados"
                        />
                    </div>
                </section>

                {/* Other Statistics */}
                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">Otros</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <StatCard
                            title="Ediciones PDF"
                            value={stats.editions}
                            icon={BookOpen}
                            color="from-purple-500 to-pink-500"
                            subtext="Ediciones digitales generadas"
                        />
                    </div>
                </section>
            </main>
        </div>
    )
}
