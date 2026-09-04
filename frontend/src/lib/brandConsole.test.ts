import { afterEach, describe, expect, it, vi } from 'vitest'
import { printOwnershipConsoleSignature } from './brandConsole'

describe('browser ownership signature', () => {
  afterEach(() => vi.restoreAllMocks())

  it('prints the binary brand and the complete ownership notice', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    printOwnershipConsoleSignature()

    expect(info).toHaveBeenCalledTimes(2)
    expect(info.mock.calls[0][0]).toContain('01001101 01000101 01010010')
    expect(info.mock.calls[0][0]).toContain('MERCHAN.DEV  ×  EPRESSIVO VENEZUELA, C.A.')
    expect(info.mock.calls[1][0]).toContain('Desarrollo e ingeniería de software propiedad de Merchan.Dev')
    expect(info.mock.calls[1][0]).toContain('acciones civiles y penales correspondientes')
  })
})
