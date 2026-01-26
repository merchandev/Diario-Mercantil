import { useState } from 'react'
import { Building2, Key } from 'lucide-react'
import { superadminLogin } from '../../lib/api'
import { useNavigate } from 'react-router-dom'

export default function LotusLogin() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await superadminLogin({ username, password })
            localStorage.setItem('superadmin_token', res.token)
            localStorage.setItem('superadmin', JSON.stringify(res.superadmin))
            navigate('/lotus/dashboard')
        } catch (err: any) {
            setError(err?.message || 'Error de autenticación')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-500/20 rounded-full mb-4 border-2 border-purple-500/50">
                        <Key className="w-10 h-10 text-purple-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Lotus Access</h1>
                    <p className="text-purple-300 text-sm">Sistema de Superadministración</p>
                </div>

                {/* Login Card */}
                <div className="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-purple-300 mb-2">
                                Usuario
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-900/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                                placeholder="merchandev"
                                required
                                autoComplete="off"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-purple-300 mb-2">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-900/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Verificando...
                                </>
                            ) : (
                                <>
                                    <Key className="w-5 h-5" />
                                    Acceder
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-purple-500/20">
                        <p className="text-center text-xs text-gray-500">
                            Acceso autorizado únicamente para superadministradores
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-gray-600 text-xs flex items-center justify-center gap-2">
                        <Building2 className="w-4 h-4" />
                        DIARIO MERCANTIL DE VENEZUELA
                    </p>
                </div>
            </div>
        </div>
    )
}
