import { IconClose, IconAlertTriangle } from './icons'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  variant = 'info',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const variantStyles = {
    danger: 'bg-rose-50 text-rose-900 border-rose-200',
    warning: 'bg-amber-50 text-amber-900 border-amber-200',
    info: 'bg-blue-50 text-blue-900 border-blue-200'
  }

  const buttonStyles = {
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 text-white'
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-fadeIn">
        {/* Header */}
        <div className={`px-6 py-4 border-b ${variantStyles[variant]} rounded-t-xl flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            {variant !== 'info' && <IconAlertTriangle className="w-6 h-6" />}
            <h3 className="font-semibold text-lg">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-white/30 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <p className="text-slate-700 leading-relaxed whitespace-pre-line">{message}</p>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-slate-50 rounded-b-xl flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onCancel()
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${buttonStyles[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
