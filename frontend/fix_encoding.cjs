const fs = require('fs');
let text = fs.readFileSync('src/pages/PublicacionDetalle.tsx', 'utf8');

text = text.replace(/En tr\?mite/g, 'En trámite');
text = text.replace(/Verificaci\?n/g, 'Verificación');

fs.writeFileSync('src/pages/PublicacionDetalle.tsx', text);
