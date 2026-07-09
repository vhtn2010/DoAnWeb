function PublicFooterLinkGroup({ heading, items }) {
  return (
    <section className="public-footer__group">
      <h2 className="public-footer__heading">{heading}</h2>
      <ul className="public-footer__list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

export default PublicFooterLinkGroup
