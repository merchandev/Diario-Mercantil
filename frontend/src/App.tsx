import { Route, Routes, Navigate } from 'react-router-dom'
import { lazy, Suspense, useState } from 'react'
import LoadingFallback from './components/LoadingFallback'

// Critical components - loaded immediately
import Topbar from './components/Topbar'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import NotFound from './pages/NotFound'
import RequireAuth from './components/RequireAuth'
import RequireSolicitante from './components/RequireSolicitante'
import RequireAdmin from './components/RequireAdmin'
import PublicLayout from './components/PublicLayout'
import ApplicantLayout from './pages/solicitante/Layout'
import PublishChoiceModal from './components/PublishChoiceModal'

// Helper to auto-reload page if a chunk is missing (deployment cache issue)
function lazyImport(factory: () => Promise<{ default: React.ComponentType<any> }>) {
  return lazy(async () => {
    try {
      return await factory()
    } catch (error: any) {
      const msg = error?.message || ''
      if (msg.includes('dynamically imported module') || msg.includes('dymanically imported module')) {
        // Prevent infinite loop
        const key = `chunk_retry_${window.location.pathname}`
        const retried = sessionStorage.getItem(key)
        if (!retried) {
          sessionStorage.setItem(key, 'true')
          window.location.reload()
          return { default: () => <LoadingFallback /> }
        }
      }
      throw error
    }
  })
}

// Heavy pages - lazy loaded
const PanelHome = lazyImport(() => import('./pages/PanelHome'))
const Ediciones = lazyImport(() => import('./pages/Ediciones'))
const Publicaciones = lazyImport(() => import('./pages/Publicaciones'))
const PublicacionDetalle = lazyImport(() => import('./pages/PublicacionDetalle'))
const Papelera = lazyImport(() => import('./pages/Papelera'))
const MediosPago = lazyImport(() => import('./pages/MediosPago'))
const DirectorioLegal = lazyImport(() => import('./pages/DirectorioLegal'))
const Usuarios = lazyImport(() => import('./pages/Usuarios'))
const Configuracion = lazyImport(() => import('./pages/Configuracion'))
const Paginas = lazyImport(() => import('./pages/Paginas'))
const FileManager = lazyImport(() => import('./pages/FileManager'))

// Public pages - lazy loaded
const PublicView = lazyImport(() => import('./pages/PublicView'))
const EditionPublic = lazyImport(() => import('./pages/EditionPublic'))
const EdicionesPublic = lazyImport(() => import('./pages/EdicionesPublic'))
const PagePublic = lazyImport(() => import('./pages/PagePublic'))
const PublicacionPublic = lazyImport(() => import('./pages/PublicacionPublic'))
const Contacto = lazyImport(() => import('./pages/Contacto'))
const VisorEspressivoPDF = lazyImport(() => import('./pages/VisorEspressivoPDF'))

// Solicitante pages - lazy loaded
const HistorialSolicitante = lazyImport(() => import('./pages/solicitante/Historial'))
const CotizadorSolicitante = lazyImport(() => import('./pages/solicitante/Cotizador'))
const ConvocatoriaSolicitante = lazyImport(() => import('./pages/solicitante/Convocatoria'))
const PerfilSolicitante = lazyImport(() => import('./pages/solicitante/Perfil'))
const PublicacionDetalleSolicitante = lazyImport(() => import('./pages/solicitante/PublicacionDetalle'))
const DocumentoSolicitante = lazyImport(() => import('./pages/solicitante/Documento'))

// Form pages - lazy loaded
const PublicarDocumento = lazyImport(() => import('./pages/PublicarDocumento'))
const PublicarDocumentoPDF = lazyImport(() => import('./pages/PublicarDocumentoPDF'))
const PublicarConvocatoria = lazyImport(() => import('./pages/PublicarConvocatoria'))
const Historial = lazyImport(() => import('./pages/Historial'))
const Cotizador = lazyImport(() => import('./pages/Cotizador'))
const MediosPagoInfo = lazyImport(() => import('./pages/MediosPagoInfo'))

// Superadmin Lotus - lazy loaded
const LotusLogin = lazyImport(() => import('./pages/SuperAdmin/LotusLogin'))
const SuperAdminDashboard = lazyImport(() => import('./pages/SuperAdmin/Dashboard'))
const SuperAdminUsers = lazyImport(() => import('./pages/SuperAdmin/Users'))
const SuperAdminPublications = lazyImport(() => import('./pages/SuperAdmin/Publications'))
const SuperAdminSettings = lazyImport(() => import('./pages/SuperAdmin/Settings'))
const SuperAdminStats = lazyImport(() => import('./pages/SuperAdmin/Stats'))
const SuperAdminActivity = lazyImport(() => import('./pages/SuperAdmin/Activity'))

// Wrapper component for lazy-loaded routes
function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
}

