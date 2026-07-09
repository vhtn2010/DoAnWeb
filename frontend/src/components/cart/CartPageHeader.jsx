export default function CartPageHeader({ onGoBack }) {
  return (
    <section className="cart-page__hero">
      <div className="cart-page__hero-copy">
        <button className="cart-page__back-button" type="button" onClick={onGoBack}>
          <span aria-hidden="true">←</span>
          <span>Quay lại</span>
        </button>
        <p className="cart-page__eyebrow">Cart preview</p>
        <h1 className="cart-page__title">Giỏ hàng của bạn</h1>
      </div>
    </section>
  )
}
