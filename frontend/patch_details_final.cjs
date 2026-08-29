const fs = require('fs');
let text = fs.readFileSync('src/components/LegalRequestDetails.tsx', 'utf8');

if (!text.includes('formatCaracasDateTime')) {
  text = `export function formatCaracasDateTime(value?: string) {
  if (!value) return '-'
  const normalized = value.includes('T') ? value : value.replace(' ', 'T') + 'Z'
  return new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(normalized))
}\n\n` + text;
}

text = text.replace(
  /const req = item\s*const meta = typeof req\.meta === 'string' \? JSON\.parse\(req\.meta \|\| '\{\}'\) : \(req\.meta \|\| \{\}\)/,
  `const req = item
  const meta = typeof req.meta === 'string' ? JSON.parse(req.meta || '{}') : (req.meta || {})
  const expediente = meta.numero_expediente ?? meta.expediente ?? ''
  const planilla = meta.numero_planilla ?? meta.planilla ?? ''`
);

text = text.replace(
  /<div>\{req\.created_at\?\.slice\(0, 10\) \|\| '-'\}<\/div>/,
  `<div>{formatCaracasDateTime(req.submitted_at || req.created_at)}</div>`
);

text = text.replace(
  /<div>\s*<label>Expediente<\/label>\s*<div>\{meta\.expediente \|\| '-'\}<\/div>\s*<\/div>\s*<div>\s*<label>Planilla \(PUB\)<\/label>\s*<div>\{meta\.planilla \|\| '-'\}<\/div>\s*<\/div>/,
  `{expediente && (
          <div>
            <label>Número de Expediente</label>
            <div>{expediente}</div>
          </div>
        )}
        {planilla && (
          <div>
            <label>Número de Planilla (PUB)</label>
            <div>{planilla}</div>
          </div>
        )}`
);

fs.writeFileSync('src/components/LegalRequestDetails.tsx', text);
