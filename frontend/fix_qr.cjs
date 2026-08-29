const fs = require('fs');
let text = fs.readFileSync('src/pages/solicitante/PublicacionDetalle.tsx', 'utf8');
// Fix editionIdentifier
text = text.replace(/const editionIdentifier = item.edition_code \|\| item.order_no \|\| item.id;/, "const editionIdentifier = item.edition_code;");
// Fix publicUrl
text = text.replace(/const publicUrl = isPublicada\s*\?\s*`\$\{window\.location\.origin\}\/dm\/\$\{editionIdentifier\}`\s*:\s*''/, "const publicUrl = isPublicada && item.edition_code ? `${window.location.origin}/edicion/${encodeURIComponent(item.edition_code)}` : '';");
fs.writeFileSync('src/pages/solicitante/PublicacionDetalle.tsx', text);
