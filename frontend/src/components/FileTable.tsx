import { Link } from 'react-router-dom'
import StatusPill from './StatusPill'

export default function FileTable({rows}:{rows:any[]}){
  return (
    <div className="overflow-auto card">
      <table className="min-w-full text-sm">
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
          {rows.map(r=> (
            <tr key={r.id} className="border-t">
              <td className="p-3">{r.name}</td>
              <td className="p-3">{(r.size/1024/1024).toFixed(2)} MB</td>
              <td className="p-3 uppercase">{r.type}</td>
              <td className="p-3"><StatusPill status={r.status}/></td>
              <td className="p-3">{new Date(r.created_at).toLocaleString()}</td>
              <td className="p-3">
                <Link className="btn btn-ghost" to={`/files/${r.id}`}>Ver</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
