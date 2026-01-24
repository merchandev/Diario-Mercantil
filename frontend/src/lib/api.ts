const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

function getUrl(path: string) {
  return path.startsWith('/') ? `${API_BASE}${path}` : path;
}

export type FileRow = {
  id: number; name: string; size: number; type: string; checksum?: string; status: string; created_at: string; updated_at: string
}

// Auth helpers
export function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || ''
}

export async function fetchAuth(input: RequestInfo | URL, init?: RequestInit, noRedirect?: boolean) {
  const token = getToken()
  const headers = new Headers(init?.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const url = typeof input === 'string' ? getUrl(input) : input;
  const res = await fetch(url, { ...init, headers })
  if (res.status === 401) {
    let serverError = 'unauthorized';
    try {
      const json = await res.clone().json();
      if (json.error) serverError = json.error;
      if (json.debug) console.warn('[Auth Debug]', json);
      if (json.received_token_preview) console.warn('[Auth Token Rx]', json);
    } catch (e) { /* ignore */ }

    if (!noRedirect) {
      try { localStorage.removeItem('token'); } catch { }
      try { sessionStorage.removeItem('token'); } catch { }
      // Force re-authentication
      if (typeof window !== 'undefined') window.location.href = '/login'
    }
    console.error(`API 401 Error: ${serverError}`);
    throw new Error(serverError)
  }
  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}`
    try {
      const contentType = res.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const json = await res.json()
        errorMsg = json.error || json.message || errorMsg
      } else {
        const text = await res.text()
        errorMsg = text || errorMsg
      }
    } catch { }
    console.error('API error response:', res.status, errorMsg)
    throw new Error(errorMsg)
  }
  return res
}

export async function login(body: { document: string; password: string }) {
  const res = await fetch(getUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error('invalid_credentials')
  return res.json() as Promise<{ token: string; user: { id: number; document: string; name: string; role: string } }>
}

export async function me() {
  const res = await fetchAuth('/api/auth/me')
  return res.json() as Promise<{ user: { id: number; document: string; name: string; role: string; avatar_url?: string | null } }>
}

export async function logout() {
  const res = await fetchAuth('/api/auth/logout', { method: 'POST' })
  return res.json()
}

// Live BCV rate (public endpoint)
export async function getBcvRate(opts?: { force?: boolean }) {
  const url = new URL('/api/rate/bcv', API_BASE || window.location.origin)
  if (opts?.force) url.searchParams.set('force', '1')
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(await res.text())
  // Backward compatible shape, extended with usd/eur/date fields
  return res.json() as Promise<{
    rate: number;
    usd?: { raw?: string; value?: number | null };
    eur?: { raw?: string; value?: number | null };
    date_iso?: string | null;
    fetched_at?: string;
    from_cache?: boolean;
    source_url?: string;
  }>
}

export async function listFiles(params?: { q?: string; status?: string }) {
  const qs = new URLSearchParams(params as any)
  const res = await fetchAuth(`/api/files?${qs}`)
  return res.json() as Promise<{ items: FileRow[] }>;
}

export async function uploadFiles(files: File[]) {
  const fd = new FormData()
  files.forEach(f => fd.append('files[]', f))
  const res = await fetchAuth('/api/files', { method: 'POST', body: fd })
  return res.json()
}

export async function getFile(id: number) {
  const res = await fetchAuth(`/api/files/${id}`)
  return res.json() as Promise<{ file: FileRow; events: { ts: string; type: string; message: string }[] }>
}

export async function retryFile(id: number) {
  const res = await fetchAuth(`/api/files/${id}/retry`, { method: 'POST' })
  return res.json()
}

export async function deleteFile(id: number) {
  const res = await fetchAuth(`/api/files/${id}`, { method: 'DELETE' })
  return res.json()
}

// Publications
export type Publication = { id: number; slug: string; title: string; status: string; created_at: string; updated_at: string; content?: string }
export async function listPublications(params?: { q?: string }) {
  const qs = new URLSearchParams(params as any)
  const res = await fetchAuth(`/api/publications?${qs}`)
  return res.json() as Promise<{ items: Publication[] }>
}
export async function createPublication(body: { title: string; content?: string; status?: string }) {
  const res = await fetchAuth('/api/publications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json() as Promise<{ id: number; slug: string }>
}
export async function getPublication(id: number) {
  const res = await fetchAuth(`/api/publications/${id}`)
  return res.json() as Promise<{ publication: Publication & { content: string } }>
}
export async function updatePublication(id: number, body: { title: string; content?: string; status?: string }) {
  const res = await fetchAuth(`/api/publications/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json()
}
export async function deletePublication(id: number) {
  const res = await fetchAuth(`/api/publications/${id}`, { method: 'DELETE' })
  return res.json()
}
export async function getPublicationPublic(slug: string) {
  const res = await fetch(getUrl(`/api/p/${encodeURIComponent(slug)}`))
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ publication: { slug: string; title: string; content: string; status: string; created_at: string; updated_at: string } }>
}

