import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import PublicLayout from '../layouts/PublicLayout.jsx'
import AuthLayout from '../layouts/AuthLayout.jsx'
import AdminLayout from '../layouts/AdminLayout.jsx'
import HomePage from '../pages/public/HomePage.jsx'
import LoginPage from '../pages/auth/LoginPage.jsx'
import RegisterPage from '../pages/auth/RegisterPage.jsx'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage.jsx'
import VerifyEmailPage from '../pages/auth/VerifyEmailPage.jsx'
import CartPage from '../pages/cart/CartPage.jsx'
import CheckoutPage from '../pages/checkout/CheckoutPage.jsx'
import HotelListPage from '../pages/hotels/HotelListPage.jsx'
import ServiceListPage from '../pages/service/ServiceListPage.jsx'
import ServiceDetailPage from '../pages/service/ServiceDetailPage.jsx'
import AdminAccessControlPage from '../pages/admin/AdminAccessControlPage.jsx'
import AdminBookingDetailPage from '../pages/admin/AdminBookingDetailPage.jsx'
import AdminBookingsPage from '../pages/admin/AdminBookingsPage.jsx'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx'
import AdminInfrastructurePage from '../pages/admin/AdminInfrastructurePage.jsx'
import AdminPaymentsPage from '../pages/admin/AdminPaymentsPage.jsx'
import AdminPromotionsPage from '../pages/admin/AdminPromotionsPage.jsx'
import AdminRefundsPage from '../pages/admin/AdminRefundsPage.jsx'
import AdminRevenuePage from '../pages/admin/AdminRevenuePage.jsx'
import AdminServiceCreatePage from '../pages/admin/AdminServiceCreatePage.jsx'
import AdminServiceReviewPage from '../pages/admin/AdminServiceReviewFigmaPage.jsx'
import AdminServicesPage from '../pages/admin/AdminServicesPage.jsx'
import AdminSettingsPage from '../pages/admin/AdminSettingsPage.jsx'
import AdminSupportPage from '../pages/admin/AdminSupportFigmaPage.jsx'
import AdminUsersPage from '../pages/admin/AdminUsersFigmaPage.jsx'
import {
  AdminAuditLogsPage,
  AdminEmailLogsPage,
  AdminInventoryPage,
  AdminNotificationsPage,
  AdminPermissionsPage,
  AdminRolesPage,
  AdminUploadsPage,
} from '../pages/admin/AdminUtilityPages.jsx'
import AdminRouteGate from '../pages/admin/AdminRouteGate.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/hotels" element={<HotelListPage />} />
          <Route path="/services" element={<ServiceListPage />} />
          <Route path="/services/:slug" element={<ServiceDetailPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Route>
        </Route>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route
              path="/admin"
              element={
                <AdminRouteGate routeId="dashboard">
                  <AdminDashboardPage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/revenue"
              element={
                <AdminRouteGate routeId="revenue">
                  <AdminRevenuePage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/bookings"
              element={
                <AdminRouteGate routeId="bookings">
                  <AdminBookingsPage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/bookings/:bookingCode"
              element={
                <AdminRouteGate routeId="bookingDetail">
                  <AdminBookingDetailPage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/inventory"
              element={
                <AdminRouteGate routeId="inventory">
                  <AdminInventoryPage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/services"
              element={
                <AdminRouteGate routeId="services">
                  <AdminServicesPage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/services/new"
              element={
                <AdminRouteGate routeId="serviceCreate">
                  <AdminServiceCreatePage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/services/review"
              element={
                <AdminRouteGate routeId="serviceReview">
                  <AdminServiceReviewPage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/payments"
              element={
                <AdminRouteGate routeId="payments">
                  <AdminPaymentsPage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/refunds"
              element={
                <AdminRouteGate routeId="refunds">
                  <AdminRefundsPage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/promotions"
              element={
                <AdminRouteGate routeId="promotions">
                  <AdminPromotionsPage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/vouchers"
              element={
                <Navigate replace to="/admin/promotions" />
              }
            />
            <Route
              path="/admin/support"
              element={
                <AdminRouteGate routeId="support">
                  <AdminSupportPage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/email-logs"
              element={
                <AdminRouteGate routeId="emailLogs">
                  <AdminEmailLogsPage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRouteGate routeId="users">
                  <AdminUsersPage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/notifications"
              element={
                <AdminRouteGate routeId="notifications">
                  <AdminNotificationsPage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/access-control"
              element={
                <AdminRouteGate routeId="accessControl">
                  <AdminAccessControlPage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/roles"
              element={
                <AdminRouteGate routeId="roles">
                  <AdminRolesPage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/permissions"
              element={
                <AdminRouteGate routeId="permissions">
                  <AdminPermissionsPage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <AdminRouteGate routeId="auditLogs">
                  <AdminAuditLogsPage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/uploads"
              element={
                <AdminRouteGate routeId="uploads">
                  <AdminUploadsPage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/infrastructure"
              element={
                <AdminRouteGate routeId="infrastructure">
                  <AdminInfrastructurePage />
                </AdminRouteGate>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <AdminRouteGate routeId="settings">
                  <AdminSettingsPage />
                </AdminRouteGate>
              }
            />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
