import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MaintenanceGate from './MaintenanceGate'

vi.mock('react-helmet-async', () => ({ Helmet: () => null }))
const fetchMock = vi.fn()
function reply(data: unknown, status = 200) { return Promise.resolve({ ok: status === 200, status, json: async () => data }) }
const locked = { enabled: true, unlocked: false, expires_at: null }
const open = { enabled: true, unlocked: true, expires_at: Math.floor(Date.now() / 1000) + 14400, remaining_seconds: 14400 }
beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset() })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const mount = () => render(<MaintenanceGate><div>Contenido privado</div></MaintenanceGate>)

describe('Scheduled maintenance access', () => {
  it('hides every route until an administrator password is validated', async () => {
    fetchMock.mockImplementation((url: string) => url.endsWith('/unlock') ? reply({ unlocked: true }) : reply(fetchMock.mock.calls.length > 2 ? open : locked))
    mount()
    await screen.findByLabelText('Contraseña de administrador')
    expect(screen.queryByText('Contenido privado')).toBeNull()
    fireEvent.change(screen.getByLabelText('Contraseña de administrador'), { target: { value: 'AdminPassword123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Autorizar acceso' }))
    await screen.findByText('Contenido privado')
    const call = fetchMock.mock.calls.find(([url]) => url.endsWith('/unlock'))
    expect(JSON.parse(call?.[1].body)).toEqual({ password: 'AdminPassword123' })
    expect(call?.[1].credentials).toBe('include')
  })
  it('keeps the gate closed when availability cannot be verified', async () => {
    fetchMock.mockRejectedValue(new Error('Servidor no disponible'))
    mount()
    await screen.findByRole('alert')
    expect(screen.queryByText('Contenido privado')).toBeNull()
  })
  it('returns to the gate immediately when an API reports a revoked session', async () => {
    fetchMock.mockResolvedValue(await reply(open))
    mount()
    await screen.findByText('Contenido privado')
    fetchMock.mockResolvedValue(await reply(locked))
    act(() => window.dispatchEvent(new Event('dm-maintenance-required')))
    expect(screen.queryByText('Contenido privado')).toBeNull()
    await screen.findByLabelText('Contraseña de administrador')
  })
  it('uses server remaining time to close an expired access grant', async () => {
    fetchMock.mockResolvedValueOnce(await reply({ ...open, remaining_seconds: 0 })).mockResolvedValue(await reply(locked))
    mount()
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1))
    await screen.findByLabelText('Contraseña de administrador')
    expect(screen.queryByText('Contenido privado')).toBeNull()
  })
  it('shows ordinary content when maintenance is disabled', async () => {
    fetchMock.mockResolvedValue(await reply({ enabled: false, unlocked: true, expires_at: null }))
    mount()
    await screen.findByText('Contenido privado')
    expect(screen.queryByLabelText('Contraseña de administrador')).toBeNull()
  })
})
