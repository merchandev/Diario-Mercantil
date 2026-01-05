import { useEffect, useState } from 'react'
import { listFiles } from '../lib/api'
import FileTable from '../components/FileTable'

export default function FileManager() {
    const [files, setFiles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        listFiles()
            .then(res => setFiles(res.items))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Gestor de Archivos</h1>
                    <p className="text-sm text-slate-600">Explora los archivos subidos al sistema.</p>
                </div>
            </div>

            <div className="card p-0 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Cargando archivos...</div>
                ) : (
                    <FileTable rows={files} />
                )}
            </div>
        </div>
    )
}
