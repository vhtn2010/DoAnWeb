const trustItems = ['SSL SECURE', 'BEST PRICE GUARANTEE', '24/7 SUPPORT']

export default function CheckoutTrustRow() {
  return (
    <div className="checkout-trust-row" aria-label="Niềm tin và bảo mật">
      {trustItems.map((item) => (
        <span className="checkout-trust-row__item" key={item}>
          {item}
        </span>
      ))}
    </div>
  )
}
