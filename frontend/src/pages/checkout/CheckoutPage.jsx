import CheckoutContactCard from '../../components/checkout/CheckoutContactCard.jsx'
import CheckoutSpecialRequestCard from '../../components/checkout/CheckoutSpecialRequestCard.jsx'
import CheckoutStepper from '../../components/checkout/CheckoutStepper.jsx'
import CheckoutSummaryCard from '../../components/checkout/CheckoutSummaryCard.jsx'
import CheckoutVoucherCard from '../../components/checkout/CheckoutVoucherCard.jsx'
import useCheckout from '../../hooks/useCheckout.js'

const trustItems = ['SSL SECURE', 'BEST PRICE GUARANTEE', '24/7 SUPPORT']

function ContactTrustRow() {
  return (
    <div className="checkout-trust-row" aria-label="Niềm tin và bảo mật">
      {trustItems.map((item) => (
        <span className="checkout-trust-row__item" key={item}>
          {item}
        </span>
      ))}
    </div>
  )
}

function CheckoutPage() {
  const {
    checkoutDraft,
    error,
    formattedSummary,
    formErrors,
    handleApplyVoucher,
    handleBaggageToggle,
    handleCheckboxChange,
    handleFieldChange,
    handleNoteChange,
    handleSubmitCheckout,
    handleVoucherChange,
    loading,
    submitFeedback,
    summaryService,
    voucherFeedback,
  } = useCheckout()

  return (
    <div className="checkout-page">
      <div className="checkout-page__shell">
        <CheckoutStepper activeStep={2} />

        {loading && !checkoutDraft ? (
          <p className="checkout-summary-card__feedback checkout-summary-card__feedback--success" role="status">
            Đang tải thông tin đặt đơn mock theo pattern API-ready...
          </p>
        ) : null}

        {error ? (
          <p className="checkout-summary-card__feedback checkout-summary-card__feedback--error" role="status">
            {error}
          </p>
        ) : null}

        {checkoutDraft && formattedSummary && summaryService ? (
          <div className="checkout-page__layout">
            <div className="checkout-page__main">
              <CheckoutContactCard
                errors={formErrors}
                formValues={checkoutDraft}
                onChange={handleFieldChange}
              />

              <CheckoutSpecialRequestCard
                baggageSelection={checkoutDraft.special_requests}
                errors={formErrors}
                note={checkoutDraft.note}
                onBaggageToggle={handleBaggageToggle}
                onCheckboxChange={handleCheckboxChange}
                onTextareaChange={handleNoteChange}
                termsAccepted={Boolean(checkoutDraft.accepted_terms)}
              />

              <ContactTrustRow />
            </div>

            <aside className="checkout-page__sidebar">
              <CheckoutSummaryCard
                buttonLabel="Tiếp Tục Thanh Toán ->"
                feedbackMessage={submitFeedback}
                formErrors={formErrors}
                onContinue={handleSubmitCheckout}
                summary={formattedSummary}
                summaryService={summaryService}
              />

              <CheckoutVoucherCard
                feedbackMessage={voucherFeedback}
                onApplyVoucher={handleApplyVoucher}
                onChange={handleVoucherChange}
                value={checkoutDraft.voucher_code}
              />
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default CheckoutPage
