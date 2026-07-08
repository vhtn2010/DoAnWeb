import CartBenefitCard from '../../components/cart/CartBenefitCard.jsx'
import CartItemCard from '../../components/cart/CartItemCard.jsx'
import CartSummaryCard from '../../components/cart/CartSummaryCard.jsx'
import useCart from '../../hooks/useCart.js'
import { formatCurrencyVND } from '../../utils/formatCurrency.js'

const benefitCards = [
  {
    id: 'best-price',
    icon: 'shield',
    title: 'Đảm bảo giá tốt nhất',
    description: 'Hoàn tiền chênh lệch nếu thấy giá rẻ hơn.',
  },
  {
    id: 'support',
    icon: 'support',
    title: 'Hỗ trợ 24/7',
    description: 'Đội ngũ hỗ trợ tận tâm luôn sẵn sàng.',
  },
]

function CartBasketIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="m5.5 9.5 1.6 9a1 1 0 0 0 .98.82h7.92a1 1 0 0 0 .98-.82l1.6-9H5.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M9 9.5 12 5l3 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function CartPage() {
  const {
    canContinue,
    cartItems,
    error,
    feedback,
    formattedSummary,
    handleContinueCheckout,
    handleEditItem,
    handleGoBack,
    handleRemoveItem,
    handleToggleItem,
    loading,
    reloadCart,
    selectedItemIds,
  } = useCart()

  return (
    <div className="cart-page">
      <section className="cart-page__hero">
        <div className="cart-page__hero-copy">
          <button className="cart-page__back-button" type="button" onClick={handleGoBack}>
            <span aria-hidden="true">←</span>
            <span>Quay lại</span>
          </button>
          <p className="cart-page__eyebrow">Cart preview</p>
          <h1 className="cart-page__title">Giỏ hàng của bạn</h1>
        </div>
      </section>

      {feedback.message ? (
        <p className={`cart-page__feedback cart-page__feedback--${feedback.tone}`} role="status">
          {feedback.message}
        </p>
      ) : null}

      {error ? (
        <p className="cart-page__feedback cart-page__feedback--error" role="status">
          {error}
        </p>
      ) : null}

      <div className="cart-page__layout">
        <section className="cart-list-card">
          <div className="cart-list-card__header">
            <div className="cart-list-card__intro">
              <span aria-hidden="true" className="cart-list-card__icon">
                <CartBasketIcon />
              </span>
              <h2 className="cart-list-card__title">Lựa chọn của bạn</h2>
            </div>
            <span className="cart-list-card__pill">{cartItems.length} Mục</span>
          </div>

          <div className="cart-list-card__items">
            {loading ? (
              <div className="cart-list-card__empty" role="status">
                <h2>Đang tải giỏ hàng</h2>
                <p>Dữ liệu mock đang được nạp theo flow API-ready cho màn hình giỏ hàng.</p>
              </div>
            ) : error && cartItems.length === 0 ? (
              <div className="cart-list-card__empty" role="status">
                <h2>Chưa tải được giỏ hàng</h2>
                <p>Vui lòng thử tải lại để tiếp tục xem các dịch vụ đã lưu trong giỏ.</p>
                <button className="cart-list-card__retry" type="button" onClick={reloadCart}>
                  Tải lại
                </button>
              </div>
            ) : cartItems.length > 0 ? (
              cartItems.map((item) => (
                <CartItemCard
                  key={item.id}
                  formatCurrency={formatCurrencyVND}
                  isSelected={selectedItemIds.includes(item.id)}
                  item={item}
                  onEdit={handleEditItem}
                  onRemove={handleRemoveItem}
                  onToggle={handleToggleItem}
                />
              ))
            ) : (
              <div className="cart-list-card__empty" role="status">
                <h2>Giỏ hàng đang trống</h2>
                <p>Thêm dịch vụ vào giỏ để tiếp tục preview quy trình đặt đơn ở các task sau.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="cart-page__sidebar">
          <CartSummaryCard
            feedbackHint="Bạn có thể tiếp tục đặt dịch vụ và nhập thông tin liên hệ ở bước tiếp theo."
            isContinueDisabled={!canContinue}
            onContinue={handleContinueCheckout}
            summary={formattedSummary}
          />

          <div className="cart-page__benefits">
            {benefitCards.map((benefit) => (
              <CartBenefitCard
                key={benefit.id}
                description={benefit.description}
                icon={benefit.icon}
                title={benefit.title}
              />
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default CartPage
