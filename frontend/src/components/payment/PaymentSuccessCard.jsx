import PaymentSuccessActions from './PaymentSuccessActions.jsx'
import PaymentSuccessOrderInfo from './PaymentSuccessOrderInfo.jsx'

function SuccessCheckIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="m7.6 12.5 3 3.2 5.9-7.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  )
}

function PaymentSuccessCard({
  description,
  feedback,
  onContinueExplore,
  onDownloadInvoice,
  orderInfo,
  title,
}) {
  return (
    <section className="payment-success-card">
      <div className="payment-success-icon" aria-hidden="true">
        <SuccessCheckIcon />
      </div>

      <h1 className="payment-success-card__title">{title}</h1>
      <p className="payment-success-card__description">{description}</p>

      <PaymentSuccessOrderInfo orderInfo={orderInfo} />

      <PaymentSuccessActions
        onContinueExplore={onContinueExplore}
        onDownloadInvoice={onDownloadInvoice}
      />

      {feedback ? (
        <p className="payment-success-card__feedback" role="status">
          {feedback}
        </p>
      ) : null}
    </section>
  )
}

export default PaymentSuccessCard
