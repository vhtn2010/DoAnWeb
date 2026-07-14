import CheckoutContactCard from '../../components/checkout/CheckoutContactCard.jsx'
import CheckoutStateStack from '../../components/checkout/CheckoutStateStack.jsx'
import CheckoutSpecialRequestCard from '../../components/checkout/CheckoutSpecialRequestCard.jsx'
import CheckoutStepper from '../../components/checkout/CheckoutStepper.jsx'
import CheckoutSummaryCard from '../../components/checkout/CheckoutSummaryCard.jsx'
import CheckoutTrustRow from '../../components/checkout/CheckoutTrustRow.jsx'
import useCheckout from '../../hooks/useCheckout.js'

function CheckoutPage() {
  const {
    checkoutDraft,
    error,
    formattedSummary,
    formErrors,
    handleBaggageToggle,
    handleCheckboxChange,
    handleFieldChange,
    handleNoteChange,
    handleSubmitCheckout,
    loading,
    submitting,
    submitFeedback,
    summaryService,
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
                isSubmitting={submitting}
                onContinue={handleSubmitCheckout}
                summary={formattedSummary}
                summaryService={summaryService}
              />
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default CheckoutPage
