import { describe, expect, it } from 'vitest'
import { desktopSpread, maxDesktopSpread } from './flipbookLayout'

describe('flipbook desktop layout', () => {
  it('shows a one-page PDF as a cover', () => {
    expect(maxDesktopSpread(1)).toBe(0)
    expect(desktopSpread(1, 0)).toEqual({ leftIndex: null, rightIndex: 0 })
  })

  it('handles two pages without inventing a page', () => {
    expect(maxDesktopSpread(2)).toBe(1)
    expect(desktopSpread(2, 0)).toEqual({ leftIndex: null, rightIndex: 0 })
    expect(desktopSpread(2, 1)).toEqual({ leftIndex: 1, rightIndex: null })
  })

  it('places an odd page count in complete spreads after the cover', () => {
    expect(maxDesktopSpread(5)).toBe(2)
    expect(desktopSpread(5, 1)).toEqual({ leftIndex: 1, rightIndex: 2 })
    expect(desktopSpread(5, 2)).toEqual({ leftIndex: 3, rightIndex: 4 })
  })

  it('leaves the final right slot empty for an even page count', () => {
    expect(maxDesktopSpread(4)).toBe(2)
    expect(desktopSpread(4, 2)).toEqual({ leftIndex: 3, rightIndex: null })
  })
})
