import type { LegalPayment } from './api'
export function isUnchangedPayment(original: LegalPayment | null, pay: { ref: string; bank: string; date: string; mobile_phone_prefix: string; mobile_phone: string }): boolean {
  return !!original && ['Aprobado', 'Por verificar', 'Verificado'].includes(original.status || '') &&
    original.ref === pay.ref && original.bank === pay.bank && original.date === pay.date &&
    original.mobile_phone === pay.mobile_phone_prefix + pay.mobile_phone
}
export function paymentIdempotency(requestId: number, pay: unknown): string {
  const slot = 'dm-payment-idempotency-' + requestId
  const signature = JSON.stringify(pay)
  let previous: { signature: string; key: string } | undefined
  try { previous = JSON.parse(sessionStorage.getItem(slot) || '{}') } catch { /* old keys are replaced */ }
  if (previous?.signature === signature && previous.key) return previous.key
  const key = crypto.randomUUID()
  sessionStorage.setItem(slot, JSON.stringify({ signature, key }))
  return key
}
