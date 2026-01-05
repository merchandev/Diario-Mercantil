import { useEffect, useState } from 'react'
import { getBcvRate, getSettings } from '../lib/api'

interface AppSettings {
  settings: Record<string, any>
  bcvRate: number | undefined
  loading: boolean
  error: string | null
}

/**
 * Custom hook to fetch and manage app settings and BCV rate
 * Reduces duplicate code across components
 */
export function useAppSettings(): AppSettings {
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [bcvRate, setBcvRate] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        const [settingsRes, rateRes] = await Promise.allSettled([
          getSettings(),
          getBcvRate()
        ])

        if (settingsRes.status === 'fulfilled') {
          setSettings(settingsRes.value.settings || {})
        } else {
          console.error('Error cargando configuración:', settingsRes.reason)
        }

        if (rateRes.status === 'fulfilled') {
          setBcvRate(rateRes.value.rate)
        } else {
          console.error('Error cargando tasa BCV:', rateRes.reason)
        }

        // Only set error if both failed
        if (settingsRes.status === 'rejected' && rateRes.status === 'rejected') {
          setError('No se pudo cargar la configuración ni la tasa BCV')
        }
      } catch (err) {
        console.error('Error inesperado:', err)
        setError('Error inesperado al cargar datos')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  return { settings, bcvRate, loading, error }
}
