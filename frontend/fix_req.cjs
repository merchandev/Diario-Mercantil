const fs = require('fs');
let text = fs.readFileSync('src/pages/solicitante/PublicacionDetalle.tsx', 'utf8');
text = text.replace(/{item.edition_file_url/g, '{req.edition_file_url');
text = text.replace(/\$\{item.edition_file_url\}/g, '${req.edition_file_url}');
text = text.replace(/item\.edition_code/g, 'req.edition_code');
fs.writeFileSync('src/pages/solicitante/PublicacionDetalle.tsx', text);
