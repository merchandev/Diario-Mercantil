const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

function getUrl(path: string) {
  return path.startsWith('/') ? `${API_BASE}${path}` : path;
}

export type FileRow = {
  id: number; name: string; size: number; type: string; checksum?: string; status: string; created_at: string; updated_at: string
}

export class ApiError extends Error {
  constructor(public message: string, public status: number, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

// Auth helpers
export async function fetchAuth(input: RequestInfo | URL, init?: RequestInit, noRedirect?: boolean) {
  const headers = new Headers(init?.headers || {})

  if (typeof document !== 'undefined') {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; dm_csrf=`);
    if (parts.length === 2) {
      const csrf = parts.pop()?.split(';').shift();
      if (csrf) headers.set('X-CSRF-Token', csrf);
    }
  }

  const url = typeof input === 'string' ? getUrl(input) : input;
  const reqInit = { ...init, headers, credentials: 'include' as RequestCredentials };
  
  const res = await fetch(url, reqInit)
  if (res.status === 401 && !noRedirect) {
      if (typeof window !== 'undefined') {
        window.location.href = window.location.pathname.startsWith('/lotus/') ? '/lotus/' : '/login'
      }
      throw new ApiError('Sesión expirada', 401);
  }
  if (!res.ok) {
    let errorMsg = `Error HTTP ${res.status}`;
    let data = null;
    try {
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await res.json();
        errorMsg = data.error || data.message || errorMsg;
      } else {
        errorMsg = await res.text() || errorMsg;
      }
    } catch { }
    throw new ApiError(errorMsg, res.status, data);
  }
  return res
}

export const api = {
  get: (url: string) => fetchAuth(getUrl(url)).then(r => r.json()),
  post: (url: string, body: any) => fetchAuth(getUrl(url), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  put: (url: string, body: any) => fetchAuth(getUrl(url), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  delete: (url: string) => fetchAuth(getUrl(url), { method: 'DELETE' }).then(r => r.json()),
}

export async function login(body: { document: string; password: string }) {
  const res = await fetch(getUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include'
  })
  if (!res.ok) {
    let errorMsg = 'invalid_credentials';
    try {
      const json = await res.clone().json();
      if (json.message) errorMsg = json.message;
      else if (json.error) errorMsg = json.error;
    } catch {
      try {
        const text = await res.text();
        if (text) errorMsg = text;
      } catch {
        // Fallback to generic error
      }
    }
    throw new Error(errorMsg);
  }
  return res.json() as Promise<{ user: { id: number; document: string; name: string; role: string } }>
}

// ========== SUPERADMIN API ==========

export async function superadminLogin(body: { username: string; password: string }) {
  const res = await fetch(getUrl('/api/superadmin/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include'
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error || 'invalid_credentials')
  }
  return res.json() as Promise<{ superadmin: { id: number; username: string } }>
}

export async function verifySuperAdmin() {
  const res = await fetch(getUrl('/api/superadmin/verify'), { credentials: 'include' })
  if (!res.ok) throw new Error('Unauthorized')
  return res.json() as Promise<{ ok: boolean; superadmin: { id: number; username: string } }>
}

export async function superadminLogout() {
  const res = await fetchAuth('/api/superadmin/logout', { method: 'POST' }, true)
  return res.json()
}


export async function me() {
  const res = await fetchAuth('/api/auth/me', undefined, true)
  return res.json() as Promise<{ user: { id: number; document: string; name: string; role: string; avatar_url?: string | null } }>
}

export async function logout() {
  const res = await fetchAuth('/api/auth/logout', { method: 'POST' }, true)
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

export async function forceRefreshBcv() {
  return getBcvRate({ force: true })
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

export async function listTrashedFiles() {
  const res = await fetchAuth('/api/files/trash')
  return res.json() as Promise<{ items: FileRow[] }>
}
export async function restoreFile(id: number) {
  const res = await fetchAuth(`/api/files/${id}/restore`, { method: 'POST' })
  return res.json() as Promise<{ ok: boolean }>
}
export async function permanentDeleteFile(id: number) {
  const res = await fetchAuth(`/api/files/trash/${id}`, { method: 'DELETE' })
  return res.json() as Promise<{ ok: boolean }>
}
export async function emptyFileTrash() {
  const res = await fetchAuth('/api/files/trash', { method: 'DELETE' })
  return res.json() as Promise<{ ok: boolean; count: number }>
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
  published_by_name?: string;
  published_at?: string;
  deleted_at?: string | null;
}
export type EditionOrder = LegalRequest & {
  publication_file_id?: number | null;
  publication_file_name?: string | null;
  publication_checksum?: string | null;
  publication_source?: 'generated' | 'uploaded' | null;
  publication_prepared_at?: string | null;
  publication_file_url?: string | null;
}
export async function listEditions() {
  const res = await fetchAuth('/api/editions')
  return res.json() as Promise<{ items: Edition[] }>
}
export async function createEdition(body: { code?: string; status?: string; date?: string; edition_no?: number; orders?: number[]; file_id?: number | null; file_name?: string }) {
  const res = await fetchAuth('/api/editions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json()
}
export async function getEdition(id: number) {
  const res = await fetchAuth(`/api/editions/${id}`)
  return res.json() as Promise<{ edition: Edition; orders: EditionOrder[] }>
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
export async function listPublicEditions(params?: { q?: string; from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const suffix = qs.toString() ? '?' + qs.toString() : '';
  const res = await fetch(`/api/public/editions${suffix}`);
  if (!res.ok) throw new Error('No se pudieron cargar las ediciones');
  return res.json() as Promise<{ items: Edition[] }>;
}
export async function notifyEdition(id: number) {
  const res = await fetchAuth(`/api/editions/${id}/notify`, { method: 'POST' })
  return res.json() as Promise<{ ok: true; sent: number }>
}
export async function publishEdition(id: number, onProgress?: (prog: number, msg: string) => void): Promise<{ ok: true }> {
  const res = await fetchAuth(`/api/editions/${id}/publish`, { method: 'POST' })
  if (!res.body) return { ok: true }
  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''
    for (const chunk of chunks) {
      if (!chunk.startsWith('data: ')) continue
      const data = JSON.parse(chunk.slice(6))
      if (data.error) throw new Error(data.error)
      if (typeof data.progress === 'number') onProgress?.(data.progress, data.msg ?? '')
      if (data.ok) return { ok: true }
    }
  }
  return { ok: true }
}
export async function uploadEditionPdf(id: number, file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetchAuth(`/api/editions/${id}/pdf`, { method: 'POST', body: fd })
  return res.json() as Promise<{ ok: true; file_id: number; file_name: string; edition: Edition }>
}
export async function listRetiredEditions() {
  const res = await fetchAuth('/api/editions-retired')
  return res.json() as Promise<{ items: Edition[] }>
}
export async function prepareEditionOrderPdf(editionId: number, orderId: number) {
  const res = await fetchAuth(`/api/editions/${editionId}/orders/${orderId}/prepare-pdf`, { method: 'POST' })
  return res.json() as Promise<{ ok: true; file_id: number; file_name: string; checksum: string; source: string; prepared_at: string }>
}
export async function uploadEditionOrderPdf(editionId: number, orderId: number, file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetchAuth(`/api/editions/${editionId}/orders/${orderId}/pdf`, { method: 'POST', body: fd })
  return res.json() as Promise<{ ok: true; file_id: number; file_name: string; checksum: string; source: string; prepared_at: string }>
}
export async function deleteEdition(id: number) {
  const res = await fetchAuth(`/api/editions/${id}`, { method: 'DELETE' })
  return res.json()
}

// Payment methods
export type PaymentMethod = { id: number; type: string; bank: string; account: string; holder: string; rif: string; phone: string }

/**
 * Para el panel de administración (requiere rol admin).
 * Incluye creación, edición y eliminación.
 */
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

/**
 * Disponible para cualquier usuario autenticado (solicitante o admin).
 * Solo lectura — usar en el formulario de pago del solicitante.
 */
export async function listPaymentMethods() {
  const res = await fetchAuth('/api/payment-methods')
  return res.json() as Promise<{ items: PaymentMethod[] }>
}

// Legal requests
export type LegalRequest = {
  id: number;
  status: string;
  name: string;
  document: string;
  date: string;
  order_no?: string;
  user_id?: number;
  created_at?: string;
  submitted_at?: string;
  publish_date?: string;
  verification_date?: string;
  phone?: string;
  email?: string;
  address?: string;
  folios?: number;
  comment?: string;
  deleted_at?: string | null;
  pub_type?: 'Documento' | 'Convocatoria';
  total_bs?: number;
  meta?: any;
  files?: LegalFile[];
  edition_code?: string;
  edition_no?: number;
  edition_id?: number | null;
  edition_file_url?: string | null;
  publication_file_id?: number | null;
  publication_file_url?: string | null;
}
export async function restoreEdition(id: number) {
  const res = await fetchAuth(`/api/editions/${id}/restore`, { method: 'POST' })
  return res.json() as Promise<{ ok: true }>
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
export async function listLegal(params?: { q?: string; status?: string; req_from?: string; req_to?: string; pub_from?: string; pub_to?: string; limit?: number; pub_type?: string; user_id?: number | string }) {
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
    if (params.user_id !== undefined && params.user_id !== null && String(params.user_id) !== '') cleanParams.user_id = String(params.user_id)
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
export async function getPublicLegalByOrder(orderNo: string) {
  const res = await fetch(getUrl(`/api/legal/public/${encodeURIComponent(orderNo)}`), { credentials: 'include' })
  if (!res.ok) {
    throw new ApiError('Publicación no disponible.', res.status)
  }
  const data = await res.json() as { item: { edition_code?: string } }
  return data.item
}
export async function updateLegal(id: number, body: Partial<LegalRequest>) {
  const res = await fetchAuth(`/api/legal/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json()
}
export async function rejectLegal(id: number, reason: string) {
  const res = await fetchAuth(`/api/legal/${id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) })
  return res.json()
}
export async function submitLegal(id: number) {
  const res = await fetchAuth(`/api/legal/${id}/submit`, { method: 'POST' })
  return res.json() as Promise<{ ok: boolean; order_no?: string; error?: string }>
}
export async function unpublishLegal(id: number) {
  const res = await fetchAuth(`/api/legal/${id}/unpublish`, { method: 'POST' })
  return res.json()
}
export async function verifyLegal(id: number) {
  const res = await fetchAuth(`/api/legal/${id}/verify`, { method: 'POST' })
  return res.json() as Promise<{ ok: boolean; error?: string }>
}
export async function returnToDraftLegal(id: number) {
  const res = await fetchAuth(`/api/legal/${id}/return-to-draft`, { method: 'POST' })
  return res.json() as Promise<{ ok: boolean; error?: string }>
}
export async function addLegalPayment(id: number, body: Partial<LegalPayment>, idempotencyKey?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey
  }
  const res = await fetchAuth(`/api/legal/${id}/payments`, { method: 'POST', headers, body: JSON.stringify(body) })
  return res.json() as Promise<{ ok: true; payment_id: number; remaining_bs: number }>
}
export async function verifyLegalPayment(requestId: number, paymentId: number) {
  const res = await fetchAuth(`/api/legal/${requestId}/payments/${paymentId}/verify`, { method: 'POST' })
  return res.json() as Promise<{ ok: true; payment: LegalPayment }>
}
export async function rejectLegalPayment(requestId: number, paymentId: number) {
  const res = await fetchAuth(`/api/legal/${requestId}/payments/${paymentId}/reject`, { method: 'POST' })
  return res.json() as Promise<{ ok: true; payment: LegalPayment }>
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

// Activity Log
export async function getActivityLog() {
  const res = await fetchAuth('/api/superadmin/activity')
  return res.json() as Promise<{ items: any[] }>
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

  const url = '/api/legal/upload-pdf';
  const res = await fetchAuth(url, { method: 'POST', body: fd })
  return res.json() as Promise<{ ok: true; id: number; file_id: number; folios: number; pricing: { price_per_folio_usd: number; bcv_rate: number; iva_percent: number; unit_bs: number; subtotal_bs: number; iva_bs: number; total_bs: number } }>
}

// Users
export interface UserSummary {
  id: number
  document: string
  name: string
  role: 'admin' | 'solicitante'
  email?: string
  status?: 'active' | 'suspended'
}
export async function listUsers() {
  const res = await fetchAuth('/api/users')
  return res.json() as Promise<{ items: UserSummary[] }>
}
export async function createUser(body: { document: string; name: string; password: string; role?: string; email?: string; phone?: string; status?: string; person_type?: string }) {
  const res = await fetchAuth('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json() as Promise<{ id: number }>
}
export async function updateUser(id: number, body: { name?: string; role?: string; email?: string; status?: string; password?: string; phone?: string; person_type?: string }) {
  // Usa la ruta de admin para editar cualquier usuario (no la de auto-perfil)
  const res = await fetchAuth(`/api/admin/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json()
}
export async function setUserPassword(id: number, password: string) {
  // Ruta correcta del backend: /api/admin/users/{id}/reset-password
  const res = await fetchAuth(`/api/admin/users/${id}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  return res.json() as Promise<{ ok: true }>
}
export async function deleteUser(id: number) {
  const res = await fetchAuth(`/api/users/${id}`, { method: 'DELETE' })
  return res.json()
}
export async function changeUserRole(id: number, role: string) {
  const res = await fetchAuth(`/api/admin/users/${id}/role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  })
  return res.json() as Promise<{ ok: boolean }>
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
  banner_main_1?: string;
  banner_sidebar?: string;
  promo_popup?: string;
  default_user_role?: string;
  unit_tax_bs?: number;
  raptor_mini_preview_enabled?: boolean | 0 | 1;
}
export async function getSettings() {
  const res = await fetchAuth('/api/settings')
  return res.json() as Promise<{ settings: Partial<Settings> }>
}
export async function getAdminSettings() {
  const res = await fetchAuth('/api/admin/settings')
  return res.json() as Promise<{ settings: Partial<Settings> }>
}
export async function saveSettings(settings: Partial<Settings>) {
  const res = await fetchAuth('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
  return res.json()
}

// Stats
export async function getStats() {
  const res = await fetchAuth('/api/stats')
  return res.json() as Promise<{
    users_total: number;
    users_active: number;
    users_suspended: number;
    users_admin: number;
    publications: number;
    publications_pending: number;
    publications_documents: number;
    publications_convocations: number;
    publications_recent_30d: number;
    editions: number;
    revenue_total_usd: number;
    revenue_pending_usd: number;
    transactions_completed: number;
  }>
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

// SEO Management
export type SeoMetadata = {
  path: string;
  title?: string;
  description?: string;
  og_image?: string;
  robots?: string;
}

export async function getPublicSeo() {
  const res = await fetch(getUrl('/api/seo/all'))
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ seo: Record<string, SeoMetadata> }>
}

export async function listSeoAdmin() {
  const res = await fetchAuth('/api/admin/seo')
  return res.json() as Promise<{ items: SeoMetadata[] }>
}

export async function saveSeoAdmin(body: SeoMetadata) {
  const res = await fetchAuth('/api/admin/seo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json() as Promise<{ ok: boolean }>
}

export async function deleteSeoAdmin(path: string) {
  const res = await fetchAuth('/api/admin/seo', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) })
  return res.json() as Promise<{ ok: boolean }>
}
