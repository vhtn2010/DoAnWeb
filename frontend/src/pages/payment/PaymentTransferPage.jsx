import PaymentQrCodePanel from '../../components/payment/PaymentQrCodePanel.jsx'
import usePaymentTransfer from '../../hooks/usePaymentTransfer.js'

function TransferIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M4.5 7.5h15m-15 9h15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="m14 4.5 5 3-5 3M10 13.5l-5 3 5 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function PaymentTransferPage() {
  const {
    actions,
    booking,
    error,
    fieldErrors,
    isPaid,
    loading,
    payment,
    paymentMethod,
    paymentProof,
    proofForm,
    submitting,
    uploadingProof,
    viewModel,
  } = usePaymentTransfer()

  return (
    <div className="payment-transfer-page">
      <div className="payment-transfer-shell">
        {loading ? (
          <p className="payment-confirmation-page__status" role="status">
            Đang tải thông tin chuyển khoản cho đơn hàng của bạn...
          </p>
        ) : null}

        {error ? (
          <div
            className="payment-confirmation-page__status payment-confirmation-page__status--error"
            role="status"
          >
            <p>{error}</p>
            <button type="button" onClick={actions.retry}>
              Thử lại
            </button>
          </div>
        ) : null}

        {!loading && !error ? (
          <section className="payment-transfer-card">
            <header className="payment-transfer-card__header">
              <span className="payment-transfer-card__icon" aria-hidden="true">
                <TransferIcon />
              </span>
              <div>
                <span className="payment-transfer-card__eyebrow">Thanh toán chuyển khoản</span>
                <h1>Hoàn tất thanh toán bằng QR ngân hàng</h1>
              </div>
            </header>

            {isPaid ? (
              <div
                className="payment-confirmation-page__status payment-confirmation-page__status--success"
                role="status"
              >
                <p>Thanh toán này đã được admin xác nhận. Bạn có thể xem kết quả chi tiết.</p>
                <button type="button" onClick={actions.goToSuccess}>
                  Xem kết quả
                </button>
              </div>
            ) : null}

            <PaymentQrCodePanel
              amountLabel={viewModel.summary.total_amount}
              bookingCode={booking?.booking_code}
              errors={fieldErrors}
              isSubmittingProof={submitting}
              method={paymentMethod}
              onProofFieldChange={actions.updateProofField}
              onProofFileChange={actions.updateProofFile}
              onSubmitProof={actions.submitProof}
              payment={payment}
              paymentProof={paymentProof}
              proofActionLabel={
                paymentProof?.proof_image_url ? 'Cập nhật bill và gửi admin' : 'Gửi bill cho admin duyệt'
              }
              proofForm={proofForm}
              showProofForm
              showQrSurface
              uploadingProof={uploadingProof}
            />

          </section>
        ) : null}
      </div>
    </div>
  )
}

export default PaymentTransferPage
