function SummaryMetaIcon({ type }) {
  if (type === 'calendar') {
    return (
      <svg fill="none" viewBox="0 0 20 20">
        <rect
          height="12"
          rx="3"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.7"
          width="14"
          x="3"
          y="5"
        />
        <path
          d="M6.5 3.5v3m7-3v3M3 8.5h14"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
      </svg>
    )
  }

  if (type === 'duration') {
    return (
      <svg fill="none" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M10 6.5V10l2.8 1.8"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    )
  }

  return (
    <svg fill="none" viewBox="0 0 20 20">
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="13.5" cy="8" r="2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M3.5 15a3.5 3.5 0 0 1 7 0m1.2-.6c.34-1.21 1.32-2.17 2.55-2.48"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function formatServiceDateRange(startAt, endAt) {
  if (!startAt || !endAt) {
    return '25 Th11 - 27 Th11, 2024'
  }

  const startDate = new Date(startAt)
  const endDate = new Date(endAt)

  const startDay = String(startDate.getDate()).padStart(2, '0')
  const startMonth = String(startDate.getMonth() + 1).padStart(2, '0')
  const endDay = String(endDate.getDate()).padStart(2, '0')
  const endMonth = String(endDate.getMonth() + 1).padStart(2, '0')
  const year = endDate.getFullYear()

  return `${startDay} Th${startMonth} - ${endDay} Th${endMonth}, ${year}`
}

function buildTravellerLabel(options = {}) {
  const adults = Number(options.adults ?? 0)
  const children = Number(options.children ?? 0)
  const travellerParts = []

  if (adults > 0) {
    travellerParts.push(`${String(adults).padStart(2, '0')} Người lớn`)
  }

  if (children > 0) {
    travellerParts.push(`${String(children).padStart(2, '0')} Trẻ em`)
  }

  return travellerParts.join(' • ') || '01 Người lớn'
}

function CheckoutSummaryCard({
  buttonLabel,
  feedbackMessage,
  formErrors,
  isSubmitting = false,
  onContinue,
  summary,
  summaryService,
}) {
  const hasValidationError = Object.keys(formErrors).length > 0
  const dateRange = formatServiceDateRange(summaryService.start_at, summaryService.end_at)
  const travellerLabel = buildTravellerLabel(summaryService.options)
  const hasBaggageFee = Boolean(summary.has_baggage_fee)
  const hasVat = Boolean(summary.has_vat)
  const hasServiceFee = Boolean(summary.has_service_fee)
  const hasDiscount = Boolean(summary.has_discount)

  return (
    <section className="checkout-summary-card">
      <div className="checkout-summary-card__media">
        <img
          alt={summaryService.title}
          className="checkout-summary-card__image"
          src={summaryService.image_url}
        />
        <div className="checkout-summary-card__overlay" />
        <span className="checkout-summary-card__badge">{summaryService.options.badge_text}</span>
        <div className="checkout-summary-card__media-copy">
          <h2 className="checkout-summary-card__service-title">{summaryService.title}</h2>
        </div>
      </div>

      <div className="checkout-summary-card__body">
        <div className="checkout-summary-card__meta-list">
          <div className="checkout-summary-card__meta-row">
            <div className="checkout-summary-card__meta-item">
              <SummaryMetaIcon type="calendar" />
              <span>{dateRange}</span>
            </div>
            <strong className="checkout-summary-card__meta-value">
              {summaryService.options.duration_text}
            </strong>
          </div>
          <div className="checkout-summary-card__meta-row">
            <div className="checkout-summary-card__meta-item">
              <SummaryMetaIcon type="travellers" />
              <span>Hành khách</span>
            </div>
            <strong className="checkout-summary-card__meta-value">{travellerLabel}</strong>
          </div>
        </div>

        <div className="checkout-summary-card__price-list">
          <div className="checkout-summary-card__price-row">
            <span>Giá</span>
            <strong>{summary.subtotal_amount}</strong>
          </div>
          {hasBaggageFee ? (
            <div className="checkout-summary-card__price-row">
              <span>Phí hành lý ký gửi</span>
              <strong>{summary.baggage_fee_amount}</strong>
            </div>
          ) : null}
          {hasVat ? (
            <div className="checkout-summary-card__price-row">
              <span>Thuế VAT (8%)</span>
              <strong>{summary.vat_amount}</strong>
            </div>
          ) : null}
          {hasServiceFee ? (
            <div className="checkout-summary-card__price-row">
              <span>Phí dịch vụ</span>
              <strong>{summary.service_fee_amount}</strong>
            </div>
          ) : null}
          {hasDiscount ? (
            <div className="checkout-summary-card__price-row checkout-summary-card__price-row--discount">
              <span>Giảm giá thành viên</span>
              <strong>- {summary.discount_amount}</strong>
            </div>
          ) : null}
        </div>

        <div className="checkout-summary-card__total-box">
          <div>
            <span className="checkout-summary-card__total-label">Tổng cộng</span>
            <strong className="checkout-summary-card__total-amount">{summary.total_amount}</strong>
          </div>
          <span className="checkout-summary-card__vat-note">Đã bao gồm VAT</span>
        </div>

        <button
          aria-busy={isSubmitting}
          className="checkout-summary-card__button"
          disabled={isSubmitting}
          type="button"
          onClick={onContinue}
        >
          {isSubmitting ? 'Đang xử lý...' : buttonLabel}
        </button>

        <p className="checkout-summary-card__note">
          Hoàn hủy miễn phí 48 giờ trước khởi hành
        </p>

        {feedbackMessage ? (
          <p
            className={`checkout-summary-card__feedback ${
              hasValidationError
                ? 'checkout-summary-card__feedback--error'
                : 'checkout-summary-card__feedback--success'
            }`}
            role="status"
          >
            {feedbackMessage}
          </p>
        ) : null}
      </div>
    </section>
  )
}

export default CheckoutSummaryCard
