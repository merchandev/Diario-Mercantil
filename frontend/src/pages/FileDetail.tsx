import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getFile, retryFile } from '../lib/api'
import { subscribeEvents } from '../lib/sse'
import StatusPill from '../components/StatusPill'

export default function FileDetail(){
  const { id } = useParams()
  const [data, setData] = useState<{file:any; events:any[]} | null>(null)

  async function load(){ if(id) setData(await getFile(+id)) }
  useEffect(()=>{ load() },[id])
  useEffect(()=>{
    if(!id) return
    const off = subscribeEvents((e)=>{ if (e.file_id==+id) load() })
    return off
  },[id])

  if(!data) return null
  const { file, events } = data

  async function onRetry(){ await retryFile(file.id); await load() }

  return (
    <div className="space-y-6">
      <div className="card p-5 flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold">{file.name}</div>
          <div className="text-sm text-slate-500">ID #{file.id} • {(file.size/1024/1024).toFixed(2)} MB</div>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill status={file.status}/>
          <button className="btn" onClick={onRetry}>Reintentar</button>
        </div>
      </div>
      <div className="card p-5">
        <div className="font-medium mb-2">Eventos</div>
        <ul className="text-sm space-y-2">
          {events.map((e,i)=> (
            <li key={i} className="flex items-center justify-between">
              <div>{e.type}: {e.message}</div>
              <div className="text-slate-500">{new Date(e.ts).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
