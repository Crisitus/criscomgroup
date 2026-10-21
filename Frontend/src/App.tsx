"use client"

import { lazy, Suspense, type ReactNode } from "react"

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "sonner"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "./components/theme-provider"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { KeyboardShortcutsProvider } from "./contexts/KeyboardShortcutsContext"
import { KeyboardShortcutsModal } from "./components/keyboard-shortcuts-modal"

// Layouts
import DashboardLayout from "./layouts/DashboardLayout"

// Components
import RoleProtectedRoute from "./components/RoleProtectedRoute"

// Pages
const LoginPage = lazy(() => import("./pages/auth/LoginPage"))
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"))
const CategoriesPage = lazy(() => import("./pages/categories/CategoriesPage"))
const CategoryDetailPage = lazy(() => import("./pages/categories/CategoryDetailPage"))
const ProductDetailPage = lazy(() => import("./pages/products/ProductDetailPage"))
const SalesPage = lazy(() => import("./pages/sales/SalesPage"))
const SaleDetailPage = lazy(() => import("./pages/sales/SaleDetailPage"))
const NewSalePage = lazy(() => import("./pages/sales/NewSalePage"))
const CompanySunatPage = lazy(() => import("./pages/company/CompanySunatPage"))
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"))
const VendorsPage = lazy(() => import("./pages/vendors/VendorsPage"))
const AffiliateSubscriptionPage = lazy(() => import('./pages/affiliates/AffiliateSubscriptionPage'))
const DailyCashPage = lazy(() => import("./pages/cash-register/DailyCashPage"))
const AuditLogsPage = lazy(() => import("./pages/audit-logs/AuditLogsPage"))
const ProductsPage = lazy(() => import("./pages/products/ProductsPage"))
const OffersPage = lazy(() => import("./pages/offers/OffersPage"))
const ProductTicketsPDFPage = lazy(() => import("./pages/generate-ticket-pdf/GenerateCardProductPage"))
const GenerateExcelProductsPage = lazy(() => import("./pages/generate-ticket-pdf/GenerateExcelProductsPage"))
const LibroReclamacionesPage = lazy(() => import("./pages/libro-reclamaciones/LibroReclamacionesPage"))
const SolicitudesImportacionPage = lazy(() => import("./pages/solicitudes-importacion/SolicitudesImportacionPage"))
const SolicitudesEnsamblePage = lazy(() => import("./pages/solicitudes-ensamble/SolicitudesEnsamblePage"))
const PostventaPage = lazy(() => import("./pages/postventa/PostventaPage"))
const AcquisitionsPage = lazy(() => import('./pages/acquisitions/AcquisitionsPage'))
const WebOrdersPage = lazy(() => import('./pages/web-orders/WebOrdersPage'))
const DeliveryQueuePage = lazy(() => import('./pages/web-orders/DeliveryQueuePage'))
const ManualsPage = lazy(() => import('./pages/manuals/ManualsPage'))
const SocialLinksPage = lazy(() => import('./pages/social-links/SocialLinksPage'))
const BlogManagerPage = lazy(() => import('./pages/marketing/BlogManagerPage'))
const CommunityPage = lazy(() => import('./pages/marketing/CommunityPage'))
const ImportsPage = lazy(() => import('./pages/imports/ImportsPage'))
const WorkOrdersPage = lazy(() => import('./pages/services/WorkOrdersPage'))
const QuickIntakePage = lazy(() => import('./pages/services/QuickIntakePage'))
const WebRequestsPage = lazy(() => import('./pages/services/WebRequestsPage'))
const ServiceAreaPage = lazy(() => import('./pages/services/ServiceAreaPage'))
const GastosTallerPage = lazy(() => import('./pages/services/GastosTallerPage'))
const CajaTallerPage = lazy(() => import('./pages/services/CajaTallerPage'))
const DiagnosticAssistantPage = lazy(() => import('./pages/services/DiagnosticAssistantPage'))
const WhatsAppStatusPage = lazy(() => import('./pages/services/WhatsAppStatusPage'))
const CommercialControlPage = lazy(() => import('./pages/commercial/CommercialControlPage'))
const AccessCenterPage = lazy(() => import('./pages/access/AccessCenterPage'))
const MasterAccountPage = lazy(() => import('./pages/access/MasterAccountPage'))
import { features } from "./config/features"
// Importar estilos personalizados

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Protected route component
const RouteLoader = () => <div className="flex min-h-[40vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  return <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router basename="/erp">
            <KeyboardShortcutsProvider>
              <Suspense fallback={<RouteLoader />}><Routes>
                {/* Auth routes */}
                <Route path="/login" element={<LoginPage />} />

                {/* Dashboard routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardPage />} />                  
                  <Route
                    path="categories"
                    element={
                      <RoleProtectedRoute allowedRoles={[1, 2, 3]} requiresBusinessHours={true}>
                        <CategoriesPage />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="categories/:id"
                    element={
                      <RoleProtectedRoute allowedRoles={[1, 2, 3]} requiresBusinessHours={true}>
                        <CategoryDetailPage />
                      </RoleProtectedRoute>
                    }
                  />
                  {/* <Route path="categories/:id/barcode" element={<BarcodeViewPage />} /> */}                  
                  <Route
                    path="products"
                    element={
                      <RoleProtectedRoute allowedRoles={[1, 2, 3]} requiresBusinessHours={true}>
                        <ProductsPage />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="products/:id"
                    element={
                      <RoleProtectedRoute allowedRoles={[1, 2, 3]} requiresBusinessHours={true}>
                        <ProductDetailPage />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="sales"
                    element={
                      <RoleProtectedRoute allowedRoles={[1, 2, 3]}>
                        <SalesPage />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="sales/new"
                    element={
                      <RoleProtectedRoute allowedRoles={[1, 2, 3]} requiresBusinessHours={true}>
                        <NewSalePage />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="sales/:id"
                    element={
                      <RoleProtectedRoute allowedRoles={[1, 2, 3]}>
                        <SaleDetailPage />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="company"
                    element={
                      <RoleProtectedRoute allowedRoles={[1, 2]}>
                        <CompanySunatPage />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="users"
                    element={<Navigate to="/company?tab=users" replace />}
                  />
                  <Route path="acquisitions" element={<RoleProtectedRoute allowedRoles={[1, 2]}><AcquisitionsPage /></RoleProtectedRoute>} />
                  <Route path="commercial-control" element={<RoleProtectedRoute allowedRoles={[1, 2, 3]}><CommercialControlPage /></RoleProtectedRoute>} />
                  <Route path="billing" element={<Navigate to="/company?tab=sunat" replace />} />
                  <Route path="web-orders" element={<RoleProtectedRoute allowedRoles={[1, 2, 3, 5]}><WebOrdersPage /></RoleProtectedRoute>} />
                  <Route path="deliveries" element={<RoleProtectedRoute allowedRoles={[1, 2, 5]}><DeliveryQueuePage /></RoleProtectedRoute>} />
                  <Route path="payments" element={<Navigate to="/company?tab=payments" replace />} />
                  <Route path="master-account" element={<RoleProtectedRoute allowedRoles={[1]}><MasterAccountPage /></RoleProtectedRoute>} />
                  <Route path="manuals" element={<RoleProtectedRoute allowedRoles={[1, 2, 3, 5, 6]}><ManualsPage /></RoleProtectedRoute>} />
                  <Route path="access-center" element={<RoleProtectedRoute allowedRoles={[1, 2, 3, 5, 6]}><AccessCenterPage /></RoleProtectedRoute>} />
                  <Route path="affiliate-subscription" element={<RoleProtectedRoute allowedRoles={[3]}><AffiliateSubscriptionPage /></RoleProtectedRoute>} />
                  <Route path="social-links" element={<RoleProtectedRoute allowedRoles={[1, 2]}><SocialLinksPage /></RoleProtectedRoute>} />
                  <Route path="blog" element={<RoleProtectedRoute allowedRoles={[1, 2]}><BlogManagerPage /></RoleProtectedRoute>} />
                  <Route path="community" element={<RoleProtectedRoute allowedRoles={[1, 2]}><CommunityPage /></RoleProtectedRoute>} />
                  <Route path="imports" element={<RoleProtectedRoute allowedRoles={[1]}><ImportsPage /></RoleProtectedRoute>} />
                  <Route path="services" element={<RoleProtectedRoute allowedRoles={[1, 6]} allowTemporarySuperuser><ServiceAreaPage /></RoleProtectedRoute>} />
                  <Route path="services/technical" element={<RoleProtectedRoute allowedRoles={[1, 6]} allowTemporarySuperuser><WorkOrdersPage tipo="servicio_tecnico" /></RoleProtectedRoute>} />
                  <Route path="services/maintenance" element={<RoleProtectedRoute allowedRoles={[1, 6]} allowTemporarySuperuser><WorkOrdersPage tipo="mantenimiento" /></RoleProtectedRoute>} />
                  <Route path="services/diagnostics" element={<RoleProtectedRoute allowedRoles={[1, 6]} allowTemporarySuperuser><DiagnosticAssistantPage /></RoleProtectedRoute>} />
                  <Route path="services/whatsapp" element={<RoleProtectedRoute allowedRoles={[1, 6]} allowTemporarySuperuser><WhatsAppStatusPage /></RoleProtectedRoute>} />
                  <Route path="services/pc-builds" element={<RoleProtectedRoute allowedRoles={[1, 6]} allowTemporarySuperuser><WorkOrdersPage tipo="armado_pc" /></RoleProtectedRoute>} />
                  <Route path="services/intake" element={<RoleProtectedRoute allowedRoles={[1, 6]} allowTemporarySuperuser><QuickIntakePage /></RoleProtectedRoute>} />
                  <Route path="services/expenses" element={<RoleProtectedRoute allowedRoles={[1, 6]} allowTemporarySuperuser><GastosTallerPage /></RoleProtectedRoute>} />
                  <Route path="services/cash" element={<RoleProtectedRoute allowedRoles={[1, 6]} allowTemporarySuperuser><CajaTallerPage /></RoleProtectedRoute>} />
                  <Route path="services/web-requests" element={<RoleProtectedRoute allowedRoles={[1, 2, 6]} allowTemporarySuperuser><WebRequestsPage /></RoleProtectedRoute>} />
                  <Route
                    path="vendors"
                    element={
                      <RoleProtectedRoute allowedRoles={[1]} allowTemporarySuperuser>
                        <VendorsPage />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="cash-register"
                    element={
                      <RoleProtectedRoute allowedRoles={[1, 2, 3]}>
                        <DailyCashPage />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="audit-logs"
                    element={
                      <RoleProtectedRoute allowedRoles={[1, 5]}>
                        <AuditLogsPage />
                      </RoleProtectedRoute>
                    }
                  />
                  {/* Añadir la ruta para la página de ofertas dentro de las rutas del dashboard */}
                  <Route
                    path="offers"
                    element={
                      <RoleProtectedRoute allowedRoles={[1, 2]}>
                        <OffersPage />
                      </RoleProtectedRoute>
                    }
                  />
                  {/* Ruta de marketing — controlada por feature flag */}
                  {features.marketing && (
                    <Route
                      path="marketing"
                      element={
                        <RoleProtectedRoute allowedRoles={[1, 2]}>
                          <Navigate to="/social-links" replace />
                        </RoleProtectedRoute>
                      }
                    />
                  )}
                  {/* Ruta para generación de tickets PDF */}
                  <Route
                    path="generate-ticket-pdf"
                    element={
                      <RoleProtectedRoute allowedRoles={[1, 2]}>
                        <ProductTicketsPDFPage />
                      </RoleProtectedRoute>
                    }
                  />
                {/* Ruta para generación de Excel de productos */}
                <Route
                  path="generate-excel-products"
                  element={
                    <RoleProtectedRoute allowedRoles={[1, 2]}>
                      <GenerateExcelProductsPage />
                    </RoleProtectedRoute>
                  }
                />
                  {/* Ruta para libro de reclamaciones — controlada por feature flag */}
                  {features.libroReclamaciones && (
                    <Route
                      path="libro-reclamaciones"
                      element={
                        <RoleProtectedRoute allowedRoles={[1, 2]}>
                          <LibroReclamacionesPage />
                        </RoleProtectedRoute>
                      }
                    />
                  )}
                  {/* Admin UI de solicitudes de importación (hot-patch B) — FEATURE_ECOMMERCE */}
                  {features.ecommerce && (
                    <Route
                      path="solicitudes-importacion"
                      element={
                        <RoleProtectedRoute allowedRoles={[1]}>
                          <SolicitudesImportacionPage />
                        </RoleProtectedRoute>
                      }
                    />
                  )}
                  {/* Admin UI de solicitudes de armado de PC — FEATURE_ECOMMERCE */}
                  {features.ecommerce && (
                    <Route
                      path="solicitudes-ensamble"
                      element={
                        <RoleProtectedRoute allowedRoles={[1]}>
                          <SolicitudesEnsamblePage />
                        </RoleProtectedRoute>
                      }
                    />
                  )}
                  {features.ecommerce && (
                    <Route path="postventa" element={<RoleProtectedRoute allowedRoles={[1, 2]}><PostventaPage /></RoleProtectedRoute>} />
                  )}
                </Route>

                {/* 404 route */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes></Suspense>
              <KeyboardShortcutsModal />
            </KeyboardShortcutsProvider>
          </Router>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
