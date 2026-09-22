import { afterEach, describe, expect, it, vi } from 'vitest'
import { printOwnershipConsoleSignature } from './brandConsole'

describe('browser ownership signature', () => {
  afterEach(() => vi.restoreAllMocks())

  it('prints the brand and the complete ownership notice', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    printOwnershipConsoleSignature()

    const output = info.mock.calls.map(call => call[0]).join('\n')
    expect(output).toContain('MERCHAN.DEV  ×  EPRESSIVO VENEZUELA, C.A.')
    expect(output).toContain('Desarrollo e ingeniería de software propiedad de Merchan.Dev')
    expect(output).toContain('acciones civiles y penales correspondientes')
  })
})
