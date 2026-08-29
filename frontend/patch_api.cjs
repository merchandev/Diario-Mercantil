const fs = require('fs');
let content = fs.readFileSync('src/lib/api.ts', 'utf8');

// 1. LegalRequest type
content = content.replace(/files\?: LegalFile\[\];\s*\}/, 
`files?: LegalFile[];
  edition_code?: string;
  edition_no?: number;
  edition_id?: number | null;
  edition_file_url?: string | null;
}`);

// 2. Edition type
content = content.replace(/updated_at\?: string;\s*\}/, 
`updated_at?: string;
  published_by_name?: string;
  published_at?: string;
}`);

// 3. Settings type
content = content.replace(/instructions_convocatorias_text\?: string;/, 
`instructions_convocatorias_text?: string;
  default_user_role?: string;
  unit_tax_bs?: number;
  banner_main_1?: string;
  banner_sidebar?: string;
  promo_popup?: string;`);

// 4. publishEdition
content = content.replace(/export async function publishEdition[\s\S]*?return res\.json\(\) as Promise<\{ ok: true \}>\s*\n\}/, 
`export async function publishEdition(id: number, onProgress?: (prog: number, msg: string) => void): Promise<{ ok: true }> {
  const res = await fetchAuth(\`/api/editions/\${id}/publish\`, { method: 'POST' })
  if (!res.body) return { ok: true }
  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\\n\\n')
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
}`);

// 5. listPublicEditions & notifyEdition
content = content.replace(/export async function publishEdition/, 
`export async function listPublicEditions(params?: { q?: string; from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const suffix = qs.toString() ? '?' + qs.toString() : '';
  const res = await fetch(\`/api/public/editions\${suffix}\`);
  if (!res.ok) throw new Error('No se pudieron cargar las ediciones');
  return res.json() as Promise<{ items: Edition[] }>;
}
export async function notifyEdition(id: number) {
  const res = await fetchAuth(\`/api/editions/\${id}/notify\`, { method: 'POST' })
  return res.json() as Promise<{ ok: true; sent: number }>
}
export async function publishEdition`);

// 6. unpublishLegal
content = content.replace(/export async function verifyLegal/, 
`export async function unpublishLegal(id: number) {
  const res = await fetchAuth(\`/api/legal/\${id}/unpublish\`, { method: 'POST' })
  return res.json()
}
export async function verifyLegal`);

// 7. getAdminSettings & saveSettings
content = content.replace(/export async function saveSettings\(settings: Partial<Settings>\) \{\s*const res = await fetchAuth\('\/api\/settings', \{ method: 'POST'/g,
`export async function getAdminSettings() {
  const res = await fetchAuth('/api/admin/settings')
  return res.json() as Promise<{ settings: Partial<Settings> }>
}
export async function saveSettings(settings: Partial<Settings>) {
  const res = await fetchAuth('/api/admin/settings', { method: 'POST'`
);

// 8. changeUserRole
content = content.replace(/export async function setUserPassword/, 
`export async function changeUserRole(id: number, role: string) {
  const res = await fetchAuth(\`/api/admin/users/\${id}/role\`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) })
  return res.json()
}
export async function setUserPassword`);

fs.writeFileSync('src/lib/api.ts', content);
