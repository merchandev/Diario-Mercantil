export default function LoadingFallback() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <p className="mt-4 text-gray-600 font-medium">Cargando...</p>
        </div>
    )
}
