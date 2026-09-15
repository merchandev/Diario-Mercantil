import { Link } from 'react-router-dom'
import StatusPill from './StatusPill'
import type { FileRow } from '../lib/api'
import { fileDetailPath } from '../lib/fileRoutes'

export default function FileTable({ rows }: { rows: FileRow[] }) {
  return (
    <div className="card overflow-x-auto pb-2 pt-1">
      <table className="min-w-[600px] w-full text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left p-3">Nombre</th>
            <th className="text-left p-3">Tamaño</th>
            <th className="text-left p-3">Tipo</th>
            <th className="text-left p-3">Estado</th>
            <th className="text-left p-3">Creado</th>
            <th className="text-left p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-t">
              <td className="p-3 max-w-md break-words" title={r.name}>{r.name}</td>
              <td className="p-3">{(r.size / 1024 / 1024).toFixed(2)} MB</td>
              <td className="p-3 uppercase">{r.type}</td>
              <td className="p-3"><StatusPill status={r.status} /></td>
              <td className="p-3">{new Date(r.created_at).toLocaleString()}</td>
              <td className="p-3">
                <Link className="btn btn-ghost" to={fileDetailPath(r.id)}>Ver detalles</Link>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr className="border-t">
              <td className="p-8 text-center text-slate-500" colSpan={6}>No se encontraron archivos.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
