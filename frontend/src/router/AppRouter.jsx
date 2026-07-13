import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import PublicLayout from '../layouts/PublicLayout.jsx'
import AuthLayout from '../layouts/AuthLayout.jsx'
import AdminLayout from '../layouts/AdminLayout.jsx'
import HomePage from '../pages/public/HomePageV2.jsx'
import NetVietBlogPage from '../pages/public/NetVietBlogPage.jsx'
import LoginPage from '../pages/auth/LoginPage.jsx'
import RegisterPage from '../pages/auth/RegisterPage.jsx'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage.jsx'
import VerifyEmailPage from '../pages/auth/VerifyEmailPage.jsx'
import ChangeEmailConfirmPage from '../pages/auth/ChangeEmailConfirmPage.jsx'
import BookingConfirmationPage from '../pages/booking/BookingConfirmationPage.jsx'
import CartPage from '../pages/cart/CartPage.jsx'
import CheckoutPage from '../pages/checkout/CheckoutPage.jsx'
import FlightDetailPage from '../pages/flights/FlightDetailPage.jsx'
import FlightListPage from '../pages/flights/FlightListPageV2.jsx'
import HotelDetailPage from '../pages/hotels/HotelDetailPage.jsx'
import HotelListPage from '../pages/hotels/HotelListPageV2.jsx'
import PaymentConfirmationPage from '../pages/payment/PaymentConfirmationPage.jsx'
import PaymentTransferPage from '../pages/payment/PaymentTransferPage.jsx'
import PaymentSuccessPage from '../pages/payment/PaymentSuccessPage.jsx'
import DepartureRemindersPage from '../pages/profile/DepartureRemindersPage.jsx'
import FavoritesPage from '../pages/profile/FavoritesPage.jsx'
import MyVouchersPage from '../pages/profile/MyVouchersPage.jsx'
import NotificationsPage from '../pages/profile/NotificationsPage.jsx'
import ProfileOrdersPage from '../pages/profile/ProfileOrdersPage.jsx'
import ProfilePage from '../pages/profile/ProfilePageV2.jsx'
import TravelHandbookPage from '../pages/profile/TravelHandbookPage.jsx'
import ServiceListPage from '../pages/service/ServiceListPageV2.jsx'
import ServiceDetailPage from '../pages/service/ServiceDetailPageV2.jsx'
import CustomerCarePage from '../pages/support/CustomerCarePage.jsx'
import HelpCenterPage from '../pages/support/HelpCenterPage.jsx'
import TrainDetailPage from '../pages/trains/TrainDetailPage.jsx'
import TrainListPage from '../pages/trains/TrainListPageV2.jsx'
import AdminAccessControlPage from '../pages/admin/AdminAccessControlPage.jsx'
import AdminBookingDetailPage from '../pages/admin/AdminBookingDetailPage.jsx'
import AdminBookingsPage from '../pages/admin/AdminBookingsPage.jsx'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx'
import AdminInfrastructurePage from '../pages/admin/AdminInfrastructurePage.jsx'
import AdminPaymentsPage from '../pages/admin/AdminPaymentsPage.jsx'
import AdminProfilePage from '../pages/admin/AdminProfilePage.jsx'
import AdminPromotionsPage from '../pages/admin/AdminPromotionsPage.jsx'
import AdminRefundsPage from '../pages/admin/AdminRefundsPage.jsx'
import AdminRevenuePage from '../pages/admin/AdminRevenuePageInteractive.jsx'
import AdminServiceCreatePage from '../pages/admin/AdminServiceCreatePage.jsx'
import AdminServiceReviewPage from '../pages/admin/AdminServiceReviewFigmaPage.jsx'
import AdminServicesPage from '../pages/admin/AdminServicesPage.jsx'
import AdminSettingsPage from '../pages/admin/AdminSettingsPage.jsx'
import AdminSupportPage from '../pages/admin/AdminSupportFigmaPage.jsx'
import AdminUsersPage from '../pages/admin/AdminUsersFigmaPage.jsx'
import {
  AdminEmailLogsPage,
  AdminInventoryPage,
} from '../pages/admin/AdminUtilityPages.jsx'
import AdminRouteGate from '../pages/admin/AdminRouteGate.jsx'
import CustomerOnlyRoute from './CustomerOnlyRoute.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import ScrollToTop from './ScrollToTop.jsx'

