import { BrowserRouter, Route, Routes } from 'react-router-dom'
import HomePage from '../pages/public/HomePage.jsx'
import LoginPage from '../pages/auth/LoginPage.jsx'
import RegisterPage from '../pages/auth/RegisterPage.jsx'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage.jsx'
import ServiceListPage from '../pages/service/ServiceListPage.jsx'
import ServiceDetailPage from '../pages/service/ServiceDetailPage.jsx'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx'
import AdminServicesPage from '../pages/admin/AdminServicesPage.jsx'

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/services" element={<ServiceListPage />} />
        <Route path="/services/:slug" element={<ServiceDetailPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/services" element={<AdminServicesPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
