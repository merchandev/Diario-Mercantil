import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { getPublicLegalByOrder } from '../lib/api'

export default function PublicacionPublic() {
  const { orden } = useParams<{ orden: string }>()
  const [target, setTarget] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!orden) {
      setNotFound(true)
      return
    }

    let active = true
    getPublicLegalByOrder(orden)
      .then(item => {
        if (!active) return
        if (!item.edition_code) {
          setNotFound(true)
          return
        }
        setTarget(`/edicion/${encodeURIComponent(item.edition_code)}`)
      })
      .catch(() => {
        if (active) setNotFound(true)
      })

    return () => { active = false }
  }, [orden])

  if (target) return <Navigate to={target} replace />
  if (notFound) return <div className="max-w-3xl mx-auto p-6"><div className="card p-6">Publicación no disponible.</div></div>
  return <div className="max-w-3xl mx-auto p-6"><div className="card p-6">Cargando...</div></div>
}
