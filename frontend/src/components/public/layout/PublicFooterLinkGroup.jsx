import { Link } from 'react-router-dom'

function renderLinkItem(item) {
  if (item.to) {
    return (
      <Link className="public-footer__link" to={item.to}>
        {item.label}
      </Link>
    )
  }

  if (item.href) {
    return (
      <a
        className="public-footer__link"
        href={item.href}
        rel={item.isExternal ? 'noreferrer' : undefined}
        target={item.isExternal ? '_blank' : undefined}
      >
        {item.label}
      </a>
    )
  }

  return <span className="public-footer__link">{item.label}</span>
}

function PublicFooterLinkGroup({ heading, items }) {
  return (
    <section className="public-footer__group">
      <h2 className="public-footer__heading">{heading}</h2>
      <ul className="public-footer__list">
        {items.map((item) => (
          <li key={item.id ?? item.label}>{renderLinkItem(item)}</li>
        ))}
      </ul>
    </section>
  )
}

export default PublicFooterLinkGroup
