function ContactField({ error, label, name, onChange, placeholder, type = 'text', value }) {
  return (
    <label className="checkout-form-card__field">
      <span className="checkout-form-card__label">{label}</span>
      <input
        aria-invalid={Boolean(error)}
        className={`checkout-form-card__input${
          error ? ' checkout-form-card__input--error' : ''
        }`}
        name={name}
        placeholder={placeholder}
        required
        type={type}
        value={value}
        onChange={onChange}
      />
      {error ? <span className="checkout-form-card__error">{error}</span> : null}
    </label>
  )
}

function UserIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 19.5a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function CheckoutContactCard({ errors, formValues, onChange }) {
  return (
    <section className="checkout-form-card checkout-form-card--contact">
      <div className="checkout-form-card__header">
        <span aria-hidden="true" className="checkout-form-card__icon">
          <UserIcon />
        </span>
        <h2 className="checkout-form-card__title">Thông Tin Liên Hệ</h2>
      </div>

      <div className="checkout-form-card__grid">
        <ContactField
          error={errors.contact_name}
          label="Họ và Tên *"
          name="contact_name"
          placeholder="Nguyễn Văn A"
          value={formValues.contact_name}
          onChange={onChange}
        />
        <ContactField
          error={errors.contact_phone}
          label="Số Điện Thoại *"
          name="contact_phone"
          placeholder="090 123 4567"
          type="tel"
          value={formValues.contact_phone}
          onChange={onChange}
        />
        <div className="checkout-form-card__field checkout-form-card__field--full">
          <ContactField
            error={errors.contact_email}
            label="Email *"
            name="contact_email"
            placeholder="example@gmail.com"
            type="email"
            value={formValues.contact_email}
            onChange={onChange}
          />
        </div>
      </div>
    </section>
  )
}

export default CheckoutContactCard
