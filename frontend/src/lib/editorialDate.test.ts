import { describe, expect, it } from 'vitest'
import { editorialToday } from './editorialDate'
describe('fecha editorial Caracas', () => {
  it('conserva el día y año venezolano al cambiar el día UTC', () => {
    expect(editorialToday(new Date('2027-01-01T00:30:00Z'))).toBe('2026-12-31')
    expect(editorialToday(new Date('2027-01-01T04:00:00Z'))).toBe('2027-01-01')
  })
})
