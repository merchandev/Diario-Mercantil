const fs = require('fs');
let text = fs.readFileSync('src/pages/Ediciones.tsx', 'utf8');

// Replace the Trash button with a conditional check
text = text.replace(
  /<button className="text-rose-500[\s\S]*?<IconTrash className="w-4 h-4" \/>\s*<\/button>/g,
  `{detail.edition.status === 'Borrador' && (
                                        <button className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-md transition-colors" title="Quitar publicación de esta edición" onClick={async () => {
                                          if (confirm(\`¿Quitar orden #\${o.id} de esta edición?\`)) {
                                            const newOrders = detail.orders.filter(ord => ord.id !== o.id).map(ord => ord.id);
                                            await api.post(\`/editions/\${selId}/orders\`, { orders: newOrders });
                                            const data = await getEdition(selId); setDetail(data);
                                            load();
                                          }
                                        }}>
                                          <IconTrash className="w-4 h-4" />
                                        </button>
                                      )}`
);

// Replace the Add More block with a conditional check
text = text.replace(
  /<div className="mt-4 border-t pt-4">\s*<h4 className="text-sm font-semibold mb-2 text-slate-700">A[\s\S]*?A[\s\S]*?dir m[\s\S]*?s publicaciones<\/h4>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
  `{detail.edition.status === 'Borrador' ? (
                                  <div className="mt-4 border-t pt-4">
                                    <h4 className="text-sm font-semibold mb-2 text-slate-700">Añadir más publicaciones</h4>
                                    <div className="max-h-56 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                      {allOrders.filter(o => o.status === 'En trámite' && !detail.orders.some(d => d.id === o.id)).map(o => {
                                        const meta = typeof o.meta === 'string' ? (() => { try { return JSON.parse(o.meta) } catch { return {} } })() : (o.meta || {})
                                        return (
                                          <div key={o.id} className="flex items-center justify-between p-2 rounded border border-slate-100 hover:border-brand-200 hover:bg-brand-50 transition-colors bg-white">
                                            <div className="overflow-hidden mr-3">
                                              <p className="font-medium text-slate-900 leading-tight truncate" title={o.company_name || o.name}>{o.company_name || o.name}</p>
                                              <p className="text-xs text-slate-500 truncate mt-0.5" title={o.document}>{o.document}</p>
                                            </div>
                                            <button className="btn btn-outline text-xs px-3 py-1.5 shrink-0 whitespace-nowrap" onClick={async () => {
                                              const newOrders = [...detail.orders.map(ord => ord.id), o.id];
                                              await api.post(\`/editions/\${selId}/orders\`, { orders: newOrders });
                                              const data = await getEdition(selId); setDetail(data);
                                              load();
                                              setAlertDialog({ isOpen: true, title: 'Agregada', message: 'Publicación agregada a la edición.', variant: 'success' })
                                            }}>+ Añadir</button>
                                          </div>
                                        )
                                      })}
                                      {allOrders.filter(o => o.status === 'En trámite' && !detail.orders.some(d => d.id === o.id)).length === 0 && (
                                        <div className="text-center p-4 bg-slate-50 text-slate-500 rounded text-sm italic">
                                          No hay publicaciones pendientes
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-4 border-t pt-4 text-center text-sm text-slate-500">
                                    La composición de una edición publicada es de solo lectura.
                                  </div>
                                )}
                              </div>
                            </div>`
);

fs.writeFileSync('src/pages/Ediciones.tsx', text);
