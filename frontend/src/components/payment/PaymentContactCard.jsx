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

function PaymentContactCard({ contactForm, customerNote, errors }) {
  const hasCustomerNote = typeof customerNote === 'string' && customerNote.trim().length > 0

  return (
    <section className="payment-contact-card">
      <header className="payment-contact-card__header">
        <span className="payment-contact-card__icon" aria-hidden="true">
          <ContactIcon />
        </span>
        <div>
          <h2 className="payment-contact-card__title">Thông tin liên hệ</h2>
          <p className="payment-contact-card__subtitle">
            Thông tin này được giữ nguyên từ bước trước để hệ thống gửi biên nhận và bộ phận vận hành liên hệ khi cần.
          </p>
        </div>
      </header>

      <div className="payment-contact-grid">
        <div className="payment-contact-card__field">
          <span className="payment-contact-label">Họ và tên *</span>
          <div className="payment-contact-input payment-contact-input--readonly">
            <span>{contactForm.contact_name || 'Chưa có thông tin'}</span>
          </div>
          {errors.contact_name ? <small>{errors.contact_name}</small> : null}
        </div>

        <div className="payment-contact-card__field">
          <span className="payment-contact-label">Số điện thoại *</span>
          <div className="payment-contact-input payment-contact-input--readonly">
            <span>{contactForm.contact_phone || 'Chưa có thông tin'}</span>
          </div>
          {errors.contact_phone ? <small>{errors.contact_phone}</small> : null}
        </div>

        <div className="payment-contact-card__field payment-contact-field--full">
          <span className="payment-contact-label">Email *</span>
          <div className="payment-contact-input payment-contact-input--readonly">
            <span>{contactForm.contact_email || 'Chưa có thông tin'}</span>
          </div>
          {errors.contact_email ? <small>{errors.contact_email}</small> : null}
        </div>

        {hasCustomerNote ? (
          <div className="payment-contact-card__field payment-contact-field--full">
            <span className="payment-contact-label">Ghi chú của bạn</span>
            <div className="payment-contact-note-box">
              <p>{customerNote.trim()}</p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default PaymentContactCard
