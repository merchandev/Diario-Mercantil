import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function PublishChoiceModal({ open, onClose }:{ open:boolean; onClose:()=>void }){
  const navigate = useNavigate()
  if (!open) return null
  const go = (path:string)=>{ onClose(); navigate(path) }
  // Detect if we're in solicitante area
  const isSolicitante = window.location.pathname.startsWith('/solicitante')
  const baseRoute = isSolicitante ? '/solicitante' : '/dashboard/publicar'
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6 z-10">
        <h3 className="text-lg font-semibold mb-3">¿Qué deseas publicar?</h3>
        <div className="flex flex-col gap-3">
          <button className="btn btn-primary" onClick={()=>go(`${baseRoute}/documento`)}>Publicar Documento</button>
          <button className="btn btn-outline" onClick={()=>go(`${baseRoute}/convocatoria`)}>Publicar Convocatoria</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
