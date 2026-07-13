import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Error al enviar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-slate-100 p-6 md:p-8">
        <div className="space-y-1 mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Recuperar contraseña</h2>
          <p className="text-slate-500 text-sm">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>
        <div>
          {success ? (
            <div className="space-y-4">
              <div className="bg-green-50 text-green-800 p-4 rounded-md border border-green-200">
                Si el correo está registrado, recibirás un enlace de recuperación pronto. Revisa tu bandeja de entrada o spam.
              </div>
              <Link to="/login" className="block text-center text-sm text-brand-600 hover:text-brand-700 font-medium">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-slate-700" htmlFor="email">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="ejemplo@correo.com"
                  disabled={loading}
                />
              </div>

              {error && <div className="text-sm text-red-500 font-medium">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-50 disabled:pointer-events-none bg-brand-600 text-white hover:bg-brand-700 h-10 px-4 py-2 w-full"
              >
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </button>

              <div className="text-center text-sm mt-4">
                <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">
                  Volver al inicio de sesión
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
