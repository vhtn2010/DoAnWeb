import PaymentChoiceCard from '../../components/payment/PaymentChoiceCard.jsx'
import PaymentOrderSummary from '../../components/payment/PaymentOrderSummary.jsx'
import PaymentQrCodePanel from '../../components/payment/PaymentQrCodePanel.jsx'
import PaymentStepper from '../../components/payment/PaymentStepper.jsx'
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
    feedback,
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
    <div className="payment-confirmation-page">
      <div className="payment-confirmation-shell">
        <PaymentStepper activeStep={3} />

        <header className="payment-confirmation-page__hero">
          <div>
            <h1 className="payment-confirmation-page__title">Thanh toán chuyển khoản</h1>
          </div>
        </header>

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
          <div className="payment-confirmation-page__layout">
            <div className="payment-confirmation-page__main">
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

              <PaymentChoiceCard
                itemCountLabel={viewModel.itemCountLabel}
                items={viewModel.items}
                onReturn={actions.goBackToConfirmation}
              />

              <section className="payment-method-panel">
                <header className="payment-method-panel__header">
                  <span className="payment-method-panel__icon" aria-hidden="true">
                    <TransferIcon />
                  </span>
                  <div>
                    <h2 className="payment-method-panel__title">Thông tin thanh toán</h2>
                    <p className="payment-method-panel__subtitle">
                      Vui lòng chuyển đúng số tiền, đúng nội dung rồi tải bill lên để gửi cho
                      admin kiểm tra và duyệt thủ công.
                    </p>
                  </div>
                </header>

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
                    paymentProof?.proof_image_url ? 'Cập nhật bill cho admin' : 'Gửi bill cho admin'
                  }
                  proofForm={proofForm}
                  showProofForm
                  showQrSurface
                  uploadingProof={uploadingProof}
                />
              </section>
            </div>

            <aside className="payment-confirmation-page__sidebar">
              <PaymentOrderSummary
                feedback={feedback}
                isDisabled={false}
                isPaid={isPaid}
                isSubmitting={false}
                payment={payment}
                selectedMethodMeta={paymentMethod}
                showPrimaryAction={false}
                summary={viewModel.summary}
              />
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default PaymentTransferPage
