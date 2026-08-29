const fs = require('fs');
let text = fs.readFileSync('src/pages/Ediciones.tsx', 'utf8');
text = text.replace(/const \{ data \} = await api\.get\(`\/editions\/\$\{selId\}`\);\s*setDetail\(\{ edition: data\.edition, orders: data\.orders \}\);/g, "const data = await getEdition(selId); setDetail(data);");
fs.writeFileSync('src/pages/Ediciones.tsx', text);
