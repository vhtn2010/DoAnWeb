import PaymentSuccessCard from '../../components/payment/PaymentSuccessCard.jsx'
import usePaymentSuccess from '../../hooks/usePaymentSuccess.js'

function PaymentSuccessEmptyState({ onContinueExplore, onRetry }) {
  return (
    <div
      className="payment-success-page__status payment-success-page__status--error"
      role="status"
    >
      <p>Chưa tải được trạng thái thanh toán. Vui lòng thử lại hoặc quay về lịch sử đơn hàng để mở lại.</p>
      <div className="payment-success-page__status-actions">
        <button type="button" onClick={onRetry}>
          Thử lại
        </button>
        <button type="button" onClick={onContinueExplore}>
          Về trang tour
        </button>
      </div>
    </div>
  )
}

function PaymentSuccessPage() {
  const {
    actions,
    error,
    feedback,
    loading,
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
            role="status"
          >
            <p>{error}</p>
            <button type="button" onClick={actions.retry}>
              Thử lại
            </button>
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
            onRetry={actions.retry}
          />
        ) : null}
      </div>
    </div>
  )
}

export default PaymentSuccessPage
