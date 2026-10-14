import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Convocatoria from './Convocatoria'

const mocks = vi.hoisted(() => ({
  addLegalPayment: vi.fn(), attachLegalFile: vi.fn(), createLegal: vi.fn(), getBcvRate: vi.fn(), getSettings: vi.fn(),
  listLegalFiles: vi.fn(), me: vi.fn(), getLegal: vi.fn(), updateLegal: vi.fn(), uploadFiles: vi.fn(), submitLegal: vi.fn(),
  showAlert: vi.fn(),
}))
vi.mock('../../lib/api', () => mocks)
vi.mock('../../contexts/DialogContext', () => ({ useDialog: () => ({ showAlert: mocks.showAlert }) }))
vi.mock('../../components/PaymentMethodsPanel', () => ({ default: () => null }))

function open(path = '/solicitante/convocatoria') {
  return render(<MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/solicitante/convocatoria" element={<Convocatoria />} /></Routes>
  </MemoryRouter>)
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getSettings.mockResolvedValue({ settings: {} })
  mocks.getBcvRate.mockResolvedValue({ rate: 1 })
  mocks.me.mockResolvedValue({ user: { name: 'SOLICITANTE DE PRUEBA', document: 'V45678901' } })
  mocks.createLegal.mockResolvedValue({ ok: true, id: '55' })
  mocks.updateLegal.mockResolvedValue({ ok: true })
  mocks.uploadFiles.mockResolvedValue({ created: [{ fileId: 9 }] })
  mocks.attachLegalFile.mockResolvedValue({ ok: true })
  mocks.listLegalFiles.mockResolvedValue({ items: [{ id: 1, kind: 'convocatoria_scan', file_id: 9, name: 'scan.png' }] })
})
afterEach(cleanup)

describe('Convocatoria draft', () => {
  it('persists the typed data before attaching the first file', async () => {
    const { container } = open()
    fireEvent.change(screen.getByPlaceholderText('RAZÓN O DENOMINACIÓN SOCIAL'), { target: { value: 'convocatoria de prueba' } })
    const scan = container.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement
    fireEvent.change(scan, { target: { files: [new File(['png'], 'scan.png', { type: 'image/png' })] } })

    await screen.findByText(/Archivo cargado: scan\.png/)
    expect(mocks.createLegal).toHaveBeenCalledWith(expect.objectContaining({ pub_type: 'Convocatoria', meta: expect.objectContaining({ razon_social: 'CONVOCATORIA DE PRUEBA' }) }))
    expect(mocks.createLegal.mock.calls[0][0]).not.toHaveProperty('name')
    expect(mocks.createLegal.mock.invocationCallOrder[0]).toBeLessThan(mocks.attachLegalFile.mock.invocationCallOrder[0])
    expect(mocks.attachLegalFile).toHaveBeenCalledWith(55, 9, 'convocatoria_scan')
    expect(screen.getByRole('status').textContent).toContain('Borrador guardado')
  })

  it('saves later changes of an existing draft with the explicit save action', async () => {
    mocks.getLegal.mockResolvedValue({ item: { id: 55, status: 'Borrador', pub_type: 'Convocatoria', meta: { razon_social: 'CONVOCATORIA DE PRUEBA' } }, payments: [] })
    open('/solicitante/convocatoria?id=55')
    const company = await screen.findByDisplayValue('CONVOCATORIA DE PRUEBA')
    fireEvent.change(company, { target: { value: 'convocatoria corregida' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }))
    await waitFor(() => expect(mocks.updateLegal).toHaveBeenCalledWith(55, { meta: expect.objectContaining({ razon_social: 'CONVOCATORIA CORREGIDA' }) }))
    expect(mocks.createLegal).not.toHaveBeenCalled()
    expect((await screen.findByRole('status')).textContent).toContain('Borrador guardado')
  })

  it('does not attach a file when the draft data cannot be saved', async () => {
    mocks.createLegal.mockRejectedValue(new Error('El expediente debe tener formato 000-00000000'))
    const { container } = open()
    const scan = container.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement
    fireEvent.change(scan, { target: { files: [new File(['png'], 'scan.png', { type: 'image/png' })] } })
    await waitFor(() => expect(mocks.showAlert).toHaveBeenCalled())
    expect(mocks.uploadFiles).not.toHaveBeenCalled()
    expect(mocks.attachLegalFile).not.toHaveBeenCalled()
    expect(screen.getByRole('status').textContent).toContain('No se guardó el borrador')
  })
})
