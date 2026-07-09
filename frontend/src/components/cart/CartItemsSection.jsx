import CartItemCard from './CartItemCard.jsx'
import { PublicButton, PublicEmptyState, PublicErrorState, PublicLoadingBlock } from '../public/ui/index.js'
import { formatCurrencyVND } from '../../utils/formatCurrency.js'

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

export default function CartItemsSection({
  cartItems,
  error,
  handleEditItem,
  handleRemoveItem,
  handleToggleItem,
  loading,
  reloadCart,
  selectedItemIds,
}) {
  return (
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
  )
}
