import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../lib/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Enlace inválido. No se proporcionó un token.')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    setError('')
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Error al restablecer la contraseña')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-slate-100 p-6 md:p-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-red-600">Enlace inválido</h2>
            <p className="text-sm text-slate-500 mt-2">
              El enlace de recuperación está incompleto o es inválido. Por favor solicita uno nuevo.
            </p>
          </div>
          <div>
            <Link to="/olvide-password" className="text-sm text-red-600 hover:underline">Volver a intentar</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-slate-100 p-6 md:p-8">
        <div className="space-y-1 mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Restablecer contraseña</h2>
          <p className="text-slate-500 text-sm">
            Ingresa tu nueva contraseña a continuación.
          </p>
        </div>
        <div>
          {success ? (
            <div className="space-y-4">
              <div className="bg-green-50 text-green-800 p-4 rounded-md border border-green-200">
                Tu contraseña ha sido actualizada exitosamente. Redirigiendo al inicio de sesión...
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="password">Nueva contraseña</label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent disabled:opacity-50"
                  placeholder="******"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="confirmPassword">Confirmar nueva contraseña</label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent disabled:opacity-50"
                  placeholder="******"
                  disabled={loading}
                />
              </div>

              {error && <div className="text-sm text-red-500 font-medium">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 h-10 px-4 py-2 w-full disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Restablecer contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
