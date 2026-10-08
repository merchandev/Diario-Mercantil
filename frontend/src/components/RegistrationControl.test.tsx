import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RegistrationControl from './RegistrationControl'

const mocks = vi.hoisted(() => ({ getAdminSettings: vi.fn(), saveSettings: vi.fn() }))
vi.mock('../lib/api', () => mocks)
beforeEach(() => {
  vi.resetAllMocks()
  mocks.getAdminSettings.mockResolvedValue({ settings: { registration_enabled: '0', price_per_folio_usd: '3' } })
  mocks.saveSettings.mockResolvedValue({ ok: true })
})
afterEach(cleanup)

describe('Control visible de registro', () => {
  it.each([
    ['0', '1', 'Activar registro', 'Desactivar registro', true],
    ['1', '0', 'Desactivar registro', 'Activar registro', false],
  ])('saves only the registration setting from %s to %s', async (initial, persisted, action, nextAction, value) => {
    mocks.getAdminSettings.mockResolvedValueOnce({ settings: { registration_enabled: initial, price_per_folio_usd: '3' } })
      .mockResolvedValueOnce({ settings: { registration_enabled: persisted } })
    render(<RegistrationControl />)
    fireEvent.click(await screen.findByRole('button', { name: action as string }))
    await screen.findByRole('button', { name: nextAction as string })
    expect(mocks.saveSettings).toHaveBeenCalledTimes(1)
    expect(mocks.saveSettings).toHaveBeenCalledWith({ registration_enabled: value })
    expect(screen.getByRole('status').textContent).toContain('ya están guardados')
  })

  it('does not allow changes before the server state is loaded', () => {
    mocks.getAdminSettings.mockReturnValue(new Promise(() => {}))
    render(<RegistrationControl />)
    expect((screen.getByRole('button', { name: 'Cargando registro...' }) as HTMLButtonElement).disabled).toBe(true)
    expect(mocks.saveSettings).not.toHaveBeenCalled()
  })

  it('shows loading errors and can query the state again', async () => {
    mocks.getAdminSettings.mockRejectedValueOnce(new Error('Sesión expirada'))
    render(<RegistrationControl />)
    expect((await screen.findByRole('alert')).textContent).toBe('Sesión expirada')
    expect(screen.queryByRole('button', { name: 'Activar registro' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Consultar de nuevo' }))
    await screen.findByRole('button', { name: 'Activar registro' })
  })

  it('does not claim success when saving fails', async () => {
    mocks.saveSettings.mockRejectedValueOnce(new Error('No autorizado'))
    render(<RegistrationControl />)
    fireEvent.click(await screen.findByRole('button', { name: 'Activar registro' }))
    expect((await screen.findByRole('alert')).textContent).toBe('No autorizado')
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Desactivar registro' })).toBeNull()
  })

  it('verifies persistence before showing success', async () => {
    render(<RegistrationControl />)
    fireEvent.click(await screen.findByRole('button', { name: 'Activar registro' }))
    await waitFor(() => expect(mocks.getAdminSettings).toHaveBeenCalledTimes(2))
    expect((await screen.findByRole('alert')).textContent).toContain('El cambio no quedó guardado')
    expect(screen.queryByRole('status')).toBeNull()
  })
})
