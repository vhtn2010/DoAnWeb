import CartBenefitCard from '../../components/cart/CartBenefitCard.jsx'
import CartItemCard from '../../components/cart/CartItemCard.jsx'
import CartSummaryCard from '../../components/cart/CartSummaryCard.jsx'
import {
  PublicButton,
  PublicEmptyState,
  PublicErrorState,
  PublicLoadingBlock,
  PublicNotice,
} from '../../components/public/ui/index.js'
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
        <PublicNotice
          className={`cart-page__feedback cart-page__feedback--${feedback.tone}`}
          role="status"
          tone={feedback.tone === 'success' ? 'success' : 'info'}
        >
          {feedback.message}
        </PublicNotice>
      ) : null}

      {error ? (
        <PublicErrorState
          className="cart-page__feedback cart-page__feedback--error"
          description={error}
          eyebrow="Cần đồng bộ lại"
          title="Có lỗi khi tải giỏ hàng"
        />
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
              <PublicLoadingBlock
                className="cart-list-card__state"
                description="Dữ liệu mock đang được nạp theo flow API-ready cho màn hình giỏ hàng."
                rows={3}
                title="Đang tải giỏ hàng"
              />
            ) : error && cartItems.length === 0 ? (
              <PublicErrorState
                action={
                  <PublicButton className="cart-list-card__retry" type="button" variant="secondary" onClick={reloadCart}>
                    Tải lại
                  </PublicButton>
                }
                className="cart-list-card__state"
                description="Vui lòng thử tải lại để tiếp tục xem các dịch vụ đã lưu trong giỏ."
                eyebrow="Kết nối thất bại"
                title="Chưa tải được giỏ hàng"
              />
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
              <PublicEmptyState
                className="cart-list-card__state"
                description="Thêm dịch vụ vào giỏ để tiếp tục preview quy trình đặt đơn ở các task sau."
                eyebrow="Chưa có lựa chọn"
                title="Giỏ hàng đang trống"
              />
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
