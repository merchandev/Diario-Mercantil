import { useEffect, useState } from 'react'
import { getAdminSettings, saveSettings, Settings, FileRow } from '../lib/api'
import MediaGallery from '../components/MediaGallery'
import { IconImage, IconX, IconCheck } from '../components/icons'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useDialog } from '../contexts/DialogContext'

type BannerKey =
    | 'banner_header_global'
    | 'banner_main_1'
    | 'banner_sidebar'
    | 'promo_popup'
    | 'banner_history_1'
    | 'banner_history_2'
    | 'banner_history_3'

type BannerSlot = {
    key: BannerKey
    label: string
    description: string
    previewClass: string
}

type BannerPage = {
    id: string
    label: string
    route: string
    description: string
    slots: BannerSlot[]
}

export const BANNER_PAGES: BannerPage[] = [
    {
        id: 'global',
        label: 'Todas las páginas públicas',
        route: 'Encabezado global',
        description: 'Este espacio aparece debajo de la navegación en todo el sitio público.',
        slots: [
            {
                key: 'banner_header_global',
                label: 'Banner del encabezado',
                description: 'Formato horizontal recomendado: 1200 × 180 px.',
                previewClass: 'aspect-[20/3]',
            },
        ],
    },
    {
        id: 'home',
        label: 'Página de Inicio',
        route: '/',
        description: 'Promociones exclusivas de la portada pública.',
        slots: [
            {
                key: 'banner_main_1',
                label: 'Banner principal',
                description: 'Franja destacada al inicio del contenido. Recomendado: 1200 × 400 px.',
                previewClass: 'aspect-[16/5]',
            },
            {
                key: 'banner_sidebar',
                label: 'Banner lateral',
                description: 'Anuncio vertical junto a la edición destacada. Recomendado: 300 × 600 px.',
                previewClass: 'aspect-[3/5]',
            },
            {
                key: 'promo_popup',
                label: 'Pop-up promocional',
                description: 'Ventana emergente al entrar a Inicio. Recomendado: 800 × 600 px.',
                previewClass: 'aspect-[4/3]',
            },
        ],
    },
    {
        id: 'history',
        label: 'Mis publicaciones',
        route: '/solicitante/historial',
        description: 'Imágenes que rotan en el carrusel superior del historial del solicitante.',
        slots: [1, 2, 3].map((position): BannerSlot => ({
            key: `banner_history_${position}` as BannerKey,
            label: `Carrusel · posición ${position}`,
            description: 'Formato horizontal recomendado: 1200 × 320 px.',
            previewClass: 'aspect-[15/4]',
        })),
    },
]

export default function Promo() {
    const { showAlert, confirmAction } = useDialog()
    const [settings, setSettings] = useState<Partial<Settings & Record<string, string>>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Modal state
    const [modalOpen, setModalOpen] = useState(false)
    const [currentKey, setCurrentKey] = useState<BannerKey | null>(null)

    const API_URL = import.meta.env.VITE_BACKEND_URL || ''

    useEffect(() => {
        getAdminSettings()
            .then(res => setSettings(res.settings as Partial<Settings & Record<string, string>>))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const handleSelectImage = async (file: FileRow) => {
        if (!currentKey) return
        const imageTypes = ['jpg', 'jpeg', 'png', 'webp', 'gif']
        if (!imageTypes.includes(String(file.type || '').toLowerCase())) {
            void showAlert('Seleccione un archivo de imagen válido (JPG, PNG, WEBP o GIF).', { title: 'Archivo inválido' })
            return
        }

        // We store the full URL or just the relative path? 
        // Let's store the full API URL for simplicity in frontend usage, or just the file ID?
        // Storing URL is easier for now to display.
        const url = `${API_URL}/api/uploads/${file.id}`;

        const previousSettings = settings
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
            setSettings(previousSettings)
            console.error(error)
            void showAlert('Error al guardar la configuración.', { title: 'Error' })
        } finally {
            setSaving(false)
        }
    }

    const openModal = (key: BannerKey) => {
        setCurrentKey(key)
        setModalOpen(true)
    }

    const clearImage = async (key: BannerKey) => {
        if (!(await confirmAction('¿Quitar esta imagen?', { title: 'Quitar banner', danger: true }))) return
        const previousSettings = settings
        const newSettings = { ...settings, [key]: '' } as Partial<Settings & Record<string, string>>
        setSettings(newSettings)
        setSaving(true)
        try {
            await saveSettings({ [key]: '' })
        } catch (error) {
            setSettings(previousSettings)
            console.error(error)
            void showAlert('No se pudo quitar el banner. La configuración anterior fue restaurada.', { title: 'Error' })
        } finally {
            setSaving(false)
        }
    }

    const valueFor = (key: BannerKey): string => {
        if (key === 'banner_header_global' && !Object.prototype.hasOwnProperty.call(settings, key)) {
            return String(settings.banner_main_1 || '')
        }
        return String(settings[key] || '')
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold">Promociones y Banners</h1>
                <p className="text-sm text-slate-600">Configura todos los espacios publicitarios, organizados por la página donde aparecen.</p>
            </div>

            <div className="space-y-8">
                {BANNER_PAGES.map(page => (
                    <section key={page.id} className="card overflow-hidden">
                        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <h2 className="font-semibold text-brand-900">{page.label}</h2>
                                <p className="text-sm text-slate-600 mt-0.5">{page.description}</p>
                            </div>
                            <span className="text-xs font-mono text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1">{page.route}</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {page.slots.map(slot => {
                                const imageUrl = valueFor(slot.key)
                                return (
                                    <div key={slot.key} className="p-5 flex flex-col lg:flex-row gap-5 items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-base font-medium text-brand-900">{slot.label}</h3>
                                                {imageUrl && <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><IconCheck className="w-3.5 h-3.5" /> Asignado</span>}
                                            </div>
                                            <p className="text-sm text-slate-500 mb-4">{slot.description}</p>
                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => openModal(slot.key)} className="btn btn-outline" disabled={saving}>
                                                    <IconImage className="w-4 h-4 mr-2" />
                                                    {imageUrl ? 'Cambiar imagen' : 'Seleccionar imagen'}
                                                </button>
                                                {imageUrl && (
                                                    <button onClick={() => clearImage(slot.key)} className="btn btn-ghost text-red-500" disabled={saving}>
                                                        <IconX className="w-4 h-4 mr-2" /> Quitar
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`w-full lg:w-2/5 max-h-64 bg-slate-100 rounded-lg ${slot.previewClass} flex items-center justify-center overflow-hidden border border-slate-200 relative`}>
                                            {imageUrl ? (
                                                <img src={imageUrl} alt={slot.label} className="w-full h-full object-contain" />
                                            ) : (
                                                <div className="text-slate-400 flex flex-col items-center">
                                                    <IconImage className="w-10 h-10 mb-2" />
                                                    <span className="text-xs">Sin imagen asignada</span>
                                                </div>
                                            )}
                                            {saving && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><LoadingSpinner /></div>}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
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
