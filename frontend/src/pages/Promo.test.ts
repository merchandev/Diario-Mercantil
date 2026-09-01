import { describe, expect, it } from 'vitest'
import { BANNER_PAGES } from './Promo'

describe('Promo banner registry', () => {
  it('lists every editable banner once and groups them by page', () => {
    const slots = BANNER_PAGES.flatMap(page => page.slots)
    const keys = slots.map(slot => slot.key)

    expect(BANNER_PAGES.map(page => page.id)).toEqual(['global', 'home', 'history'])
    expect(keys).toHaveLength(7)
    expect(new Set(keys).size).toBe(7)
    expect(keys).toEqual([
      'banner_header_global',
      'banner_main_1',
      'banner_sidebar',
      'promo_popup',
      'banner_history_1',
      'banner_history_2',
      'banner_history_3',
    ])
  })
})