export default function App() {
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  return (
    <Routes>
      {/* Public pages with shared header */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="ediciones" element={<LazyRoute><EdicionesPublic /></LazyRoute>} />
        <Route path="publicaciones/:orden/:razon?" element={<LazyRoute><PublicacionPublic /></LazyRoute>} />
        <Route path="publicacion/:slug" element={<LazyRoute><PublicView /></LazyRoute>} />
        <Route path="edicion/:code" element={<LazyRoute><EditionPublic /></LazyRoute>} />
        <Route path="visor-espresivo/:code" element={<LazyRoute><VisorEspressivoPDF /></LazyRoute>} />
        <Route path="p/:slug" element={<LazyRoute><PagePublic /></LazyRoute>} />
        <Route path="contacto" element={<LazyRoute><Contacto /></LazyRoute>} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Lotus - Secret Superadmin Routes */}
      <Route path="/lotus/" element={<LazyRoute><LotusLogin /></LazyRoute>} />
      <Route path="/lotus/dashboard" element={<LazyRoute><SuperAdminDashboard /></LazyRoute>} />
      <Route path="/lotus/users" element={<LazyRoute><SuperAdminUsers /></LazyRoute>} />
      <Route path="/lotus/publications" element={<LazyRoute><SuperAdminPublications /></LazyRoute>} />
      <Route path="/lotus/settings" element={<LazyRoute><SuperAdminSettings /></LazyRoute>} />
      <Route path="/lotus/stats" element={<LazyRoute><SuperAdminStats /></LazyRoute>} />
      <Route path="/lotus/activity" element={<LazyRoute><SuperAdminActivity /></LazyRoute>} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Solicitante area */}
      <Route path="/solicitante/*" element={<RequireSolicitante><ApplicantLayout /></RequireSolicitante>}>
        <Route index element={<LazyRoute><HistorialSolicitante /></LazyRoute>} />
        <Route path="historial" element={<LazyRoute><HistorialSolicitante /></LazyRoute>} />
        <Route path="publicaciones/:id" element={<LazyRoute><PublicacionDetalleSolicitante /></LazyRoute>} />
        <Route path="documento" element={<LazyRoute><DocumentoSolicitante /></LazyRoute>} />
        <Route path="convocatoria" element={<LazyRoute><ConvocatoriaSolicitante /></LazyRoute>} />
        <Route path="cotizador" element={<LazyRoute><CotizadorSolicitante /></LazyRoute>} />
        <Route path="perfil" element={<LazyRoute><PerfilSolicitante /></LazyRoute>} />
        <Route path="medios-de-pago" element={<LazyRoute><MediosPagoInfo /></LazyRoute>} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Dashboard area */}
      <Route
        path="/dashboard/*"
        element={(
          <RequireAdmin>
            <div className="min-h-screen">
              <Sidebar
                onPublishClick={() => setShowPublishModal(true)}
                onCollapseChange={setSidebarCollapsed}
              />
              <div className={`grid grid-rows-[auto,1fr] transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
                <Topbar />
                <main className="p-6 space-y-6">
                  <Routes>
                    <Route index element={<LazyRoute><PanelHome /></LazyRoute>} />
                    <Route path="ediciones" element={<RequireAdmin><LazyRoute><Ediciones /></LazyRoute></RequireAdmin>} />
                    <Route path="publicaciones" element={<RequireAdmin><LazyRoute><Publicaciones /></LazyRoute></RequireAdmin>} />
                    <Route path="publicaciones/:id" element={<RequireAdmin><LazyRoute><PublicacionDetalle /></LazyRoute></RequireAdmin>} />
                    <Route path="papelera" element={<RequireAdmin><LazyRoute><Papelera /></LazyRoute></RequireAdmin>} />
                    <Route path="paginas" element={<RequireAdmin><LazyRoute><Paginas /></LazyRoute></RequireAdmin>} />
                    <Route path="pagos" element={<RequireAdmin><LazyRoute><MediosPago /></LazyRoute></RequireAdmin>} />
                    <Route path="directorio" element={<LazyRoute><DirectorioLegal /></LazyRoute>} />
                    <Route path="perfil" element={<LazyRoute><PerfilSolicitante /></LazyRoute>} />
                    {/* Applicant (solicitante) routes */}
                    {/* Reemplazamos el formulario antiguo por el nuevo de solicitante */}
                    <Route path="publicar/documento" element={<LazyRoute><DocumentoSolicitante /></LazyRoute>} />
                    <Route path="medios-de-pago" element={<LazyRoute><MediosPagoInfo /></LazyRoute>} />
                    <Route path="publicar/documento-pdf" element={<LazyRoute><PublicarDocumentoPDF /></LazyRoute>} />
                    <Route path="publicar/convocatoria" element={<LazyRoute><PublicarConvocatoria /></LazyRoute>} />
                    <Route path="historial" element={<LazyRoute><Historial /></LazyRoute>} />
                    <Route path="cotizador" element={<LazyRoute><Cotizador /></LazyRoute>} />
                    <Route path="usuarios" element={<RequireAdmin><LazyRoute><Usuarios /></LazyRoute></RequireAdmin>} />
                    <Route path="archivos" element={<RequireAdmin><LazyRoute><FileManager /></LazyRoute></RequireAdmin>} />
                    <Route path="configuracion" element={<RequireAdmin><LazyRoute><Configuracion /></LazyRoute></RequireAdmin>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </div>
              <PublishChoiceModal open={showPublishModal} onClose={() => setShowPublishModal(false)} />
            </div>
          </RequireAdmin>
        )}
      />
      {/* Global catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
