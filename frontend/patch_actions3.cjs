const fs = require('fs');
let text = fs.readFileSync('src/pages/PublicacionDetalle.tsx', 'utf8');

text = text.replace(
  /\{item\.status === 'Por verificar' && \([\s\S]*?<div className="card p-4 bg-amber-50 border-amber-200">[\s\S]*?<p className="font-semibold text-amber-900 mb-3">?? Solicitud pendiente de verificación<\/p>[\s\S]*?<div className="flex gap-2">[\s\S]*?<button className="btn bg-green-600 text-white hover:bg-green-700" onClick=\{onApprove\}>[\s\S]*?? Verificar publicación[\s\S]*?<\/button>[\s\S]*?<button className="btn bg-red-600 text-white hover:bg-red-700" onClick=\{onReject\}>[\s\S]*?? Rechazar[\s\S]*?<\/button>[\s\S]*?<button className="btn bg-slate-600 text-white hover:bg-slate-700" onClick=\{onReturnToDraft\}>[\s\S]*?Devolver a Borrador[\s\S]*?<\/button>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\)\}/,
  `{['Por verificar', 'En trámite'].includes(item.status) && (
        <div className="card p-4 bg-amber-50 border-amber-200">
          <p className="font-semibold text-amber-900 mb-3">?? Acciones de Verificación</p>
          <div className="flex gap-2">
            {item.status === 'Por verificar' && (
              <button className="btn bg-green-600 text-white hover:bg-green-700" onClick={onApprove}>
                ? Verificar publicación
              </button>
            )}
            <button className="btn bg-red-600 text-white hover:bg-red-700" onClick={onReject}>
              ? Rechazar
            </button>
            <button className="btn bg-slate-600 text-white hover:bg-slate-700" onClick={onReturnToDraft}>
              Devolver a Borrador
            </button>
          </div>
        </div>
      )}`
);

fs.writeFileSync('src/pages/PublicacionDetalle.tsx', text);
