import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Papelera from './Papelera'

const mocks = vi.hoisted(() => ({
  role: 'admin', listTrashedLegal: vi.fn(), listRetiredEditions: vi.fn(),
  restoreLegal: vi.fn(), restoreEdition: vi.fn(), permanentDeleteLegal: vi.fn(),
  permanentDeleteEdition: vi.fn(), getTrashedLegal: vi.fn(), getTrashedEdition: vi.fn(),
  confirmAction: vi.fn(), showAlert: vi.fn(),
}))
vi.mock('../lib/api', () => mocks)
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { role: mocks.role } }) }))
vi.mock('../contexts/DialogContext', () => ({ useDialog: () => mocks }))

function open(tab = 'publicaciones') {
  render(<MemoryRouter initialEntries={['/dashboard/papelera?tab=' + tab]}>
    <Routes>
      <Route path="/dashboard/papelera" element={<Papelera />} />
      <Route path="/dashboard/publicaciones/11" element={<p>Ficha restaurada</p>} />
      <Route path="/dashboard/ediciones" element={<p>Edición restaurada</p>} />
    </Routes>
  </MemoryRouter>)
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.role = 'admin'
  mocks.confirmAction.mockResolvedValue(true)
  mocks.listTrashedLegal.mockResolvedValue({ items: [{ id: 11, name: 'Solicitud conservada', status: 'En trámite', can_permanently_delete: true }] })
  mocks.listRetiredEditions.mockResolvedValue({ items: [{ id: 22, code: 'MMXXVI-0022', status: 'Publicada', orders_count: 1, can_permanently_delete: true }] })
})
afterEach(cleanup)

describe('Papelera editorial', () => {
  it('shows both tabs and restores a publication to its editable detail', async () => {
    open()
    await screen.findByText('Solicitud conservada')
    expect(screen.getByRole('tab', { name: 'Ediciones (1)' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Eliminar definitivamente' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar y editar' }))
    await screen.findByText('Ficha restaurada')
    expect(mocks.restoreLegal).toHaveBeenCalledWith(11)
    expect(mocks.confirmAction.mock.calls[0][0]).toContain('Por verificar')
  })

  it('restores editions with a clear requirement for a new final PDF', async () => {
    open('ediciones')
    await screen.findByText('MMXXVI-0022')
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar y editar' }))
    await screen.findByText('Edición restaurada')
    expect(mocks.restoreEdition).toHaveBeenCalledWith(22)
    expect(mocks.confirmAction.mock.calls[0][0]).toContain('Borrador con el mismo CVE')
    expect(mocks.confirmAction.mock.calls[0][0]).toContain('PDF final')
  })

  it('keeps the edition in trash and displays association conflicts', async () => {
    mocks.restoreEdition.mockRejectedValue(new Error('La publicación ya pertenece a otra edición activa.'))
    open('ediciones')
    await screen.findByText('MMXXVI-0022')
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar y editar' }))
    await waitFor(() => expect(mocks.showAlert).toHaveBeenCalledWith('La publicación ya pertenece a otra edición activa.', expect.anything()))
    expect(screen.queryByText('Edición restaurada')).toBeNull()
    expect(screen.getByText('MMXXVI-0022')).toBeTruthy()
  })

  it.each(['admin', 'superadmin'])('offers confirmed permanent deletion to %s for both kinds of records', async (role) => {
    mocks.role = role
    open()
    await screen.findByText('Solicitud conservada')
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar definitivamente' }))
    await waitFor(() => expect(mocks.permanentDeleteLegal).toHaveBeenCalledWith(11))
    fireEvent.click(screen.getByRole('tab', { name: 'Ediciones (1)' }))
    await screen.findByText('MMXXVI-0022')
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar definitivamente' }))
    await waitFor(() => expect(mocks.permanentDeleteEdition).toHaveBeenCalledWith(22))
    expect(mocks.confirmAction).toHaveBeenCalledTimes(2)
  })

  it.each(['staff', 'manager', 'solicitante'])('does not offer permanent deletion to %s', async (role) => {
    mocks.role = role
    open('ediciones')
    await screen.findByText('MMXXVI-0022')
    expect(screen.queryByRole('button', { name: 'Eliminar definitivamente' })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Publicaciones (1)' }))
    expect(screen.queryByRole('button', { name: 'Eliminar definitivamente' })).toBeNull()
  })

  it('respects backend eligibility and cancellation', async () => {
    mocks.listRetiredEditions.mockResolvedValue({ items: [{ id: 22, code: 'MMXXVI-0022', can_permanently_delete: false }] })
    mocks.confirmAction.mockResolvedValue(false)
    open('ediciones')
    await screen.findByText('MMXXVI-0022')
    expect(screen.queryByRole('button', { name: 'Eliminar definitivamente' })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Publicaciones (1)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar definitivamente' }))
    await waitFor(() => expect(mocks.confirmAction).toHaveBeenCalledTimes(1))
    expect(mocks.permanentDeleteLegal).not.toHaveBeenCalled()
  })
})
