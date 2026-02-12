import { useEffect, useState } from 'react'
import { getSettings, saveSettings, Settings, FileRow } from '../lib/api'
import MediaGallery from '../components/MediaGallery'
import { IconImage, IconX, IconCheck } from '../components/icons'
import { LoadingSpinner } from '../components/LoadingSpinner'

// Define the keys we care about
const BANNER_KEYS = {
    'banner_main_1': { label: 'Banner Principal (Inicio)', description: 'Aparece en la parte superior de la página de inicio. Tamaño recomendado: 1200x400px.' },
    'banner_sidebar': { label: 'Banner Lateral', description: 'Aparece en la barra lateral de las páginas interiores. Tamaño recomendado: 300x600px.' },
    'promo_popup': { label: 'Pop-up Promocional', description: 'Aparece como ventana emergente al entrar al sitio. Tamaño recomendado: 800x600px.' },
}

export default function Promo() {
    const [settings, setSettings] = useState<Partial<Settings & Record<string, string>>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Modal state
    const [modalOpen, setModalOpen] = useState(false)
    const [currentKey, setCurrentKey] = useState<string | null>(null)

    const API_URL = import.meta.env.VITE_BACKEND_URL || ''

    useEffect(() => {
        getSettings()
            .then(res => setSettings(res.settings as Partial<Settings & Record<string, string>>))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const handleSelectImage = async (file: FileRow) => {
        if (!currentKey) return

        // We store the full URL or just the relative path? 
        // Let's store the full API URL for simplicity in frontend usage, or just the file ID?
        // Storing URL is easier for now to display.
        const url = `${API_URL}/api/uploads/${file.id}`;

        // Optimistic update
        const newSettings = { ...settings, [currentKey]: url } as Partial<Settings & Record<string, string>>
        setSettings(newSettings)
        setModalOpen(false)
        setCurrentKey(null)

        // Save immediately
        setSaving(true)
        try {
            await saveSettings({ [currentKey]: url })
        } catch (error) {
            console.error(error)
            alert('Error al guardar la configuración')
        } finally {
            setSaving(false)
        }
    }

    const openModal = (key: string) => {
        setCurrentKey(key)
        setModalOpen(true)
    }

    const clearImage = async (key: string) => {
        if (!confirm('¿Quitar esta imagen?')) return
        const newSettings = { ...settings, [key]: '' } as Partial<Settings & Record<string, string>>
        setSettings(newSettings)
        setSaving(true)
        try {
            await saveSettings({ [key]: '' })
        } catch (error) {
            console.error(error)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold">Promociones y Banners</h1>
                <p className="text-sm text-slate-600">Configura las imágenes destacadas del sitio.</p>
            </div>

            <div className="grid gap-6">
                {Object.entries(BANNER_KEYS).map(([key, info]) => (
                    <div key={key} className="card p-6 flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex-1">
                            <h3 className="text-lg font-medium text-brand-900 mb-1">{info.label}</h3>
                            <p className="text-sm text-slate-500 mb-4">{info.description}</p>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => openModal(key)}
                                    className="btn btn-outline"
                                    disabled={saving}
                                >
                                    <IconImage className="w-4 h-4 mr-2" />
                                    {settings[key] ? 'Cambiar Imagen' : 'Seleccionar Imagen'}
                                </button>
                                {settings[key] && (
                                    <button
                                        onClick={() => clearImage(key)}
                                        className="btn btn-ghost text-red-500"
                                        disabled={saving}
                                    >
                                        <IconX className="w-4 h-4 mr-2" />
                                        Quitar
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="w-full md:w-1/3 bg-slate-100 rounded-lg aspect-video flex items-center justify-center overflow-hidden border border-slate-200 relative">
                            {settings[key] ? (
                                <img
                                    src={settings[key]}
                                    alt={info.label}
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <div className="text-slate-400 flex flex-col items-center">
                                    <IconImage className="w-12 h-12 mb-2" />
                                    <span className="text-xs">Sin imagen asignada</span>
                                </div>
                            )}
                            {saving && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><LoadingSpinner /></div>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
                            <h3 className="font-semibold text-lg">Seleccionar Imagen</h3>
                            <button onClick={() => setModalOpen(false)} className="btn btn-ghost btn-sm rounded-full p-1"><IconX className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            <MediaGallery selectable onSelect={handleSelectImage} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
