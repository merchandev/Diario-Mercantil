import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Inicio from './Inicio'

const mocks = vi.hoisted(() => ({ fetchAuth: vi.fn() }))
vi.mock('../../lib/api', () => mocks)
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 7, name: 'SOLICITANTE DE PRUEBA' } }) }))
vi.mock('../../components/AdvertisingSlider', () => ({ default: () => null }))
vi.mock('../../components/PublishChoiceModal', () => ({ default: () => null }))

const published = { id: 101, status: 'Publicada', name: 'SOLICITANTE DE PRUEBA', meta: { razon_social: 'Empresa Representada, C.A.' }, event_key: '101:Publicada:a9' }

function open(notices: unknown[]) {
  mocks.fetchAuth.mockResolvedValue({ json: async () => ({ total: 1, counts: { Publicada: 1 }, notices }) })
  render(<MemoryRouter><Inicio /></MemoryRouter>)
}

beforeEach(() => { vi.resetAllMocks(); localStorage.clear() })
afterEach(cleanup)

describe('Inicio notifications', () => {
  it('shows a later publication even when the earlier return of the same request was hidden', async () => {
    localStorage.setItem('dm-publication-notice-events-7', JSON.stringify(['101:Borrador:a5']))
    localStorage.setItem('dm-publication-notices-7', JSON.stringify([101]))
    open([published])
    expect(await screen.findByText('¡Publicación realizada!')).toBeTruthy()
    expect(screen.getByText(/EMPRESA REPRESENTADA, C\.A\./)).toBeTruthy()
    expect(localStorage.getItem('dm-publication-notices-7')).toBeNull()
  })

  it('hides only the event that was dismissed', async () => {
    open([published, { id: 102, status: 'Borrador', comment: 'Falta un folio.', event_key: '102:Borrador:a10' }])
    await screen.findByText('¡Publicación realizada!')
    fireEvent.click(screen.getAllByRole('button', { name: 'Ocultar' })[0])
    expect(screen.queryByText('¡Publicación realizada!')).toBeNull()
    expect(screen.getByText('Falta un folio.')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem('dm-publication-notice-events-7') || '[]')).toEqual(['101:Publicada:a9'])
  })
})
