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

  it('builds the edition endpoint when the API omits edition_file_url', () => {
    expect(editionDownloadUrl({
      status: 'Publicada',
      edition_code: 'MMXXVI/0002',
    })).toBe('/api/e/code/MMXXVI%2F0002/download?download=1')
  })

  it('does not expose a download before publication or without an edition', () => {
    expect(editionDownloadUrl({ status: 'Borrador', edition_code: 'MMXXVI-0001' })).toBeNull()
    expect(editionDownloadUrl({ status: 'Publicada' })).toBeNull()
  })
})
