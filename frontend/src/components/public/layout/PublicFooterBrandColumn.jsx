function PublicFooterSocialIcon({ children, label }) {
  return (
    <span aria-hidden="true" className="public-footer__social-icon" title={label}>
      <svg fill="currentColor" viewBox="0 0 24 24">
        {children}
      </svg>
    </span>
  )
}

function PublicFooterBrandColumn({
  siteName = 'Net Viet Travel',
  socialItems = [],
}) {
  return (
    <section className="public-footer__brand-column">
      <img
        alt={siteName}
        className="public-footer__wordmark"
        src="/assets/template/brand/footer-wordmark-white.png"
      />
      <p className="public-footer__description">
        Hành trình tử tế, gọn rõ và thuận tiện hơn cho từng chuyến đi của bạn.
      </p>
      {socialItems.length ? (
        <div aria-label="Mạng xã hội" className="public-footer__socials">
          {socialItems.map((item) => (
            <a
              className="public-footer__social"
              href={item.href}
              key={item.id ?? item.label}
              rel="noreferrer"
              target="_blank"
            >
              <PublicFooterSocialIcon label={item.label}>{item.icon}</PublicFooterSocialIcon>
            </a>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export default PublicFooterBrandColumn
