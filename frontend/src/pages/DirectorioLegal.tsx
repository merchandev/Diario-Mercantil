import { useEffect, useState } from 'react'
import type React from 'react'
import { getDirectoryProfile, saveDirectoryProfile, setDirectoryPhoto, type DirectoryProfile, uploadFiles } from '../lib/api'

export default function DirectorioLegal(){
  const [profile, setProfile] = useState<DirectoryProfile|null>(null)
  const [form, setForm] = useState<Partial<DirectoryProfile>>({})
  const [accepted, setAccepted] = useState(false)
  const load = ()=> getDirectoryProfile().then(r=>{ setProfile(r.profile||null); setForm(r.profile||{}) })
  useEffect(()=>{ load() },[])

  const onSave = async(e:React.FormEvent)=>{
    e.preventDefault()
    if (!accepted && !(profile && profile.status==='aprobado')) {
      alert('Debe aceptar los Términos y Condiciones y las Políticas de Privacidad.')
      return
    }
    await saveDirectoryProfile(form)
    alert(profile?.status==='aprobado' ? 'Información actualizada.' : 'Su registro en el Directorio Legal se encuentra en estado pendiente de verificación y aprobación. Este proceso puede tardar hasta 72 horas, dependiendo de la cantidad de solicitudes por procesar.')
    load()
  }

  const onUpload = async(file: File|null, kind:'profile'|'inpre')=>{
    if (!file) return
    const up = await uploadFiles([file] as any)
    const id = (up.items?.[0]?.id) || (up[0]?.id) || up.id
    if (id) {
      try {
        await setDirectoryPhoto(id, kind)
        load()
      } catch (e:any) {
        alert('No se pudo actualizar la foto. '+(e?.message||''))
      }
    }
  }

  const approved = profile?.status==='aprobado'

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">DIRECTORIO LEGAL. Regístrate en nuestro Directorio Legal y haz que tus servicios profesionales estén al alcance de nuevos clientes</h1>
      <div className="grid md:grid-cols-3 gap-3">
        <a href="/dashboard/publicar/documento-pdf" className="card p-4 hover:bg-slate-50">
          <div className="font-semibold">Publicar Documento (PDF)</div>
          <div className="text-sm text-slate-600">Sube tu PDF, contamos los folios y calculamos el monto automáticamente.</div>
        </a>
        <a href="/dashboard/cotizador" className="card p-4 hover:bg-slate-50">
          <div className="font-semibold">Calculadora</div>
          <div className="text-sm text-slate-600">Consulta el monto referencial según la tasa BCV.</div>
        </a>
        <a href="/dashboard/medios-de-pago" className="card p-4 hover:bg-slate-50">
          <div className="font-semibold">Medios de pago</div>
          <div className="text-sm text-slate-600">Consulta las cuentas y datos para realizar tu pago.</div>
        </a>
      </div>
      {approved && (
        <div className="card p-4 bg-emerald-50 border border-emerald-200">
          <div className="font-semibold text-emerald-800">¡Tu registro ha sido aprobado! Tu tarjeta profesional ya está activa en el Directorio Legal</div>
        </div>
      )}
      <div className="card p-4 text-sm space-y-2 text-slate-700">
        <p>El Directorio Legal del Diario Mercantil de Venezuela está dirigido a abogados y abogadas que deseen formar parte de nuestra red profesional, incrementando su visibilidad ante potenciales clientes en el estado donde ejercen su actividad.</p>
        <p>A través de esta opción, los profesionales del derecho pueden publicar sus áreas de ejercicio profesional y ofrecer contacto seguro para que terceros interesados puedan localizarlos y establecer comunicación directa.</p>
        <p>Datos solicitados para el registro:</p>
        <ul className="list-disc pl-5">
          <li>Nombre completo y datos de contacto (teléfonos, correo electrónico y redes sociales).</li>
          <li>Estado donde presta sus servicios y áreas de ejercicio profesional en derecho.</li>
          <li>Fotografía del carnet del INPREABOGADO y datos del Colegio de Abogados al que pertenece, que se usan solo para constatación profesional interna y no se divulgan a terceros.</li>
          <li>Fotografía de perfil profesional, utilizada en la tarjeta de contacto visible en nuestro sitio web.</li>
        </ul>
        <p>La inscripción en el Directorio Legal es gratuita y solo requiere completar el formulario de registro con los datos solicitados.</p>
        <div className="mt-2">
          <div className="font-semibold">Proceso de publicación y visualización de su tarjeta de contacto profesional:</div>
          <ol className="list-decimal pl-5">
            <li>Revisión y aprobación: Una vez completado el registro, nuestro equipo verificará la información y, tras su aprobación, su tarjeta profesional de contacto será visible en nuestro sitio web en la sección del Directorio Legal.</li>
            <li>Búsqueda por terceros: Los usuarios interesados podrán filtrar abogados por materia o por estado de ejercicio profesional.</li>
          </ol>
          <div className="mt-2">
            <div className="font-semibold">Privacidad y contacto seguro:</div>
            <ul className="list-disc pl-5">
              <li>Los datos de contacto (teléfonos, correos y redes sociales) no estarán visibles públicamente.</li>
              <li>Estos datos solo se comparten cuando un tercero interesado pulsa “Contactar” desde su tarjeta de contacto profesional.</li>
            </ul>
          </div>
        </div>
      </div>

      {approved ? (
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full overflow-hidden bg-slate-200" />
            <div>
              <div className="font-semibold">{profile?.full_name}</div>
              <div className="text-sm text-slate-600">{profile?.state} • Áreas de ejercicio profesional: {profile?.areas}</div>
            </div>
          </div>
          <div className="mt-3"><button className="btn" onClick={()=>setForm(profile||{} )}>Editar información</button></div>
        </div>
      ) : null}

      {/* Registration / Edit form */}
      <form onSubmit={onSave} className="card p-4 grid md:grid-cols-2 gap-3 items-start">
        <label className="block">
          <span className="text-sm">Nombre completo</span>
          <input className="input w-full" value={form.full_name||''} onChange={e=>setForm({...form, full_name:e.target.value})} />
        </label>
        <label className="block">
          <span className="text-sm">Correo electrónico</span>
          <input className="input w-full" type="email" value={form.email||''} onChange={e=>setForm({...form, email:e.target.value})} />
        </label>
        <label className="block">
          <span className="text-sm">Teléfonos</span>
          <input className="input w-full" value={form.phones||''} onChange={e=>setForm({...form, phones:e.target.value})} />
        </label>
        <label className="block">
          <span className="text-sm">Redes sociales (opcional)</span>
          <input className="input w-full" value={form.socials||''} onChange={e=>setForm({...form, socials:e.target.value})} />
        </label>
        <label className="block">
          <span className="text-sm">Estado donde presta sus servicios</span>
          <input className="input w-full" value={form.state||''} onChange={e=>setForm({...form, state:e.target.value})} />
        </label>
        <label className="block">
          <span className="text-sm">Áreas de ejercicio profesional</span>
          <input className="input w-full" value={form.areas||''} onChange={e=>setForm({...form, areas:e.target.value})} />
        </label>
        <label className="block">
          <span className="text-sm">Datos del Colegio de Abogados</span>
          <input className="input w-full" value={form.colegio||''} onChange={e=>setForm({...form, colegio:e.target.value})} />
        </label>
        <div className="md:col-span-2 grid md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm">Fotografía del carnet del INPREABOGADO</span>
            <input className="input w-full" type="file" accept="image/*" onChange={e=>onUpload(e.currentTarget.files?.[0]||null,'inpre')} disabled={approved} />
            {approved && <div className="text-xs text-slate-500">(No editable después de aprobado)</div>}
          </label>
          <label className="block">
            <span className="text-sm">Fotografía de perfil profesional (cuadrada recomendada)</span>
            <input className="input w-full" type="file" accept="image/*" onChange={e=>onUpload(e.currentTarget.files?.[0]||null,'profile')} />
            <div className="text-xs text-slate-500">Se recomienda subir una imagen cuadrada para un encuadre óptimo en el círculo.</div>
          </label>
        </div>
        <label className="md:col-span-2 flex items-start gap-2 text-sm">
          <input type="checkbox" checked={approved || accepted} onChange={e=>setAccepted(e.target.checked)} disabled={approved} />
          <span>Al hacer clic en “REGISTRARME”, confirmo que he leído, entiendo y acepto los Términos y Condiciones y las Políticas de Privacidad, y declaro cumplir con los requisitos para la publicación de mis servicios profesionales en el Directorio Legal del Diario Mercantil de Venezuela.</span>
        </label>
        <div className="md:col-span-2"><button className="btn btn-primary uppercase">{approved? 'Guardar cambios':'Registrarme'}</button></div>
      </form>
    </section>
  )
}
