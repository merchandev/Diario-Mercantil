import { useRef, useState } from 'react'
import Dropzone from '../components/Dropzone'
import { uploadFiles } from '../lib/api'

export default function Upload(){
  const [rows, setRows] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function onPick(){ inputRef.current?.click() }
  function onSelected(e:React.ChangeEvent<HTMLInputElement>){
    const files = Array.from(e.target.files||[])
    setRows(prev=>[...prev, ...files])
  }

  async function onUpload(){
    setBusy(true)
    try { await uploadFiles(rows); alert('Carga enviada'); setRows([]) }
    catch(e:any){ alert(e.message) }
    finally{ setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold">Cargar archivos</h2>
            <p className="text-sm text-slate-500">Formatos permitidos configurables en el backend</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onPick} className="btn">Seleccionar archivos</button>
            <button disabled={!rows.length||busy} onClick={onUpload} className="btn btn-primary">Subir</button>
          </div>
        </div>
        <input type="file" className="hidden" multiple ref={inputRef} onChange={onSelected} />
        <Dropzone onFiles={(fs)=> setRows(prev=>[...prev,...fs]) }/>
      </div>

      {rows.length>0 && (
        <div className="card p-4">
          <div className="font-medium mb-2">Lista para validar</div>
          <ul className="text-sm space-y-2">
            {rows.map((f,i)=> (
              <li key={i} className="flex justify-between gap-4">
                <div className="truncate">{f.name}</div>
                <div className="text-slate-500">{(f.size/1024/1024).toFixed(2)} MB</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