// Editions
export type Edition = {
  id: number;
  code: string;
  status: string;
  date: string;
  edition_no: number;
  orders_count: number;
  file_id?: number | null;
  file_name?: string | null;
  file_url?: string | null;
  created_at?: string;
  updated_at?: string;
}
export async function listEditions() {
  const res = await fetchAuth('/api/editions')
  return res.json() as Promise<{ items: Edition[] }>
}
export async function createEdition(body: { code: string; status?: string; date?: string; edition_no?: number; orders_count?: number; file_id?: number | null; file_name?: string }) {
  const res = await fetchAuth('/api/editions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json()
}
export async function getEdition(id: number) {
  const res = await fetchAuth(`/api/editions/${id}`)
  return res.json() as Promise<{ edition: Edition; orders: LegalRequest[] }>
}
export async function updateEdition(id: number, body: Partial<Pick<Edition, 'code' | 'status' | 'date' | 'edition_no' | 'file_id' | 'file_name'>>) {
  const res = await fetchAuth(`/api/editions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json()
}
export async function setEditionOrders(id: number, order_ids: number[]) {
  const res = await fetchAuth(`/api/editions/${id}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_ids }) })
  return res.json() as Promise<{ ok: true; orders_count: number }>
}
export async function autoSelectEditionOrders(id: number, limit: number) {
  const res = await fetchAuth(`/api/editions/${id}/auto-select`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit }) })
  return res.json() as Promise<{ ok: true; orders_count: number; order_ids: number[] }>
}
export async function publishEdition(id: number) {
  const res = await fetchAuth(`/api/editions/${id}/publish`, { method: 'POST' })
  return res.json() as Promise<{ ok: true }>
}
export async function uploadEditionPdf(id: number, file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetchAuth(`/api/editions/${id}/pdf`, { method: 'POST', body: fd })
  return res.json() as Promise<{ ok: true; file_id: number; file_name: string; edition: Edition }>
}
export async function deleteEdition(id: number) {
  const res = await fetchAuth(`/api/editions/${id}`, { method: 'DELETE' })
  return res.json()
}