function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/booking-confirmation"
            element={
              <CustomerOnlyRoute
                description="Đăng nhập để xem chi tiết đơn đặt chỗ, kiểm tra dịch vụ đã chọn và tiếp tục sang bước thanh toán."
                eyebrow="Đơn đặt chỗ"
                title="Vui lòng đăng nhập để xem đơn đặt chỗ của bạn"
              >
                <BookingConfirmationPage />
              </CustomerOnlyRoute>
            }
          />
          <Route
            path="/booking-confirmation/:bookingCode"
            element={
              <CustomerOnlyRoute
                description="Đăng nhập để xem chi tiết đơn đặt chỗ, kiểm tra dịch vụ đã chọn và tiếp tục sang bước thanh toán."
                eyebrow="Đơn đặt chỗ"
                title="Vui lòng đăng nhập để xem đơn đặt chỗ của bạn"
              >
                <BookingConfirmationPage />
              </CustomerOnlyRoute>
            }
          />
          <Route
            path="/payment-confirmation"
            element={
              <CustomerOnlyRoute
                description="Đăng nhập để giữ lại thông tin đơn hàng, chọn phương thức phù hợp và hoàn tất thanh toán thuận tiện hơn."
                eyebrow="Thanh toán"
                title="Vui lòng đăng nhập để tiếp tục thanh toán"
              >
                <PaymentConfirmationPage />
              </CustomerOnlyRoute>
            }
          />
          <Route
            path="/payment-confirmation/:paymentCode"
            element={
              <CustomerOnlyRoute
                description="Đăng nhập để giữ lại thông tin đơn hàng, chọn phương thức phù hợp và hoàn tất thanh toán thuận tiện hơn."
                eyebrow="Thanh toán"
                title="Vui lòng đăng nhập để tiếp tục thanh toán"
              >
                <PaymentConfirmationPage />
              </CustomerOnlyRoute>
            }
          />
          <Route
            path="/payment-success"
            element={
              <CustomerOnlyRoute
                description="Đăng nhập để xem kết quả thanh toán, tải chứng từ và theo dõi bước tiếp theo của đơn hàng."
                eyebrow="Thanh toán"
                title="Vui lòng đăng nhập để xem kết quả thanh toán"
              >
                <PaymentSuccessPage />
              </CustomerOnlyRoute>
            }
          />
          <Route
            path="/payment-transfer/:paymentCode"
            element={
              <CustomerOnlyRoute
                description="Đăng nhập để xem thông tin chuyển khoản, tải bill và chờ admin xác nhận thanh toán."
                eyebrow="Thanh toán"
                title="Vui lòng đăng nhập để tiếp tục chuyển khoản"
              >
                <PaymentTransferPage />
              </CustomerOnlyRoute>
            }
          />
          <Route
            path="/payment-success/:paymentCode"
            element={
              <CustomerOnlyRoute
                description="Đăng nhập để xem kết quả thanh toán, tải chứng từ và theo dõi bước tiếp theo của đơn hàng."
                eyebrow="Thanh toán"
                title="Vui lòng đăng nhập để xem kết quả thanh toán"
              >
                <PaymentSuccessPage />
              </CustomerOnlyRoute>
            }
          />
          <Route
            path="/departure-reminders"
            element={
              <CustomerOnlyRoute
                description="Đăng nhập để theo dõi các mốc check-in, giờ ra sân bay và nhắc việc gắn với từng đơn đặt chỗ của bạn."
                eyebrow="Nhắc lịch khởi hành"
                title="Vui lòng đăng nhập để mở nhắc lịch chuyến đi"
              >
                <DepartureRemindersPage />
              </CustomerOnlyRoute>
            }
          />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route
            path="/profile"
            element={
              <CustomerOnlyRoute
                description="Đăng nhập để xem hồ sơ, lịch sử đơn hàng và các tiện ích cá nhân dành riêng cho tài khoản của bạn."
                eyebrow="Tài khoản"
                title="Vui lòng đăng nhập để mở tài khoản cá nhân"
              >
                <ProfilePage />
              </CustomerOnlyRoute>
            }
          />
          <Route
            path="/profile/orders"
            element={
              <CustomerOnlyRoute
                description="Đăng nhập để xem lịch sử đơn hàng, trạng thái thanh toán và các yêu cầu đang chờ duyệt."
                eyebrow="Lịch sử đơn hàng"
                title="Vui lòng đăng nhập để xem lịch sử đơn hàng"
              >
                <ProfileOrdersPage />
              </CustomerOnlyRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <CustomerOnlyRoute
                description="Đăng nhập để theo dõi thông báo đơn hàng, thanh toán và các cập nhật hệ thống dành riêng cho bạn."
                eyebrow="Hộp thư thông báo"
                title="Vui lòng đăng nhập để xem thông báo của bạn"
              >
                <NotificationsPage />
              </CustomerOnlyRoute>
            }
          />
          <Route
            path="/my-vouchers"
            element={
              <CustomerOnlyRoute
                description="Đăng nhập để xem lại mã đã lưu, nhập mã bạn đang có và kiểm tra khả năng áp dụng theo giỏ hàng hiện tại."
                eyebrow="Mã ưu đãi"
                title="Vui lòng đăng nhập để dùng mã ưu đãi của bạn"
              >
                <MyVouchersPage />
              </CustomerOnlyRoute>
            }
          />
          <Route path="/travel-handbook" element={<TravelHandbookPage />} />
          <Route path="/blog" element={<NetVietBlogPage />} />
          <Route path="/customer-care" element={<CustomerCarePage />} />
          <Route path="/help-center" element={<HelpCenterPage />} />
          <Route path="/flights" element={<FlightListPage />} />
          <Route path="/flights/:slug" element={<FlightDetailPage />} />
          <Route path="/trains" element={<TrainListPage />} />
          <Route path="/trains/:slug" element={<TrainDetailPage />} />
          <Route path="/hotels" element={<HotelListPage />} />
          <Route path="/hotels/:slug" element={<HotelDetailPage />} />
          <Route path="/services" element={<ServiceListPage />} />
          <Route path="/services/:slug" element={<ServiceDetailPage />} />
          <Route
            path="/cart"
            element={
              <CustomerOnlyRoute
                description="Đăng nhập để lưu dịch vụ bạn chọn và tiếp tục đặt chỗ thuận tiện hơn."
                eyebrow="Giỏ hàng"
                title="Vui lòng đăng nhập để có thể thêm vào giỏ hàng"
              >
                <CartPage />
              </CustomerOnlyRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <CustomerOnlyRoute
                description="Đăng nhập để giữ lại giỏ hàng, nhập thông tin hành khách và hoàn tất đặt chỗ thuận tiện hơn."
                eyebrow="Thanh toán"
                title="Vui lòng đăng nhập để tiếp tục bước đặt chỗ"
              >
                <CheckoutPage />
              </CustomerOnlyRoute>
            }
          />
          <Route element={<ProtectedRoute />}>
            <Route
              path="/change-email/confirm"
              element={<ChangeEmailConfirmPage />}
            />
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
              path="/admin/profile"
              element={
                <AdminRouteGate routeId="profile">
                  <AdminProfilePage />
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
              element={<Navigate replace to="/admin" />}
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
