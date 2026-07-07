import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { ROLES } from '../../constants/roles.js'

function preserveAuthPath(pathname, authState) {
  if (authState !== ROLES.customer) {
    return pathname
  }

  return pathname.includes('?') ? `${pathname}&auth=customer` : `${pathname}?auth=customer`
}

function PaymentSuccessPlaceholderPage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const authState =
    searchParams.get('auth') === ROLES.customer ? ROLES.customer : ROLES.guest
  const bookingCode = location.state?.booking?.booking_code ?? ''

  return (
    <div className="payment-success-page">
      <div className="payment-success-page__card">
        <span className="payment-success-page__eyebrow">Thanh toán thành công</span>
        <h1>Thanh toán thành công</h1>
        <p>Đơn hàng của bạn đã được ghi nhận trong dữ liệu mock.</p>
        {bookingCode ? (
          <p className="payment-success-page__meta">Mã đơn: {bookingCode}</p>
        ) : null}
        <Link className="payment-success-page__button" to={preserveAuthPath('/', authState)}>
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}

export default PaymentSuccessPlaceholderPage
