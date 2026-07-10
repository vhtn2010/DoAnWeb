const companyLinks = [
  'Câu chuyện thương hiệu',
  'Tin tức & Sự kiện',
  'Cơ hội nghề nghiệp',
  'Đối tác chiến lược',
]

const supportLinks = [
  'Chính sách bảo mật',
  'Điều khoản sử dụng',
  'Câu hỏi thường gặp',
  'Hotline 24/7',
]

const contactItems = [
  {
    label: 'Trụ sở: Nét Việt, Q1, TP. Hồ Chí Minh',
    title: 'Địa chỉ',
    icon: (
      <path d="M12 2.6a5.9 5.9 0 0 0-5.9 5.9c0 4.5 5.9 11.3 5.9 11.3s5.9-6.8 5.9-11.3A5.9 5.9 0 0 0 12 2.6Zm0 8.3A2.4 2.4 0 1 1 12 6a2.4 2.4 0 0 1 0 4.9Z" />
    ),
  },
  {
    label: 'hellonetviet@gmail.com',
    title: 'Email',
    icon: (
      <path d="M3.5 5.8h17a1 1 0 0 1 1 1v10.4a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1V6.8a1 1 0 0 1 1-1Zm0 1.7v.2l8.5 5.9 8.5-5.9v-.2h-17Zm17 8.9V9.6l-8 5.5a1 1 0 0 1-1 0l-8-5.5v6.8h17Z" />
    ),
  },
  {
    label: '1990 888 999',
    title: 'Điện thoại',
    icon: (
      <path d="M6.8 3.4h2.7c.5 0 .9.3 1 .8l.5 2.8c.1.4 0 .8-.3 1l-1.4 1.5a13 13 0 0 0 5.4 5.4l1.5-1.4c.3-.3.7-.4 1-.3l2.8.5c.5.1.8.5.8 1v2.7c0 .6-.5 1.1-1.1 1.1A17.2 17.2 0 0 1 5.7 4.5c0-.6.5-1.1 1.1-1.1Z" />
    ),
  },
]

const socialItems = [
  {
    label: 'Instagram',
    icon: (
      <>
        <rect
          fill="none"
          height="13"
          rx="4"
          ry="4"
          stroke="currentColor"
          strokeWidth="1.8"
          width="13"
          x="5.5"
          y="5.5"
        />
        <circle cx="12" cy="12" fill="none" r="3.1" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16.8" cy="7.3" r="1.15" />
      </>
    ),
  },
  {
    label: 'Facebook',
    icon: (
      <path d="M13.8 20v-6h2.6l.4-3h-3V9.1c0-.9.3-1.6 1.6-1.6H17V4.8c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V11H8.3v3h2.5v6h3Z" />
    ),
  },
  {
    label: 'TikTok',
    icon: (
      <path d="M14.7 4.5c.5 1.5 1.5 2.6 3 3.2v2.6a5.6 5.6 0 0 1-3-1v4.7a4.7 4.7 0 1 1-4.7-4.7c.3 0 .7 0 1 .1v2.7a2.2 2.2 0 1 0 1.2 2v-9.6h2.5Z" />
    ),
  },
]

function FooterContactIcon({ children, title }) {
  return (
    <span aria-hidden="true" className="public-footer__contact-icon" title={title}>
      <svg fill="currentColor" viewBox="0 0 24 24">
        {children}
      </svg>
    </span>
  )
}

function FooterSocialIcon({ children, label }) {
  return (
    <span aria-hidden="true" className="public-footer__social-icon" title={label}>
      <svg fill="currentColor" viewBox="0 0 24 24">
        {children}
      </svg>
    </span>
  )
}

function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer__shell">
        <div className="public-footer__grid">
          <section className="public-footer__brand-column">
            <img
              alt="Nét Việt"
              className="public-footer__wordmark"
              src="/assets/template/brand/footer-wordmark-white.png"
            />
            <p className="public-footer__description">
              Hành trình từ tâm, nâng tầm trải nghiệm Việt. Khám phá vẻ đẹp bất tận của
              mảnh đất chữ S cùng chúng tôi.
            </p>
            <div aria-label="Mạng xã hội" className="public-footer__socials">
              {socialItems.map((item) => (
                <span className="public-footer__social" key={item.label}>
                  <FooterSocialIcon label={item.label}>{item.icon}</FooterSocialIcon>
                </span>
              ))}
            </div>
          </section>

          <section className="public-footer__group">
            <h2 className="public-footer__heading">VỀ CÔNG TY</h2>
            <ul className="public-footer__list">
              {companyLinks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="public-footer__group">
            <h2 className="public-footer__heading">HỖ TRỢ KHÁCH HÀNG</h2>
            <ul className="public-footer__list">
              {supportLinks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="public-footer__group public-footer__group--contact">
            <h2 className="public-footer__heading">LIÊN HỆ</h2>
            <ul className="public-footer__list public-footer__list--contact">
              {contactItems.map((item) => (
                <li className="public-footer__contact-item" key={item.label}>
                  <FooterContactIcon title={item.title}>{item.icon}</FooterContactIcon>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div aria-hidden="true" className="public-footer__divider" />

        <div className="public-footer__bottom">
          <span>© 2026 Nét Việt.</span>
          <div className="public-footer__bottom-links">
            <span>Chính sách</span>
            <span>Cài đặt</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default PublicFooter
