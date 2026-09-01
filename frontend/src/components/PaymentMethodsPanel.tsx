import { usePaymentMethods } from '../hooks/usePaymentMethods'

export default function PaymentMethodsPanel() {
  const { paymentMethods, paymentMethodsLoading, paymentMethodsError, reloadPaymentMethods } = usePaymentMethods()

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <h3 className="mb-2 font-bold text-blue-900">Datos bancarios para efectuar el pago</h3>
      <p className="mb-3 text-sm text-blue-800">Realice el pago a uno de los siguientes números antes de registrar su referencia:</p>
      {paymentMethodsLoading && <p className="text-sm text-slate-600">Cargando datos bancarios...</p>}
      {!paymentMethodsLoading && paymentMethodsError && (
        <div className="rounded-lg border border-rose-200 bg-white p-3 text-sm text-rose-800">
          {paymentMethodsError} <button type="button" className="font-semibold underline" onClick={() => void reloadPaymentMethods()}>Reintentar</button>
        </div>
      )}
      {!paymentMethodsLoading && !paymentMethodsError && paymentMethods.length === 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">No hay medios de pago configurados. Comuníquese con administración antes de efectuar el pago.</p>
      )}
      {!paymentMethodsLoading && !paymentMethodsError && paymentMethods.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {paymentMethods.map(method => (
            <div key={method.id} className="rounded-lg border border-blue-100 bg-white p-3 text-sm shadow-sm">
              <div className="mb-2 font-bold text-blue-900">{method.bank}</div>
              <div><span className="text-slate-500">Pago Móvil:</span> <span className="font-mono font-semibold">{method.phone}</span></div>
              <div><span className="text-slate-500">Titular:</span> <span className="font-medium">{method.holder}</span></div>
              <div><span className="text-slate-500">RIF:</span> <span className="font-medium">{method.rif}</span></div>
              {method.qr_url && (
                <div className="mt-3 border-t border-blue-100 pt-3 text-center">
                  <a href={method.qr_url} target="_blank" rel="noreferrer" className="inline-block rounded-lg border border-blue-200 bg-white p-2" title="Abrir QR en tamaño completo">
                    <img className="mx-auto h-48 w-48 object-contain" src={`${method.qr_url}?v=${encodeURIComponent(method.qr_updated_at || '')}`} alt={`QR bancario de ${method.bank}`} />
                  </a>
                  <p className="mt-1 text-xs text-blue-700">Toque o haga clic en el QR para ampliarlo. Verifique banco, teléfono y RIF antes de pagar.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
