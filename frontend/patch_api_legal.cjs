const fs = require('fs');
let text = fs.readFileSync('src/lib/api.ts', 'utf8');

text = text.replace(
  /export async function listLegal\(params\?: \{ q\?: string; status\?: string; req_from\?: string; req_to\?: string; pub_from\?: string; pub_to\?: string; limit\?: number; pub_type\?: string \}\) \{/,
  `export async function listLegal(params?: { q?: string; status?: string; req_from?: string; req_to?: string; pub_from?: string; pub_to?: string; limit?: number; pub_type?: string; user_id?: number | string }) {`
);

fs.writeFileSync('src/lib/api.ts', text);
