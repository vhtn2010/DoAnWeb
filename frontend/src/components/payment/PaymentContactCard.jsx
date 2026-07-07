function ContactIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 19a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function PaymentContactCard({ contactForm, errors, onChange }) {
  return (
    <section className="payment-contact-card">
      <header className="payment-contact-card__header">
        <span className="payment-contact-card__icon" aria-hidden="true">
          <ContactIcon />
        </span>
        <div>
          <h2 className="payment-contact-card__title">Thông tin liên hệ</h2>
          <p className="payment-contact-card__subtitle">Xác nhận lại thông tin để gửi biên nhận thanh toán.</p>
        </div>
      </header>

      <div className="payment-contact-card__grid">
        <label className="payment-contact-card__field">
          <span>Họ và Tên</span>
          <input
            name="contact_name"
            placeholder="Nguyễn Văn A"
            type="text"
            value={contactForm.contact_name}
            onChange={onChange}
          />
          {errors.contact_name ? <small>{errors.contact_name}</small> : null}
        </label>

        <label className="payment-contact-card__field">
          <span>Địa chỉ Email</span>
          <input
            name="contact_email"
            placeholder="Example@gmail.com"
            type="email"
            value={contactForm.contact_email}
            onChange={onChange}
          />
          {errors.contact_email ? <small>{errors.contact_email}</small> : null}
        </label>

        <label className="payment-contact-card__field">
          <span>Số điện thoại</span>
          <input
            name="contact_phone"
            placeholder="090 123 4567"
            type="text"
            value={contactForm.contact_phone}
            onChange={onChange}
          />
          {errors.contact_phone ? <small>{errors.contact_phone}</small> : null}
        </label>
      </div>
    </section>
  )
}

export default PaymentContactCard
