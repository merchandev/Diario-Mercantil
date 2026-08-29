import { useEffect } from 'react'
import { ArrowLeft, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { verifySuperAdmin } from '../../lib/api'
import Paginas from '../Paginas'

export default function SuperAdminPaginas() {
    const navigate = useNavigate()

    useEffect(() => {
        verifySuperAdmin().catch(() => navigate('/lotus/'))
    }, [navigate])

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 pb-12">
            {/* Header */}
            <header className="bg-gray-800/50 backdrop-blur-xl border-b border-purple-500/30 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/lotus/dashboard')}
                            className="p-2 bg-gray-800 hover:bg-gray-700 border border-purple-500/30 rounded-lg text-gray-300 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center border border-teal-500/50">
                                <FileText className="w-6 h-6 text-teal-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Gestor de Páginas (CMS)</h1>
                                <p className="text-sm text-purple-300">Administra las páginas estáticas del sitio web</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-slate-50 rounded-2xl overflow-hidden shadow-2xl p-6">
                    <Paginas />
                </div>
            </main>
        </div>
    )
}
