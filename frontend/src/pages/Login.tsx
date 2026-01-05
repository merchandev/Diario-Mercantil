import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login as apiLogin, me } from '../lib/api'
import { IconEye, IconEyeOff, IconIdCard, IconKey } from '../components/icons'

export default function Login(){
  const navigate = useNavigate()
  const [docPrefix, setDocPrefix] = useState<'V'|'E'|'J'|'G'|'P'>('V')
  const [docNumber, setDocNumber] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e:React.FormEvent)=>{
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const raw = (docNumber || '').trim()
      const document = /[^0-9]/.test(raw) ? raw : `${docPrefix}${raw}`
      const { token, user } = await apiLogin({ document, password })
      console.log('🔐 Login exitoso:', { user: user.name, role: user.role })
      
      if (remember) {
        localStorage.setItem('token', token)
        localStorage.setItem('user_name', user.name || '')
        localStorage.setItem('user_role', user.role || '')
        localStorage.setItem('user_doc', user.document || '')
      } else {
        sessionStorage.setItem('token', token)
        sessionStorage.setItem('user_name', user.name || '')
        sessionStorage.setItem('user_role', user.role || '')
        sessionStorage.setItem('user_doc', user.document || '')
      }
      
      // Redirect based on role
      const role = user.role.toLowerCase()
      console.log('🚀 Redirigiendo basado en rol:', role)
      
      if (role === 'solicitante' || role === 'user') {
        console.log('➡️ Navegando a /solicitante/historial')
        navigate('/solicitante/historial')
      } else {
        console.log('➡️ Navegando a /dashboard')
        navigate('/dashboard')
      }
    } catch (err:any) {
      console.error('❌ Error en login:', err)
      setError('Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-slate-50 flex items-center justify-center px-4 py-10">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-600/10 blur-3xl animate-pulse"></div>
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-rose-400/10 blur-3xl animate-pulse"></div>

      <div className="w-full max-w-md">
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8">
            <div className="relative text-center mb-8">
              <a href="/" aria-label="Inicio" className="inline-block">
                <img src="/Logotipo_Diario_Mercantil.svg" alt="Diario Mercantil de Venezuela" className="h-12 md:h-16 w-auto mx-auto" />
              </a>
              <span className="absolute inset-x-1/2 -translate-x-1/2 -bottom-3 h-px w-24 bg-gradient-to-r from-transparent via-brand-600/40 to-transparent" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-800 mb-6">Inicia sesión</h2>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="group">
                <label className="block text-sm mb-1 text-slate-600">N° de documento</label>
                <div className="flex items-center rounded-2xl ring-1 ring-slate-200 bg-white focus-within:ring-2 focus-within:ring-brand-600 transition px-2 h-12 shadow-sm">
                  <span className="text-slate-500 w-8 grid place-items-center"><IconIdCard/></span>
                  <select aria-label="Prefijo" value={docPrefix} onChange={e=>setDocPrefix(e.target.value as any)} className="h-8 rounded-md bg-transparent px-1 text-slate-700 focus:outline-none">
                    <option value="V">V</option>
                    <option value="E">E</option>
                    <option value="J">J</option>
                    <option value="G">G</option>
                    <option value="P">P</option>
                  </select>
                  <input
                    value={docNumber}
                    onChange={e=>setDocNumber(e.target.value)}
                    className="ml-2 flex-1 bg-transparent outline-none text-slate-800 placeholder-slate-400 h-10"
                    placeholder="Documento o usuario"
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="group">
                <label className="block text-sm mb-1 text-slate-600">Contraseña</label>
                <div className="flex items-center rounded-2xl ring-1 ring-slate-200 bg-white focus-within:ring-2 focus-within:ring-brand-600 transition px-2 h-12 shadow-sm">
                  <span className="text-slate-500 w-8 grid place-items-center"><IconKey/></span>
                  <div className="flex-1 relative h-full">
                    <input
                      value={password}
                      onChange={e=>setPassword(e.target.value)}
                      className="bg-transparent outline-none text-slate-800 placeholder-slate-400 h-full w-full pr-10"
                      type={show? 'text':'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button type="button" onClick={()=>setShow(!show)} className="absolute inset-y-0 right-1 px-2 text-slate-500 w-8 grid place-items-center hover:text-slate-700 transition" aria-label="Mostrar u ocultar contraseña">
                      {show? <IconEyeOff/> : <IconEye/>}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="inline-flex items-center gap-2 select-none">
                  <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} /> Recuérdame
                </label>
                <button type="button" className="text-slate-500 hover:text-slate-700 transition">¿Olvidé mi contraseña?</button>
              </div>
              {error && <div className="text-rose-600 text-sm">{error}</div>}
              <button disabled={loading} className="relative btn btn-primary w-full overflow-hidden">
                <span className="relative z-10">{loading? 'Ingresando...':'Ingresar'}</span>
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </button>
              <div className="text-center">
                <span className="text-sm text-slate-600">¿No tiene una cuenta? </span>
                <Link to="/register" className="text-sm text-brand-600 hover:text-brand-700 font-medium">Crear cuenta</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
