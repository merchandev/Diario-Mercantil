import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { getPublicLegalByOrder } from '../lib/api'

export default function PublicLegalRequest() {
  const { order } = useParams<{ order: string }>()
  const [target, setTarget] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!order) {
      setNotFound(true)
      return
    }

    let active = true
    getPublicLegalByOrder(order)
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
  }, [order])

  if (target) return <Navigate to={target} replace />
  if (notFound) return <div className="min-h-screen grid place-items-center">Publicación no disponible.</div>
  return <div className="min-h-screen grid place-items-center">Cargando...</div>
}
