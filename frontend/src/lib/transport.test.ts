import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchApi } from './transport'
import { fetchAuth, listPublicEditions } from './api'
afterEach(() => vi.restoreAllMocks())
describe('maintenance response handling', () => {
  it('immediately blocks public searches while preserving their response body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'maintenance_required' }), { status: 503 }))
    const event = vi.fn()
    window.addEventListener('dm-maintenance-required', event)
    const response = await listPublicEditions().catch(error => error)
    expect(event).toHaveBeenCalledTimes(1)
    window.removeEventListener('dm-maintenance-required', event)
  })
  it('emits once for authenticated calls and retains the structured error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'maintenance_required', message: 'Mantenimiento' }), { status: 503, headers: { 'Content-Type': 'application/json' } }))
    const event = vi.fn()
    window.addEventListener('dm-maintenance-required', event)
    await expect(fetchAuth('/api/legal')).rejects.toMatchObject({ status: 503, data: { error: 'maintenance_required' } })
    expect(event).toHaveBeenCalledTimes(1)
    window.removeEventListener('dm-maintenance-required', event)
  })
  it('leaves unrelated infrastructure errors visible to the caller', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Unavailable', { status: 503 }))
    const event = vi.fn()
    window.addEventListener('dm-maintenance-required', event)
    const response = await fetchApi('/api/settings')
    expect(await response.text()).toBe('Unavailable')
    expect(event).not.toHaveBeenCalled()
    window.removeEventListener('dm-maintenance-required', event)
  })
})
