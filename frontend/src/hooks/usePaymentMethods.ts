import { useCallback, useEffect, useState } from 'react'
import { listPaymentMethods, type PaymentMethod } from '../lib/api'

export function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true)
  const [paymentMethodsError, setPaymentMethodsError] = useState('')

  const reloadPaymentMethods = useCallback(async () => {
    setPaymentMethodsLoading(true)
    try {
      const response = await listPaymentMethods()
      setPaymentMethods(response.items)
      setPaymentMethodsError('')
    } catch (error: any) {
      setPaymentMethods([])
      setPaymentMethodsError(error?.data?.message || error?.message || 'No se pudieron cargar los datos bancarios.')
    } finally {
      setPaymentMethodsLoading(false)
    }
  }, [])

  useEffect(() => { void reloadPaymentMethods() }, [reloadPaymentMethods])

  return { paymentMethods, paymentMethodsLoading, paymentMethodsError, reloadPaymentMethods }
}
