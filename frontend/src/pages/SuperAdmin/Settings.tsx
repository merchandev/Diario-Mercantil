import { useState, useEffect } from 'react'
import { ArrowLeft, Save, DollarSign, FileText, Settings as SettingsIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getSettings, saveSettings, Settings as SettingsType } from '../../lib/api'
import { verifySuperAdmin } from '../../lib/api'

export default function Settings() {
    const [settings, setSettings] = useState<Partial<SettingsType>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        verifySuperAdmin().catch(() => navigate('/lotus/'))
        loadSettings()
    }, [navigate])

    async function loadSettings() {
        try {
            const res = await getSettings()
            setSettings(res.settings)
        } catch (error) {
            console.error('Error loading settings:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        try {
            await saveSettings(settings)
            alert('Configuración guardada correctamente')
        } catch (error) {
            console.error('Error saving settings:', error)
            alert('Error al guardar configuración')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="text-white text-center py-20">Cargando configuración...</div>

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
                            <h1 className="text-xl font-bold text-white">Configuración del Sistema</h1>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition-colors shadow-lg shadow-purple-900/20 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Precios y Tasas */}
                    <div className="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-purple-500/20 rounded-lg">
                                <DollarSign className="w-6 h-6 text-purple-400" />
                            </div>
                            <h2 className="text-lg font-bold text-white">Precios y Tasas</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Tasa BCV (Bs/USD)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={settings.bcv_rate || ''}
                                    onChange={(e) => setSettings({ ...settings, bcv_rate: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Precio por Folio (USD)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={settings.price_per_folio_usd || ''}
                                    onChange={(e) => setSettings({ ...settings, price_per_folio_usd: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Costo Convocatoria (USD)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={settings.convocatoria_usd || ''}
                                    onChange={(e) => setSettings({ ...settings, convocatoria_usd: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">IVA (%)</label>
                                <input
                                    type="number"
                                    step="1"
                                    value={settings.iva_percent || ''}
                                    onChange={(e) => setSettings({ ...settings, iva_percent: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Unidad Tributaria (Bs)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={settings.unit_tax_bs || ''}
                                    onChange={(e) => setSettings({ ...settings, unit_tax_bs: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Instrucciones y Textos */}
                    <div className="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-blue-500/20 rounded-lg">
                                <FileText className="w-6 h-6 text-blue-400" />
                            </div>
                            <h2 className="text-lg font-bold text-white">Instrucciones</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Texto Instrucciones Documentos</label>
                                <textarea
                                    rows={4}
                                    value={settings.instructions_documents_text || ''}
                                    onChange={(e) => setSettings({ ...settings, instructions_documents_text: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">URL Imagen Instrucciones</label>
                                <input
                                    type="text"
                                    value={settings.instructions_documents_image_url || ''}
                                    onChange={(e) => setSettings({ ...settings, instructions_documents_image_url: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Texto Instrucciones Convocatorias</label>
                                <textarea
                                    rows={4}
                                    value={settings.instructions_convocatorias_text || ''}
                                    onChange={(e) => setSettings({ ...settings, instructions_convocatorias_text: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 outline-none text-sm"
                                />
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-purple-500/20">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-indigo-500/20 rounded-lg">
                                    <SettingsIcon className="w-4 h-4 text-indigo-400" />
                                </div>
                                <h3 className="text-md font-bold text-white">Defaults</h3>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Rol de Usuario por Defecto</label>
                                <select
                                    value={settings.default_user_role || 'solicitante'}
                                    onChange={(e) => setSettings({ ...settings, default_user_role: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 outline-none"
                                >
                                    <option value="solicitante">Solicitante</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
