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
    error,
    feedback,
    fieldErrors,
    isPaid,
    loading,
    paymentMethods,
    selectedPaymentMethod,
    cardNumber,
    contactForm,
    viewModel,
    voucherCode,
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

        {loading ? (
          <p className="payment-confirmation-page__status" role="status">
            Đang chuẩn bị dữ liệu thanh toán mock theo pattern API-ready...
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
                <div className="payment-confirmation-page__status payment-confirmation-page__status--success" role="status">
                  <p>{feedback || 'Thanh toán mock đã hoàn tất thành công.'}</p>
                  <button type="button" onClick={actions.goHome}>
                    Về trang chủ
                  </button>
                </div>
              ) : null}

              <PaymentChoiceCard
                itemCountLabel={viewModel.itemCountLabel}
                items={viewModel.items}
                onEdit={actions.goBackToBookingConfirmation}
                onRemove={actions.removePaymentItemMock}
                onReturn={actions.goBackToBookingConfirmation}
              />

              <PaymentContactCard
                contactForm={contactForm}
                errors={fieldErrors}
                onChange={actions.updateContactField}
              />

              <PaymentMethodPanel
                cardNumber={cardNumber}
                errors={fieldErrors}
                methods={paymentMethods}
                onCardNumberChange={actions.updateCardNumber}
                onSelectMethod={actions.selectPaymentMethod}
                selectedMethod={selectedPaymentMethod}
              />
            </div>

            <aside className="payment-confirmation-page__sidebar">
              <PaymentOrderSummary
                feedback={feedback}
                isDisabled={viewModel.items.length === 0 || isPaid}
                isPaid={isPaid}
                onApplyVoucher={actions.applyVoucherMock}
                onPay={actions.confirmPaymentMock}
                onVoucherChange={actions.updateVoucherCode}
                summary={viewModel.summary}
                voucherCode={voucherCode}
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
