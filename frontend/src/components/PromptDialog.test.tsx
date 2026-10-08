import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import PromptDialog from './PromptDialog'
afterEach(cleanup)
it('clears a password on reopening for another user and waits for a successful save', async () => {
  const save = vi.fn().mockRejectedValue(new Error('Contraseña inválida'))
  const close = vi.fn()
  const props = { isOpen: true, title: 'Contraseña', message: 'Usuario A', inputType: 'password' as const, onConfirm: save, onCancel: close }
  const { rerender } = render(<PromptDialog {...props} />)
  const input = document.querySelector('input')!
  expect(input.type).toBe('password')
  fireEvent.change(input, { target: { value: 'secret' } })
  fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }))
  await screen.findByRole('alert')
  expect(close).not.toHaveBeenCalled()
  rerender(<PromptDialog {...props} isOpen={false} />)
  rerender(<PromptDialog {...props} message="Usuario B" />)
  expect(document.querySelector('input')!.value).toBe('')
  save.mockResolvedValue(undefined)
  fireEvent.change(document.querySelector('input')!, { target: { value: 'new-password' } })
  fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }))
  await waitFor(() => expect(close).toHaveBeenCalledOnce())
})
