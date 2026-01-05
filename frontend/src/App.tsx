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

// Heavy pages - lazy loaded
const PanelHome = lazy(() => import('./pages/PanelHome'))
const Ediciones = lazy(() => import('./pages/Ediciones'))
const Publicaciones = lazy(() => import('./pages/Publicaciones'))
const PublicacionDetalle = lazy(() => import('./pages/PublicacionDetalle'))
const Papelera = lazy(() => import('./pages/Papelera'))
const MediosPago = lazy(() => import('./pages/MediosPago'))
const DirectorioLegal = lazy(() => import('./pages/DirectorioLegal'))
const Usuarios = lazy(() => import('./pages/Usuarios'))
const Configuracion = lazy(() => import('./pages/Configuracion'))
const Paginas = lazy(() => import('./pages/Paginas'))
const FileManager = lazy(() => import('./pages/FileManager'))

// Public pages - lazy loaded
const PublicView = lazy(() => import('./pages/PublicView'))
const EditionPublic = lazy(() => import('./pages/EditionPublic'))
const EdicionesPublic = lazy(() => import('./pages/EdicionesPublic'))
const PagePublic = lazy(() => import('./pages/PagePublic'))
const PublicacionPublic = lazy(() => import('./pages/PublicacionPublic'))
const Contacto = lazy(() => import('./pages/Contacto'))
const VisorEspressivoPDF = lazy(() => import('./pages/VisorEspressivoPDF'))

// Solicitante pages - lazy loaded
const HistorialSolicitante = lazy(() => import('./pages/solicitante/Historial'))
const CotizadorSolicitante = lazy(() => import('./pages/solicitante/Cotizador'))
const ConvocatoriaSolicitante = lazy(() => import('./pages/solicitante/Convocatoria'))
const PerfilSolicitante = lazy(() => import('./pages/solicitante/Perfil'))
const PublicacionDetalleSolicitante = lazy(() => import('./pages/solicitante/PublicacionDetalle'))
const DocumentoSolicitante = lazy(() => import('./pages/solicitante/Documento'))

// Form pages - lazy loaded
const PublicarDocumento = lazy(() => import('./pages/PublicarDocumento'))
const PublicarDocumentoPDF = lazy(() => import('./pages/PublicarDocumentoPDF'))
const PublicarConvocatoria = lazy(() => import('./pages/PublicarConvocatoria'))
const Historial = lazy(() => import('./pages/Historial'))
const Cotizador = lazy(() => import('./pages/Cotizador'))
const MediosPagoInfo = lazy(() => import('./pages/MediosPagoInfo'))

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
