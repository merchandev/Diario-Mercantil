export function LoadingSpinner({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="card p-8 text-center text-slate-500">
      <div className="animate-spin inline-block w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full mb-2"></div>
      <p>{message}</p>
    </div>
  )
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card p-4 bg-rose-50 border-rose-200 text-rose-800">
      <div className="flex items-start gap-2">
        <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <div className="flex-1">
          <strong>Error:</strong> {message}
          {onRetry && (
            <button 
              onClick={onRetry}
              className="ml-4 text-brand-700 hover:underline font-semibold"
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function EmptyState({ message, icon }: { message: string; icon?: React.ReactNode }) {
  return (
    <div className="card p-8 text-center text-slate-500">
      {icon || (
        <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      )}
      <p>{message}</p>
    </div>
  )
}
