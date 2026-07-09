import CheckoutContactCard from '../../components/checkout/CheckoutContactCard.jsx'
import CheckoutStateStack from '../../components/checkout/CheckoutStateStack.jsx'
import CheckoutSpecialRequestCard from '../../components/checkout/CheckoutSpecialRequestCard.jsx'
import CheckoutStepper from '../../components/checkout/CheckoutStepper.jsx'
import CheckoutSummaryCard from '../../components/checkout/CheckoutSummaryCard.jsx'
import CheckoutTrustRow from '../../components/checkout/CheckoutTrustRow.jsx'
import CheckoutVoucherCard from '../../components/checkout/CheckoutVoucherCard.jsx'
import useCheckout from '../../hooks/useCheckout.js'

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

        <CheckoutStateStack checkoutDraft={checkoutDraft} error={error} loading={loading} />

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

              <CheckoutTrustRow />
            </div>

            <aside className="checkout-page__sidebar">
              <CheckoutSummaryCard
                buttonLabel="Tiếp tục thanh toán"
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
