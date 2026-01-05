import { IconClose, IconAlertTriangle, IconCheck } from './icons'

interface AlertDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  variant?: 'success' | 'error' | 'info' | 'warning'
  onClose: () => void
}

export default function AlertDialog({
  isOpen,
  title,
  message,
  confirmText = 'Aceptar',
  variant = 'info',
  onClose
}: AlertDialogProps) {
  if (!isOpen) return null

  const variantStyles = {
    success: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    error: 'bg-rose-50 text-rose-900 border-rose-200',
    warning: 'bg-amber-50 text-amber-900 border-amber-200',
    info: 'bg-blue-50 text-blue-900 border-blue-200'
  }

  const buttonStyles = {
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    error: 'bg-rose-600 hover:bg-rose-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 text-white'
  }

  const icon = variant === 'success' ? <IconCheck className="w-6 h-6" /> : <IconAlertTriangle className="w-6 h-6" />

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-fadeIn">
        {/* Header */}
        <div className={`px-6 py-4 border-b ${variantStyles[variant]} rounded-t-xl flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            {icon}
            <h3 className="font-semibold text-lg">{title}</h3>
          </div>
          <button
            onClick={onClose}
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
            onClick={onClose}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${buttonStyles[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
