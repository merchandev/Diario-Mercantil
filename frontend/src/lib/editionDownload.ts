type EditionDownloadRequest = {
  status?: string
  edition_code?: string
  edition_file_url?: string | null
}

export function editionDownloadUrl(request: EditionDownloadRequest): string | null {
  const published = request.status === 'Publicada' || request.status === 'Publicado'
  const code = request.edition_code?.trim()
  if (!published || !code) return null

  const baseUrl = request.edition_file_url?.trim()
    || `/api/e/code/${encodeURIComponent(code)}/download`
  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}download=1`
}
