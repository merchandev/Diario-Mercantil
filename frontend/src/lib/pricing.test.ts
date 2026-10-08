import { expect, it } from 'vitest'
import { includedVat } from './pricing'
it('extracts VAT from a final thirteen-page price without increasing it', () => {
  expect(includedVat(13 * 3,16)).toEqual({ total: 39, sub: 33.62, iva: 5.38 })
  expect(includedVat(39,0)).toEqual({ total: 39, sub: 39, iva: 0 })
})
