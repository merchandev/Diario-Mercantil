const fs = require('fs');
let text = fs.readFileSync('src/pages/PublicacionDetalle.tsx', 'utf8');

text = text.replace(
  /\{\/\* Column 2: Solicitante Info \(Editable\) \*\/\}\s*<div className="card p-4 space-y-4">\s*<h3 className="font-semibold text-lg border-b pb-2">Datos del Solicitante \(Editar\)<\/h3>\s*<div>\s*<label className="block text-sm font-medium text-slate-700 mb-1">Folios<\/label>\s*<input\s*className="input w-full"\s*type="number"\s*min="1"\s*value=\{item\.folios \|\| 1\}\s*onChange=\{e => setItem\(\{ \.\.\.item, folios: Number\(e\.target\.value\) \}\)\}\s*\/>\s*<\/div>/,
  `{/* Datos del Tramite */}
        <div className="card p-4 space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Datos del Trámite</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Folios a publicar</label>
            <input
              className="input w-full"
              type="number"
              min="1"
              value={item.folios || 1}
              onChange={e => setItem({ ...item, folios: Number(e.target.value) })}
            />
          </div>
        </div>
        
        {/* Column 2: Solicitante Info (Editable) */}
        <div className="card p-4 space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Datos del Solicitante (Editar)</h3>`
);

fs.writeFileSync('src/pages/PublicacionDetalle.tsx', text);
