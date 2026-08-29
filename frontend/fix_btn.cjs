const fs = require('fs');
let text = fs.readFileSync('src/pages/solicitante/PublicacionDetalle.tsx', 'utf8');
text = text.replace(
  /<a\s*href="\/ediciones"[\s\S]*?<IconDownload \/> Ver Ediciones del Diario\s*<\/a>/,
  `{item.edition_file_url ? (
                <a
                  href={\`\${item.edition_file_url}?download=1\`}
                  className="btn btn-primary w-full inline-flex items-center justify-center gap-2 text-sm"
                >
                  <IconDownload /> Descargar publicación
                </a>
              ) : (
                <a
                  href="/ediciones"
                  className="btn btn-primary w-full inline-flex items-center justify-center gap-2 text-sm"
                >
                  <IconDownload /> Ver Ediciones del Diario
                </a>
              )}`
);
fs.writeFileSync('src/pages/solicitante/PublicacionDetalle.tsx', text);
