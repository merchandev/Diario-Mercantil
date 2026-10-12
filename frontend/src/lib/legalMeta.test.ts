import { describe, expect, it } from 'vitest'
import { normalizeLegalMeta } from './legalMeta'
import { isUnchangedPayment, paymentIdempotency } from './legalPayment'
describe('returned legal draft', () => {
  it('restores canonical aliases and uppercase selectors without losing fields', () => {
    const result = normalizeLegalMeta(JSON.stringify({ fecha_registro: '2026-01-02', numero_expediente: '391-001', numero_planilla: '391.2026.1.000123', estado: 'Monagas', tipo_sociedad: 'Compañía Anónima (C.A.)', tomo: '001' }))
    expect(result.fecha).toBe('2026-01-02')
    expect(result.expediente).toBe('391-001')
    expect(result.planilla).toBe('391.2026.1.000123')
    expect(result.estado).toBe('MONAGAS')
    expect(result.tipo_sociedad).toBe('COMPAÑÍA ANÓNIMA (C.A.)')
    expect(result.tomo).toBe('001')
  })
  it('supports old aliases and damaged metadata', () => {
    expect(normalizeLegalMeta({ fecha: '2026-01-01', expediente: '391-123' }).expediente).toBe('391-123')
    expect(normalizeLegalMeta('null').fecha).toBe('')
    expect(normalizeLegalMeta('invalid').fecha).toBe('')
  })
  it('reuses an unchanged historic payment but requires a new report when rejected or edited', () => {
    const original = { id: 1, legal_request_id: 1, status: 'Aprobado', amount_bs: 100, ref: '1234', bank: 'Banco', date: '2026-01-01', mobile_phone: '04121234567' }
    const form = { ref: '1234', bank: 'Banco', date: '2026-01-01', mobile_phone_prefix: '0412', mobile_phone: '1234567' }
    expect(isUnchangedPayment(original, form)).toBe(true)
    expect(isUnchangedPayment({ ...original, status: 'Rechazado' }, form)).toBe(false)
    expect(isUnchangedPayment(original, { ...form, ref: '001234' })).toBe(false)
  })
  it('keeps retry identity only for identical payment data', () => {
    sessionStorage.clear()
    const first = paymentIdempotency(1, { ref: '001234' })
    expect(paymentIdempotency(1, { ref: '001234' })).toBe(first)
    expect(paymentIdempotency(1, { ref: '001235' })).not.toBe(first)
  })
})
