type EditionDownloadRequest = {
  status?: string
  edition_code?: string
  edition_file_url?: string | null
  edition_has_file?: boolean
}

export function editionDownloadUrl(request: EditionDownloadRequest): string | null {
  const published = request.status === 'Publicada' || request.status === 'Publicado'
  const code = request.edition_code?.trim()
  const fileUrl = request.edition_file_url?.trim()
  if (!published || !code || !fileUrl || request.edition_has_file === false) return null

  const separator = fileUrl.includes('?') ? '&' : '?'
  return `${fileUrl}${separator}download=1`
}
