import { BrowserRouter, Route, Routes } from 'react-router-dom'
import PublicLayout from '../layouts/PublicLayout.jsx'
import AuthLayout from '../layouts/AuthLayout.jsx'
import AdminLayout from '../layouts/AdminLayout.jsx'
import HomePage from '../pages/public/HomePage.jsx'
import LoginPage from '../pages/auth/LoginPage.jsx'
import RegisterPage from '../pages/auth/RegisterPage.jsx'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage.jsx'
import BookingConfirmationPage from '../pages/booking/BookingConfirmationPage.jsx'
import CartPage from '../pages/cart/CartPage.jsx'
import CheckoutPage from '../pages/checkout/CheckoutPage.jsx'
import FlightDetailPage from '../pages/flights/FlightDetailPage.jsx'
import FlightListPage from '../pages/flights/FlightListPage.jsx'
import HotelDetailPage from '../pages/hotels/HotelDetailPage.jsx'
import HotelListPage from '../pages/hotels/HotelListPage.jsx'
import PaymentConfirmationPage from '../pages/payment/PaymentConfirmationPage.jsx'
import PaymentSuccessPage from '../pages/payment/PaymentSuccessPage.jsx'
import TrainDetailPage from '../pages/trains/TrainDetailPage.jsx'
import TrainListPage from '../pages/trains/TrainListPage.jsx'
import ServiceListPage from '../pages/service/ServiceListPage.jsx'
import ServiceDetailPage from '../pages/service/ServiceDetailPage.jsx'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx'
import AdminServicesPage from '../pages/admin/AdminServicesPage.jsx'

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/booking-confirmation" element={<BookingConfirmationPage />} />
          <Route
            path="/booking-confirmation/:bookingCode"
            element={<BookingConfirmationPage />}
          />
          <Route
            path="/payment-confirmation"
            element={<PaymentConfirmationPage />}
          />
          <Route
            path="/payment-confirmation/:paymentCode"
            element={<PaymentConfirmationPage />}
          />
          <Route
            path="/payment-success"
            element={<PaymentSuccessPage />}
          />
          <Route
            path="/payment-success/:paymentCode"
            element={<PaymentSuccessPage />}
          />
          <Route path="/flights" element={<FlightListPage />} />
          <Route path="/flights/:slug" element={<FlightDetailPage />} />
          <Route path="/trains" element={<TrainListPage />} />
          <Route path="/trains/:slug" element={<TrainDetailPage />} />
          <Route path="/hotels" element={<HotelListPage />} />
          <Route path="/hotels/:slug" element={<HotelDetailPage />} />
          <Route path="/services" element={<ServiceListPage />} />
          <Route path="/services/:slug" element={<ServiceDetailPage />} />
        </Route>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/services" element={<AdminServicesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
