import { useState, useEffect } from 'react'
import { IconUser, IconMail, IconPhone, IconIdCard, IconSave, IconCamera, IconUserCircle } from '../../components/icons'
import { fetchAuth } from '../../lib/api'

interface UserProfile {
  id: number
  document: string
  name: string
  email: string | null
  phone: string | null
  person_type: string
  avatar_url: string | null
}

export default function Perfil() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const res = await fetchAuth('/api/auth/me')
      const data = await res.json()
      setProfile(data.user)
      setFormData({
        name: data.user.name || '',
        email: data.user.email || '',
        phone: data.user.phone || ''
      })
      setAvatarPreview(data.user.avatar_url)
    } catch (err) {
      console.error('Error cargando perfil:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'La imagen debe ser menor a 2MB' })
        return
      }
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Solo se permiten imágenes' })
        return
      }
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSaving(true)

    try {
      // Actualizar datos básicos
      const updateRes = await fetchAuth('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!updateRes.ok) {
        throw new Error('Error al actualizar perfil')
      }

      // Subir avatar si hay uno nuevo
      if (avatarFile) {
        const formData = new FormData()
        formData.append('avatar', avatarFile)

        const avatarRes = await fetchAuth('/api/user/avatar', {
          method: 'POST',
          body: formData
        })

        if (!avatarRes.ok) {
          throw new Error('Error al subir foto de perfil')
        }
      }

      setMessage({ type: 'success', text: 'Perfil actualizado exitosamente' })
      await loadProfile()
      setAvatarFile(null)
      window.dispatchEvent(new Event('user_updated'))
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al actualizar perfil' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Cargando perfil...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Mi Perfil</h1>
        <p className="text-slate-600 text-sm mt-1">Actualice su información personal</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Section */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Foto de Perfil</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-slate-400 overflow-hidden flex items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <IconUserCircle className="w-20 h-20 text-slate-600" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-10 h-10 bg-brand-600 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-brand-700 transition shadow-lg">
                <IconCamera className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-700 font-medium mb-1">Cambiar foto de perfil</p>
              <p className="text-xs text-slate-500">JPG, PNG o GIF. Máximo 2MB</p>
              {avatarFile && (
                <p className="text-xs text-brand-600 mt-2">
                  ✓ Imagen seleccionada: {avatarFile.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Información Básica</h2>
          <div className="space-y-4">
            {/* Document (read-only) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {profile?.person_type === 'natural' ? 'Cédula / Pasaporte' : 'RIF'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <IconIdCard />
                </span>
                <input
                  type="text"
                  value={profile?.document || ''}
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">El documento no puede ser modificado</p>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                {profile?.person_type === 'natural' ? 'Nombre completo' : 'Razón social'} *
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
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
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

            {/* Phone */}
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
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={loadProfile}
            className="btn btn-ghost"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary flex items-center gap-2"
            disabled={saving}
          >
            <IconSave />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
