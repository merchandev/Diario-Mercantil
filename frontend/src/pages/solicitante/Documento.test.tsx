import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Documento from './Documento'

const mocks = vi.hoisted(() => ({
  addLegalPayment: vi.fn(), attachLegalFile: vi.fn(), createLegal: vi.fn(), downloadLegal: vi.fn(), getBcvRate: vi.fn(),
  getSettings: vi.fn(), listLegalFiles: vi.fn(), me: vi.fn(), getLegal: vi.fn(), updateLegal: vi.fn(), uploadFiles: vi.fn(),
  submitLegal: vi.fn(), fetchAuth: vi.fn(), ApiError: class ApiError extends Error {},
}))
vi.mock('../../lib/api', () => mocks)
vi.mock('../../components/PaymentMethodsPanel', () => ({ default: () => null }))
vi.mock('../../components/ProtectedPdfViewer', () => ({ default: () => null }))

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getSettings.mockResolvedValue({ settings: { price_per_folio_usd: '10' } })
  mocks.getBcvRate.mockResolvedValue({ rate: 1 })
  mocks.me.mockResolvedValue({ user: { name: 'SOLICITANTE DE PRUEBA', document: 'V45678901', email: 'solicitante@example.test', phone: '04121234567' } })
  mocks.listLegalFiles.mockResolvedValue({ items: [] })
  mocks.updateLegal.mockResolvedValue({ ok: true })
  // Draft saved by the previous flow, which copied the company into the applicant fields.
  mocks.getLegal.mockResolvedValue({
    item: {
      id: 77, status: 'Borrador', pub_type: 'Documento', name: 'EMPRESA REPRESENTADA, C.A.', document: 'J123456789',
      folios: 3, total_bs: 30, tasa_bcv: 1, subtotal_usd: 25.86, iva_usd: 4.14,
      meta: { razon_social: 'EMPRESA REPRESENTADA, C.A.', rif: 'J123456789', tipo_sociedad: 'COMPAÑÍA ANÓNIMA (C.A.)', tipo_acto: 'CONSTITUCIÓN' },
    },
    payments: [],
  })
})
afterEach(cleanup)

describe('Documento applicant identity', () => {
  it('keeps the account as applicant and the company only in the publication description', async () => {
    render(<MemoryRouter initialEntries={['/solicitante/documento?id=77']}>
      <Routes><Route path="/solicitante/documento" element={<Documento />} /></Routes>
    </MemoryRouter>)

    await screen.findByDisplayValue('EMPRESA REPRESENTADA, C.A.')
    fireEvent.click(screen.getByRole('button', { name: /Continuar al Paso 2/ }))
    fireEvent.click(await screen.findByRole('button', { name: /Continuar al pago/ }))

    const applicant = (await screen.findByText('Datos del Solicitante')).parentElement as HTMLElement
    expect(within(applicant).getByText('SOLICITANTE DE PRUEBA')).toBeTruthy()
    expect(within(applicant).getByText('V45678901')).toBeTruthy()
    expect(within(applicant).queryByText('J123456789')).toBeNull()
    expect(screen.getAllByText('EMPRESA REPRESENTADA, C.A.').length).toBeGreaterThan(0)

    const saved = mocks.updateLegal.mock.calls[0][1]
    expect(saved).not.toHaveProperty('name')
    expect(saved).not.toHaveProperty('document')
    expect(saved).not.toHaveProperty('date')
    expect(saved.meta.razon_social).toBe('EMPRESA REPRESENTADA, C.A.')
  })
})
