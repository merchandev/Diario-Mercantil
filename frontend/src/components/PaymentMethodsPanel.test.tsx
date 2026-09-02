import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PaymentMethodsPanel from './PaymentMethodsPanel'

vi.mock('../hooks/usePaymentMethods', () => ({
  usePaymentMethods: () => ({
    paymentMethods: [{
      id: 7,
      type: 'pago_movil',
      bank: 'Banco de Venezuela',
      account: '',
      holder: 'Diario Mercantil',
      rif: 'J-12345678-9',
      phone: '04121234567',
      qr_url: '/api/payment-methods/7/qr',
      qr_updated_at: '2026-09-02 10:00:00',
    }],
    paymentMethodsLoading: false,
    paymentMethodsError: '',
    reloadPaymentMethods: vi.fn(),
  }),
}))

describe('PaymentMethodsPanel', () => {
  it('shows the exact QR configured by the administrator', () => {
    const { container } = render(<PaymentMethodsPanel amountBs={123.45} />)
    const qr = screen.getByAltText('QR bancario de Banco de Venezuela')

    expect(qr.getAttribute('src')).toBe('/api/payment-methods/7/qr?v=2026-09-02%2010%3A00%3A00')
    expect(container.querySelector('canvas')).toBeNull()
    expect(screen.getByText('VES 123,45')).toBeTruthy()
  })
})
