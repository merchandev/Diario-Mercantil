import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconUser, IconIdCard, IconKey, IconEye, IconEyeOff, IconMail, IconPhone } from '../components/icons'

export default function Register(){
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    document: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    person_type: 'natural' as 'natural' | 'juridica'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validaciones
    if (!formData.document || !formData.name || !formData.password) {
      setError('Por favor complete los campos obligatorios')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: formData.document,
          name: formData.name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          password: formData.password,
          person_type: formData.person_type
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Error al crear la cuenta' }))
        throw new Error(data.error || 'Error al crear la cuenta')
      }

      const data = await res.json()
      
      // Auto-login después de registro exitoso
      if (data.token) {
        localStorage.setItem('token', data.token)
        navigate('/solicitante/historial')
      } else {
        // Si no retorna token, redirigir a login
        navigate('/login', { state: { message: 'Cuenta creada exitosamente. Por favor inicie sesión.' } })
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 grid place-items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/">
            <img src="/Logotipo_Diario_Mercantil.svg" alt="Diario Mercantil" className="h-16 mx-auto mb-4" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Crear cuenta</h1>
          <p className="text-slate-600 text-sm mt-2">Complete el formulario para registrarse</p>
        </div>

        <div className="card p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Tipo de persona */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tipo de persona *
              </label>
              <div className="flex gap-3">
                <label className="flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:border-brand-500 transition">
                  <input
                    type="radio"
                    name="person_type"
                    value="natural"
                    checked={formData.person_type === 'natural'}
                    onChange={handleChange}
                    className="text-brand-600"
                  />
                  <span className="text-sm">Natural</span>
                </label>
                <label className="flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:border-brand-500 transition">
                  <input
                    type="radio"
                    name="person_type"
                    value="juridica"
                    checked={formData.person_type === 'juridica'}
                    onChange={handleChange}
                    className="text-brand-600"
                  />
                  <span className="text-sm">Jurídica</span>
                </label>
              </div>
            </div>

            {/* Documento */}
            <div>
              <label htmlFor="document" className="block text-sm font-medium text-slate-700 mb-2">
                {formData.person_type === 'natural' ? 'Cédula / Pasaporte' : 'RIF'} *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <IconIdCard />
                </span>
                <input
                  type="text"
                  id="document"
                  name="document"
                  value={formData.document}
                  onChange={handleChange}
                  placeholder={formData.person_type === 'natural' ? 'V12345678' : 'J123456789'}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                {formData.person_type === 'natural' ? 'Nombre completo' : 'Razón social'} *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <IconUser />
                </span>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ingrese su nombre"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <IconMail />
                </span>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="correo@ejemplo.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                Teléfono
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <IconPhone />
                </span>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="04XX-XXXXXXX"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Contraseña *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <IconKey />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-12 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                Confirmar contraseña *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <IconKey />
                </span>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repita su contraseña"
                  className="w-full pl-10 pr-12 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary h-11 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>

            <p className="text-center text-sm text-slate-600">
              ¿Ya tiene una cuenta?{' '}
              <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">
                Iniciar sesión
              </Link>
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          Al crear una cuenta, acepta nuestros términos y condiciones
        </p>
      </div>
    </div>
  )
}
