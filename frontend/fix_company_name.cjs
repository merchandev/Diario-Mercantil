const fs = require('fs');
let text = fs.readFileSync('src/pages/Ediciones.tsx', 'utf8');
text = text.replace(/<span className="font-semibold text-slate-900 block truncate">\{o\.name\}<\/span>/g, `<span className="font-semibold text-slate-900 block truncate">{o.company_name || o.name}</span>`);
text = text.replace(/<p className="font-medium text-slate-900 leading-tight">\{o\.name\}<\/p>/g, `<p className="font-medium text-slate-900 leading-tight">{o.company_name || o.name}</p>`);
fs.writeFileSync('src/pages/Ediciones.tsx', text);
