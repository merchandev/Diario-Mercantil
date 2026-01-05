import { useCallback, useState } from 'react'

export default function Dropzone({onFiles}:{onFiles:(files:File[])=>void}){
  const [active, setActive] = useState(false)
  const onDrop = useCallback((e:React.DragEvent)=>{
    e.preventDefault(); setActive(false)
    const files = Array.from(e.dataTransfer.files)
    onFiles(files)
  },[])
  return (
    <div
      onDragOver={e=>{e.preventDefault(); setActive(true)}}
      onDragLeave={()=>setActive(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-2xl p-10 text-center ${active? 'border-brand-500 bg-brand-50':'border-slate-300'}`}
    >
      <div className="text-lg font-medium">Arrastra tus archivos aquí</div>
      <div className="text-sm text-slate-500">o usa el botón “Seleccionar archivos”</div>
    </div>
  )
}
