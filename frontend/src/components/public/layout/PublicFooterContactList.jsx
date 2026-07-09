import { PUBLIC_FOOTER_CONTACT_ITEMS } from './publicLayoutData.jsx'

function PublicFooterContactIcon({ children, title }) {
  return (
    <span aria-hidden="true" className="public-footer__contact-icon" title={title}>
      <svg fill="currentColor" viewBox="0 0 24 24">
        {children}
      </svg>
    </span>
  )
}

function PublicFooterContactList() {
  return (
    <section className="public-footer__group public-footer__group--contact">
      <h2 className="public-footer__heading">LIÊN HỆ</h2>
      <ul className="public-footer__list public-footer__list--contact">
        {PUBLIC_FOOTER_CONTACT_ITEMS.map((item) => (
          <li className="public-footer__contact-item" key={item.label}>
            <PublicFooterContactIcon title={item.title}>{item.icon}</PublicFooterContactIcon>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default PublicFooterContactList
