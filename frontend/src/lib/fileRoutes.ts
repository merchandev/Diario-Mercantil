export function fileDetailPath(id: number | string) {
  return `/dashboard/archivos/${encodeURIComponent(String(id))}`
}

export function fileContentUrl(id: number | string, download = false) {
  const url = `/api/uploads/${encodeURIComponent(String(id))}`
  return download ? `${url}?download=1` : url
}
