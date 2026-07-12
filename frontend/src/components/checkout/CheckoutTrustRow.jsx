const trustItems = [
  {
    label: 'SSL SECURE',
    icon: (
      <path d="M10 2.5 16.5 5v5.1c0 4.3-2.9 7.5-6.5 8.9-3.6-1.4-6.5-4.6-6.5-8.9V5L10 2.5Z" />
    ),
  },
  {
    label: 'BEST PRICE GUARANTEE',
    icon: (
      <>
        <circle cx="10" cy="8.2" r="4.7" />
        <path d="M7.1 12.1 6.3 18l3.7-2 3.7 2-.8-5.9" />
      </>
    ),
  },
  {
    label: '24/7 SUPPORT',
    icon: (
      <>
        <path d="M3.8 10.5a6.2 6.2 0 1 1 12.4 0" />
        <rect height="5.5" rx="1.5" width="3.1" x="2.8" y="10.2" />
        <rect height="5.5" rx="1.5" width="3.1" x="14.1" y="10.2" />
        <path d="M14 15.6c-.7 1.1-1.9 1.7-3.6 1.7H9" />
      </>
    ),
  },
]

export default function CheckoutTrustRow() {
  return (
    <div className="checkout-trust-row" aria-label="Niềm tin và bảo mật">
      {trustItems.map((item) => (
        <span className="checkout-trust-row__item" key={item.label}>
          <svg
            aria-hidden="true"
            fill="none"
            viewBox="0 0 20 20"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          >
            {item.icon}
          </svg>
          {item.label}
        </span>
      ))}
    </div>
  )
}
