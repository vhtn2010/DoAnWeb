import PaymentSuccessCard from '../../components/payment/PaymentSuccessCard.jsx'
import usePaymentSuccess from '../../hooks/usePaymentSuccess.js'

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
            Đang chuẩn bị dữ liệu thanh toán thành công mock theo pattern API-ready...
          </p>
        ) : null}

        {error ? (
          <div className="payment-success-page__status payment-success-page__status--error" role="status">
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
      </div>
    </div>
  )
}

export default PaymentSuccessPage
