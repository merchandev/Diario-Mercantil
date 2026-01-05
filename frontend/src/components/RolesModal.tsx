import React, { useEffect, useState } from 'react'
import { getSettings, saveSettings } from '../lib/api'

export default function RolesModal({ open, onClose }:{ open:boolean; onClose:()=>void }){
  const [loading, setLoading] = useState(false)
  const [defaultRole, setDefaultRole] = useState<string>('solicitante')

  useEffect(()=>{ if (!open) return; setLoading(true); getSettings().then(r=>{ setDefaultRole((r.settings?.default_user_role as string) || 'solicitante') }).catch(()=>{}).finally(()=>setLoading(false)) },[open])

  const onSave = async()=>{
    setLoading(true)
    try{ await saveSettings({ default_user_role: defaultRole }) ; alert('Guardado') }catch(e){ alert('Error al guardar') }finally{ setLoading(false); onClose() }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-6 z-10">
        <h3 className="text-lg font-semibold mb-3">Roles y permisos</h3>
        <p className="text-sm text-slate-600 mb-4">Define ajustes básicos relacionados con roles; puedes establecer el rol por defecto al crear usuarios desde el panel.</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="text-sm">Rol por defecto</label>
          <select className="input" value={defaultRole} onChange={e=>setDefaultRole(e.target.value)}>
            <option value="solicitante">Solicitante</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <div className="flex gap-2 justify-end">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={onSave} disabled={loading}>{loading?'Guardando...':'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}
