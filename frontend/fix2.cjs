const fs = require('fs');
let content = fs.readFileSync('src/lib/api.ts', 'utf8');

// Fix duplicates
content = content.replace(/banner_main_1\?: string;\n  banner_sidebar\?: string;\n  promo_popup\?: string;\n  default_user_role\?: string;\n  unit_tax_bs\?: number;/g, 
`banner_main_1?: string;\n  banner_sidebar?: string;\n  promo_popup?: string;`);

// Rewrite publishEdition correctly
content = content.replace(/export async function publishEdition[\s\S]*?return res.json\(\) as Promise<\{ ok: true \}>\s*\n\}/, 
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

// Add listPublicEditions to the end of the file
content += `\nexport async function listPublicEditions(params?: { q?: string; from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const suffix = qs.toString() ? '?' + qs.toString() : '';
  const res = await fetch(\`/api/public/editions\${suffix}\`);
  if (!res.ok) throw new Error('No se pudieron cargar las ediciones');
  return res.json() as Promise<{ items: Edition[] }>;
}\n`;

fs.writeFileSync('src/lib/api.ts', content);