// Payment methods
export type PaymentMethod = { id: number; type: string; bank: string; account: string; holder: string; rif: string; phone: string }
export async function listPayments() {
  const res = await fetchAuth('/api/payments')
  return res.json() as Promise<{ items: PaymentMethod[] }>
}
export async function createPayment(body: Partial<PaymentMethod>) {
  const res = await fetchAuth('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json()
}
export async function deletePayment(id: number) {
  const res = await fetchAuth(`/api/payments/${id}`, { method: 'DELETE' })
  return res.json()
}

// Legal requests
export type LegalRequest = {
  id: number;
  status: string;
  name: string;
  document: string;
  date: string;
  order_no?: string;
  publish_date?: string;
  phone?: string;
  email?: string;
  address?: string;
  folios?: number;
  comment?: string;
  deleted_at?: string | null;
  pub_type?: 'Documento' | 'Convocatoria';
  meta?: any;
  files?: LegalFile[];
}
export type LegalPayment = {
  id: number;
  legal_request_id: number;
  ref?: string;
  date: string;
  bank?: string;
  type?: string;
  amount_bs: number;
  status?: string;
  comment?: string;
  mobile_phone?: string;
  document?: string;
}
export async function listLegal(params?: { q?: string; status?: string; req_from?: string; req_to?: string; pub_from?: string; pub_to?: string; limit?: number; pub_type?: string }) {
  // Clean up undefined values - don't send them as "undefined" string
  const cleanParams: Record<string, string> = {}
  if (params) {
    if (params.q) cleanParams.q = params.q
    if (params.status) cleanParams.status = params.status
    if (params.req_from && params.req_from !== 'undefined') cleanParams.req_from = params.req_from
    if (params.req_to && params.req_to !== 'undefined') cleanParams.req_to = params.req_to
    if (params.pub_from && params.pub_from !== 'undefined') cleanParams.pub_from = params.pub_from
    if (params.pub_to && params.pub_to !== 'undefined') cleanParams.pub_to = params.pub_to
    if (params.limit) cleanParams.limit = String(params.limit)
    if (params.pub_type) cleanParams.pub_type = params.pub_type
  }

  const qs = new URLSearchParams(cleanParams)
  const url = `/api/legal${qs.toString() ? '?' + qs.toString() : ''}`
  console.log('🌐 [API] listLegal request URL:', url)
  console.log('🌐 [API] listLegal params:', cleanParams)
  const res = await fetchAuth(url)
  console.log('🌐 [API] listLegal response status:', res.status)
  const data = await res.json() as { items: LegalRequest[] }
  console.log('🌐 [API] listLegal response data:', data)
  return data
}
export async function createLegal(body: Partial<LegalRequest>) {
  const res = await fetchAuth('/api/legal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json()
}
export async function getLegal(id: number) {
  const res = await fetchAuth(`/api/legal/${id}`)
  return res.json() as Promise<{ item: LegalRequest; payments: LegalPayment[] }>
}
export async function updateLegal(id: number, body: Partial<LegalRequest>) {
  const res = await fetchAuth(`/api/legal/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json()
}
export async function rejectLegal(id: number, reason: string) {
  const res = await fetchAuth(`/api/legal/${id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) })
  return res.json()
}
export async function addLegalPayment(id: number, body: Partial<LegalPayment>) {
  const res = await fetchAuth(`/api/legal/${id}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json() as Promise<{ ok: true; payment_id: number }>
}
export async function deleteLegalPayment(id: number, paymentId: number) {
  const res = await fetchAuth(`/api/legal/${id}/payments/${paymentId}`, { method: 'DELETE' })
  return res.json()
}
export async function downloadLegal(id: number) {
  const res = await fetchAuth(`/api/legal/${id}/download`)
  const blob = await res.blob()
  return blob
}

// Soft Delete / Trash Management
export async function deleteLegal(id: number) {
  const res = await fetchAuth(`/api/legal/${id}`, { method: 'DELETE' })
  return res.json() as Promise<{ ok: boolean; message: string }>
}
export async function listTrashedLegal() {
  const res = await fetchAuth('/api/legal/trash')
  return res.json() as Promise<{ items: LegalRequest[] }>
}
export async function restoreLegal(id: number) {
  const res = await fetchAuth(`/api/legal/${id}/restore`, { method: 'POST' })
  return res.json() as Promise<{ ok: boolean; message: string }>
}
export async function permanentDeleteLegal(id: number) {
  const res = await fetchAuth(`/api/legal/trash/${id}`, { method: 'DELETE' })
  return res.json() as Promise<{ ok: boolean; message: string }>
}
export async function emptyTrash() {
  const res = await fetchAuth('/api/legal/trash', { method: 'DELETE' })
  return res.json() as Promise<{ ok: boolean; message: string; count: number }>
}
export async function cleanupOldTrashed() {
  const res = await fetchAuth('/api/legal/cleanup', { method: 'POST' })
  return res.json() as Promise<{ ok: boolean; message: string; count: number }>
}

// Legal files attachments
export type LegalFile = { id: number; kind: string; file_id: number; name: string; type: string; size: number; created_at: string }
export async function listLegalFiles(id: number) {
  const res = await fetchAuth(`/api/legal/${id}/files`)
  return res.json() as Promise<{ items: LegalFile[] }>
}
export async function attachLegalFile(id: number, file_id: number, kind: string) {
  const res = await fetchAuth(`/api/legal/${id}/files`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_id, kind }) })
  return res.json()
}
export async function detachLegalFile(id: number, fid: number) {
  const res = await fetchAuth(`/api/legal/${id}/files/${fid}`, { method: 'DELETE' })
  return res.json()
}

// Applicant: upload a single PDF and auto-create legal request
export async function uploadLegalPdf(file: File, id?: number) {
  const fd = new FormData()
  fd.append('file', file)
  if (id) fd.append('legal_request_id', String(id))

  // Use query param token as fallback for aggressive proxies stripping headers
  const token = getToken();
  const url = `/api/legal/upload-pdf${token ? '?token=' + encodeURIComponent(token) : ''}`;

  const res = await fetchAuth(url, { method: 'POST', body: fd })
  return res.json() as Promise<{ ok: true; id: number; file_id: number; folios: number; pricing: { price_per_folio_usd: number; bcv_rate: number; iva_percent: number; unit_bs: number; subtotal_bs: number; iva_bs: number; total_bs: number } }>
}

// Users
export type UserSummary = { id: number; document: string; name: string; role: string }
export async function listUsers() {
  const res = await fetchAuth('/api/users')
  return res.json() as Promise<{ items: UserSummary[] }>
}
export async function createUser(body: { document: string; name: string; password: string; role?: string; email?: string; phone?: string; status?: string; person_type?: string }) {
  const res = await fetchAuth('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json() as Promise<{ id: number }>
}
export async function updateUser(id: number, body: { name: string; role?: string; email?: string; phone?: string; status?: string; person_type?: string }) {
  const res = await fetchAuth(`/api/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json()
}
export async function setUserPassword(id: number, password: string) {
  const res = await fetchAuth(`/api/users/${id}/password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
  return res.json()
}
export async function deleteUser(id: number) {
  const res = await fetchAuth(`/api/users/${id}`, { method: 'DELETE' })
  return res.json()
}

// Settings
export type Settings = {
  bcv_rate: number;
  price_per_folio_usd: number;
  convocatoria_usd: number;
  iva_percent: number;
  instructions_documents_text?: string;
  instructions_documents_image_url?: string;
  instructions_convocatorias_text?: string;
  default_user_role?: string;
  unit_tax_bs?: number;
}
export async function getSettings() {
  const res = await fetchAuth('/api/settings')
  return res.json() as Promise<{ settings: Partial<Settings> }>
}
export async function saveSettings(settings: Partial<Settings>) {
  const res = await fetchAuth('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
  return res.json()
}

// Stats
export async function getStats() {
  const res = await fetchAuth('/api/stats')
  return res.json() as Promise<{ publications: number; editions: number; users_active: number }>
}
export async function clearStats() {
  const res = await fetchAuth('/api/stats/clear', { method: 'POST' })
  return res.json() as Promise<{ publications: number; editions: number; users_active: number }>
}

// Directory Legal (applicant)
export type DirectoryProfile = {
  user_id: number; full_name: string; email?: string; phones?: string; state?: string; areas?: string; colegio?: string; socials?: string; status: string; inpre_photo_file_id?: number; profile_photo_file_id?: number
}
export async function getDirectoryProfile() {
  const res = await fetchAuth('/api/directory/profile')
  return res.json() as Promise<{ profile: DirectoryProfile | null }>
}
export async function saveDirectoryProfile(body: Partial<DirectoryProfile>) {
  const res = await fetchAuth('/api/directory/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json() as Promise<{ ok: true }>
}
export async function setDirectoryPhoto(file_id: number, kind: 'profile' | 'inpre' = 'profile') {
  const res = await fetchAuth('/api/directory/profile/photo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_id, kind }) })
  return res.json() as Promise<{ ok: true }>
}

// Directory reference: Areas & Colleges (admin)
export type DirArea = { id: number; name: string }
export type DirCollege = { id: number; name: string }
export async function listDirAreas() {
  const res = await fetchAuth('/api/directory/areas')
  return res.json() as Promise<{ items: DirArea[] }>
}
export async function createDirArea(name: string) {
  const res = await fetchAuth('/api/directory/areas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
  return res.json() as Promise<{ id: number }>
}
export async function updateDirArea(id: number, name: string) {
  const res = await fetchAuth(`/api/directory/areas/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
  return res.json() as Promise<{ ok: true }>
}
export async function deleteDirArea(id: number) {
  const res = await fetchAuth(`/api/directory/areas/${id}`, { method: 'DELETE' })
  return res.json() as Promise<{ ok: true }>
}
export async function listDirColleges() {
  const res = await fetchAuth('/api/directory/colleges')
  return res.json() as Promise<{ items: DirCollege[] }>
}
export async function createDirCollege(name: string) {
  const res = await fetchAuth('/api/directory/colleges', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
  return res.json() as Promise<{ id: number }>
}
export async function updateDirCollege(id: number, name: string) {
  const res = await fetchAuth(`/api/directory/colleges/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
  return res.json() as Promise<{ ok: true }>
}
export async function deleteDirCollege(id: number) {
  const res = await fetchAuth(`/api/directory/colleges/${id}`, { method: 'DELETE' })
  return res.json() as Promise<{ ok: true }>
}

// Pages (CMS)
export type PageBlock =
  | { id: string; type: 'heading'; props: { text: string; level: 1 | 2 | 3 | 4 | 5 | 6; align: 'left' | 'center' | 'right' } }
  | { id: string; type: 'paragraph'; props: { text: string; align: 'left' | 'center' | 'right' } }
  | { id: string; type: 'image'; props: { url: string; alt?: string } }

export type PageRow = {
  id: number; slug: string; title: string; status: string; created_at: string; updated_at: string
}
export type PageDetail = PageRow & { header_html?: string; footer_html?: string; body_blocks: PageBlock[] }

export async function listPages() {
  const res = await fetchAuth('/api/pages')
  return res.json() as Promise<{ items: PageRow[] }>
}
export async function createPage(body: { title: string; slug?: string; header_html?: string; footer_html?: string; status?: string; body_blocks?: PageBlock[] }) {
  const res = await fetchAuth('/api/pages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json() as Promise<{ id: number; slug: string }>
}
export async function getPage(id: number) {
  const res = await fetchAuth(`/api/pages/${id}`)
  return res.json() as Promise<PageDetail>
}
export async function updatePage(id: number, body: Partial<{ title: string; slug: string; header_html: string; footer_html: string; status: string; body_blocks: PageBlock[] }>) {
  const res = await fetchAuth(`/api/pages/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json() as Promise<{ ok: true }>
}
export async function deletePage(id: number) {
  const res = await fetchAuth(`/api/pages/${id}`, { method: 'DELETE' })
  return res.json() as Promise<{ ok: true }>
}
export async function getPagePublic(slug: string) {
  const res = await fetch(getUrl(`/api/page/${encodeURIComponent(slug)}`))
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ page: { slug: string; title: string; header_html?: string; footer_html?: string; body_blocks: PageBlock[]; status: string; updated_at: string } }>
}

// Public list of published pages (for navigation)
export async function listPagesPublic() {
  const res = await fetch(getUrl('/api/public/pages'))
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ items: { slug: string; title: string }[] }>
}
