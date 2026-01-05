import { useState } from 'react'

export default function Contacto(){
  const [nombre, setNombre] = useState('')
  const [tiempo, setTiempo] = useState('')
  const [vivienda, setVivienda] = useState('')

  const onSubmit = (e: React.FormEvent)=>{
    e.preventDefault()
    if (!nombre || !tiempo || !vivienda) return
    const mensaje = `Hola Carmelo Bungalows, quisiera recibir información:\n· Nombre: ${nombre}\n· Tiempo de estadía: ${tiempo}\n· Tipo de vivienda: ${vivienda}`
    const url = 'https://wa.me/59898341539?text=' + encodeURIComponent(mensaje)
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold">Contacto</h1>
          <p className="text-slate-600">Envíanos un mensaje por WhatsApp y te responderemos a la brevedad.</p>
        </div>
        <div className="grid place-items-center">
          <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-slate-200 shadow-sm bg-white/70 backdrop-blur p-6">
            <div>
              <label htmlFor="c_nombre" className="block text-sm font-medium text-slate-700">Nombre completo</label>
              <input id="c_nombre" className="input w-full mt-1" placeholder="Ej: Juan Gómez" value={nombre} onChange={e=>setNombre(e.target.value)} required />
            </div>
            <div className="mt-4">
              <label htmlFor="c_tiempo" className="block text-sm font-medium text-slate-700">Tiempo estimado de estadía</label>
              <input id="c_tiempo" className="input w-full mt-1" placeholder="Ej: 3 días" value={tiempo} onChange={e=>setTiempo(e.target.value)} required />
            </div>
            <div className="mt-4">
              <label htmlFor="c_vivienda" className="block text-sm font-medium text-slate-700">Tipo de vivienda</label>
              <select id="c_vivienda" className="input w-full mt-1" value={vivienda} onChange={e=>setVivienda(e.target.value)} required>
                <option value="">Selecciona una opción</option>
                <option>Casa</option>
                <option>Bungalow</option>
                <option>Bungalow con dormitorio</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary w-full mt-6 h-12 text-base">
              <img src="https://carmelobungalows.com.uy/wp-content/uploads/2025/07/whatsapp-logo-variant-svgrepo-com.svg" alt="WhatsApp" className="w-6 h-6" />
              Contáctanos
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
