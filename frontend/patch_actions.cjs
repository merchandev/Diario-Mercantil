const fs = require('fs');
let text = fs.readFileSync('src/pages/PublicacionDetalle.tsx', 'utf8');

text = text.replace(
  /\{item\.status === 'Por verificar' && \([\s\S]*?<div className="card p-4 bg-amber-50 border-amber-200">[\s\S]*?<p className="font-semibold text-amber-900 mb-3">.*?Solicitud pendiente de verificaci.n<\/p>[\s\S]*?<div className="flex gap-2">[\s\S]*?<button className="btn btn-primary" onClick=\{onApprove\}>Aprobar y En Tr.mite<\/button>[\s\S]*?<button className="btn btn-outline border-rose-200 text-rose-700 hover:bg-rose-50" onClick=\{onReject\}>Rechazar<\/button>[\s\S]*?<button className="btn btn-outline border-slate-300 text-slate-700 hover:bg-slate-100" onClick=\{onReturnToDraft\}>Devolver a Borrador<\/button>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\)\}/,
  `{['Por verificar', 'En trámite'].includes(item.status) && (
        <div className="card p-4 bg-amber-50 border-amber-200">
          <p className="font-semibold text-amber-900 mb-3">Acciones de Verificación</p>
          <div className="flex gap-2">
            {item.status === 'Por verificar' && <button className="btn btn-primary" onClick={onApprove}>Aprobar y En Trámite</button>}
            <button className="btn btn-outline border-rose-200 text-rose-700 hover:bg-rose-50" onClick={onReject}>Rechazar</button>
            <button className="btn btn-outline border-slate-300 text-slate-700 hover:bg-slate-100" onClick={onReturnToDraft}>Devolver a Borrador</button>
          </div>
        </div>
      )}`
);

fs.writeFileSync('src/pages/PublicacionDetalle.tsx', text);
