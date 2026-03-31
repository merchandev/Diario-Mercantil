import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Search, Trash2, Eye, CheckCircle, XCircle, FileText, DollarSign, Download, QrCode, Clock, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
    listLegal,
    getLegal,
    updateLegal,
    rejectLegal,
    deleteLegal,
    addLegalPayment,
    deleteLegalPayment,
    downloadLegal,
    verifySuperAdmin,
    type LegalRequest,
    type LegalPayment
} from '../../lib/api'
import ConfirmDialog from '../../components/ConfirmDialog'
import QRCodeModal from '../../components/QRCodeModal'

const statusOptions = ['Todos', 'Pendiente', 'Por verificar', 'En trámite', 'Publicado', 'Rechazado']

export default function Publications() {
    const [submissions, setSubmissions] = useState<LegalRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('Todos')
    const [selected, setSelected] = useState<LegalRequest | null>(null)
    const [payments, setPayments] = useState<LegalPayment[]>([])
    const [showPaymentForm, setShowPaymentForm] = useState(false)
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean
        title: string
        message: string
        variant: 'danger' | 'warning' | 'info'
        onConfirm: () => void
    }>({ isOpen: false, title: '', message: '', variant: 'info', onConfirm: () => { } })
    const [qrModal, setQrModal] = useState<{ isOpen: boolean; url: string; title: string }>({
        isOpen: false, url: '', title: ''
    })

    const navigate = useNavigate()

    useEffect(() => {
        verifySuperAdmin().catch(() => navigate('/lotus/'))
        loadSubmissions()
    }, [navigate])

    useEffect(() => {
        const timer = setTimeout(() => loadSubmissions(), 400)
        return () => clearTimeout(timer)
    }, [searchTerm, statusFilter])

    async function loadSubmissions() {
        try {
            const mapStatus = (s: string) =>
                s === 'Pendiente' ? 'Borrador' :
                    s === 'Publicado' ? 'Publicada' : s

            const filters = {
                q: searchTerm,
                status: statusFilter === 'Todos' ? '' : mapStatus(statusFilter)
            }

            const res = await listLegal(filters)
            setSubmissions(res.items)
        } catch (error) {
            console.error('Error loading submissions:', error)
        } finally {
            setLoading(false)
        }
    }

    async function openDetails(id: number) {
        const data = await getLegal(id)
        setSelected(data.item)
        setPayments(data.payments)
    }

    async function handleApprove(id: number) {
        setConfirmDialog({
            isOpen: true,
            title: 'Verificar Solicitud',
            message: '¿Marcar esta solicitud como En trámite?\n\nSe registrará la fecha de hoy como verificación. La publicación quedará pendiente hasta ser incorporada a una edición del diario.',
            variant: 'info',
            onConfirm: async () => {
                await updateLegal(id, {
                    status: 'En trámite',
                    verification_date: new Date().toISOString().slice(0, 10)
                })
                loadSubmissions()
                setSelected(null)
            }
        })
    }

    async function handleReject(id: number) {
        const reason = prompt('Motivo del rechazo:')
        if (reason === null) return

        await rejectLegal(id, reason || 'No especificado')
        loadSubmissions()
        setSelected(null)
    }

    async function handleDelete(id: number) {
        setConfirmDialog({
            isOpen: true,
            title: 'Mover a Papelera',
            message: '¿Mover esta solicitud a la papelera?\n\nSerá eliminada automáticamente después de 30 días.',
            variant: 'warning',
            onConfirm: async () => {
                await deleteLegal(id)
                loadSubmissions()
                setSelected(null)
            }
        })
    }

    async function handleDownload(id: number) {
        const blob = await downloadLegal(id)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `orden-servicio-${id}.pdf`
        a.click()
        URL.revokeObjectURL(url)
    }

    async function handleAddPayment(e: React.FormEvent) {
        e.preventDefault()
        if (!selected) return

        const form = e.target as HTMLFormElement
        const formData = new FormData(form)

        const paymentData = {
            ref: formData.get('ref') as string || '',
            date: formData.get('date') as string || new Date().toISOString().slice(0, 10),
            bank: formData.get('bank') as string || '',
            type: formData.get('type') as string || '',
            amount_bs: Number(formData.get('amount_bs') || 0),
            status: formData.get('pstatus') as string || 'Verificado',
            comment: formData.get('comment') as string || ''
        }

        await addLegalPayment(selected.id, paymentData)
        const updated = await getLegal(selected.id)
        setSelected(updated.item)
        setPayments(updated.payments)
        form.reset()
        setShowPaymentForm(false)
    }

    async function handleDeletePayment(paymentId: number) {
        if (!selected) return

        setConfirmDialog({
            isOpen: true,
            title: 'Eliminar Pago',
            message: '¿Eliminar este pago?',
            variant: 'danger',
            onConfirm: async () => {
                await deleteLegalPayment(selected.id, paymentId)
                const updated = await getLegal(selected.id)
                setSelected(updated.item)
                setPayments(updated.payments)
            }
        })
    }

    const totalPaid = useMemo(
        () => payments.reduce((sum, p) => sum + Number(p.amount_bs || 0), 0),
        [payments]
    )

    const getStatusBadge = (status?: string) => {
        if (!status) return { label: '-', color: 'bg-gray-500/10 text-gray-400', icon: FileText }

        const normalized = status === 'Borrador' || status === 'Pendiente' ? 'Pendiente' :
            status === 'Publicada' ? 'Publicado' : status

        const badges: Record<string, { label: string; color: string; icon: any }> = {
            'Pendiente': { label: 'Pendiente', color: 'bg-yellow-500/10 text-yellow-400', icon: Clock },
            'Por verificar': { label: 'Por Verificar', color: 'bg-orange-500/10 text-orange-400', icon: AlertCircle },
            'En trámite': { label: 'En Trámite', color: 'bg-blue-500/10 text-blue-400', icon: Clock },
            'Publicado': { label: 'Publicado', color: 'bg-green-500/10 text-green-400', icon: CheckCircle },
            'Rechazado': { label: 'Rechazado', color: 'bg-red-500/10 text-red-400', icon: XCircle }
        }

        return badges[normalized] || { label: normalized, color: 'bg-gray-500/10 text-gray-400', icon: FileText }
    }

    const prettyDate = (s?: string) => s ? s.split('-').reverse().join('/') : '-'

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
            <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} />
            <QRCodeModal {...qrModal} onClose={() => setQrModal({ isOpen: false, url: '', title: '' })} />

            {/* Header */}
            <header className="bg-gray-800/50 backdrop-blur-xl border-b border-purple-500/30 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/lotus/dashboard')}
                                className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className="text-xl font-bold text-white">Gestión de Solicitudes</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filters */}
                <div className="mb-6 grid gap-4 md:grid-cols-2">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, documento, N° orden..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 outline-none hover:border-purple-500/50 transition-colors"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-3 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white focus:border-purple-500 outline-none hover:border-purple-500/50 transition-colors"
                    >
                        {statusOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>

                {/* List */}
                <div className="grid gap-4">
                    {loading ? (
                        <div className="text-center py-12 text-gray-400">
                            <div className="animate-spin inline-block w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full mb-2"></div>
                            <p>Cargando solicitudes...</p>
                        </div>
                    ) : submissions.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No se encontraron solicitudes</p>
                        </div>
                    ) : (
                        submissions.map((sub) => {
                            const badge = getStatusBadge(sub.status)
                            const StatusIcon = badge.icon

                            return (
                                <div
                                    key={sub.id}
                                    className="bg-gray-800/50 backdrop-blur-xl border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/40 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="font-mono text-purple-400 font-semibold">
                                                    #{sub.order_no || sub.id}
                                                </span>
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {badge.label}
                                                </span>
                                                <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full">
                                                    {sub.pub_type || 'Documento'}
                                                </span>
                                            </div>

                                            <h3 className="text-lg font-semibold text-white mb-1">{sub.name}</h3>

                                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                                <span>📅 Solicitud: {prettyDate(sub.date)}</span>
                                                {sub.publish_date && (
                                                    <span>📰 Publicación: {prettyDate(sub.publish_date)}</span>
                                                )}
                                                <span>📄 {sub.folios || 1} folio(s)</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openDetails(sub.id)}
                                                className="p-2 hover:bg-purple-500/10 rounded-lg text-purple-400 hover:text-purple-300 transition-colors"
                                                title="Ver detalles"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>

                                            {sub.status === 'Publicada' && (
                                                <button
                                                    onClick={() => setQrModal({
                                                        isOpen: true,
                                                        url: `${window.location.origin}/ediciones/${sub.order_no || sub.id}`,
                                                        title: `Publicación ${sub.order_no || sub.id}`
                                                    })}
                                                    className="p-2 hover:bg-blue-500/10 rounded-lg text-blue-400 hover:text-blue-300 transition-colors"
                                                    title="QR Code"
                                                >
                                                    <QrCode className="w-4 h-4" />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleDownload(sub.id)}
                                                className="p-2 hover:bg-green-500/10 rounded-lg text-green-400 hover:text-green-300 transition-colors"
                                                title="Descargar PDF"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>

                                            {sub.status === 'Por verificar' && (
                                                <>
                                                    <button
                                                        onClick={() => handleApprove(sub.id)}
                                                        className="p-2 hover:bg-green-500/10 rounded-lg text-green-400 hover:text-green-300 transition-colors"
                                                        title="Aprobar"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(sub.id)}
                                                        className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                                                        title="Rechazar"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}

                                            <button
                                                onClick={() => handleDelete(sub.id)}
                                                className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </main>

            {/* Details Modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-gray-800 border border-purple-500/30 rounded-2xl p-6 w-full max-w-4xl my-8 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">
                                Orden de Servicio #{selected.order_no || selected.id}
                            </h2>
                            <button
                                onClick={() => setSelected(null)}
                                className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Payment Management */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-white flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" />
                                        Pagos
                                    </h3>
                                    <button
                                        onClick={() => setShowPaymentForm(!showPaymentForm)}
                                        className="text-sm text-purple-400 hover:text-purple-300"
                                    >
                                        {showPaymentForm ? 'Cancelar' : '+ Agregar'}
                                    </button>
                                </div>

                                {showPaymentForm && (
                                    <form onSubmit={handleAddPayment} className="mb-4 p-4 bg-gray-900/50 rounded-lg space-y-3">
                                        <input
                                            name="ref"
                                            placeholder="Referencia"
                                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 outline-none"
                                        />
                                        <input
                                            type="date"
                                            name="date"
                                            defaultValue={new Date().toISOString().slice(0, 10)}
                                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 outline-none"
                                        />
                                        <input
                                            name="bank"
                                            placeholder="Banco"
                                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 outline-none"
                                        />
                                        <input
                                            name="type"
                                            placeholder="Tipo (ej: Transferencia)"
                                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 outline-none"
                                        />
                                        <input
                                            type="number"
                                            name="amount_bs"
                                            step="0.01"
                                            placeholder="Monto Bs."
                                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 outline-none"
                                        />
                                        <select
                                            name="pstatus"
                                            defaultValue="Verificado"
                                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 outline-none"
                                        >
                                            <option>Verificado</option>
                                            <option>Pendiente</option>
                                        </select>
                                        <button
                                            type="submit"
                                            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm transition-colors"
                                        >
                                            Guardar Pago
                                        </button>
                                    </form>
                                )}

                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {payments.length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center py-4">No hay pagos registrados</p>
                                    ) : (
                                        payments.map((payment) => (
                                            <div
                                                key={payment.id}
                                                className="p-3 bg-gray-900/50 rounded-lg text-sm"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1">
                                                        <div className="text-white font-medium">{payment.ref}</div>
                                                        <div className="text-gray-400 text-xs mt-1">
                                                            {payment.bank} • {payment.type}
                                                        </div>
                                                        <div className="text-gray-500 text-xs">{payment.date}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-green-400 font-semibold">
                                                            {Number(payment.amount_bs).toLocaleString(undefined, {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            })} Bs
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeletePayment(payment.id)}
                                                            className="text-red-400 hover:text-red-300 text-xs mt-1"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    {payments.length > 0 && (
                                        <div className="p-3 bg-purple-500/10 rounded-lg">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-300 font-medium">Total Pagado:</span>
                                                <span className="text-purple-400 font-bold text-lg">
                                                    {totalPaid.toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })} Bs
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Details & Actions */}
                            <div>
                                <h3 className="font-semibold text-white mb-3">Información</h3>
                                <div className="space-y-2 text-sm mb-4">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Nombre / Razón Social:</span>
                                        <span className="text-white font-medium">{selected.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">RIF / Documento:</span>
                                        <span className="text-white font-mono">{selected.document}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Teléfono:</span>
                                        <span className="text-white">{selected.phone || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Email:</span>
                                        <span className="text-white">{selected.email || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Tipo:</span>
                                        <span className="text-white">{selected.pub_type || 'Documento'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Folios:</span>
                                        <span className="text-white">{selected.folios || 1}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Nº de Orden:</span>
                                        <span className="text-white font-mono">{selected.order_no || String(selected.id).padStart(8, '0')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Fecha de Solicitud:</span>
                                        <span className="text-white">{prettyDate((selected as any).created_at?.slice(0, 10) || selected.date)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Estado:</span>
                                        <span className="text-white">{getStatusBadge(selected.status).label}</span>
                                    </div>
                                    {selected.verification_date && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Fecha de Verificación:</span>
                                            <span className="text-white">{prettyDate(selected.verification_date)}</span>
                                        </div>
                                    )}
                                    {selected.publish_date && selected.status === 'Publicada' && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Fecha Publicación:</span>
                                            <span className="text-white">{prettyDate(selected.publish_date)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Quick Actions */}
                                {selected.status === 'Por verificar' && (
                                    <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg mb-4">
                                        <p className="text-sm font-semibold text-orange-400 mb-3">
                                            ⚠️ Pendiente de verificación
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleApprove(selected.id)}
                                                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm transition-colors"
                                            >
                                                ✓ Aprobar
                                            </button>
                                            <button
                                                onClick={() => handleReject(selected.id)}
                                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white text-sm transition-colors"
                                            >
                                                ✗ Rechazar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* General Actions */}
                                <div className="space-y-2">
                                    <button
                                        onClick={() => handleDownload(selected.id)}
                                        className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Descargar PDF
                                    </button>
                                    {selected.status === 'Publicada' && (
                                        <button
                                            onClick={() => setQrModal({
                                                isOpen: true,
                                                url: `${window.location.origin}/ediciones/${selected.order_no || selected.id}`,
                                                title: `Publicación ${selected.order_no || selected.id}`
                                            })}
                                            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <QrCode className="w-4 h-4" />
                                            Generar QR
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(selected.id)}
                                        className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white text-sm flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Mover a Papelera
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
