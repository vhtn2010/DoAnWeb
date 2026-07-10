function ShieldIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path
        d="M10 2.5 15.5 4.5v4.6c0 3.1-2.1 5.9-5.5 7.2-3.4-1.3-5.5-4.1-5.5-7.2V4.5L10 2.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="m7.7 9.8 1.5 1.5 3.1-3.3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function SupportIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path
        d="M5.8 12.8H4.3A1.8 1.8 0 0 1 2.5 11V9a7.5 7.5 0 1 1 15 0v2a1.8 1.8 0 0 1-1.8 1.8h-1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M7.5 15.3h5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function CartBenefitCard({ description, icon, title }) {
  return (
    <article className="cart-benefit-card">
      <span aria-hidden="true" className="cart-benefit-card__icon">
        {icon === 'shield' ? <ShieldIcon /> : <SupportIcon />}
      </span>
      <div className="cart-benefit-card__copy">
        <h3 className="cart-benefit-card__title">{title}</h3>
        <p className="cart-benefit-card__description">{description}</p>
      </div>
    </article>
  )
}

export default CartBenefitCard
