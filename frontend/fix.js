const fs = require('fs');
let text = fs.readFileSync('src/pages/solicitante/Documento.tsx', 'utf8');
text = text.replace(/type: last\.type === '[^']+' \? 'pago_movil' : 'transferencia',/, "type: 'pago_movil',");
text = text.replace(/type: pay\.type === 'pago_movil' \? '[^']+' : 'Transferencia',/, "type: 'pago_movil',");
fs.writeFileSync('src/pages/solicitante/Documento.tsx', text);
