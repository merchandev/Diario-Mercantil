import { useEffect, useState } from 'react'
import { listFiles } from '../lib/api'
import FileTable from '../components/FileTable'

export default function History(){
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')

  async function load(){ setRows((await listFiles({q,status})).items) }
  useEffect(()=>{ load() },[])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={e=>setQ(e.target.value)} className="input" placeholder="Buscar por nombre" />
        <select value={status} onChange={e=>setStatus(e.target.value)} className="input">
          <option value="">Todos</option>
          <option value="uploaded">uploaded</option>
          <option value="completed">completed</option>
          <option value="processing_failed">processing_failed</option>
          <option value="validation_failed">validation_failed</option>
        </select>
        <button className="btn" onClick={load}>Filtrar</button>
      </div>
      <FileTable rows={rows}/>
    </div>
  )
}
