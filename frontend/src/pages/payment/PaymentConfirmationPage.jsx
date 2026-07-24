import { LocalLoading } from '../../components/loading/Loading.jsx'
import PaymentChoiceCard from '../../components/payment/PaymentChoiceCard.jsx'
import PaymentContactCard from '../../components/payment/PaymentContactCard.jsx'
import PaymentMethodPanel from '../../components/payment/PaymentMethodPanel.jsx'
import PaymentOrderSummary from '../../components/payment/PaymentOrderSummary.jsx'
import PaymentStepper from '../../components/payment/PaymentStepper.jsx'
import PaymentTrustCards from '../../components/payment/PaymentTrustCards.jsx'
import usePaymentConfirmation from '../../hooks/usePaymentConfirmation.js'

function PaymentConfirmationPage() {
  const {
    actions,
    booking,
    canCancelPendingPayment,
    cancellingPayment,
    contactForm,
    error,
    feedback,
    fieldErrors,
    isPaid,
    isPrimaryActionDisabled,
    loading,
    payActionLabel,
    payment,
    paymentMethods,
    paymentProof,
    proofForm,
    selectedMethodMeta,
    selectedPaymentMethod,
    submitting,
    uploadingProof,
    viewModel,
  } = usePaymentConfirmation()

  return (
    <div className="payment-confirmation-page">
      <div className="payment-confirmation-shell">
        <PaymentStepper activeStep={3} />

        <header className="payment-confirmation-page__hero">
          <div>
            <h1 className="payment-confirmation-page__title">Xác nhận thanh toán</h1>
          </div>
        </header>

        {loading ? <LocalLoading className="payment-confirmation-page__status" minHeight="220px" /> : null}

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
                  <p>{feedback || 'Thanh toán đã được xác nhận thành công.'}</p>
                  <button type="button" onClick={actions.goHome}>
                    Về trang chủ
                  </button>
                </div>
              ) : null}

              <PaymentChoiceCard
                itemCountLabel={viewModel.itemCountLabel}
                items={viewModel.items}
                onReturn={actions.goBackToBookingConfirmation}
              />

              <PaymentContactCard
                contactForm={contactForm}
                customerNote={booking?.customer_note}
                errors={fieldErrors}
              />

              <PaymentMethodPanel
                amountLabel={viewModel.summary.total_amount}
                bookingCode={booking?.booking_code}
                errors={fieldErrors}
                methods={paymentMethods}
                onProofFieldChange={actions.updateProofField}
                onProofFileChange={actions.updateProofFile}
                onSelectMethod={actions.selectPaymentMethod}
                payment={payment}
                paymentProof={paymentProof}
                proofForm={proofForm}
                selectedMethod={selectedPaymentMethod}
                selectedMethodMeta={selectedMethodMeta}
                uploadingProof={uploadingProof}
              />
            </div>

            <aside className="payment-confirmation-page__sidebar">
              <PaymentOrderSummary
                canCancelPayment={canCancelPendingPayment}
                isCancellingPayment={cancellingPayment}
                isDisabled={isPrimaryActionDisabled}
                isPaid={isPaid}
                isSubmitting={submitting || uploadingProof}
                onCancelPayment={actions.cancelPendingPayment}
                onPay={actions.confirmPayment}
                payLabel={payActionLabel}
                payment={payment}
                selectedMethodMeta={selectedMethodMeta}
                summary={viewModel.summary}
              />
              <PaymentTrustCards />
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default PaymentConfirmationPage
