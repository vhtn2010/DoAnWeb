import { Link } from 'react-router-dom'

function PublicFooterContactIcon({ children, title }) {
  return (
    <span aria-hidden="true" className="public-footer__contact-icon" title={title}>
      <svg fill="currentColor" viewBox="0 0 24 24">
        {children}
      </svg>
    </span>
  )
}

function renderContactAction(item) {
  if (item.to) {
    return <Link to={item.to}>{item.label}</Link>
  }

  if (item.href) {
    return (
      <a
        href={item.href}
        rel={item.isExternal ? 'noreferrer' : undefined}
        target={item.isExternal ? '_blank' : undefined}
      >
        {item.label}
      </a>
    )
  }

  return <span>{item.label}</span>
}

function PublicFooterContactList({ items = [] }) {
  return (
    <section className="public-footer__group public-footer__group--contact">
      <h2 className="public-footer__heading">LIÊN HỆ</h2>
      {items.length ? (
        <ul className="public-footer__list public-footer__list--contact">
          {items.map((item) => (
            <li className="public-footer__contact-item" key={item.id ?? item.label}>
              <PublicFooterContactIcon title={item.title}>{item.icon}</PublicFooterContactIcon>
              <span className="public-footer__contact-copy">{renderContactAction(item)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="public-footer__empty-copy">
          <Link to="/help-center">Xem trung tâm trợ giúp</Link>
        </p>
      )}
    </section>
  )
}

export default PublicFooterContactList
