import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Users, FileText, Settings, LogOut, Activity, BarChart3 } from 'lucide-react'
import { verifySuperAdmin, superadminLogout } from '../../lib/api'

export default function SuperAdminDashboard() {
    const [superadmin, setSuperadmin] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        async function verify() {
            try {
                const res = await verifySuperAdmin()
                setSuperadmin(res.superadmin)
            } catch {
                localStorage.removeItem('superadmin_token')
                localStorage.removeItem('superadmin')
                navigate('/lotus/')
            } finally {
                setLoading(false)
            }
        }
        verify()
    }, [navigate])

    async function handleLogout() {
        try {
            await superadminLogout()
        } catch {
            // Ignorar errores
        }
        localStorage.removeItem('superadmin_token')
        localStorage.removeItem('superadmin')
        navigate('/lotus/')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
        )
    }

    const cards = [
        { title: 'Usuarios', icon: Users, path: '/configuracion', color: 'from-blue-500 to-cyan-500' },
        { title: 'Publicaciones', icon: FileText, path: '/historial', color: 'from-green-500 to-emerald-500' },
        { title: 'Estadísticas', icon: BarChart3, path: '/dashboard', color: 'from-purple-500 to-pink-500' },
        { title: 'Actividad', icon: Activity, path: '/historial', color: 'from-orange-500 to-red-500' },
        { title: 'Configuración', icon: Settings, path: '/configuracion', color: 'from-indigo-500 to-purple-500' },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
            {/* Header */}
            <header className="bg-gray-800/50 backdrop-blur-xl border-b border-purple-500/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/50">
                                <Shield className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Superadmin Panel</h1>
                                <p className="text-sm text-purple-300">Bienvenido, {superadmin?.username}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Salir
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">Panel de Control</h2>
                    <p className="text-purple-300">Acceso completo a todas las funcionalidades del sistema</p>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cards.map((card) => {
                        const Icon = card.icon
                        return (
                            <button
                                key={card.title}
                                onClick={() => navigate(card.path)}
                                className="group relative bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 hover:border-purple-500/60 transition-all duration-300 hover:scale-105"
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity`} />
                                <div className="relative">
                                    <div className={`w-12 h-12 bg-gradient-to-br ${card.color} rounded-lg flex items-center justify-center mb-4`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2">{card.title}</h3>
                                    <p className="text-sm text-gray-400">Gestionar {card.title.toLowerCase()}</p>
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Info Box */}
                <div className="mt-12 bg-purple-500/10 border border-purple-500/30 rounded-2xl p-6">
                    <div className="flex items-start gap-3">
                        <Shield className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">Privilegios de Superadministrador</h3>
                            <ul className="text-sm text-purple-300 space-y-1">
                                <li>• Acceso completo a todas las funcionalidades</li>
                                <li>• Gestión de usuarios y permisos</li>
                                <li>• Configuración del sistema</li>
                                <li>• Visualización de estadísticas y actividad</li>
                                <li>• Control total sobre publicaciones y ediciones</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
