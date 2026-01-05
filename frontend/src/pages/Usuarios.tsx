import { useEffect, useMemo, useState } from 'react'
import { listUsers, type UserSummary, createUser, deleteUser, updateUser, setUserPassword, listLegal, type LegalRequest } from '../lib/api'
import RolesModal from '../components/RolesModal'
import ConfirmDialog from '../components/ConfirmDialog'
import PromptDialog from '../components/PromptDialog'
import AlertDialog from '../components/AlertDialog'

export default function Usuarios(){
  const [rows, setRows] = useState<UserSummary[]>([])
  const [showForm, setShowForm] = useState(false)
  const [f, setF] = useState({ document:'', name:'', password:'', role:'solicitante', email:'', phone:'', person_type:'natural' })
  const [alertDialog, setAlertDialog] = useState<{isOpen:boolean; title:string; message:string; variant:'success'|'error'|'info'|'warning'}>({isOpen:false, title:'', message:'', variant:'info'})
  const [confirmDialog, setConfirmDialog] = useState<{isOpen:boolean; title:string; message:string; onConfirm:()=>void}>({isOpen:false, title:'', message:'', onConfirm:()=>{}})
  const [promptDialog, setPromptDialog] = useState<{isOpen:boolean; title:string; message:string; placeholder?:string; defaultValue?:string; confirmText?:string; cancelText?:string; variant?:'danger'|'warning'|'info'; onConfirm:(v:string)=>void}>({isOpen:false, title:'', message:'', onConfirm:()=>{}})
  const reload = ()=> listUsers()
    .then(r=>setRows(r.items))
    .catch(err=>{
      console.error('Error cargando usuarios:', err)
      setAlertDialog({isOpen:true, title:'Error', message:'Error al cargar usuarios', variant:'error'})
    })
  useEffect(()=>{ reload() },[])
  const [showRoles, setShowRoles] = useState(false)
  const [editUser, setEditUser] = useState<any|undefined>(undefined)
  const [statusFor, setStatusFor] = useState<{user:UserSummary; rows:LegalRequest[]}|null>(null)
  const statusCounts = useMemo(()=>{
    if (!statusFor) return {}
    const map: Record<string, number> = {}
    for (const r of statusFor.rows) {
      const raw = (r.status||'').trim()
      const norm = raw === 'Pendiente' ? 'Borrador' : (raw === 'Publicado' ? 'Publicada' : (raw||'Desconocido'))
      map[norm] = (map[norm]||0) + 1
    }
    return map
  }, [statusFor])

  const openStatus = async(u:UserSummary)=>{
    try{
      const q = u.document || u.name
      const r = await listLegal({ q })
      setStatusFor({ user: u, rows: r.items ?? [] })
    }catch{
      setStatusFor({ user: u, rows: [] as any })
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Gestión de Usuarios</h1>
        <div className="flex items-center gap-2">
          <button className="btn btn-outline" onClick={()=>setShowRoles(true)}>Roles y Permisos</button>
          <button className="btn btn-primary" onClick={()=>setShowForm(v=>!v)}>{showForm? 'Cerrar':'Agregar Usuario'}</button>
        </div>
      </div>
      {showForm && (
        <form onSubmit={async e=>{e.preventDefault(); await createUser(f as any); setF({ document:'', name:'', password:'', role:'solicitante', email:'', phone:'', person_type:'natural' }); setShowForm(false); reload()}} className="card p-4 space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm mb-1">Documento</label>
              <input className="input w-full" value={f.document} onChange={e=>setF({...f, document:e.target.value})} placeholder="V12345678" required />
            </div>
            <div>
              <label className="block text-sm mb-1">Nombre</label>
              <input className="input w-full" value={f.name} onChange={e=>setF({...f, name:e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm mb-1">Rol</label>
              <select className="input w-full" value={f.role} onChange={e=>setF({...f, role:e.target.value})}>
                <option value="admin">Administrador</option>
                <option value="solicitante">Solicitante</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Correo</label>
              <input className="input w-full" type="email" value={f.email} onChange={e=>setF({...f, email:e.target.value})} />
            </div>
            <div>
              <label className="block text-sm mb-1">Teléfono</label>
              <input className="input w-full" value={f.phone} onChange={e=>setF({...f, phone:e.target.value})} />
            </div>
            <div>
              <label className="block text-sm mb-1">Contraseña</label>
              <input className="input w-full" type="password" value={f.password} onChange={e=>setF({...f, password:e.target.value})} required />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary">Guardar</button>
            <button type="button" className="btn btn-ghost" onClick={()=>setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}
      <div className="card overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-brand-800 text-white">
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-left px-4 py-2">N° de documento</th>
              <th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2">Rol</th>
              <th className="text-right px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u:any)=> (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-2">
                  <span className={`pill ${u.status==='active'?'bg-green-100 text-green-700':'bg-slate-200 text-slate-700'}`}>{u.status==='active'?'Activo':'Inactivo'}</span>
                </td>
                <td className="px-4 py-2">{u.document}</td>
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2">{u.role}</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex gap-2 flex-wrap justify-end">
                    <button className="btn btn-outline" onClick={()=>setEditUser(u)}>Editar</button>
                    <button className="btn btn-outline" onClick={()=>setPromptDialog({isOpen:true, title:'Cambiar contraseña', message:'Ingrese la nueva contraseña:', onConfirm:async(pw)=>{if(!pw)return; await setUserPassword(u.id,pw); setAlertDialog({isOpen:true,title:'Éxito',message:'Contraseña actualizada.',variant:'success'})}})}>Clave</button>
                    <button className="btn btn-outline" onClick={()=>openStatus(u)}>Estado</button>
                    <a className="btn btn-outline" href={`/dashboard/publicaciones?q=${encodeURIComponent(u.document||u.name)}&auto=1`}>
                      Ver publicaciones
                    </a>
                    <button className="btn btn-danger" onClick={()=>setConfirmDialog({isOpen:true, title:'Eliminar usuario', message:'¿Está seguro de eliminar este usuario?', onConfirm:async()=>{await deleteUser(u.id); reload()}})}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editUser && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setEditUser(undefined)}></div>
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-6 z-50">
            <h3 className="text-lg font-semibold mb-3">Editar usuario</h3>
            <form onSubmit={async e=>{ e.preventDefault(); await updateUser(editUser.id, { name: editUser.name, role: editUser.role, email: editUser.email, phone: editUser.phone, status: editUser.status, person_type: editUser.person_type }); setEditUser(undefined); reload() }} className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Nombre</label>
                  <input className="input w-full" value={editUser.name} onChange={e=>setEditUser({...editUser, name:e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Rol</label>
                  <select className="input w-full" value={editUser.role} onChange={e=>setEditUser({...editUser, role:e.target.value})}>
                    <option value="admin">Administrador</option>
                    <option value="solicitante">Solicitante</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Correo</label>
                  <input className="input w-full" value={editUser.email||''} onChange={e=>setEditUser({...editUser, email:e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Teléfono</label>
                  <input className="input w-full" value={editUser.phone||''} onChange={e=>setEditUser({...editUser, phone:e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Estado</label>
                  <select className="input w-full" value={editUser.status||'active'} onChange={e=>setEditUser({...editUser, status:e.target.value})}>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Tipo</label>
                  <select className="input w-full" value={editUser.person_type||'natural'} onChange={e=>setEditUser({...editUser, person_type:e.target.value})}>
                    <option value="natural">Natural</option>
                    <option value="juridica">Jurídica</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" className="btn btn-ghost" onClick={()=>setEditUser(undefined)}>Cancelar</button>
                <button className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {statusFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setStatusFor(null)}></div>
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6 z-50">
            <h3 className="text-lg font-semibold mb-3">Estado de publicaciones</h3>
            <div className="text-sm text-slate-700 mb-3">{statusFor.user.name} — {statusFor.user.document}</div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {Object.keys(statusCounts).length===0 && (
                <div className="col-span-2 text-sm text-slate-500">Sin publicaciones registradas.</div>
              )}
              {Object.entries(statusCounts).map(([k,v])=> (
                <div key={k} className="card p-3 flex items-center justify-between">
                  <div className="text-sm">{k}</div>
                  <div className="text-xl font-semibold">{v}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <a className="btn btn-outline" href={`/dashboard/publicaciones?q=${encodeURIComponent(statusFor.user.document||statusFor.user.name)}&auto=1`}>Ir a publicaciones</a>
              <button className="btn" onClick={()=>setStatusFor(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
      <AlertDialog {...alertDialog} onClose={()=>setAlertDialog({...alertDialog,isOpen:false})} />
      <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message} variant="danger" onConfirm={confirmDialog.onConfirm} onCancel={()=>setConfirmDialog({...confirmDialog,isOpen:false})} />
      <PromptDialog {...promptDialog} onCancel={()=>setPromptDialog({...promptDialog,isOpen:false})} />
      <RolesModal open={showRoles} onClose={()=>setShowRoles(false)} />
    </section>
  )
}
