import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconUser, IconIdCard, IconKey, IconEye, IconEyeOff, IconMail, IconPhone, IconMap } from '../components/icons'
import { ESTADOS_VENEZUELA, MUNICIPIOS_VENEZUELA } from '../lib/constants'
import { useAuth } from '../hooks/useAuth'
import { getSettings, getPagePublic } from '../lib/api'
import { PASSWORD_MIN_LENGTH, PASSWORD_MIN_MESSAGE } from '../utils/passwordPolicy'

export default function Register() {
  const navigate = useNavigate()
  const [docPrefix, setDocPrefix] = useState('V')
  const [phonePrefix, setPhonePrefix] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [termsVersion, setTermsVersion] = useState('')
  const [termsError, setTermsError] = useState('')
  const loadTerms = () => getPagePublic('terminos-y-condiciones').then(({ page }) => { setTermsVersion(page.version || ''); setTermsError('') }).catch(() => setTermsError('Los Términos y condiciones aún no están disponibles. Contacte a administración.'))
  useEffect(() => { void loadTerms() }, [])
  const [registration, setRegistration] = useState<'loading' | 'enabled' | 'suspended'>('loading')
  useEffect(() => { getSettings().then(r => setRegistration(String(r.settings.registration_enabled) === '1' || r.settings.registration_enabled === true ? 'enabled' : 'suspended')).catch(() => setRegistration('suspended')) }, [])
  const { refreshUser } = useAuth()
  const [formData, setFormData] = useState({
    document: '',
    name: '',
    email: '',
    phone: '',
    state: '',
    municipality: '',
    address: '',
    password: '',
    confirmPassword: '',
    person_type: 'natural' as 'natural' | 'juridica'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableMunicipalities, setAvailableMunicipalities] = useState<string[]>([])

  useEffect(() => {
    if (formData.state && MUNICIPIOS_VENEZUELA[formData.state]) {
      setAvailableMunicipalities(MUNICIPIOS_VENEZUELA[formData.state])
    } else {
      setAvailableMunicipalities([])
      setFormData(prev => ({ ...prev, municipality: '' }))
    }
  }, [formData.state])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.name === 'name' ? e.target.value.toLocaleUpperCase('es-VE') : e.target.value
    setFormData({ ...formData, [e.target.name]: value })
    if (e.target.name === 'person_type') setDocPrefix('V')
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (registration !== 'enabled') return
    if (!accepted || !termsVersion) { setError('Consulte y acepte los Términos y condiciones.'); return }
    if (!/^04(12|14|16|22|24|26)$/.test(phonePrefix) || !/^[0-9]{7}$/.test(formData.phone)) { setError('Seleccione la operadora y complete los siete dígitos del teléfono.'); return }
    setError('')
    setLoading(true)

    // Validaciones
    if (!formData.document || !formData.name || !formData.password || !formData.phone || !formData.state || !formData.municipality || !formData.address) {
      setError('Por favor complete todos los campos obligatorios')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    if (formData.password.length < PASSWORD_MIN_LENGTH) {
      setError(PASSWORD_MIN_MESSAGE)
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: docPrefix + formData.document,
          name: formData.name,
          email: formData.email,
          phone: phonePrefix + formData.phone,
          terms_accepted: accepted,
          terms_version: termsVersion,
          state: formData.state,
          municipality: formData.municipality,
          address: formData.address,
          password: formData.password,
          person_type: formData.person_type
        })
      })

      if (!res.ok) {
        if (res.status === 409) { setAccepted(false); void loadTerms() }
        const data = await res.json().catch(() => ({ error: 'Error al crear la cuenta' }))
        throw new Error(data.error || 'Error al crear la cuenta')
      }

      const data = await res.json()

      // Auto-login después de registro exitoso
      if (data.user) {
        localStorage.setItem('user_name', data.user.name || '')
        localStorage.setItem('user_role', data.user.role || '')
        localStorage.setItem('user_doc', data.user.document || '')
        await refreshUser()
        navigate('/solicitante/historial')
      } else {
        // Si no retorna user, redirigir a login
        navigate('/login', { state: { message: 'Cuenta creada exitosamente. Por favor inicie sesión.' } })
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 grid grid-cols-1 place-items-center p-4">
      <div className="w-full max-w-2xl min-w-0">
        <div className="text-center mb-6">
          <Link to="/">
            <img src="/Logotipo_Diario_Mercantil.svg" alt="Diario Mercantil" className="h-16 w-auto max-w-full mx-auto mb-4" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Crear cuenta</h1>
          <p className="text-slate-600 text-sm mt-2">Complete el formulario para registrarse</p>
        </div>

        <div className="card p-6">
          {registration !== 'enabled' && <p role="status" className="p-4 bg-amber-50 text-amber-900 mb-4 rounded">{registration === 'loading' ? 'Consultando disponibilidad de registro...' : 'El registro de nuevos usuarios está suspendido temporalmente.'}</p>}
          <form onSubmit={onSubmit} className="space-y-4"><fieldset disabled={registration !== 'enabled' || loading} className="space-y-4 min-w-0 w-full">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Documento */}
              <div>
                <label htmlFor="document" className="block text-sm font-medium text-slate-700 mb-2">
                  {formData.person_type === 'natural' ? 'Cédula / Pasaporte' : 'RIF'} *
                </label>
                <div className="flex gap-2 items-center min-w-0">
                <select aria-label="Prefijo del documento" className="input w-20 shrink-0" value={docPrefix} onChange={e => setDocPrefix(e.target.value)}>{(formData.person_type === 'natural' ? ['V','E','P'] : ['V','J','G']).map(p => <option key={p}>{p}</option>)}</select>
                <div className="relative flex-1 min-w-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <IconIdCard />
                  </span>
                  <input
                    type="text"
                    id="document"
                    name="document"
                    inputMode="numeric" pattern="[0-9]{1,12}" maxLength={12}
                    value={formData.document}
                    onChange={e => setFormData({ ...formData, document: e.target.value.replace(/\D/g, '') })}
                    placeholder="Número de documento"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    required
                  />
                </div>
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
                    placeholder={formData.person_type === 'natural' ? 'Nombre y Apellido' : 'Empresa C.A.'}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                  Correo electrónico *
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
                    required
                  />
                </div>
              </div>

              {/* Teléfono */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                  Teléfono *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <IconPhone />
                  </span>
                  <div className="flex gap-2 pl-8">
                    <select aria-label="Operadora telefónica" className="input w-28" value={phonePrefix} onChange={e => setPhonePrefix(e.target.value)} required><option value="">Código</option>{['0412','0414','0416','0422','0424','0426'].map(code => <option key={code}>{code}</option>)}</select>
                    <input id="phone" name="phone" inputMode="numeric" pattern="[0-9]{7}" maxLength={7} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })} placeholder="1234567" className="input flex-1 min-w-0" required />
                  </div>
                </div>
              </div>
            </div>

            {/* Dirección */}
            <hr className="border-slate-200" />
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700">Dirección de habitación o domicilio fiscal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Estado *</label>
                  <select
                    name="state"
                    className="input w-full"
                    value={formData.state}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccione Estado</option>
                    {ESTADOS_VENEZUELA.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Municipio *</label>
                  <select
                    name="municipality"
                    className="input w-full"
                    value={formData.municipality}
                    onChange={handleChange}
                    disabled={!formData.state}
                    required
                  >
                    <option value="">Seleccione Municipio</option>
                    {availableMunicipalities.map(mun => <option key={mun} value={mun}>{mun}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Dirección de habitación o domicilio fiscal *</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400">
                    <IconMap />
                  </span>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Av. Principal, Edif. Torre, Piso 1, Apto 1-A..."
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent min-h-[80px]"
                    required
                  />
                </div>
              </div>
            </div>
            <hr className="border-slate-200" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    placeholder={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres`}
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
            </div>

            {termsError && <p role="alert" className="text-sm text-rose-700">{termsError} <button type="button" className="underline" onClick={() => void loadTerms()}>Reintentar</button></p>}
            <label className="flex gap-3 items-start text-sm"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} required disabled={!termsVersion} className="mt-1" /><span>Acepto los <Link to="/p/terminos-y-condiciones" target="_blank" className="text-brand-700 underline">Términos y condiciones</Link> del Diario Mercantil de Venezuela.</span></label>
            <button
              type="submit"
              disabled={loading || !accepted || !termsVersion}
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
          </fieldset></form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          <Link to="/p/politicas-de-privacidad" className="underline">Políticas de privacidad</Link>
        </p>
      </div>
    </div>
  )
}
