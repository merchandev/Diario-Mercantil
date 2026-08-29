const fs = require('fs');
let content = fs.readFileSync('src/pages/PublicacionDetalle.tsx', 'utf8');

// 1. Add fetchAuth, unpublishLegal, returnToDraftLegal to imports
content = content.replace(
  /import \{ getLegal, updateLegal, verifyLegal, rejectLegal, type LegalRequest, attachLegalFile, detachLegalFile, listLegalFiles, listUsers \} from '\.\.\/lib\/api'/,
  "import { getLegal, updateLegal, verifyLegal, rejectLegal, type LegalRequest, attachLegalFile, detachLegalFile, listLegalFiles, listUsers, unpublishLegal, returnToDraftLegal, fetchAuth } from '../lib/api'"
);

// 2. Add 'En trámite' actions block
content = content.replace(
  /(\s*<\/div>\s*)(<\/div>\s*)\}\s*<div className="grid lg:grid-cols-3 gap-4 items-start">/s,
  `$1$2}
      {item.status === 'En trámite' && (
        <div className="card p-4 bg-blue-50 border-blue-200">
          <p className="font-semibold text-blue-900 mb-3">?? Solicitud en trámite (verificada)</p>
          <div className="flex gap-2">
            <button className="btn bg-red-600 text-white hover:bg-red-700" onClick={onReject}>
              ? Rechazar
            </button>
            <button className="btn bg-slate-600 text-white hover:bg-slate-700" onClick={onReturnToDraft}>
              Devolver a Borrador
            </button>
          </div>
        </div>
      )}
      <div className="grid lg:grid-cols-3 gap-4 items-start">`
);

// 3. Fix attachment download to use fetchAuth
content = content.replace(
  /window\.open\(`\/api\/files\/\$\{f\.file_id\}\`, '_blank'\)/g,
  `const dl = async () => {
                          const res = await fetchAuth(\`/api/files/\${f.file_id}?download=1\`);
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = f.name;
                          a.click();
                          URL.revokeObjectURL(url);
                        };
                        dl();`
);

fs.writeFileSync('src/pages/PublicacionDetalle.tsx', content);
