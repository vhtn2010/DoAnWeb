import { CHECKOUT_BAGGAGE_FEE_BY_ROUTE } from '../../constants/checkout.js'
import { formatCurrencyVND } from '../../utils/formatCurrency.js'

function TravelIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M4 18.5h16M8 15.5l2.6-8.2a1.2 1.2 0 0 1 2.28 0l2.52 8.2M6.5 12.5h11"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" className="checkout-special-card__baggage-arrow" viewBox="0 0 16 16">
      <path
        d="M2.5 8h10M9 4.5 12.5 8 9 11.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function buildBaggageActionLabel(isSelected, baggageKey) {
  const feeAmount = formatCurrencyVND(CHECKOUT_BAGGAGE_FEE_BY_ROUTE[baggageKey] ?? 0)

  if (isSelected) {
    return `Đã thêm ${feeAmount}`
  }

  return `Thêm hành lý ${feeAmount}`
}

function CheckoutSpecialRequestCard({
  baggageSelection,
  errors,
  note,
  onBaggageToggle,
  onCheckboxChange,
  onTextareaChange,
  termsAccepted,
}) {
  return (
    <section className="checkout-form-card checkout-form-card--special">
      <div className="checkout-form-card__header">
        <span aria-hidden="true" className="checkout-form-card__icon">
          <TravelIcon />
        </span>
        <h2 className="checkout-form-card__title">Yêu Cầu Đặc Biệt</h2>
      </div>

      <div className="checkout-special-card__section">
        <h3 className="checkout-special-card__section-title">Hành lý ký gửi</h3>

        <div className="checkout-special-card__baggage-list">
          <button
            className={`checkout-special-card__baggage-row ${
              baggageSelection.baggage_departure
                ? 'checkout-special-card__baggage-row--selected'
                : ''
            }`}
            type="button"
            onClick={() => onBaggageToggle('baggage_departure')}
          >
            <span>Chiều đi</span>
            <span className="checkout-special-card__baggage-action">
              {buildBaggageActionLabel(Boolean(baggageSelection.baggage_departure), 'baggage_departure')}
              <ArrowRightIcon />
            </span>
          </button>

          <button
            className={`checkout-special-card__baggage-row ${
              baggageSelection.baggage_return
                ? 'checkout-special-card__baggage-row--selected'
                : ''
            }`}
            type="button"
            onClick={() => onBaggageToggle('baggage_return')}
          >
            <span>Chiều về</span>
            <span className="checkout-special-card__baggage-action">
              {buildBaggageActionLabel(Boolean(baggageSelection.baggage_return), 'baggage_return')}
              <ArrowRightIcon />
            </span>
          </button>
        </div>
      </div>

      <label className="checkout-form-card__field">
        <span className="checkout-form-card__label">Ghi chú thêm</span>
        <textarea
          className="checkout-form-card__textarea"
          name="note"
          placeholder="Ghi chú về dị ứng thực phẩm, yêu cầu chỗ ngồi hoặc nhu cầu đặc biệt khác..."
          rows="5"
          value={note}
          onChange={onTextareaChange}
        />
      </label>

      <label className="checkout-special-card__terms">
        <input checked={termsAccepted} name="accepted_terms" type="checkbox" onChange={onCheckboxChange} />
        <span>
          Tôi đồng ý với <strong>Điều khoản & Chính sách bảo mật</strong> của Nét Việt.
        </span>
      </label>
      {errors.accepted_terms ? (
        <span className="checkout-form-card__error">{errors.accepted_terms}</span>
      ) : null}
    </section>
  )
}

export default CheckoutSpecialRequestCard
