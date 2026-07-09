function DownloadIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M12 4.8v9.2m0 0 3.4-3.4M12 14l-3.4-3.4M5 18.5h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function CompassIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m14.8 9.2-1.9 4-4 1.9 1.9-4 4-1.9Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function PaymentSuccessActions({
  onContinueExplore,
  onDownloadInvoice,
}) {
  return (
    <div className="payment-success-actions">
      <button
        className="payment-success-actions__button payment-success-actions__button--primary"
        type="button"
        onClick={onDownloadInvoice}
      >
        <span>Tải về hóa đơn điện tử</span>
        <span className="payment-success-actions__icon" aria-hidden="true">
          <DownloadIcon />
        </span>
      </button>

      <button
        className="payment-success-actions__button payment-success-actions__button--secondary"
        type="button"
        onClick={onContinueExplore}
      >
        <span className="payment-success-actions__icon" aria-hidden="true">
          <CompassIcon />
        </span>
        <span>Tiếp tục khám phá tour</span>
      </button>
    </div>
  )
}

export default PaymentSuccessActions
