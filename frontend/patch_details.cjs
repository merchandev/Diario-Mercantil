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

text = text.replace(/<label>Expediente<\/label>\s*<div>\{meta\.expediente \|\| '-'\}<\/div>/, "");
text = text.replace(/<label>Planilla \(PUB\)<\/label>\s*<div>\{meta\.planilla \|\| '-'\}<\/div>/, "");
text = text.replace(/const meta = typeof req\.meta/, "const expediente = meta.numero_expediente ?? meta.expediente ?? '';\n  const planilla = meta.numero_planilla ?? meta.planilla ?? '';\n  const meta = typeof req.meta");

// Replace date display: "Fecha de solicitud"
text = text.replace(
  /<label>Fecha de solicitud<\/label>\s*<div>\{req\.created_at\?\.slice\(0, 10\) \|\| '-'\}<\/div>/,
  `<label>Fecha de solicitud</label>\n          <div>{formatCaracasDateTime(req.submitted_at || req.created_at)}</div>`
);

// Inject expediente/planilla blocks
text = text.replace(
  /<label>Teléfono<\/label>\s*<div>\{req\.phone\}<\/div>\s*<\/div>/,
  `<label>Teléfono</label>\n          <div>{req.phone}</div>\n        </div>\n        {expediente && (<div><label>Número de Expediente</label><div>{expediente}</div></div>)}\n        {planilla && (<div><label>Número de Planilla (PUB)</label><div>{planilla}</div></div>)}`
);

fs.writeFileSync('src/components/LegalRequestDetails.tsx', text);
