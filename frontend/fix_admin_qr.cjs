const fs = require('fs');
let text = fs.readFileSync('src/pages/PublicacionDetalle.tsx', 'utf8');
text = text.replace(
  /url: `\$\{window\.location\.origin\}\/ediciones\/\$\{item\.order_no \|\| item\.id\}`/g,
  "url: item.edition_code ? `${window.location.origin}/edicion/${item.edition_code}` : ''"
);
fs.writeFileSync('src/pages/PublicacionDetalle.tsx', text);
