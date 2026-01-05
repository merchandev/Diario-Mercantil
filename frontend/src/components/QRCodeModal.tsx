import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { IconClose, IconDownload, IconShare } from './icons'

interface QRCodeModalProps {
  isOpen: boolean
  url: string
  title: string
  onClose: () => void
}

export default function QRCodeModal({ isOpen, url, title, onClose }: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => {
    if (isOpen && canvasRef.current && url) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#111827',
          light: '#FFFFFF'
        }
      })
      QRCode.toDataURL(url, {
        width: 300,
        margin: 2
      }).then(setQrDataUrl)
    }
  }, [isOpen, url])

  if (!isOpen) return null

  const handleDownload = () => {
    const link = document.createElement('a')
    link.download = `qr-${title.replace(/\s+/g, '-').toLowerCase()}.png`
    link.href = qrDataUrl
    link.click()
  }

  const handleShareWhatsApp = () => {
    const text = `${title}\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
  }

  const handleShareEmail = () => {
    const subject = encodeURIComponent(title)
    const body = encodeURIComponent(`${title}\n\nVer publicación: ${url}`)
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      alert('Enlace copiado al portapapeles')
    } catch (e) {
      alert('No se pudo copiar el enlace')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-lg text-slate-900">Código QR de la publicación</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          {/* QR Code */}
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-4 rounded-lg border-2 border-slate-200 shadow-sm">
              <canvas ref={canvasRef} />
            </div>
            <p className="text-sm text-slate-600 text-center max-w-xs break-all">{url}</p>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={handleDownload}
              className="w-full btn btn-primary flex items-center justify-center gap-2"
            >
              <IconDownload className="w-4 h-4" />
              Descargar QR
            </button>

            <button
              onClick={handleCopyLink}
              className="w-full btn btn-outline flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copiar enlace
            </button>
          </div>

          {/* Share options */}
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">Compartir en:</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleShareWhatsApp}
                className="flex flex-col items-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-green-50 hover:border-green-300 transition-colors"
              >
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <span className="text-xs font-medium text-slate-700">WhatsApp</span>
              </button>

              <button
                onClick={handleShareFacebook}
                className="flex flex-col items-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-xs font-medium text-slate-700">Facebook</span>
              </button>

              <button
                onClick={handleShareEmail}
                className="flex flex-col items-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-medium text-slate-700">Email</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 rounded-b-xl">
          <p className="text-xs text-slate-500 text-center">
            Escanea el código QR con tu dispositivo móvil para acceder a la publicación
          </p>
        </div>
      </div>
    </div>
  )
}
