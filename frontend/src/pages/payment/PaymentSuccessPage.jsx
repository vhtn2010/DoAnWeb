import { Component } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PaymentSuccessCard from '../../components/payment/PaymentSuccessCard.jsx'
import usePaymentSuccess from '../../hooks/usePaymentSuccess.js'
import usePublicSession from '../../hooks/usePublicSession.js'
import { buildPublicAuthPath } from '../../utils/publicNavigation.js'

function PaymentSuccessEmptyState({ onContinueExplore, onGoToOrders, onRetry }) {
  return (
    <div
      className="payment-success-page__status payment-success-page__status--error"
      role="status"
    >
      <p>
        Chưa tải được trạng thái thanh toán. Vui lòng thử lại hoặc quay về lịch sử đơn hàng để
        mở lại đơn này.
      </p>
      <div className="payment-success-page__status-actions">
        <button type="button" onClick={onRetry}>
          Thử lại
        </button>
        <button type="button" onClick={onGoToOrders}>
          Về lịch sử đơn
        </button>
        <button type="button" onClick={onContinueExplore}>
          Về trang tour
        </button>
      </div>
    </div>
  )
}

class PaymentSuccessCrashBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      error: null,
    }
  }

  static getDerivedStateFromError(error) {
    return {
      error,
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    const errorMessage = String(this.state.error?.message ?? '').trim()

    return (
      <div className="payment-success-page">
        <div className="payment-success-shell">
          <div
            className="payment-success-page__status payment-success-page__status--error"
            role="alert"
          >
            <p>Không thể hiển thị trạng thái thanh toán của đơn hàng này.</p>
            {errorMessage ? (
              <p className="payment-success-page__error-detail">
                Chi tiết lỗi: <strong>{errorMessage}</strong>
              </p>
            ) : null}
            <div className="payment-success-page__status-actions">
              <button type="button" onClick={this.props.onRetry}>
                Tải lại trang
              </button>
              <button type="button" onClick={this.props.onGoToOrders}>
                Về lịch sử đơn
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

function PaymentSuccessPageContent() {
  const {
    actions,
    error,
    feedback,
    loading,
    paymentCode,
    paymentSuccess,
    viewModel,
  } = usePaymentSuccess()

  return (
    <div className="payment-success-page">
      <div className="payment-success-shell">
        {loading ? (
          <p className="payment-success-page__status" role="status">
            Đang tải trạng thái thanh toán mới nhất...
          </p>
        ) : null}

        {error ? (
          <div
            className="payment-success-page__status payment-success-page__status--error"
            role="alert"
          >
            <p>Không thể hiển thị trạng thái thanh toán cho mã {paymentCode || 'đơn hiện tại'}.</p>
            <p className="payment-success-page__error-detail">
              Chi tiết lỗi: <strong>{error}</strong>
            </p>
            <div className="payment-success-page__status-actions">
              <button type="button" onClick={actions.retry}>
                Thử lại
              </button>
              <button type="button" onClick={actions.goToOrderHistory}>
                Về lịch sử đơn
              </button>
            </div>
          </div>
        ) : null}

        {!loading && !error && paymentSuccess ? (
          <PaymentSuccessCard
            description={viewModel.description}
            feedback={feedback}
            onContinueExplore={actions.continueExploreTours}
            onDownloadInvoice={actions.downloadInvoiceMock}
            orderInfo={viewModel.orderInfo}
            title={viewModel.title}
          />
        ) : null}

        {!loading && !error && !paymentSuccess ? (
          <PaymentSuccessEmptyState
            onContinueExplore={actions.continueExploreTours}
            onGoToOrders={actions.goToOrderHistory}
            onRetry={actions.retry}
          />
        ) : null}
      </div>
    </div>
  )
}

function PaymentSuccessPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isCustomer } = usePublicSession()

  function handleRetry() {
    if (typeof window !== 'undefined') {
      window.location.reload()
      return
    }

    navigate(0)
  }

  function handleGoToOrders() {
    navigate(buildPublicAuthPath('/profile/orders', isCustomer))
  }

  return (
    <PaymentSuccessCrashBoundary
      key={`${location.pathname}${location.search}${location.key ?? ''}`}
      onGoToOrders={handleGoToOrders}
      onRetry={handleRetry}
    >
      <PaymentSuccessPageContent />
    </PaymentSuccessCrashBoundary>
  )
}

export default PaymentSuccessPage
