import MediaGallery from '../components/MediaGallery'

export default function Medios() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold">Medios</h1>
                <p className="text-sm text-slate-600">Gestiona las imágenes y documentos del sitio.</p>
            </div>

            <div className="card p-4">
                <MediaGallery />
            </div>
        </div>
    )
}

