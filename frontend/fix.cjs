const fs = require('fs');
let text = fs.readFileSync('src/pages/solicitante/Documento.tsx', 'utf8');
text = text.replace(/type:\s*last\.type\s*===[^,]+,/g, "type: 'pago_movil',");
text = text.replace(/type:\s*pay\.type\s*===[^,]+,/g, "type: 'pago_movil',");
fs.writeFileSync('src/pages/solicitante/Documento.tsx', text);
