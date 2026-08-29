const fs = require('fs');
let content = fs.readFileSync('src/lib/api.ts', 'utf8');

content = content.replace(/export async function setUserPassword/, 
`export async function changeUserRole(id: number, role: string) {
  const res = await fetchAuth(\`/api/admin/users/\${id}/role\`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) })
  return res.json()
}
export async function setUserPassword`);

fs.writeFileSync('src/lib/api.ts', content);
