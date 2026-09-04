import { describe, expect, it } from 'vitest'
import { editionDownloadUrl } from './editionDownload'

describe('editionDownloadUrl', () => {
  it('always returns the complete edition for a published request', () => {
    expect(editionDownloadUrl({
      status: 'Publicada',
      edition_code: 'MMXXVI-0001',
      edition_file_url: '/api/e/code/MMXXVI-0001/download',
      publication_file_url: '/api/editions/1/orders/14/pdf',
    } as any)).toBe('/api/e/code/MMXXVI-0001/download?download=1')
  })

  it('returns null when edition_file_url is missing even if published', () => {
    expect(editionDownloadUrl({
      status: 'Publicada',
      edition_code: 'MMXXVI/0002',
    })).toBeNull()
  })

  it('trusts an explicit backend availability rejection over a stale URL', () => {
    expect(editionDownloadUrl({
      status: 'Publicada',
      edition_code: 'MMXXVI-0003',
      edition_file_url: '/api/e/code/MMXXVI-0003/download',
      edition_has_file: false,
    })).toBeNull()
  })

  it('does not expose a download before publication or without an edition', () => {
    expect(editionDownloadUrl({ status: 'Borrador', edition_code: 'MMXXVI-0001' })).toBeNull()
    expect(editionDownloadUrl({ status: 'Publicada' })).toBeNull()
  })
})
