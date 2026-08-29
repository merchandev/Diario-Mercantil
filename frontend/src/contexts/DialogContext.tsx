import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type DialogKind = 'alert' | 'confirm' | 'prompt'
type DialogOptions = {
  title?: string
  confirmText?: string
  cancelText?: string
  initialValue?: string
  required?: boolean
  danger?: boolean
}
type DialogState = DialogOptions & {
  kind: DialogKind
  message: string
}

type DialogApi = {
  showAlert: (message: string, options?: DialogOptions) => Promise<void>
  confirmAction: (message: string, options?: DialogOptions) => Promise<boolean>
  requestText: (message: string, options?: DialogOptions) => Promise<string | null>
}

const DialogContext = createContext<DialogApi | null>(null)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [value, setValue] = useState('')
  const resolver = useRef<((result: unknown) => void) | null>(null)

  const open = useCallback((next: DialogState) => new Promise<unknown>(resolve => {
    resolver.current = resolve
    setValue(next.initialValue || '')
    setDialog(next)
  }), [])

  const close = (result: unknown) => {
    const resolve = resolver.current
    resolver.current = null
    setDialog(null)
    resolve?.(result)
  }

  const api: DialogApi = {
    showAlert: (message, options = {}) => open({ kind: 'alert', message, ...options }).then(() => undefined),
    confirmAction: (message, options = {}) => open({ kind: 'confirm', message, ...options }).then(Boolean),
    requestText: (message, options = {}) => open({ kind: 'prompt', message, required: true, ...options }).then(result => typeof result === 'string' ? result : null),
  }

  const promptInvalid = dialog?.kind === 'prompt' && dialog.required && value.trim() === ''

  return (
    <DialogContext.Provider value={api}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className={`border-b px-6 py-4 ${dialog.danger ? 'bg-rose-50 text-rose-900' : 'bg-slate-50 text-slate-900'}`}>
              <h2 className="text-lg font-semibold">{dialog.title || (dialog.kind === 'alert' ? 'Aviso' : 'Confirmación')}</h2>
            </div>
            <div className="space-y-4 px-6 py-5">
              <p className="whitespace-pre-line text-slate-700">{dialog.message}</p>
              {dialog.kind === 'prompt' && (
                <textarea
                  autoFocus
                  className="input min-h-28 w-full"
                  value={value}
                  onChange={event => setValue(event.target.value)}
                />
              )}
            </div>
            <div className="flex justify-end gap-3 bg-slate-50 px-6 py-4">
              {dialog.kind !== 'alert' && (
                <button className="btn" type="button" onClick={() => close(dialog.kind === 'confirm' ? false : null)}>
                  {dialog.cancelText || 'Cancelar'}
                </button>
              )}
              <button
                className={dialog.danger ? 'btn bg-rose-600 text-white hover:bg-rose-700' : 'btn btn-primary'}
                type="button"
                disabled={promptInvalid}
                onClick={() => close(dialog.kind === 'prompt' ? value.trim() : dialog.kind === 'confirm' ? true : undefined)}
              >
                {dialog.confirmText || (dialog.kind === 'alert' ? 'Aceptar' : 'Confirmar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}

export function useDialog(): DialogApi {
  const context = useContext(DialogContext)
  if (!context) throw new Error('useDialog debe utilizarse dentro de DialogProvider')
  return context
}
