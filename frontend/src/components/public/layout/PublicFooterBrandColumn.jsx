import { PUBLIC_FOOTER_SOCIAL_ITEMS } from './publicLayoutData.jsx'

function PublicFooterSocialIcon({ children, label }) {
  return (
    <span aria-hidden="true" className="public-footer__social-icon" title={label}>
      <svg fill="currentColor" viewBox="0 0 24 24">
        {children}
      </svg>
    </span>
  )
}

function PublicFooterBrandColumn() {
  return (
    <section className="public-footer__brand-column">
      <img
        alt="Nét Việt"
        className="public-footer__wordmark"
        src="/assets/template/brand/footer-wordmark-white.png"
      />
      <p className="public-footer__description">
        Hành trình từ tâm, nâng tầm trải nghiệm Việt. Khám phá vẻ đẹp bất tận của mảnh đất chữ S
        cùng chúng tôi.
      </p>
      <div aria-label="Mạng xã hội" className="public-footer__socials">
        {PUBLIC_FOOTER_SOCIAL_ITEMS.map((item) => (
          <span className="public-footer__social" key={item.label}>
            <PublicFooterSocialIcon label={item.label}>{item.icon}</PublicFooterSocialIcon>
          </span>
        ))}
      </div>
    </section>
  )
}

export default PublicFooterBrandColumn
